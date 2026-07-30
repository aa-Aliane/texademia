# Tree View:
```
backend
└── src
    ├── database
    │   └── session.py
    └── features
        └── texademia
            ├── models
            │   └── document.py
            ├── routers
            │   └── documents.py
            ├── schemas
            │   └── document.py
            └── services
                ├── compiler.py
                └── compiler_worker.py

```

# Content:

## src/database/session.py

```py
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import AsyncGenerator
from src.config.settings import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)

async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

```


## src/features/texademia/models/document.py

```py
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List
from pathlib import Path

from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, JSON
import enum

if TYPE_CHECKING:
    from src.features.auth.models import User

_COMPILED_PDF_DIR = Path("compiled_pdfs")


class Document(SQLModel, table=True):
    __tablename__ = "documents"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, index=True)
    title: str = Field(default="Untitled", nullable=False)
    template: str = Field(default="default", nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    collaborators: List["DocumentCollaborator"] = Relationship(
        back_populates="document",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
    )

    user: "User" = Relationship()
    files: List["DocumentFile"] = Relationship(
        back_populates="document",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "lazy": "selectin",
        },
    )

    @property
    def pdf_url(self) -> str | None:
        pdf_path = _COMPILED_PDF_DIR / f"{self.id}.pdf"
        if pdf_path.exists():
            return f"/static/compiled/{self.id}.pdf"
        return None


class DocumentFile(SQLModel, table=True):
    __tablename__ = "document_files"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(
        foreign_key="documents.id", nullable=False, index=True
    )
    name: str = Field(nullable=False)  # "main.tex", "references.bib"
    language: str = Field(default="latex", nullable=False)  # "latex" | "bibtex" | "log"
    content: str = Field(default="", nullable=False)
    line_authors: list[dict] | None = Field(default=None, sa_column=Column(JSON))

    document: "Document" = Relationship(back_populates="files")


class CollaboratorRole(str, enum.Enum):
    reader = "reader"
    writer = "writer"


class CollaboratorStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"


class DocumentCollaborator(SQLModel, table=True):
    __tablename__ = "document_collaborators"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(
        foreign_key="documents.id", nullable=False, index=True
    )
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, index=True)
    invited_by_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    role: CollaboratorRole = Field(default=CollaboratorRole.reader, nullable=False)
    status: CollaboratorStatus = Field(
        default=CollaboratorStatus.pending, nullable=False
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    document: "Document" = Relationship(back_populates="collaborators")
    user: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "DocumentCollaborator.user_id"}
    )

    @property
    def email(
        self,
    ) -> str | None:  # NEW — lets CollaboratorRead.model_validate() read it directly
        return self.user.email if self.user else None

```


## src/features/texademia/routers/documents.py

```py
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

import difflib
from datetime import datetime


from src.database.session import get_db
from src.features.auth.models import User
from src.features.auth.router import current_active_user
from src.features.texademia.models.document import (
    Document,
    DocumentFile,
    DocumentCollaborator,
    CollaboratorStatus,
    CollaboratorRole,
)
from src.features.texademia.schemas.document import (
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    DocumentDuplicate,
    FileUpdate,
    CollaboratorRead,
)
from src.features.texademia.templates import get_template_files
from src.features.texademia.services.compiler import (
    enqueue_compile_job,
    get_job_status,
    CompileError as CompilerError,
)
from src.features.texademia.services.template_migrator import (
    migrate_files_to_template,
)

router = APIRouter(prefix="/documents", tags=["documents"])


def _update_line_authors(
    old_content: str, new_content: str, old_meta: list[dict] | None, author: str
) -> list[dict]:
    old_lines = old_content.split("\n")
    new_lines = new_content.split("\n")
    old_meta = list(old_meta or [])
    now = datetime.utcnow().isoformat()

    while len(old_meta) < len(old_lines):
        old_meta.append({"author": author, "edited_at": now})

    matcher = difflib.SequenceMatcher(a=old_lines, b=new_lines, autojunk=False)
    new_meta: list[dict] = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            new_meta.extend(old_meta[i1:i2])
        else:
            new_meta.extend([{"author": author, "edited_at": now}] * (j2 - j1))
    return new_meta


async def _get_accessible_document(
    document_id: uuid.UUID,
    session: AsyncSession,
    user: User,
    require_write: bool = False,
) -> tuple[Document, str]:
    """
    Replaces the old owner-only `_get_owned_document`. Returns the document
    plus the caller's effective role ("owner" | "writer" | "reader") so
    endpoints can both authorize and build the response without a second
    lookup.
    """
    statement = (
        select(Document)
        .where(Document.id == document_id)
        .options(
            selectinload(Document.files),
            selectinload(Document.collaborators).selectinload(
                DocumentCollaborator.user
            ),
        )
    )
    result = await session.exec(statement)
    document = result.first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.user_id == user.id:
        return document, "owner"

    collab = next(
        (
            c
            for c in document.collaborators
            if c.user_id == user.id and c.status == CollaboratorStatus.accepted
        ),
        None,
    )
    if not collab:
        # Not the owner and no accepted collaborator row — treat as not found
        # rather than 403, so we don't leak document existence.
        raise HTTPException(status_code=404, detail="Document not found")

    if require_write and collab.role != CollaboratorRole.writer:
        raise HTTPException(
            status_code=403, detail="You only have read access to this document"
        )

    return document, collab.role.value


async def _get_owned_file(
    document_id: uuid.UUID, file_id: uuid.UUID, session: AsyncSession, user: User
) -> DocumentFile:
    await _get_accessible_document(document_id, session, user, require_write=True)

    statement = select(DocumentFile).where(
        DocumentFile.id == file_id, DocumentFile.document_id == document_id
    )
    result = await session.exec(statement)
    file = result.first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return file


def _role_for(document: Document, user: User) -> str:
    collab = next((c for c in document.collaborators if c.user_id == user.id), None)
    return collab.role.value if collab else "reader"


def _to_document_read(document: Document, role: str) -> DocumentRead:
    base = DocumentRead.model_validate(document)
    collaborators = (
        [
            CollaboratorRead(
                id=c.id,
                user_id=c.user_id,
                email=c.user.email,
                role=c.role,
                status=c.status,
            )
            for c in document.collaborators
        ]
        if role == "owner"
        else []
    )
    return base.model_copy(update={"role": role, "collaborators": collaborators})


@router.get("", response_model=List[DocumentRead])
async def list_documents(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    owned_result = await session.exec(
        select(Document)
        .where(Document.user_id == user.id)
        .options(
            selectinload(Document.files),
            selectinload(Document.collaborators).selectinload(
                DocumentCollaborator.user
            ),
        )
    )
    owned = list(owned_result.all())

    shared_result = await session.exec(
        select(Document)
        .join(DocumentCollaborator, DocumentCollaborator.document_id == Document.id)
        .where(
            DocumentCollaborator.user_id == user.id,
            DocumentCollaborator.status == CollaboratorStatus.accepted,
        )
        .options(
            selectinload(Document.files),
            selectinload(Document.collaborators).selectinload(
                DocumentCollaborator.user
            ),
        )
    )
    shared = list(shared_result.all())

    return [_to_document_read(d, "owner") for d in owned] + [
        _to_document_read(d, _role_for(d, user)) for d in shared
    ]

async def list_accessible_document_ids(
    session: AsyncSession, user: User
) -> list[uuid.UUID]:
    """
    Id-only variant of list_documents, used by the presence websocket so it
    can subscribe to the right Redis channels without paying for the
    files/collaborators eager load.
    """
    owned_result = await session.exec(
        select(Document.id).where(Document.user_id == user.id)
    )
    owned_ids = list(owned_result.all())

    shared_result = await session.exec(
        select(Document.id)
        .join(DocumentCollaborator, DocumentCollaborator.document_id == Document.id)
        .where(
            DocumentCollaborator.user_id == user.id,
            DocumentCollaborator.status == CollaboratorStatus.accepted,
        )
    )
    shared_ids = list(shared_result.all())

    return owned_ids + shared_ids


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    doc_in: DocumentCreate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document = Document(title=doc_in.title, template=doc_in.template, user_id=user.id)
    session.add(document)
    await session.flush()

    for tf in get_template_files(doc_in.template):
        session.add(
            DocumentFile(
                document_id=document.id,
                name=tf["name"],
                language=tf["language"],
                content=tf["content"],
            )
        )

    await session.commit()
    await session.refresh(document, attribute_names=["files", "collaborators"])
    return _to_document_read(document, "owner")


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, role = await _get_accessible_document(document_id, session, user)
    return _to_document_read(document, role)


@router.patch("/{document_id}", response_model=DocumentRead)
async def update_document(
    document_id: uuid.UUID,
    doc_in: DocumentUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, role = await _get_accessible_document(
        document_id, session, user, require_write=True
    )

    if doc_in.title is not None:
        document.title = doc_in.title
    if doc_in.template is not None:
        document.template = doc_in.template

    session.add(document)
    await session.commit()
    await session.refresh(document, attribute_names=["files", "collaborators"])
    return _to_document_read(document, role)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    # Deletion stays owner-only — collaborators, even writers, can't delete
    # the document out from under the owner.
    document, role = await _get_accessible_document(document_id, session, user)
    if role != "owner":
        raise HTTPException(
            status_code=403, detail="Only the owner can delete this document"
        )
    await session.delete(document)
    await session.commit()


@router.patch("/{document_id}/files/{file_id}", response_model=DocumentRead)
async def update_file(
    document_id: uuid.UUID,
    file_id: uuid.UUID,
    file_in: FileUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    file = await _get_owned_file(document_id, file_id, session, user)
    file.line_authors = _update_line_authors(
        file.content, file_in.content, file.line_authors, user.email
    )
    file.content = file_in.content
    session.add(file)
    await session.commit()

    document, role = await _get_accessible_document(document_id, session, user)
    return _to_document_read(document, role)


@router.post("/{document_id}/compile", status_code=status.HTTP_202_ACCEPTED)
async def compile_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, _role = await _get_accessible_document(
        document_id, session, user, require_write=True
    )

    main_file = next((f for f in document.files if f.name.endswith(".tex")), None)
    print(
        f"[compile] doc={document_id} template={document.template} "
        f"files={[(f.name, len(f.content)) for f in document.files]} "
        f"main_snippet={main_file.content[:200]!r}"
        if main_file
        else "no-main"
    )

    try:
        job_id = enqueue_compile_job(document.id, document.files, document.template)
    except CompilerError as e:
        raise HTTPException(status_code=500, detail=e.message)

    return {"job_id": job_id, "status": "queued"}


@router.post(
    "/{document_id}/duplicate",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
)
async def duplicate_document(
    document_id: uuid.UUID,
    payload: DocumentDuplicate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    # Duplicating creates a brand new document owned by the caller — a
    # reader/writer collaborator can do this too, they just end up owning
    # the copy (not the original).
    source, _role = await _get_accessible_document(document_id, session, user)
    target_template = payload.template or source.template

    new_document = Document(
        user_id=user.id,
        title=payload.title or f"{source.title} (copy)",
        template=target_template,
    )
    session.add(new_document)
    await session.flush()  # need new_document.id before creating child files

    source_files = [
        {"name": f.name, "language": f.language, "content": f.content}
        for f in source.files
    ]

    if target_template != source.template:
        source_files = migrate_files_to_template(source_files, target_template)

    for f in source_files:
        session.add(
            DocumentFile(
                document_id=new_document.id,
                name=f["name"],
                language=f["language"],
                content=f["content"],
                # line_authors intentionally left unset — content/attribution changed
            )
        )

    await session.commit()
    await session.refresh(new_document, attribute_names=["files", "collaborators"])
    return _to_document_read(new_document, "owner")

```


## src/features/texademia/schemas/document.py

```py
import uuid
from datetime import datetime

from pydantic import BaseModel
from enum import Enum
from pydantic import EmailStr


class CollaboratorRole(str, Enum):
    reader = "reader"
    writer = "writer"


class CollaboratorInvite(BaseModel):
    email: EmailStr
    role: CollaboratorRole = CollaboratorRole.reader


class CollaboratorRoleUpdate(BaseModel):
    role: CollaboratorRole


class CollaboratorRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email: str
    role: CollaboratorRole
    status: str

    model_config = {"from_attributes": True}


class InvitationRead(BaseModel):
    id: uuid.UUID  # collaborator row id
    document_id: uuid.UUID
    document_title: str
    role: CollaboratorRole
    invited_by_email: str


class LineAuthor(BaseModel):
    author: str
    edited_at: datetime


class FileRead(BaseModel):
    id: uuid.UUID
    name: str
    language: str
    content: str

    line_authors: list[LineAuthor] | None = None

    model_config = {"from_attributes": True}


class DocumentCreate(BaseModel):
    title: str = "Untitled"
    template: str = "default"


class DocumentRead(BaseModel):
    id: uuid.UUID
    title: str
    template: str
    created_at: datetime
    updated_at: datetime
    files: list[FileRead] = []
    pdf_url: str | None = None
    role: str = "owner"  #  "owner" | "writer" | "reader"
    collaborators: list[CollaboratorRead] = []

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    title: str | None = None
    template: str | None = None


class DocumentDuplicate(BaseModel):  # NEW
    template: str | None = None
    title: str | None = None


class FileUpdate(BaseModel):
    content: str


class CompileResponse(BaseModel):
    pdf_url: str

```


## src/features/texademia/services/compiler.py

```py
# src/features/texademia/services/compiler.py
import uuid
from pathlib import Path

import redis
from rq import Queue

from src.config.settings import settings
from src.features.texademia.models.document import (
    DocumentFile,
)

redis_conn = redis.from_url(settings.REDIS_URL)
compile_queue = Queue("latex_compile", connection=redis_conn)

OUTPUT_DIR = Path("compiled_pdfs")
OUTPUT_DIR.mkdir(exist_ok=True)


class CompileError(Exception):
    def __init__(self, message: str, log: str = ""):
        self.message = message
        self.log = log
        super().__init__(message)


def enqueue_compile_job(
    document_id: uuid.UUID, files: list[DocumentFile], template: str
) -> str:
    """
    Enqueues a compilation job and returns the job ID for polling.
    """
    files_data = [
        {"id": str(f.id), "name": f.name, "language": f.language, "content": f.content}
        for f in files
    ]

    from src.features.texademia.services.compiler_worker import compile_latex_job

    job = compile_queue.enqueue(
        compile_latex_job,
        str(document_id),
        files_data,
        template,
        job_timeout=180,
        result_ttl=3600,
    )
    return job.id


def get_job_status(job_id: str) -> dict:
    """Poll job status from Redis."""
    from rq.job import Job

    job = Job.fetch(job_id, connection=redis_conn)

    if job.is_finished:
        return {
            "status": "done",
            "result": job.result,
        }
    elif job.is_failed:
        meta = job.meta or {}
        return {
            "status": "error",
            "error": str(job.exc_info) if job.exc_info else "Unknown error",
            "log": meta.get("log", ""),
        }
    else:
        meta = job.meta or {}
        return {
            "status": meta.get("status", "queued"),
            "step": meta.get("step", "waiting"),
            "percent": meta.get("percent", 0),
            "message": meta.get("message", "Job is queued..."),
        }

```


## src/features/texademia/services/compiler_worker.py

```py
# src/features/texademia/services/compiler_worker.py
import os
import resource
import shutil
import subprocess
import tempfile
from pathlib import Path

import redis
from rq import get_current_job

from src.config.settings import settings
from src.features.texademia.assets import get_template_asset_files
from src.features.texademia.services.pubsub import publish_document_event

redis_conn = redis.from_url(settings.REDIS_URL)

OUTPUT_DIR = Path("compiled_pdfs")
OUTPUT_DIR.mkdir(exist_ok=True)

COMPILE_TIMEOUT_SECONDS = 60  # per pdflatex/bibtex invocation
MEMORY_LIMIT_BYTES = 768 * 1024 * 1024  # bumped a bit — 512MB was tight for real docs


class CompileError(Exception):
    def __init__(self, message: str, log: str = ""):
        self.message = message
        self.log = log
        super().__init__(message)


def _limit_memory():
    try:
        resource.setrlimit(resource.RLIMIT_AS, (MEMORY_LIMIT_BYTES, MEMORY_LIMIT_BYTES))
    except (ValueError, OSError):
        pass


def _run(cmd: list[str], cwd: Path, timeout: int) -> tuple[int, str]:
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        preexec_fn=_limit_memory,
    )
    try:
        stdout, _ = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        return -1, f"Command timed out after {timeout}s: {' '.join(cmd)}"
    return proc.returncode, stdout.decode(errors="replace")


def compile_latex_job(document_id: str, files_data: list[dict], template: str) -> dict:
    job = get_current_job()
    combined_log = []

    main_file = next((f for f in files_data if f["name"].endswith(".tex")), None)
    print(
        f"[worker] doc={document_id} template={template} "
        f"files={[(f['name'], len(f['content'])) for f in files_data]} "
        f"main_snippet={main_file['content'][:200]!r}"
        if main_file
        else "no-main"
    )

    def update_progress(step: str, percent: int, message: str = ""):
        if job:
            job.meta = {
                "status": "running",
                "step": step,
                "percent": percent,
                "message": message,
            }
            job.save_meta()

    def fail(message: str):
        full_log = "\n\n".join(combined_log)
        if job:
            job.meta = {**(job.meta or {}), "log": full_log}
            job.save_meta()
        publish_document_event(
            document_id,
            {
                "type": "compile:update",
                "phase": "error",
                "error": message,
                "log": full_log,
            },
        )
        raise CompileError(message, log=full_log)

    update_progress("preparing", 10, "Setting up compilation environment")

    if not shutil.which("pdflatex"):
        fail("pdflatex is not installed.")

    main_file = next((f for f in files_data if f["name"].endswith(".tex")), None)
    if main_file is None:
        fail("No .tex file found.")

    main_stem = Path(main_file["name"]).stem
    has_bib = any(f["name"].endswith(".bib") for f in files_data)

    os.environ.setdefault("TMPDIR", "/var/tmp")

    with tempfile.TemporaryDirectory(dir="/var/tmp") as tmp:
        tmp_path = Path(tmp)

        update_progress("copying", 15, "Copying template assets")
        for asset in get_template_asset_files(template):
            shutil.copy(asset, tmp_path / asset.name)

        update_progress("writing", 20, "Writing source files")
        for f in files_data:
            (tmp_path / f["name"]).write_text(f["content"], encoding="utf-8")

        pdflatex_cmd = [
            "pdflatex",
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-no-shell-escape",
            main_file["name"],
        ]

        update_progress("compiling", 35, "Running pdflatex (pass 1)")
        rc, log = _run(pdflatex_cmd, tmp_path, COMPILE_TIMEOUT_SECONDS)
        combined_log.append(f"--- pdflatex pass 1 ---\n{log}")
        if rc != 0:
            fail("LaTeX compilation failed on first pass.")

        if has_bib:
            update_progress("bibliography", 55, "Running bibtex")
            rc, log = _run(["bibtex", main_stem], tmp_path, COMPILE_TIMEOUT_SECONDS)
            combined_log.append(f"--- bibtex ---\n{log}")
            # bibtex returns nonzero on warnings too, so don't hard-fail here —
            # only bail if it clearly couldn't run at all.
            if rc != 0 and "I found no" not in log and "I couldn't open" not in log:
                pass  # keep going; pdflatex passes below will surface real issues

            update_progress("compiling", 70, "Running pdflatex (pass 2)")
            rc, log = _run(pdflatex_cmd, tmp_path, COMPILE_TIMEOUT_SECONDS)
            combined_log.append(f"--- pdflatex pass 2 ---\n{log}")
            if rc != 0:
                fail("LaTeX compilation failed after bibtex.")

            update_progress("compiling", 85, "Running pdflatex (pass 3)")
            rc, log = _run(pdflatex_cmd, tmp_path, COMPILE_TIMEOUT_SECONDS)
            combined_log.append(f"--- pdflatex pass 3 ---\n{log}")
            if rc != 0:
                fail("LaTeX compilation failed on final pass.")

        pdf_path = tmp_path / f"{main_stem}.pdf"
        if not pdf_path.exists():
            fail("Compilation finished but no PDF was produced.")

        update_progress("saving", 95, "Saving PDF output")
        dest_path = OUTPUT_DIR / f"{document_id}.pdf"
        shutil.copyfile(pdf_path, dest_path)

    full_log = "\n\n".join(combined_log)
    update_progress("done", 100, "Compilation complete")

    publish_document_event(
        document_id,
        {
            "type": "compile:update",
            "phase": "done",
            "pdfUrl": f"/static/compiled/{document_id}.pdf",
        },
    )
    return {
        "status": "success",
        "pdf_url": f"/static/compiled/{document_id}.pdf",
        "log": full_log,
    }

```


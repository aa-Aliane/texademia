# Tree View:
```
backend
└── src
    └── features
        └── texademia
            ├── models
            │   └── document.py
            ├── routers
            │   └── documents.py
            └── services
                └── versioning.py

```

# Content:

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


class VersionTrigger(str, enum.Enum):
    compile = "compile"
    idle = "idle"
    restore = "restore"


class DocumentFileVersion(SQLModel, table=True):
    __tablename__ = "document_file_versions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    file_id: uuid.UUID = Field(
        foreign_key="document_files.id", nullable=False, index=True
    )

    # ADD THIS LINE:
    commit_id: uuid.UUID = Field(
        foreign_key="document_versions.id", nullable=False, index=True
    )

    created_at: datetime = Field(
        default_factory=datetime.utcnow, nullable=False, index=True
    )
    trigger: VersionTrigger = Field(default=VersionTrigger.idle, nullable=False)
    author: str = Field(nullable=False)
    reverse_patch: str = Field(nullable=False)

    file: "DocumentFile" = Relationship(back_populates="versions")
    commit: "DocumentVersion" = Relationship(back_populates="file_versions")


class DocumentVersion(SQLModel, table=True):
    """A 'commit' — groups the file-level diffs made in one compile/idle/restore event."""

    __tablename__ = "document_versions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(
        foreign_key="documents.id", nullable=False, index=True
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow, nullable=False, index=True
    )
    trigger: VersionTrigger = Field(default=VersionTrigger.idle, nullable=False)
    author: str = Field(nullable=False)

    document: "Document" = Relationship(back_populates="versions")
    file_versions: List["DocumentFileVersion"] = Relationship(
        back_populates="commit",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
    )


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

    versions: List["DocumentVersion"] = Relationship(
        back_populates="document",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
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

    # snapshot of content at the last checkpoint — lets us diff cheaply
    # without re-reading version history
    last_checkpoint_content: str | None = Field(default=None)

    versions: List["DocumentFileVersion"] = Relationship(
        back_populates="file",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "lazy": "selectin",
            "order_by": "DocumentFileVersion.created_at.desc()",
        },
    )


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
    DocumentFileVersion,
    VersionTrigger,
)
from src.features.texademia.schemas.document import (
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    DocumentDuplicate,
    FileUpdate,
    FileRead,
    CollaboratorRead,
    DocumentVersionRead,
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

from src.features.texademia.services.versioning import (
    create_document_checkpoint,
    reconstruct_document_at,
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
                last_checkpoint_content=tf["content"],
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

    commit = create_document_checkpoint(
        session, document, VersionTrigger.compile, user.email
    )
    if commit:
        await session.commit()

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
                last_checkpoint_content=f["content"],
            )
        )

    await session.commit()
    await session.refresh(new_document, attribute_names=["files", "collaborators"])
    return _to_document_read(new_document, "owner")


@router.post("/{document_id}/checkpoint", status_code=status.HTTP_204_NO_CONTENT)
async def checkpoint_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """Called by the frontend after an idle-edit debounce window."""
    document, _role = await _get_accessible_document(
        document_id, session, user, require_write=True
    )
    commit = create_document_checkpoint(
        session, document, VersionTrigger.idle, user.email
    )
    if commit:
        await session.commit()


@router.get("/{document_id}/versions", response_model=List[DocumentVersionRead])
async def list_document_versions(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, _role = await _get_accessible_document(document_id, session, user)
    commits = sorted(document.versions, key=lambda c: c.created_at, reverse=True)
    file_names_by_id = {f.id: f.name for f in document.files}
    return [
        DocumentVersionRead(
            id=c.id,
            created_at=c.created_at,
            trigger=c.trigger,
            author=c.author,
            files_changed=[
                file_names_by_id.get(v.file_id, "unknown") for v in c.file_versions
            ],
        )
        for c in commits
    ]


@router.post(
    "/{document_id}/versions/{version_id}/restore", response_model=DocumentRead
)
async def restore_document_version(
    document_id: uuid.UUID,
    version_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, role = await _get_accessible_document(
        document_id, session, user, require_write=True
    )

    if not any(c.id == version_id for c in document.versions):
        raise HTTPException(status_code=404, detail="Version not found")

    restored = reconstruct_document_at(document, version_id)

    # snapshot the pre-restore state as its own commit, so restoring is itself undoable
    pre_restore = create_document_checkpoint(
        session, document, VersionTrigger.restore, user.email
    )
    if pre_restore:
        session.add(pre_restore)

    for f in document.files:
        new_content = restored[f.id]
        if new_content != f.content:
            f.line_authors = _update_line_authors(
                f.content, new_content, f.line_authors, f"{user.email} (restore)"
            )
            f.content = new_content
        f.last_checkpoint_content = new_content
        session.add(f)

    await session.commit()
    await session.refresh(document, attribute_names=["files", "collaborators"])
    return _to_document_read(document, role)

```


## src/features/texademia/services/versioning.py

```py
# src/features/texademia/services/versioning.py
import uuid
from datetime import datetime
from diff_match_patch import diff_match_patch
from sqlmodel.ext.asyncio.session import AsyncSession

from src.features.texademia.models.document import (
    Document,
    DocumentFile,
    DocumentFileVersion,
    DocumentVersion,
    VersionTrigger,
)

_dmp = diff_match_patch()


def create_document_checkpoint(
    session: AsyncSession, document: Document, trigger: VersionTrigger, author: str
) -> DocumentVersion | None:
    """
    Creates one commit for the whole document, containing a reverse-patch
    entry for every file whose content changed since its own last checkpoint.
    Files with no changes are simply omitted from the commit — same as a
    git commit only touching a subset of files. Returns None (no commit
    created) if nothing changed anywhere.
    """
    now = datetime.utcnow()
    pending: list[tuple[DocumentFile, str]] = []

    for f in document.files:
        baseline = (
            f.last_checkpoint_content
            if f.last_checkpoint_content is not None
            else f.content
        )
        if baseline == f.content:
            continue
        patches = _dmp.patch_make(f.content, baseline)
        pending.append((f, _dmp.patch_toText(patches)))

    if not pending:
        return None

    commit = DocumentVersion(
        document_id=document.id, trigger=trigger, author=author, created_at=now
    )
    session.add(commit)

    for f, reverse_patch in pending:
        version = DocumentFileVersion(
            file_id=f.id,
            commit_id=commit.id,  # id is client-generated (uuid4 default_factory), safe pre-flush
            trigger=trigger,
            author=author,
            reverse_patch=reverse_patch,
            created_at=now,
        )
        f.last_checkpoint_content = f.content
        session.add(version)
        session.add(f)

    return commit


def reconstruct_document_at(
    document: Document, target_commit_id: uuid.UUID
) -> dict[uuid.UUID, str]:
    """
    Returns {file_id: content} reconstructing every file's content as it was
    right after `target_commit_id` was made — i.e. undoing every commit
    strictly newer than the target, per file, using each file's own
    reverse-patch chain.
    """
    commits_desc = sorted(document.versions, key=lambda c: c.created_at, reverse=True)
    target_index = next(
        (i for i, c in enumerate(commits_desc) if c.id == target_commit_id), None
    )
    if target_index is None:
        raise ValueError("Commit not found for this document")

    newer_commit_ids = {c.id for c in commits_desc[:target_index]}

    result: dict[uuid.UUID, str] = {}
    for f in document.files:
        content = f.content
        file_versions = sorted(
            [v for v in f.versions if v.commit_id in newer_commit_ids],
            key=lambda v: v.created_at,
            reverse=True,
        )
        for v in file_versions:
            patches = _dmp.patch_fromText(v.reverse_patch)
            content, results = _dmp.patch_apply(patches, content)
            if not all(results):
                raise ValueError(
                    f"Patch failed to apply cleanly for version {v.id} (file {f.id})"
                )
        result[f.id] = content

    return result

```


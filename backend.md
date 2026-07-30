# Tree View:
```
backend
└── src
    ├── config
    │   └── settings.py
    ├── database
    │   ├── base.py
    │   └── session.py
    ├── features
    │   └── texademia
    │       ├── models
    │       │   ├── document.py
    │       │   └── profile.py
    │       ├── router.py
    │       ├── routers
    │       │   ├── collaborators.py
    │       │   ├── compile.py
    │       │   ├── documents.py
    │       │   ├── profile.py
    │       │   └── websocket.py
    │       ├── schemas
    │       │   ├── document.py
    │       │   └── profile.py
    │       └── services
    │           ├── compiler.py
    │           ├── compiler_worker.py
    │           ├── preable_merger.py
    │           ├── pubsub.py
    │           └── template_migrator.py
    └── main.py

```

# Content:

## src/config/settings.py

```py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 7 * 24 * 60  # 7 days
    REDIS_URL: str = "redis://redis:6379/0"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

```


## src/database/base.py

```py
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

```


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


## src/features/texademia/models/profile.py

```py
import uuid
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.features.auth.models import User


class Profile(SQLModel, table=True):
    __tablename__ = "profiles"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True, nullable=False)

    headline: str | None = Field(default=None, nullable=True)
    bio: str | None = Field(default=None, nullable=True)
    picture_url: str | None = Field(default=None, nullable=True)
    phone_number: str | None = Field(default=None, nullable=True)
    location: str | None = Field(default=None, nullable=True)
    driving_license: str | None = Field(default=None, nullable=True)
    linkedin_url: str | None = Field(default=None, nullable=True)
    github_url: str | None = Field(default=None, nullable=True)
    website_url: str | None = Field(default=None, nullable=True)
    tier: str = Field(default="Free", nullable=False)

    user: "User" = Relationship(back_populates="profile")

```


## src/features/texademia/router.py

```py
from fastapi import APIRouter
from .routers import (
    profile_router,
    documents_router,
    compile_router,
    collaborators_router,
    websocket_router,
)

router = APIRouter()

router.include_router(profile_router)
router.include_router(documents_router)
router.include_router(compile_router)
router.include_router(collaborators_router)
router.include_router(websocket_router)

```


## src/features/texademia/routers/collaborators.py

```py
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.session import get_db
from src.features.auth.models import User
from src.features.auth.router import current_active_user
from src.features.texademia.models.document import (
    Document,
    DocumentCollaborator,
    CollaboratorStatus,
)
from src.features.texademia.schemas.document import (
    CollaboratorInvite,
    CollaboratorRoleUpdate,
    CollaboratorRead,
    InvitationRead,
)
from .documents import _get_accessible_document

router = APIRouter(tags=["collaborators"])


@router.post(
    "/documents/{document_id}/collaborators",
    response_model=CollaboratorRead,
    status_code=status.HTTP_201_CREATED,
)
async def invite_collaborator(
    document_id: uuid.UUID,
    payload: CollaboratorInvite,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, role = await _get_accessible_document(document_id, session, user)
    if role != "owner":
        raise HTTPException(403, "Only the owner can invite collaborators")

    result = await session.exec(select(User).where(User.email == payload.email))
    invitee = result.first()
    if not invitee:
        raise HTTPException(404, "No user with that email")
    if invitee.id == user.id:
        raise HTTPException(400, "You can't invite yourself")

    existing = await session.exec(
        select(DocumentCollaborator).where(
            DocumentCollaborator.document_id == document_id,
            DocumentCollaborator.user_id == invitee.id,
        )
    )
    if existing.first():
        raise HTTPException(400, "This user is already invited")

    collab = DocumentCollaborator(
        document_id=document_id,
        user_id=invitee.id,
        role=payload.role,
        invited_by_id=user.id,
    )
    session.add(collab)
    await session.commit()
    return CollaboratorRead(
        id=collab.id,
        user_id=invitee.id,
        email=invitee.email,
        role=collab.role,
        status=collab.status,
    )


@router.patch(
    "/documents/{document_id}/collaborators/{collaborator_id}",
    response_model=CollaboratorRead,
)
async def update_collaborator_role(
    document_id: uuid.UUID,
    collaborator_id: uuid.UUID,
    payload: CollaboratorRoleUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, role = await _get_accessible_document(document_id, session, user)
    if role != "owner":
        raise HTTPException(403, "Only the owner can change roles")
    collab = next((c for c in document.collaborators if c.id == collaborator_id), None)
    if not collab:
        raise HTTPException(404, "Collaborator not found")
    collab.role = payload.role
    session.add(collab)
    await session.commit()
    return CollaboratorRead(
        id=collab.id,
        user_id=collab.user_id,
        email=collab.user.email,
        role=collab.role,
        status=collab.status,
    )


@router.delete(
    "/documents/{document_id}/collaborators/{collaborator_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_collaborator(
    document_id: uuid.UUID,
    collaborator_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, role = await _get_accessible_document(document_id, session, user)
    collab = next((c for c in document.collaborators if c.id == collaborator_id), None)
    if not collab:
        raise HTTPException(404, "Collaborator not found")
    # owner can remove anyone; a collaborator can remove themself (= "leave")
    if role != "owner" and collab.user_id != user.id:
        raise HTTPException(403, "Not allowed")
    await session.delete(collab)
    await session.commit()


@router.get("/invitations", response_model=list[InvitationRead])
async def list_pending_invitations(
    session: AsyncSession = Depends(get_db), user: User = Depends(current_active_user)
):
    statement = select(DocumentCollaborator).where(
        DocumentCollaborator.user_id == user.id,
        DocumentCollaborator.status == CollaboratorStatus.pending,
    )
    result = await session.exec(statement)
    invites = result.all()
    out = []
    for c in invites:
        doc = await session.get(Document, c.document_id)
        inviter = await session.get(User, c.invited_by_id)
        out.append(
            InvitationRead(
                id=c.id,
                document_id=c.document_id,
                document_title=doc.title,
                role=c.role,
                invited_by_email=inviter.email,
            )
        )
    return out


@router.post(
    "/invitations/{collaborator_id}/accept", status_code=status.HTTP_204_NO_CONTENT
)
async def accept_invitation(
    collaborator_id: uuid.UUID,
    session=Depends(get_db),
    user=Depends(current_active_user),
):
    collab = await session.get(DocumentCollaborator, collaborator_id)
    if not collab or collab.user_id != user.id:
        raise HTTPException(404, "Invitation not found")
    collab.status = CollaboratorStatus.accepted
    session.add(collab)
    await session.commit()


@router.post(
    "/invitations/{collaborator_id}/decline", status_code=status.HTTP_204_NO_CONTENT
)
async def decline_invitation(
    collaborator_id: uuid.UUID,
    session=Depends(get_db),
    user=Depends(current_active_user),
):
    collab = await session.get(DocumentCollaborator, collaborator_id)
    if not collab or collab.user_id != user.id:
        raise HTTPException(404, "Invitation not found")
    await session.delete(collab)
    await session.commit()

```


## src/features/texademia/routers/compile.py

```py
from fastapi import APIRouter, Depends
from src.features.auth.models import User
from src.features.texademia.services.compiler import get_job_status
from src.features.auth.router import current_active_user

router = APIRouter(prefix="/compile", tags=["compile"])


@router.get("/{job_id}")
async def poll_compile_status(job_id: str, user: User = Depends(current_active_user)):
    return get_job_status(job_id)

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


## src/features/texademia/routers/profile.py

```py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.session import get_db
from src.features.auth.models import User
from src.features.auth.router import current_active_user

from src.features.texademia.models.profile import Profile
from src.features.texademia.schemas.profile import ProfileCreate, ProfileRead, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("", response_model=ProfileRead)
async def get_profile(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user)
):
    statement = select(Profile).where(Profile.user_id == user.id)
    result = await session.exec(statement)
    profile = result.first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.post("", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_in: ProfileCreate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user)
):
    # Check if profile already exists
    statement = select(Profile).where(Profile.user_id == user.id)
    result = await session.exec(statement)
    if result.first():
        raise HTTPException(status_code=400, detail="Profile already exists")

    db_profile = Profile(**profile_in.model_dump(), user_id=user.id)
    session.add(db_profile)
    await session.commit()
    await session.refresh(db_profile)
    return db_profile

@router.patch("", response_model=ProfileRead)
async def update_profile(
    profile_in: ProfileUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user)
):
    statement = select(Profile).where(Profile.user_id == user.id)
    result = await session.exec(statement)
    db_profile = result.first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = profile_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_profile, key, value)

    session.add(db_profile)
    await session.commit()
    await session.refresh(db_profile)
    return db_profile

```


## src/features/texademia/routers/websocket.py

```py
import asyncio
import json
import uuid

from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    Depends,
    HTTPException,
    status,
)
from redis.asyncio import Redis

from src.config.settings import settings
from src.database.session import get_db
from src.features.auth.manager import access_backend, get_user_manager
from .documents import _get_accessible_document

router = APIRouter(tags=["websocket"])

_async_redis: Redis | None = None

PING_INTERVAL_SECONDS = 20


def get_async_redis() -> Redis:
    global _async_redis
    if _async_redis is None:
        _async_redis = Redis.from_url(settings.REDIS_URL)
    return _async_redis


@router.websocket("/ws/documents/{document_id}")
async def document_socket(
    websocket: WebSocket,
    document_id: uuid.UUID,
    session=Depends(get_db),
    user_manager=Depends(get_user_manager),
):
    token = websocket.cookies.get("auth_token")
    if not token:
        print(f"[ws] rejected: no auth_token cookie, doc={document_id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    strategy = access_backend.get_strategy()
    user = await strategy.read_token(token, user_manager)
    if user is None or not user.is_active:
        print(f"[ws] rejected: invalid/inactive user, doc={document_id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        await _get_accessible_document(document_id, session, user)
    except HTTPException:
        print(f"[ws] rejected: user={user.email} has no access to doc={document_id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    print(f"[ws] connected: user={user.email} doc={document_id}")

    redis = get_async_redis()
    channel_name = f"document:{document_id}"
    pubsub = redis.pubsub()
    await pubsub.subscribe(channel_name)
    print(f"[ws] subscribed: user={user.email} channel={channel_name}")

    async def relay_from_redis():
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            data = message["data"]
            text = data.decode() if isinstance(data, bytes) else data
            try:
                await websocket.send_text(text)
            except Exception as e:
                print(f"[ws] send_text failed for user={user.email}: {e}")
                raise

    async def relay_from_client():
        while True:
            raw = await websocket.receive_text()
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = payload.get("type")

            if msg_type == "presence":
                payload["userId"] = str(user.id)
                payload["name"] = user.first_name or user.email
                payload["email"] = user.email
                await redis.publish(channel_name, json.dumps(payload))

            elif msg_type == "cursor":
                payload["userId"] = str(user.id)
                payload["name"] = user.first_name or user.email
                payload["email"] = user.email
                await redis.publish(channel_name, json.dumps(payload))

            elif msg_type == "pong":
                # Client's reply to our keepalive ping — nothing to do,
                # just proves the round trip is alive.
                pass

    async def send_pings():
        # App-level keepalive. This matters most during long-running work
        # elsewhere in the system (e.g. a compile job saturating CPU on a
        # shared host) — it guarantees outbound traffic on this socket at a
        # fixed cadence so idle-timeout proxies/load balancers don't reap it,
        # independent of how busy the rest of the stack is.
        while True:
            await asyncio.sleep(PING_INTERVAL_SECONDS)
            try:
                await websocket.send_text(json.dumps({"type": "ping"}))
            except Exception as e:
                print(f"[ws] ping failed for user={user.email}: {e}")
                raise

    redis_task = asyncio.create_task(relay_from_redis())
    client_task = asyncio.create_task(relay_from_client())
    ping_task = asyncio.create_task(send_pings())

    try:
        done, pending = await asyncio.wait(
            {redis_task, client_task, ping_task}, return_when=asyncio.FIRST_COMPLETED
        )
        for task in done:
            if task.exception():
                print(
                    f"[ws] task ended with exception, user={user.email}: {task.exception()!r}"
                )
    except WebSocketDisconnect:
        print(f"[ws] client disconnected: user={user.email} doc={document_id}")
    finally:
        print(f"[ws] cleaning up: user={user.email} doc={document_id}")
        redis_task.cancel()
        client_task.cancel()
        ping_task.cancel()
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()

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


## src/features/texademia/schemas/profile.py

```py
from pydantic import BaseModel


class ProfileRead(BaseModel):
    headline: str | None = None
    bio: str | None = None
    picture_url: str | None = None
    phone_number: str | None = None
    location: str | None = None
    driving_license: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    website_url: str | None = None
    tier: str

    model_config = {"from_attributes": True}


class ProfileCreate(BaseModel):
    headline: str | None = None
    bio: str | None = None
    picture_url: str | None = None
    phone_number: str | None = None
    location: str | None = None
    driving_license: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    website_url: str | None = None
    tier: str = "Free"


class ProfileUpdate(BaseModel):
    headline: str | None = None
    bio: str | None = None
    picture_url: str | None = None
    phone_number: str | None = None
    location: str | None = None
    driving_license: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    website_url: str | None = None

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


## src/features/texademia/services/preable_merger.py

```py
# src/features/texademia/services/preamble_merger.py
import re

# Commands that accumulate — safe to merge/union across preambles
ACCUMULATOR_PATTERNS = {
    "usepackage": re.compile(
        r"\\usepackage(?:\[(?P<opts>[^\]]*)\])?\{(?P<name>[^}]+)\}"
    ),
    "usetikzlibrary": re.compile(r"\\usetikzlibrary\{(?P<name>[^}]+)\}"),
    "newcommand": re.compile(r"\\(?:re)?newcommand\{?\\(?P<name>[a-zA-Z]+)\}?"),
}

# Packages where the TARGET template's version should always win
# (they usually set document geometry/typography and conflict if duplicated)
TEMPLATE_OWNED_PACKAGES = {
    "geometry",
    "hyperref",
    "fontenc",
    "inputenc",
    "times",
    "natbib",
    "lineno",
    "caption",
}


def _extract_preamble(tex: str) -> str:
    match = re.search(r"(.*?)\\begin\{document\}", tex, re.DOTALL)
    return match.group(1) if match else tex


def _parse_packages(preamble: str) -> dict[str, str | None]:
    """Returns {package_name: options_or_None} preserving order via insertion."""
    pkgs = {}
    for m in ACCUMULATOR_PATTERNS["usepackage"].finditer(preamble):
        name = m.group("name").strip()
        # \usepackage{a,b,c} form -> split
        for single in [n.strip() for n in name.split(",")]:
            pkgs[single] = m.group("opts")
    return pkgs


def _parse_tikz_libraries(preamble: str) -> set[str]:
    libs = set()
    for m in ACCUMULATOR_PATTERNS["usetikzlibrary"].finditer(preamble):
        for lib in m.group("name").split(","):
            libs.add(lib.strip())
    return libs


def merge_preambles(source_tex: str, target_preamble: str) -> str:
    """
    source_tex: full .tex of the ORIGINAL document (e.g. arxiv version)
    target_preamble: preamble of the TARGET template (e.g. acl.sty-based main.tex),
                      including everything up to (not including) \\begin{document}

    Returns the merged preamble to use in the duplicated/converted document.
    """
    source_preamble = _extract_preamble(source_tex)

    source_pkgs = _parse_packages(source_preamble)
    target_pkgs = _parse_packages(target_preamble)

    source_tikz_libs = _parse_tikz_libraries(source_preamble)
    target_tikz_libs = _parse_tikz_libraries(target_preamble)
    missing_tikz_libs = source_tikz_libs - target_tikz_libs

    merged = target_preamble.rstrip()

    # 1. Add tikz libraries the source needed but target doesn't have
    if missing_tikz_libs:
        # only add if tikz itself is loaded somewhere (target or source)
        if "tikz" in target_pkgs or "tikz" in source_pkgs:
            merged += "\n\\usetikzlibrary{" + ",".join(sorted(missing_tikz_libs)) + "}"

    # 2. Add any package the source had that target doesn't, and that
    #    isn't one of the template-owned/conflicting ones
    for pkg, opts in source_pkgs.items():
        if pkg in target_pkgs:
            continue
        if pkg in TEMPLATE_OWNED_PACKAGES:
            continue
        line = (
            f"\\usepackage{{{pkg}}}" if not opts else f"\\usepackage[{opts}]{{{pkg}}}"
        )
        merged += f"\n{line}"

    # 3. Carry over any custom \newcommand / \renewcommand macros the body relies on
    for m in ACCUMULATOR_PATTERNS["newcommand"].finditer(source_preamble):
        macro_name = m.group("name")
        if f"\\{macro_name}" not in target_preamble:
            # grab the full line so we keep the definition, not just the name
            line_match = re.search(
                rf"\\(?:re)?newcommand\{{?\\{macro_name}\}}?.*", source_preamble
            )
            if line_match:
                merged += f"\n{line_match.group(0)}"

    return merged

```


## src/features/texademia/services/pubsub.py

```py
import json
import redis
from src.config.settings import settings

redis_conn = redis.from_url(settings.REDIS_URL)


def publish_document_event(document_id: str, event: dict) -> None:
    try:
        result = redis_conn.publish(f"document:{document_id}", json.dumps(event))
        print(f"[pubsub] published to document:{document_id}, {result} subscriber(s)")
    except redis.RedisError as e:
        print(f"[pubsub] FAILED to publish: {e}")

```


## src/features/texademia/services/template_migrator.py

```py
# src/features/texademia/services/template_migrator.py
import re
from src.features.texademia.templates import (
    get_template_files,
    TEMPLATE_NAMES,
)  # CHANGED

_BEGIN_DOC_RE = re.compile(r"\\begin\{document\}")
_END_DOC_RE = re.compile(r"\\end\{document\}")
_USEPACKAGE_RE = re.compile(r"\\usepackage(?:\[[^\]]*\])?\{([^}]*)\}")
_USETIKZLIBRARY_RE = re.compile(r"\\usetikzlibrary\{([^}]*)\}")
_NEWCOMMAND_START_RE = re.compile(r"\\newcommand\*?")

# Fallback for commands that only exist in specific templates' .sty files
# (e.g. arxiv.sty's \keywords). \providecommand is a no-op if the target
# template already defines it. \keywords splits its argument on \and, so
# \and is locally redefined inside a group before expanding #1.
_COMPAT_SHIM = "\\providecommand{\\keywords}[1]{{\\def\\and{, }\\par\\noindent\\textbf{Keywords:} #1\\par}}\n"

_CONFLICTING_PACKAGES = {"authblk", "achemso", "elsarticle"}

# --- body overflow fix (NEW) -------------------------------------------------
_INCLUDEGRAPHICS_RE = re.compile(r"\\includegraphics(\[[^\]]*\])?\{([^}]*)\}")
_ENV_BLOCK_RE = re.compile(r"\\begin\{(figure\*?|table\*?)\}.*?\\end\{\1\}", re.DOTALL)
# Any of these are "raw content" environments that can silently keep the
# source template's wider sizing (a fixed-width tabular, or a tikzpicture
# built with absolute node/coordinate widths) — both get wrapped in
# \resizebox the same way, since resizebox works on arbitrary box content,
# not just tables.
_CONTENT_ENV_RE = re.compile(r"\\begin\{(tabular\*?|tikzpicture)\}")
_ALREADY_WRAPPED_RE = re.compile(r"\\(resizebox|adjustbox)")
# -----------------------------------------------------------------------------


def _split_preamble(tex_source: str) -> tuple[str, str]:
    """(everything before \\begin{document}, everything from \\begin{document} onward)."""
    match = _BEGIN_DOC_RE.search(tex_source)
    if not match:
        return tex_source, ""
    return tex_source[: match.start()], tex_source[match.start() :]


def _extract_body(tex_source: str) -> str:
    """Content strictly between \\begin{document} and \\end{document}."""
    begin = _BEGIN_DOC_RE.search(tex_source)
    end = _END_DOC_RE.search(tex_source)
    if not begin or not end or end.start() < begin.end():
        return tex_source
    return tex_source[begin.end() : end.start()]


def _package_names(preamble: str) -> set[str]:
    names: set[str] = set()
    for m in _USEPACKAGE_RE.finditer(preamble):
        names.update(pkg.strip() for pkg in m.group(1).split(","))
    return names


def _tikz_library_names(preamble: str) -> set[str]:
    names: set[str] = set()
    for m in _USETIKZLIBRARY_RE.finditer(preamble):
        names.update(lib.strip() for lib in m.group(1).split(","))
    return names


def _extra_usepackage_lines(source_preamble: str, target_preamble: str) -> list[str]:
    target_pkgs = _package_names(target_preamble)
    lines = []
    for m in _USEPACKAGE_RE.finditer(source_preamble):
        pkgs = {p.strip() for p in m.group(1).split(",")}
        if pkgs & TEMPLATE_NAMES:
            continue
        if pkgs & _CONFLICTING_PACKAGES:  # NEW
            continue
        if pkgs & target_pkgs:
            continue
        lines.append(m.group(0))
    return lines


def _extra_tikzlibrary_line(source_preamble: str, target_preamble: str) -> str | None:
    """
    Union any \\usetikzlibrary{...} entries from the source that the target
    template doesn't already load. Without this, a body that relies on e.g.
    `right=of <node>` positioning syntax will compile fine in its original
    template but fatally error after conversion, since that syntax silently
    depends on `\\usetikzlibrary{positioning}` being loaded somewhere.
    """
    source_libs = _tikz_library_names(source_preamble)
    if not source_libs:
        return None
    target_libs = _tikz_library_names(target_preamble)
    missing = source_libs - target_libs
    if not missing:
        return None
    return "\\usetikzlibrary{" + ",".join(sorted(missing)) + "}"


def _find_balanced_brace(text: str, brace_start: int) -> str:
    """text[brace_start] must be '{'; return its content up to the matching '}'."""
    depth = 0
    for i in range(brace_start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[brace_start + 1 : i]
    return text[brace_start + 1 :]  # unbalanced — best effort


def _extract_command_arg(text: str, command: str) -> str | None:
    """Find \\command[...]{...} (options optional) and return the {...} content."""
    m = re.search(r"\\" + re.escape(command) + r"(?:\[[^\]]*\])?\s*\{", text)
    if not m:
        return None
    return _find_balanced_brace(text, m.end() - 1)


def _replace_command_arg(preamble: str, command: str, new_arg: str) -> str:
    """Replace an existing \\command{...} argument, or append a fresh \\command{...} if missing."""
    m = re.search(r"\\" + re.escape(command) + r"(?:\[[^\]]*\])?\s*\{", preamble)
    if not m:
        return preamble + f"\\{command}{{{new_arg}}}\n"
    brace_start = m.end() - 1
    old_arg = _find_balanced_brace(preamble, brace_start)
    return (
        preamble[: brace_start + 1]
        + new_arg
        + preamble[brace_start + 1 + len(old_arg) :]
    )


def _parse_newcommands(preamble: str) -> list[tuple[str, str]]:  # NEW
    """
    Returns [(command_name, full_definition_text), ...] for each
    \\newcommand/\\renewcommand found in the preamble. Handles both
    \\newcommand{\\foo}... and \\newcommand\\foo... forms, plus optional
    [nargs] and [default] specs before the body brace group.
    """
    results = []
    for m in _NEWCOMMAND_START_RE.finditer(preamble):
        start = m.start()
        pos = m.end()
        while pos < len(preamble) and preamble[pos].isspace():
            pos += 1

        name = None
        if pos < len(preamble) and preamble[pos] == "{":
            arg = _find_balanced_brace(preamble, pos)
            name = arg.lstrip("\\").strip()
            pos += len(arg) + 2
        elif pos < len(preamble) and preamble[pos] == "\\":
            name_match = re.match(r"\\([a-zA-Z]+)", preamble[pos:])
            if name_match:
                name = name_match.group(1)
                pos += name_match.end()

        if name is None:
            continue

        while pos < len(preamble) and preamble[pos].isspace():
            pos += 1
        # skip up to two optional [...] groups: [nargs] and [default]
        for _ in range(2):
            if pos < len(preamble) and preamble[pos] == "[":
                close = preamble.find("]", pos)
                if close == -1:
                    break
                pos = close + 1
                while pos < len(preamble) and preamble[pos].isspace():
                    pos += 1
            else:
                break

        if pos >= len(preamble) or preamble[pos] != "{":
            continue  # not a brace-bodied definition — skip, best effort

        body = _find_balanced_brace(preamble, pos)
        end = pos + len(body) + 2
        results.append((name, preamble[start:end]))
    return results


def _extra_newcommand_lines(
    source_preamble: str, target_preamble: str
) -> list[str]:  # NEW
    """
    Carry over custom \\newcommand/\\renewcommand macros the body relies on
    (e.g. a \\best{} helper used to bold the top score in a results table)
    that the target template doesn't already define. Without this, swapping
    templates silently drops any macro the original author defined for their
    own body content, and the body fails with 'Undefined control sequence'.
    """
    target_names = {name for name, _ in _parse_newcommands(target_preamble)}
    target_names.add("keywords")  # already covered by _COMPAT_SHIM

    lines = []
    seen = set()
    for name, definition in _parse_newcommands(source_preamble):
        if name in target_names or name in seen:
            continue
        seen.add(name)
        lines.append(definition)
    return lines


def _target_width_macro(env_name: str) -> str:  # NEW
    """Starred (spanning) envs get \\textwidth; single-column envs get \\columnwidth."""
    return "\\textwidth" if env_name.endswith("*") else "\\columnwidth"


def _fix_includegraphics_widths(block: str, width_macro: str) -> str:  # NEW
    def _replace(m: re.Match) -> str:
        opts, path = m.group(1) or "", m.group(2)
        # Already relative to the right thing (columnwidth/linewidth/textwidth) — leave it.
        if opts and re.search(r"width\s*=\s*\\(column|line|text)width", opts):
            return m.group(0)
        if not opts:
            return f"\\includegraphics[width={width_macro}]{{{path}}}"
        if "width=" in opts:
            opts = re.sub(r"width\s*=\s*[^,\]]+", f"width={width_macro}", opts)
        else:
            opts = opts[:-1] + f",width={width_macro}]"
        return f"\\includegraphics{opts}{{{path}}}"

    return _INCLUDEGRAPHICS_RE.sub(_replace, block)


def _fix_content_overflow(block: str, width_macro: str) -> str:  # NEW
    """
    Wraps the first raw-content environment in a figure/table block (a
    tabular, or a tikzpicture) in \\resizebox, unless it's already wrapped
    in resizebox/adjustbox. This is what actually catches figures made of
    plain TikZ nodes/arrows with hardcoded absolute widths — those have no
    \\includegraphics and no tabular, so they'd otherwise pass through the
    migration completely unscaled and keep overflowing the narrower target
    column.
    """
    if _ALREADY_WRAPPED_RE.search(block):
        return block  # author already handled scaling, don't double-wrap

    m = _CONTENT_ENV_RE.search(block)
    if not m:
        return block

    env_name = m.group(1)
    begin = m.start()
    end_marker = f"\\end{{{env_name}}}"
    end_idx = block.find(end_marker, begin)
    if end_idx == -1:
        return block  # unbalanced — best effort, leave as-is
    end_idx += len(end_marker)

    content = block[begin:end_idx]
    wrapped = f"\\resizebox{{{width_macro}}}{{!}}{{%\n{content}}}"
    return block[:begin] + wrapped + block[end_idx:]


def _fix_body_overflow(body: str) -> str:  # NEW
    """
    Rewrites figure/table environments so their contents scale to the
    target template's column width instead of keeping the source
    template's (often wider) sizing, which otherwise overflows into the
    margin/gutter after a single->two-column style migration.

    - Plain figure/table -> width rewritten to \\columnwidth.
    - figure*/table* (already spanning) -> width rewritten to \\textwidth.
    - includegraphics widths already relative to \\columnwidth/\\linewidth/
      \\textwidth are left untouched.
    - Bare tabular or tikzpicture content with no existing resizebox/
      adjustbox gets wrapped in \\resizebox{<width_macro>}{!}{...}. This is
      what catches figures built directly out of raw TikZ (nodes, arrows,
      boxes) with hardcoded absolute widths — there's no includegraphics
      or tabular to key off of otherwise, so without this they pass
      through untouched and keep overflowing.
    """

    def _fix_block(m: re.Match) -> str:
        env_name = m.group(1)
        block = m.group(0)
        width_macro = _target_width_macro(env_name)
        block = _fix_includegraphics_widths(block, width_macro)
        block = _fix_content_overflow(block, width_macro)
        return block

    return _ENV_BLOCK_RE.sub(_fix_block, body)


def migrate_files_to_template(
    files: list[dict],  # [{"name", "language", "content"}, ...]
    target_template: str,
) -> list[dict]:
    """
    Rebuild each .tex file for the target template: swap \\documentclass and
    the template's own style package, but keep the author's actual title,
    author block, extra \\usepackage lines, custom macros, and full body
    content intact (with figure/table widths rescaled to the target
    template's column width to avoid overflow). Non-.tex files (bib, etc.)
    pass through unchanged.
    """
    starters = {
        name: content for name, _lang, content in get_template_files(target_template)
    }

    migrated = []
    for f in files:
        starter = starters.get(f["name"])
        if f["name"].endswith(".tex") and starter is not None:
            source_preamble, _ = _split_preamble(f["content"])
            target_preamble, _ = _split_preamble(starter)

            extra_pkgs = _extra_usepackage_lines(source_preamble, target_preamble)
            new_preamble = target_preamble
            if extra_pkgs:
                new_preamble = (
                    new_preamble.rstrip("\n") + "\n" + "\n".join(extra_pkgs) + "\n"
                )

            extra_tikzlib = _extra_tikzlibrary_line(source_preamble, target_preamble)
            if extra_tikzlib:
                new_preamble = new_preamble.rstrip("\n") + "\n" + extra_tikzlib + "\n"

            # Carry over custom \newcommand/\renewcommand macros the body needs
            extra_macros = _extra_newcommand_lines(source_preamble, target_preamble)
            if extra_macros:
                new_preamble = (
                    new_preamble.rstrip("\n") + "\n" + "\n".join(extra_macros) + "\n"
                )

            source_title = _extract_command_arg(source_preamble, "title")
            if source_title is not None:
                new_preamble = _replace_command_arg(new_preamble, "title", source_title)
            source_author = _extract_command_arg(source_preamble, "author")
            if source_author is not None:
                new_preamble = _replace_command_arg(
                    new_preamble, "author", source_author
                )

            new_preamble += _COMPAT_SHIM

            body = _extract_body(f["content"])
            body = _fix_body_overflow(body)  # NEW — rescale figure/table widths
            migrated.append(
                {
                    **f,
                    "content": f"{new_preamble}\\begin{{document}}\n{body}\\end{{document}}\n",
                }
            )
        else:
            migrated.append(f)
    return migrated

```


## src/main.py

```py
from contextlib import asynccontextmanager
from typing import List

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  # <-- new import
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.session import engine, get_db
from src.features.auth.models import User
from src.features.auth.router import current_active_user
from src.features.auth.router import router as auth_router
from src.features.texademia.router import router as texademia_router  # <-- new import
from src.features.texademia.services.compiler import OUTPUT_DIR  # <-- new import


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield


app = FastAPI(title="CV Maker API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- new lines go here, right after CORS middleware ---
app.mount("/static/compiled", StaticFiles(directory=OUTPUT_DIR), name="compiled")
app.include_router(texademia_router, prefix="/api/texademia", tags=["texademia"])
# --------------------------------------------------------

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])


@app.get("/")
async def root():
    return {"status": "healthy", "service": "TexAdemia Api", "version": "1.0.0"}


@app.get("/api/users", response_model=List[User], tags=["users"])
async def list_users(
    session: AsyncSession = Depends(get_db),
):
    statement = select(User)
    result = await session.exec(statement)
    users = result.all()
    return users


@app.get("/api/protected-route", tags=["secure"])
async def protected_endpoint(user: User = Depends(current_active_user)):
    return {"message": "Access granted via fastapi-users!", "user_email": user.email}


@app.get("/health")
async def health():
    return {"status": "ok"}

```


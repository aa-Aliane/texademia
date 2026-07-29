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
    │   ├── auth
    │   │   ├── dev_user.py
    │   │   ├── manager.py
    │   │   ├── models.py
    │   │   ├── router.py
    │   │   └── schemas.py
    │   └── texademia
    │       ├── assets.py
    │       ├── models
    │       │   ├── document.py
    │       │   └── profile.py
    │       ├── router.py
    │       ├── routers
    │       │   ├── collaborators.py
    │       │   ├── compile.py
    │       │   ├── documents.py
    │       │   └── profile.py
    │       ├── schemas
    │       │   ├── document.py
    │       │   └── profile.py
    │       └── templates.py
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


## src/features/auth/dev_user.py

```py
import uuid
from fastapi import Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.session import get_db
from src.features.auth.models import User

DEV_USER_EMAIL = "dev@local.test"


async def get_dev_user(session: AsyncSession = Depends(get_db)) -> User:
    """
    Stand-in for current_active_user while auth isn't wired up yet.
    Returns (creating if needed) a single fixed local user so ownership
    checks (Document.user_id, Profile.user_id, ...) keep working unchanged.

    Remove this file and revert routers to current_active_user once
    real login is implemented.
    """
    statement = select(User).where(User.email == DEV_USER_EMAIL)
    result = await session.exec(statement)
    user = result.first()
    if user is None:
        user = User(
            email=DEV_USER_EMAIL,
            hashed_password="!",  # unused — no login flow while this is active
            is_active=True,
            is_superuser=False,
            is_verified=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user

```


## src/features/auth/manager.py

```py
import uuid
from typing import Optional
import os
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, UUIDIDMixin
from fastapi_users.authentication import (
    AuthenticationBackend,
    CookieTransport,
    JWTStrategy,
)
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlmodel.ext.asyncio.session import AsyncSession
from src.config.settings import settings
from src.database.session import get_db
from src.features.auth.models import User

# 1. Import your Profile model
from src.features.texademia.models.profile import Profile


async def get_user_db(session: AsyncSession = Depends(get_db)):
    yield SQLAlchemyUserDatabase(session, User)


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY

    username_field = "email"

    # 2. Override on_after_register to create the profile
    async def on_after_register(self, user: User, request: Optional[Request] = None):
        # Access the session from the user_db dependency
        session = self.user_db.session

        # Create a new Profile instance.
        # Note: 'tier' defaults to "Free" as defined in your Profile model
        profile = Profile(user_id=user.id)

        session.add(profile)
        await session.commit()

        print(f"User {user.id} registered and blank profile created.")


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)


access_cookie_transport = CookieTransport(
    cookie_name="auth_token",
    cookie_max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    cookie_samesite="lax",
    cookie_secure=os.getenv("ENVIRONMENT") == "production",
    cookie_path="/",
)

refresh_cookie_transport = CookieTransport(
    cookie_name="refresh_token",
    cookie_max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
    cookie_samesite="lax",
    cookie_secure=os.getenv("ENVIRONMENT") == "production",
    cookie_path="/api/auth/jwt",
)


def get_access_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=settings.SECRET_KEY,
        lifetime_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def get_refresh_strategy() -> JWTStrategy:
    # Use a different signing key so a refresh token cannot be reused as an
    # access token even if both cookies are present.
    return JWTStrategy(
        secret=f"{settings.SECRET_KEY}:refresh",
        lifetime_seconds=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
    )


access_backend = AuthenticationBackend(
    name="jwt",
    transport=access_cookie_transport,
    get_strategy=get_access_strategy,
)

refresh_backend = AuthenticationBackend(
    name="jwt-refresh",
    transport=refresh_cookie_transport,
    get_strategy=get_refresh_strategy,
)

```


## src/features/auth/models.py

```py
import uuid
from typing import Optional, List, TYPE_CHECKING

from sqlmodel import Field, SQLModel, Relationship


if TYPE_CHECKING:
    from src.features.texademia.models.profile import Profile


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, index=True, nullable=False
    )
    email: str = Field(unique=True, index=True, nullable=False)
    hashed_password: str = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    is_superuser: bool = Field(default=False, nullable=False)
    is_verified: bool = Field(default=False, nullable=False)

    first_name: Optional[str] = Field(default=None, nullable=True)
    last_name: Optional[str] = Field(default=None, nullable=True)

    profile: Optional["Profile"] = Relationship(back_populates="user")

```


## src/features/auth/router.py

```py
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_users import FastAPIUsers
from src.features.auth.manager import (
    access_backend,
    refresh_backend,
    get_user_manager,
)
from src.features.auth.models import User
from src.features.auth.schemas import UserCreate, UserRead, UserUpdate

fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [access_backend])
refresh_fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager, [refresh_backend]
)

router = APIRouter()

# Auto-generates /register
router.include_router(fastapi_users.get_register_router(UserRead, UserCreate))

router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
)

# Protected endpoints use the short-lived access token only.
current_active_user = fastapi_users.current_user(active=True)

# The refresh endpoint uses the long-lived refresh token only.
refresh_current_user = refresh_fastapi_users.current_user(active=True)


def _set_auth_cookie(
    response: Response,
    transport,
    token: str,
) -> None:
    response.set_cookie(
        key=transport.cookie_name,
        value=token,
        max_age=transport.cookie_max_age,
        path=transport.cookie_path,
        domain=transport.cookie_domain,
        secure=transport.cookie_secure,
        httponly=transport.cookie_httponly,
        samesite=transport.cookie_samesite,
    )


def _clear_auth_cookie(response: Response, transport) -> None:
    response.delete_cookie(
        key=transport.cookie_name,
        path=transport.cookie_path,
        domain=transport.cookie_domain,
    )


@router.post("/jwt/login")
async def login(
    response: Response,
    credentials: OAuth2PasswordRequestForm = Depends(),
    user_manager=Depends(get_user_manager),
):
    """Authenticate and set both access and refresh cookies."""
    user = await user_manager.authenticate(credentials)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LOGIN_BAD_CREDENTIALS",
        )

    access_strategy = access_backend.get_strategy()
    refresh_strategy = refresh_backend.get_strategy()

    access_token = await access_strategy.write_token(user)
    refresh_token = await refresh_strategy.write_token(user)

    _set_auth_cookie(response, access_backend.transport, access_token)
    _set_auth_cookie(response, refresh_backend.transport, refresh_token)

    return {"detail": "Login successful"}


@router.post("/jwt/logout")
async def logout(response: Response):
    """Clear both access and refresh cookies."""
    _clear_auth_cookie(response, access_backend.transport)
    _clear_auth_cookie(response, refresh_backend.transport)
    return {"detail": "Logout successful"}


@router.post("/jwt/refresh")
async def refresh(
    response: Response,
    user: User = Depends(refresh_current_user),
):
    """Use a valid refresh cookie to issue a new access cookie."""
    access_strategy = access_backend.get_strategy()
    access_token = await access_strategy.write_token(user)
    _set_auth_cookie(response, access_backend.transport, access_token)
    return {"detail": "Refresh successful"}

```


## src/features/auth/schemas.py

```py
import uuid

from fastapi_users import schemas
from pydantic import EmailStr


class UserRead(schemas.BaseUser[uuid.UUID]):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr


class UserCreate(schemas.BaseUserCreate):
    email: EmailStr
    password: str


class UserUpdate(schemas.BaseUserUpdate):
    first_name: str | None = None
    last_name: str | None = None

```


## src/features/texademia/assets.py

```py
# src/features/texademia/assets.py
from pathlib import Path

ASSETS_DIR = Path(__file__).parent / "assets"


def get_template_asset_files(template: str) -> list[Path]:
    """Extra .sty/.cls/.bst files a template needs at compile time."""
    template_dir = ASSETS_DIR / template
    if not template_dir.exists():
        return []
    return [f for f in template_dir.iterdir() if f.is_file()]

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
)

router = APIRouter()

router.include_router(profile_router)
router.include_router(documents_router)
router.include_router(compile_router)
router.include_router(collaborators_router)

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


## src/features/texademia/templates.py

```py
"""
Starter file sets per document theme. Add a new entry here whenever you
support another style — the .cls/.sty it needs must exist in the server's
TeX distribution (e.g. IEEEtran needs texlive-publishers installed).
"""

from typing import TypedDict, List, Tuple


class TemplateFile(TypedDict):
    name: str
    language: str
    content: str


# Raw starter tuples: (filename, language, content)
_DEFAULT: List[Tuple[str, str, str]] = [
    (
        "main.tex",
        "latex",
        "\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}\n",
    ),
    ("references.bib", "bibtex", ""),
]

_ARXIV: List[Tuple[str, str, str]] = [
    (
        "main.tex",
        "latex",
        "\\documentclass{article}\n"
        "\\usepackage{arxiv}\n"
        "\\title{Your Paper Title}\n"
        "\\author{Your Name}\n"
        "\\begin{document}\n"
        "\\maketitle\n"
        "\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n"
        "\\section{Introduction}\n"
        "\\end{document}\n",
    ),
    ("references.bib", "bibtex", ""),
]

_IEEE: List[Tuple[str, str, str]] = [
    (
        "main.tex",
        "latex",
        "\\documentclass[conference]{IEEEtran}\n"
        "\\begin{document}\n"
        "\\title{Your Paper Title}\n"
        "\\author{\\IEEEauthorblockN{Your Name}}\n"
        "\\maketitle\n"
        "\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n"
        "\\section{Introduction}\n"
        "\\end{document}\n",
    ),
    ("references.bib", "bibtex", ""),
]

_ACL: List[Tuple[str, str, str]] = [
    (
        "main.tex",
        "latex",
        "\\documentclass[11pt]{article}\n"
        "\\usepackage[review]{acl}\n"
        "\\package{times}\n"
        "\\usepackage{latexsym}\n"
        "\\title{Your Paper Title}\n"
        "\\author{Your Name \\\\ Your Affiliation \\\\ \\texttt{you@example.com}}\n"
        "\\begin{document}\n"
        "\\maketitle\n"
        "\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n"
        "\\section{Introduction}\n"
        "\\end{document}\n",
    ),
    ("references.bib", "bibtex", ""),
]

_TEMPLATES = {
    "default": _DEFAULT,
    "arxiv": _ARXIV,
    "ieee": _IEEE,
    "acl": _ACL,
}

TEMPLATE_NAMES = set(_TEMPLATES.keys())


def get_template_files(template: str) -> List[TemplateFile]:
    """
    Returns the starter files for a template as structured dictionaries.
    """
    raw_files = _TEMPLATES.get(template, _DEFAULT)
    return [
        {"name": name, "language": lang, "content": content}
        for name, lang, content in raw_files
    ]

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


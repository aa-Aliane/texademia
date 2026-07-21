# Tree View:
```
backend
├── .env
├── .env.example
├── backend.md
├── Dockerfile
├── requirements.txt
└── src
    ├── __init__.py
    ├── __pycache__
    │   ├── __init__.cpython-311.pyc
    │   └── main.cpython-311.pyc
    ├── config
    │   ├── __init__.py
    │   ├── __pycache__
    │   │   ├── __init__.cpython-311.pyc
    │   │   └── settings.cpython-311.pyc
    │   └── settings.py
    ├── database
    │   ├── __init__.py
    │   ├── __pycache__
    │   │   ├── __init__.cpython-311.pyc
    │   │   └── session.cpython-311.pyc
    │   ├── base.py
    │   └── session.py
    ├── features
    │   ├── __init__.py
    │   ├── __pycache__
    │   │   └── __init__.cpython-311.pyc
    │   ├── auth
    │   │   ├── __init__.py
    │   │   ├── __pycache__
    │   │   │   ├── __init__.cpython-311.pyc
    │   │   │   ├── manager.cpython-311.pyc
    │   │   │   ├── models.cpython-311.pyc
    │   │   │   ├── router.cpython-311.pyc
    │   │   │   └── schemas.cpython-311.pyc
    │   │   ├── manager.py
    │   │   ├── models.py
    │   │   ├── router.py
    │   │   └── schemas.py
    │   └── texademia
    │       ├── __init__.py
    │       ├── __pycache__
    │       │   ├── __init__.cpython-311.pyc
    │       │   ├── router.cpython-311.pyc
    │       │   └── templates.cpython-311.pyc
    │       ├── models
    │       │   ├── __init__.py
    │       │   ├── __pycache__
    │       │   │   ├── __init__.cpython-311.pyc
    │       │   │   ├── document.cpython-311.pyc
    │       │   │   └── profile.cpython-311.pyc
    │       │   ├── document.py
    │       │   └── profile.py
    │       ├── router.py
    │       ├── routers
    │       │   ├── __init__.py
    │       │   ├── __pycache__
    │       │   │   ├── __init__.cpython-311.pyc
    │       │   │   ├── documents.cpython-311.pyc
    │       │   │   └── profile.cpython-311.pyc
    │       │   ├── documents.py
    │       │   └── profile.py
    │       ├── schemas
    │       │   ├── __init__.py
    │       │   ├── __pycache__
    │       │   │   ├── __init__.cpython-311.pyc
    │       │   │   ├── document.cpython-311.pyc
    │       │   │   └── profile.cpython-311.pyc
    │       │   ├── document.py
    │       │   └── profile.py
    │       ├── services
    │       │   ├── __pycache__
    │       │   │   └── compiler.cpython-311.pyc
    │       │   └── compiler.py
    │       └── templates.py
    └── main.py

```

# Content:

## .env

```env
DATABASE_URL=postgresql+asyncpg://user:password@db:5432/texademia
SECRET_KEY=change-this-to-a-long-random-string-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

```


## .env.example

```example
DATABASE_URL=postgresql+asyncpg://user:password@db:5432/texademia
SECRET_KEY=change-this-to-a-long-random-string-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

```


## Dockerfile

```
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```


## backend.md

````md
# Tree View:
```
src
├── __init__.py
├── __pycache__
│   ├── __init__.cpython-311.pyc
│   └── main.cpython-311.pyc
├── config
│   ├── __init__.py
│   └── settings.py
├── database
│   ├── __init__.py
│   ├── base.py
│   └── session.py
├── features
│   ├── __init__.py
│   ├── auth
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-311.pyc
│   │   │   ├── manager.cpython-311.pyc
│   │   │   ├── models.cpython-311.pyc
│   │   │   ├── router.cpython-311.pyc
│   │   │   └── schemas.cpython-311.pyc
│   │   ├── manager.py
│   │   ├── models.py
│   │   ├── router.py
│   │   └── schemas.py
│   └── texademia
│       ├── __init__.py
│       ├── models
│       │   ├── __init__.py
│       │   └── profile.py
│       ├── router.py
│       ├── routers
│       │   ├── __init__.py
│       │   └── profile.py
│       └── schemas
│           ├── __init__.py
│           └── profile.py
└── main.py

```

# Content:

## config/settings.py

```py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

```


## database/base.py

```py
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

```


## database/session.py

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


## features/auth/manager.py

```py
import uuid
from typing import Optional

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
from src.features.cv_builder.models.profile import Profile


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


# ... (rest of your existing authentication code remains the same)


cookie_transport = CookieTransport(
    cookie_name="auth_token",
    cookie_max_age=3600,
    cookie_samesite="lax",
    cookie_secure=False,
    cookie_path="/",
)


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=settings.SECRET_KEY,
        lifetime_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

```


## features/auth/models.py

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
    educations: List["Education"] = Relationship(back_populates="user")
    experiences: List["Experience"] = Relationship(back_populates="user")

```


## features/auth/router.py

```py
import uuid

from fastapi import APIRouter
from fastapi_users import FastAPIUsers
from src.features.auth.manager import auth_backend, get_user_manager
from src.features.auth.models import User
from src.features.auth.schemas import UserCreate, UserRead, UserUpdate

fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])

router = APIRouter()

# Auto-generates /login and /logout
router.include_router(fastapi_users.get_auth_router(auth_backend), prefix="/jwt")

# Auto-generates /register
router.include_router(fastapi_users.get_register_router(UserRead, UserCreate))

router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
)

current_active_user = fastapi_users.current_user(active=True)

```


## features/auth/schemas.py

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


## features/texademia/models/__init__.py

```py
from .profile import Profile
__all__ = ['Profile']

```


## features/texademia/models/profile.py

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


## features/texademia/router.py

```py
from fastapi import APIRouter
from .routers import profile_router

router = APIRouter()

router.include_router(profile_router)

```


## features/texademia/routers/__init__.py

```py
from .profile import router as profile_router

__all__ = ["profile_router"]

```


## features/texademia/routers/profile.py

```py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.session import get_db
from src.features.auth.models import User
from src.features.auth.router import current_active_user

from src.features.cv_builder.models.profile import Profile
from src.features.cv_builder.schemas.profile import ProfileCreate, ProfileRead, ProfileUpdate

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


## features/texademia/schemas/__init__.py

```py
from .profile import ProfileRead, ProfileUpdate, ProfileCreate

__all__ = [
    "ProfileRead",
    "ProfileUpdate",
    "ProfileCreate",
]

```


## features/texademia/schemas/profile.py

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


## main.py

```py
from contextlib import asynccontextmanager
from typing import List

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.session import engine, get_db
from src.features.auth.models import User
from src.features.auth.router import current_active_user
from src.features.auth.router import router as auth_router




@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dynamic table generation on startup to avoid initial migration steps
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


# Example protected route to extend into your future CV Builder modules
@app.get("/api/protected-route", tags=["secure"])
async def protected_endpoint(user: User = Depends(current_active_user)):
    return {"message": "Access granted via fastapi-users!", "user_email": user.email}

```


````


## requirements.txt

```txt
fastapi
uvicorn[standard]
sqlmodel
asyncpg
pydantic-settings
python-dotenv
fastapi-users[sqlalchemy]
```


## src/config/settings.py

```py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

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


## src/features/auth/manager.py

```py
import uuid
from typing import Optional

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


# ... (rest of your existing authentication code remains the same)


cookie_transport = CookieTransport(
    cookie_name="auth_token",
    cookie_max_age=3600,
    cookie_samesite="lax",
    cookie_secure=False,
    cookie_path="/",
)


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=settings.SECRET_KEY,
        lifetime_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
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
    educations: List["Education"] = Relationship(back_populates="user")
    experiences: List["Experience"] = Relationship(back_populates="user")

```


## src/features/auth/router.py

```py
import uuid

from fastapi import APIRouter
from fastapi_users import FastAPIUsers
from src.features.auth.manager import auth_backend, get_user_manager
from src.features.auth.models import User
from src.features.auth.schemas import UserCreate, UserRead, UserUpdate

fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])

router = APIRouter()

# Auto-generates /login and /logout
router.include_router(fastapi_users.get_auth_router(auth_backend), prefix="/jwt")

# Auto-generates /register
router.include_router(fastapi_users.get_register_router(UserRead, UserCreate))

router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
)

current_active_user = fastapi_users.current_user(active=True)

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


## src/features/texademia/models/__init__.py

```py
from .document import Document, DocumentFile
from .profile import Profile

__all__ = ['Profile', "Document", "DocumentFile"]

```


## src/features/texademia/models/document.py

```py
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.features.auth.models import User


class Document(SQLModel, table=True):
    __tablename__ = "documents"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, index=True)
    title: str = Field(default="Untitled", nullable=False)
    template: str = Field(
        default="default", nullable=False
    )  # "default" | "arxiv" | "ieee"
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    user: "User" = Relationship()
    files: List["DocumentFile"] = Relationship(
        back_populates="document",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class DocumentFile(SQLModel, table=True):
    __tablename__ = "document_files"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(
        foreign_key="documents.id", nullable=False, index=True
    )
    name: str = Field(nullable=False)  # "main.tex", "references.bib"
    language: str = Field(default="latex", nullable=False)  # "latex" | "bibtex"
    content: str = Field(default="", nullable=False)

    document: "Document" = Relationship(back_populates="files")

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
from .routers import profile_router, documents_router

router = APIRouter()

router.include_router(profile_router)
router.include_router(documents_router)

```


## src/features/texademia/routers/__init__.py

```py
from .profile import router as profile_router
from .documents import router as documents_router

__all__ = ["profile_router", "documents_router"]

```


## src/features/texademia/routers/documents.py

```py
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.session import get_db
from src.features.auth.models import User
from src.features.auth.router import current_active_user
from src.features.texademia.models.document import Document, DocumentFile
from src.features.texademia.schemas.document import (
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    FileUpdate,
    CompileResponse,
)
from src.features.texademia.services.compiler import (
    compile_latex,
    CompileError as CompilerError,
)
from src.features.texademia.templates import get_template_files

router = APIRouter(prefix="/documents", tags=["documents"])


async def _get_owned_document(
    document_id: uuid.UUID, session: AsyncSession, user: User
) -> Document:
    statement = select(Document).where(
        Document.id == document_id, Document.user_id == user.id
    )
    result = await session.exec(statement)
    document = result.first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.get("", response_model=List[DocumentRead])
async def list_documents(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    statement = select(Document).where(Document.user_id == user.id)
    result = await session.exec(statement)
    return result.all()


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    doc_in: DocumentCreate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document = Document(title=doc_in.title, template=doc_in.template, user_id=user.id)
    session.add(document)
    await session.flush()

    for name, language, content in get_template_files(doc_in.template):
        session.add(
            DocumentFile(
                document_id=document.id, name=name, language=language, content=content
            )
        )

    await session.commit()
    statement = select(Document).where(Document.id == document.id)
    result = await session.exec(statement)
    return result.first()


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    return await _get_owned_document(document_id, session, user)


@router.patch("/{document_id}", response_model=DocumentRead)
async def update_document(
    document_id: uuid.UUID,
    doc_in: DocumentUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document = await _get_owned_document(document_id, session, user)
    for key, value in doc_in.model_dump(exclude_unset=True).items():
        setattr(document, key, value)
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document = await _get_owned_document(document_id, session, user)
    await session.delete(document)
    await session.commit()


@router.patch("/{document_id}/files/{file_id}")
async def update_file(
    document_id: uuid.UUID,
    file_id: uuid.UUID,
    file_in: FileUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document = await _get_owned_document(document_id, session, user)
    file = next((f for f in document.files if f.id == file_id), None)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    file.content = file_in.content
    session.add(file)
    await session.commit()
    await session.refresh(file)
    return file


@router.post("/{document_id}/compile", response_model=CompileResponse)
async def compile_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document = await _get_owned_document(document_id, session, user)
    try:
        pdf_url = await compile_latex(document.files, document.id)
    except CompilerError as e:
        raise HTTPException(
            status_code=422, detail={"message": e.message, "log": e.log}
        )
    return CompileResponse(pdf_url=pdf_url)

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


## src/features/texademia/schemas/__init__.py

```py
from .document import (
    CompileResponse,
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    FileRead,
    FileUpdate,
)
from .profile import ProfileCreate, ProfileRead, ProfileUpdate

__all__ = [
    "ProfileRead",
    "ProfileUpdate",
    "ProfileCreate",
    "FileRead",
    "FileUpdate",
    "DocumentRead",
    "DocumentCreate",
    "DocumentUpdate",
]

```


## src/features/texademia/schemas/document.py

```py
import uuid
from datetime import datetime

from pydantic import BaseModel


class FileRead(BaseModel):
    id: uuid.UUID
    name: str
    language: str
    content: str

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

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    title: str | None = None
    template: str | None = None


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
import asyncio
import shutil
import tempfile
import uuid
from pathlib import Path

from src.features.texademia.models.document import DocumentFile

OUTPUT_DIR = Path("compiled_pdfs")
OUTPUT_DIR.mkdir(exist_ok=True)

COMPILE_TIMEOUT_SECONDS = 30


class CompileError(Exception):
    def __init__(self, message: str, log: str = ""):
        self.message = message
        self.log = log
        super().__init__(message)


async def compile_latex(files: list[DocumentFile], document_id: uuid.UUID) -> str:
    if not shutil.which("latexmk"):
        raise CompileError("latexmk is not installed on the server.")

    main_file = next((f for f in files if f.name.endswith(".tex")), None)
    if main_file is None:
        raise CompileError("No .tex file found in the project.")

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        for f in files:
            (tmp_path / f.name).write_text(f.content, encoding="utf-8")

        cmd = [
            "latexmk",
            "-pdf",
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-no-shell-escape",
            main_file.name,
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=tmp_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        try:
            stdout, _ = await asyncio.wait_for(
                proc.communicate(), timeout=COMPILE_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            proc.kill()
            raise CompileError("Compilation timed out.")

        log_text = stdout.decode(errors="replace")
        pdf_path = tmp_path / Path(main_file.name).with_suffix(".pdf").name

        if proc.returncode != 0 or not pdf_path.exists():
            raise CompileError("LaTeX compilation failed.", log=log_text)

        dest_path = OUTPUT_DIR / f"{document_id}.pdf"
        shutil.copyfile(pdf_path, dest_path)

    return f"/static/compiled/{document_id}.pdf"

```


## src/features/texademia/templates.py

```py
"""
Starter file sets per document theme. Add a new entry here whenever you
support another style — the .cls/.sty it needs must exist in the server's
TeX distribution (e.g. IEEEtran needs texlive-publishers installed).
"""

_DEFAULT = [
    ("main.tex", "latex",
     "\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}\n"),
    ("references.bib", "bibtex", ""),
]

_ARXIV = [
    ("main.tex", "latex",
     "\\documentclass{article}\n"
     "\\usepackage{arxiv}\n"
     "\\title{Your Paper Title}\n"
     "\\author{Your Name}\n"
     "\\begin{document}\n"
     "\\maketitle\n"
     "\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n"
     "\\section{Introduction}\n"
     "\\end{document}\n"),
    ("references.bib", "bibtex", ""),
]

_IEEE = [
    ("main.tex", "latex",
     "\\documentclass[conference]{IEEEtran}\n"
     "\\begin{document}\n"
     "\\title{Your Paper Title}\n"
     "\\author{\\IEEEauthorblockN{Your Name}}\n"
     "\\maketitle\n"
     "\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n"
     "\\section{Introduction}\n"
     "\\end{document}\n"),
    ("references.bib", "bibtex", ""),
]

_TEMPLATES = {"default": _DEFAULT, "arxiv": _ARXIV, "ieee": _IEEE}


def get_template_files(template: str):
    return _TEMPLATES.get(template, _DEFAULT)

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

```


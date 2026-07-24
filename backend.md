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
    │   │   │   ├── dev_user.cpython-311.pyc
    │   │   │   ├── manager.cpython-311.pyc
    │   │   │   ├── models.cpython-311.pyc
    │   │   │   ├── router.cpython-311.pyc
    │   │   │   └── schemas.cpython-311.pyc
    │   │   ├── dev_user.py
    │   │   ├── manager.py
    │   │   ├── models.py
    │   │   ├── router.py
    │   │   └── schemas.py
    │   └── texademia
    │       ├── __init__.py
    │       ├── __pycache__
    │       │   ├── __init__.cpython-311.pyc
    │       │   ├── assets.cpython-311.pyc
    │       │   ├── router.cpython-311.pyc
    │       │   └── templates.cpython-311.pyc
    │       ├── assets
    │       │   ├── acl
    │       │   │   ├── acl.sty
    │       │   │   └── acl_natbib.bst
    │       │   └── arxiv
    │       │       └── arxiv.sty
    │       ├── assets.py
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
    │       │   │   ├── compile.cpython-311.pyc
    │       │   │   ├── documents.cpython-311.pyc
    │       │   │   └── profile.cpython-311.pyc
    │       │   ├── compile.py
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
    │       │   │   ├── compiler.cpython-311.pyc
    │       │   │   ├── compiler_worker.cpython-311.pyc
    │       │   │   └── template_migrator.cpython-311.pyc
    │       │   ├── compiler.py
    │       │   ├── compiler_worker.py
    │       │   ├── preable_merger.py
    │       │   └── template_migrator.py
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
REDIS_URL=redis://redis:6379/0

```


## .env.example

```example
DATABASE_URL=postgresql+asyncpg://user:password@db:5432/texademia
SECRET_KEY=change-this-to-a-long-random-string-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REDIS_URL=redis://redis:6379/0

```


## Dockerfile

```
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-publishers \
    texlive-science \
    texlive-pictures \
    texlive-bibtex-extra \
    biber \
    latexmk \
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
redis
rq

```


## src/config/settings.py

```py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
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


## src/features/texademia/assets/acl/acl.sty

```sty
% This is the LaTex style file for *ACL.
% The official sources can be found at
%
%     https://github.com/acl-org/acl-style-files/
%
% This package is activated by adding
%
%    \usepackage{acl}
%
% to your LaTeX file. When submitting your paper for review, add the "review" option:
%
%    \usepackage[review]{acl}

\newif\ifacl@finalcopy
\newif\ifacl@anonymize
\newif\ifacl@linenumbers
\newif\ifacl@pagenumbers
\DeclareOption{final}{\acl@finalcopytrue\acl@anonymizefalse\acl@linenumbersfalse\acl@pagenumbersfalse}
\DeclareOption{review}{\acl@finalcopyfalse\acl@anonymizetrue\acl@linenumberstrue\acl@pagenumberstrue}
\DeclareOption{preprint}{\acl@finalcopytrue\acl@anonymizefalse\acl@linenumbersfalse\acl@pagenumberstrue}
\ExecuteOptions{final} % final copy is the default

% include hyperref, unless user specifies nohyperref option like this:
% \usepackage[nohyperref]{acl}
\newif\ifacl@hyperref
\DeclareOption{hyperref}{\acl@hyperreftrue}
\DeclareOption{nohyperref}{\acl@hyperreffalse}
\ExecuteOptions{hyperref} % default is to use hyperref
\ProcessOptions\relax

\typeout{Conference Style for ACL}

\usepackage{xcolor}

\ifacl@linenumbers
  % Add draft line numbering via the lineno package
  % https://texblog.org/2012/02/08/adding-line-numbers-to-documents/
  \usepackage[switch,mathlines]{lineno}

  % Line numbers in gray Helvetica 8pt
  \font\aclhv = phvb at 8pt
  \renewcommand\linenumberfont{\aclhv\color{lightgray}}

  % Zero-fill line numbers
  % NUMBER with left flushed zeros  \fillzeros[<WIDTH>]<NUMBER>
  \newcount\cv@tmpc@ \newcount\cv@tmpc
  \def\fillzeros[#1]#2{\cv@tmpc@=#2\relax\ifnum\cv@tmpc@<0\cv@tmpc@=-\cv@tmpc@\fi
    \cv@tmpc=1 %
    \loop\ifnum\cv@tmpc@<10 \else \divide\cv@tmpc@ by 10 \advance\cv@tmpc by 1 \fi
      \ifnum\cv@tmpc@=10\relax\cv@tmpc@=11\relax\fi \ifnum\cv@tmpc@>10 \repeat
    \ifnum#2<0\advance\cv@tmpc1\relax-\fi
    \loop\ifnum\cv@tmpc<#1\relax0\advance\cv@tmpc1\relax\fi \ifnum\cv@tmpc<#1 \repeat
    \cv@tmpc@=#2\relax\ifnum\cv@tmpc@<0\cv@tmpc@=-\cv@tmpc@\fi \relax\the\cv@tmpc@}%
  \renewcommand\thelinenumber{\fillzeros[3]{\arabic{linenumber}}}
  \AtBeginDocument{\linenumbers}

  \setlength{\linenumbersep}{1.6cm}

  % Bug: An equation with $$ ... $$ isn't numbered, nor is the previous line.

  % Patch amsmath commands so that the previous line and the equation itself
  % are numbered. Bug: multline has an extra line number.
  % https://tex.stackexchange.com/questions/461186/how-to-use-lineno-with-amsmath-align
  \usepackage{etoolbox} %% <- for \pretocmd, \apptocmd and \patchcmd

  \newcommand*\linenomathpatch[1]{%
    \expandafter\pretocmd\csname #1\endcsname {\linenomath}{}{}%
    \expandafter\pretocmd\csname #1*\endcsname {\linenomath}{}{}%
    \expandafter\apptocmd\csname end#1\endcsname {\endlinenomath}{}{}%
    \expandafter\apptocmd\csname end#1*\endcsname {\endlinenomath}{}{}%
  }
  \newcommand*\linenomathpatchAMS[1]{%
    \expandafter\pretocmd\csname #1\endcsname {\linenomathAMS}{}{}%
    \expandafter\pretocmd\csname #1*\endcsname {\linenomathAMS}{}{}%
    \expandafter\apptocmd\csname end#1\endcsname {\endlinenomath}{}{}%
    \expandafter\apptocmd\csname end#1*\endcsname {\endlinenomath}{}{}%
  }

  %% Definition of \linenomathAMS depends on whether the mathlines option is provided
  \expandafter\ifx\linenomath\linenomathWithnumbers
    \let\linenomathAMS\linenomathWithnumbers
    %% The following line gets rid of an extra line numbers at the bottom:
    \patchcmd\linenomathAMS{\advance\postdisplaypenalty\linenopenalty}{}{}{}
  \else
    \let\linenomathAMS\linenomathNonumbers
  \fi

  \AtBeginDocument{%
    \linenomathpatch{equation}%
    \linenomathpatchAMS{gather}%
    \linenomathpatchAMS{multline}%
    \linenomathpatchAMS{align}%
    \linenomathpatchAMS{alignat}%
    \linenomathpatchAMS{flalign}%
  }
\else
  % Hack to ignore these commands, which review mode puts into the .aux file.
  \newcommand{\@LN@col}[1]{}
  \newcommand{\@LN}[2]{}
  \newcommand{\nolinenumbers}{}
\fi

\PassOptionsToPackage{a4paper,margin=2.5cm,heightrounded=true}{geometry}
\RequirePackage{geometry}

\setlength\columnsep{0.6cm}
\newlength\titlebox
\setlength\titlebox{11\baselineskip}
% \titlebox should be a multiple of \baselineskip so that
% column height remaining fits an exact number of lines of text

\flushbottom \twocolumn \sloppy

% We're never going to need a table of contents, so just flush it to
% save space --- suggested by drstrip@sandia-2
\def\addcontentsline#1#2#3{}

\ifacl@pagenumbers
    \pagenumbering{arabic}
\else
    \thispagestyle{empty}
    \pagestyle{empty}
\fi

%% Title and Authors %%

\let\Thanks\thanks % \Thanks and \thanks used to be different, but keep this for backwards compatibility.

\newcommand\outauthor{%
    \begin{tabular}[t]{c}
    \ifacl@anonymize
        \bfseries Anonymous ACL submission
    \else
        \bfseries\@author
    \fi
    \end{tabular}}

% Mostly taken from deproc.
\AtBeginDocument{
\def\maketitle{\par
 \begingroup
   \def\thefootnote{\fnsymbol{footnote}}
   \twocolumn[\@maketitle]
   \@thanks
 \endgroup
 \setcounter{footnote}{0}
 \let\maketitle\relax
 \let\@maketitle\relax
 \gdef\@thanks{}\gdef\@author{}\gdef\@title{}\let\thanks\relax}
\def\@maketitle{\vbox to \titlebox{\hsize\textwidth
 \linewidth\hsize \vskip 0.125in minus 0.125in \centering
 {\Large\bfseries \@title \par} \vskip 0.2in plus 1fil minus 0.1in
 {\def\and{\unskip\enspace{\rmfamily and}\enspace}%
  \def\And{\end{tabular}\hss \egroup \hskip 1in plus 2fil
           \hbox to 0pt\bgroup\hss \begin{tabular}[t]{c}\bfseries}%
  \def\AND{\end{tabular}\hss\egroup \hfil\hfil\egroup
          \vskip 0.25in plus 1fil minus 0.125in
           \hbox to \linewidth\bgroup\large \hfil\hfil
             \hbox to 0pt\bgroup\hss \begin{tabular}[t]{c}\bfseries}
  \hbox to \linewidth\bgroup\large \hfil\hfil
    \hbox to 0pt\bgroup\hss
  \outauthor
   \hss\egroup
    \hfil\hfil\egroup}
  \vskip 0.3in plus 2fil minus 0.1in
}}
}

% margins and font size for abstract
\renewenvironment{abstract}%
  {\begin{center}\large\textbf{\abstractname}\end{center}%
    \begin{list}{}%
      {\setlength{\rightmargin}{0.6cm}%
        \setlength{\leftmargin}{0.6cm}}%
      \item[]\ignorespaces%
      \@setsize\normalsize{12pt}\xpt\@xpt
  }%
  {\unskip\end{list}}

% Resizing figure and table captions - SL
% Support for interacting with the caption, subfigure, and subcaption packages - SL
\RequirePackage{caption}
\DeclareCaptionFont{10pt}{\fontsize{10pt}{12pt}\selectfont}
\captionsetup{font=10pt}

\RequirePackage{natbib}
% for citation commands in the .tex, authors can use:
% \citep, \citet, and \citeyearpar for compatibility with natbib, or
% \cite, \newcite, and \shortcite for compatibility with older ACL .sty files
\renewcommand\cite{\citep}  % to get "(Author Year)" with natbib
\newcommand\shortcite{\citeyearpar}% to get "(Year)" with natbib
\newcommand\newcite{\citet} % to get "Author (Year)" with natbib
\newcommand{\citeposs}[1]{\citeauthor{#1}'s (\citeyear{#1})} % to get "Author's (Year)"

\bibliographystyle{acl_natbib}

% Bibliography

% Don't put a label in the bibliography at all.  Just use the unlabeled format
% instead.
\def\thebibliography#1{\vskip\parskip%
\vskip\baselineskip%
\def\baselinestretch{1}%
\ifx\@currsize\normalsize\@normalsize\else\@currsize\fi%
\vskip-\parskip%
\vskip-\baselineskip%
\section*{References\@mkboth
 {References}{References}}\list
 {}{\setlength{\labelwidth}{0pt}\setlength{\leftmargin}{\parindent}
 \setlength{\itemindent}{-\parindent}}
 \def\newblock{\hskip .11em plus .33em minus -.07em}
 \sloppy\clubpenalty4000\widowpenalty4000
 \sfcode`\.=1000\relax}
\let\endthebibliography=\endlist


% Allow for a bibliography of sources of attested examples
\def\thesourcebibliography#1{\vskip\parskip%
\vskip\baselineskip%
\def\baselinestretch{1}%
\ifx\@currsize\normalsize\@normalsize\else\@currsize\fi%
\vskip-\parskip%
\vskip-\baselineskip%
\section*{Sources of Attested Examples\@mkboth
 {Sources of Attested Examples}{Sources of Attested Examples}}\list
 {}{\setlength{\labelwidth}{0pt}\setlength{\leftmargin}{\parindent}
 \setlength{\itemindent}{-\parindent}}
 \def\newblock{\hskip .11em plus .33em minus -.07em}
 \sloppy\clubpenalty4000\widowpenalty4000
 \sfcode`\.=1000\relax}
\let\endthesourcebibliography=\endlist

% sections with less space
\def\section{\@startsection {section}{1}{\z@}{-2.0ex plus
    -0.5ex minus -.2ex}{1.5ex plus 0.3ex minus .2ex}{\large\bfseries\raggedright}}
\def\subsection{\@startsection{subsection}{2}{\z@}{-1.8ex plus
    -0.5ex minus -.2ex}{0.8ex plus .2ex}{\normalsize\bfseries\raggedright}}
%% changed by KO to - values to get the initial parindent right
\def\subsubsection{\@startsection{subsubsection}{3}{\z@}{-1.5ex plus
   -0.5ex minus -.2ex}{0.5ex plus .2ex}{\normalsize\bfseries\raggedright}}
\def\paragraph{\@startsection{paragraph}{4}{\z@}{1.5ex plus
   0.5ex minus .2ex}{-1em}{\normalsize\bfseries}}
\def\subparagraph{\@startsection{subparagraph}{5}{\parindent}{1.5ex plus
   0.5ex minus .2ex}{-1em}{\normalsize\bfseries}}

% Footnotes
\footnotesep 6.65pt %
\skip\footins 9pt plus 4pt minus 2pt
\def\footnoterule{\kern-3pt \hrule width 5pc \kern 2.6pt }
\setcounter{footnote}{0}

% Lists and paragraphs
\parindent 1em
\topsep 4pt plus 1pt minus 2pt
\partopsep 1pt plus 0.5pt minus 0.5pt
\itemsep 2pt plus 1pt minus 0.5pt
\parsep 2pt plus 1pt minus 0.5pt

\leftmargin 2em \leftmargini\leftmargin \leftmarginii 2em
\leftmarginiii 1.5em \leftmarginiv 1.0em \leftmarginv .5em \leftmarginvi .5em
\labelwidth\leftmargini\advance\labelwidth-\labelsep \labelsep 5pt

\def\@listi{\leftmargin\leftmargini}
\def\@listii{\leftmargin\leftmarginii
   \labelwidth\leftmarginii\advance\labelwidth-\labelsep
   \topsep 2pt plus 1pt minus 0.5pt
   \parsep 1pt plus 0.5pt minus 0.5pt
   \itemsep \parsep}
\def\@listiii{\leftmargin\leftmarginiii
    \labelwidth\leftmarginiii\advance\labelwidth-\labelsep
    \topsep 1pt plus 0.5pt minus 0.5pt
    \parsep \z@ \partopsep 0.5pt plus 0pt minus 0.5pt
    \itemsep \topsep}
\def\@listiv{\leftmargin\leftmarginiv
     \labelwidth\leftmarginiv\advance\labelwidth-\labelsep}
\def\@listv{\leftmargin\leftmarginv
     \labelwidth\leftmarginv\advance\labelwidth-\labelsep}
\def\@listvi{\leftmargin\leftmarginvi
     \labelwidth\leftmarginvi\advance\labelwidth-\labelsep}

\abovedisplayskip 7pt plus2pt minus5pt%
\belowdisplayskip \abovedisplayskip
\abovedisplayshortskip  0pt plus3pt%
\belowdisplayshortskip  4pt plus3pt minus3pt%

% Less leading in most fonts (due to the narrow columns)
% The choices were between 1-pt and 1.5-pt leading
\def\@normalsize{\@setsize\normalsize{11pt}\xpt\@xpt}
\def\small{\@setsize\small{10pt}\ixpt\@ixpt}
\def\footnotesize{\@setsize\footnotesize{10pt}\ixpt\@ixpt}
\def\scriptsize{\@setsize\scriptsize{8pt}\viipt\@viipt}
\def\tiny{\@setsize\tiny{7pt}\vipt\@vipt}
\def\large{\@setsize\large{14pt}\xiipt\@xiipt}
\def\Large{\@setsize\Large{16pt}\xivpt\@xivpt}
\def\LARGE{\@setsize\LARGE{20pt}\xviipt\@xviipt}
\def\huge{\@setsize\huge{23pt}\xxpt\@xxpt}
\def\Huge{\@setsize\Huge{28pt}\xxvpt\@xxvpt}

% The hyperref manual (section 9) says hyperref should be loaded after natbib
\ifacl@hyperref
  \PassOptionsToPackage{breaklinks}{hyperref}
  \RequirePackage{hyperref}
  % make links dark blue
  \definecolor{darkblue}{rgb}{0, 0, 0.5}
  \hypersetup{colorlinks=true, citecolor=darkblue, linkcolor=darkblue, urlcolor=darkblue}
\else
  % This definition is used if the hyperref package is not loaded.
  % It provides a backup, no-op definiton of \href.
  % This is necessary because \href command is used in the acl_natbib.bst file.
  \def\href#1#2{{#2}}
  \usepackage{url}
\fi

```


## src/features/texademia/assets/acl/acl_natbib.bst

```bst
%%% Modification of BibTeX style file acl_natbib_nourl.bst
%%% ... by urlbst, version 0.9.1 (marked with "% urlbst")
%%% See <https://purl.org/nxg/dist/urlbst> and repository <https://heptapod.host/nxg/urlbst>
%%% Modifications Copyright 2002–23, Norman Gray,
%%% and distributed under the terms of the LPPL; see README for discussion.
%%%
%%% Added webpage entry type, and url and lastchecked fields.
%%% Added eprint support.
%%% Added DOI support.
%%% Added PUBMED support.
%%% Added hyperref support.
%%% Original headers follow...

%%
%% This is file `acl_natbib_basic.bst',
%% generated with the docstrip utility.
%%
%% The original source files were:
%%
%% merlin.mbs  (with options: `ay,nat,pres,ed-au,keyxyr,blkyear,dt-beg,yr-per,note-yr,num-xser,pre-edn,xedn,nfss')
%% ----------------------------------------
%% *** Intended for ACL conferences ***
%%
%% Copyright 1994-2011 Patrick W Daly
 % ===============================================================
 % IMPORTANT NOTICE:
 % This bibliographic style (bst) file has been generated from one or
 % more master bibliographic style (mbs) files, listed above.
 %
 % This generated file can be redistributed and/or modified under the terms
 % of the LaTeX Project Public License Distributed from CTAN
 % archives in directory macros/latex/base/lppl.txt; either
 % version 1 of the License, or any later version.
 % ===============================================================
 % Name and version information of the main mbs file:
 % \ProvidesFile{merlin.mbs}[2011/11/18 4.33 (PWD, AO, DPC)]
 %   For use with BibTeX version 0.99a or later
 %-------------------------------------------------------------------
 % This bibliography style file is intended for texts in ENGLISH
 % This is an author-year citation style bibliography. As such, it is
 % non-standard LaTeX, and requires a special package file to function properly.
 % Such a package is    natbib.sty   by Patrick W. Daly
 % The form of the \bibitem entries is
 %   \bibitem[Jones et al.(1990)]{key}...
 %   \bibitem[Jones et al.(1990)Jones, Baker, and Smith]{key}...
 % The essential feature is that the label (the part in brackets) consists
 % of the author names, as they should appear in the citation, with the year
 % in parentheses following. There must be no space before the opening
 % parenthesis!
 % With natbib v5.3, a full list of authors may also follow the year.
 % In natbib.sty, it is possible to define the type of enclosures that is
 % really wanted (brackets or parentheses), but in either case, there must
 % be parentheses in the label.
 % The \cite command functions as follows:
 %   \citet{key} ==>>                Jones et al. (1990)
 %   \citet*{key} ==>>               Jones, Baker, and Smith (1990)
 %   \citep{key} ==>>                (Jones et al., 1990)
 %   \citep*{key} ==>>               (Jones, Baker, and Smith, 1990)
 %   \citep[chap. 2]{key} ==>>       (Jones et al., 1990, chap. 2)
 %   \citep[e.g.][]{key} ==>>        (e.g. Jones et al., 1990)
 %   \citep[e.g.][p. 32]{key} ==>>   (e.g. Jones et al., 1990, p. 32)
 %   \citeauthor{key} ==>>           Jones et al.
 %   \citeauthor*{key} ==>>          Jones, Baker, and Smith
 %   \citeyear{key} ==>>             1990
 %---------------------------------------------------------------------

%% 2025 modified to truncate author lists of more than 20 authors

ENTRY
  { address
    archivePrefix
    author
    booktitle
    chapter
    edition
    editor
    eid
    eprint
    eprinttype % = archivePrefix
    howpublished
    institution
    journal
    key
    month
    note
    number
    organization
    pages
    publisher
    school
    series
    title
    type
    volume
    year
    doi % urlbst
    pubmed % urlbst
    url % urlbst
    lastchecked % urlbst
  }
  {}
  { label extra.label sort.label short.list }
INTEGERS { output.state before.all mid.sentence after.sentence after.block }
% urlbst...
% urlbst constants and state variables
STRINGS { urlintro
  eprinturl eprintprefix doiprefix doiurl pubmedprefix pubmedurl
  citedstring onlinestring linktextstring
  openinlinelink closeinlinelink }
INTEGERS { hrefform doiform inlinelinks makeinlinelink
  addeprints adddoi addpubmed }
FUNCTION {init.urlbst.variables}
{
  % The following constants may be adjusted by hand, if desired

  % The first set allow you to enable or disable certain functionality.
  #1 'addeprints :=	% 0=no eprints; 1=include eprints
  #2 'hrefform :=	% 0=no crossrefs; 1=hypertex hrefs; 2=hyperref hrefs
  #1 'inlinelinks :=	% 0=URLs explicit; 1=URLs attached to titles
  #1 'adddoi :=	% 0=no DOI resolver; 1=include it
  #1 'addpubmed :=	% 0=no PUBMED resolver; 1=include it
  #0 'doiform :=	% 0=with href; 1=with \doi{}

  % String constants, which you _might_ want to tweak.
  "online" 'onlinestring :=	% label that a resource is online
  "[link]" 'linktextstring :=	% anonymous link text
  "http://www.ncbi.nlm.nih.gov/pubmed/" 'pubmedurl :=	% prefix to make URL from PUBMED
  "https://doi.org/" 'doiurl :=	% prefix to make URL from DOI
  "doi:" 'doiprefix :=	% printed text to introduce DOI
  "https://arxiv.org/abs/" 'eprinturl :=	% prefix to make URL from eprint ref
  "cited " 'citedstring :=	% label in "lastchecked" remark
  "arXiv:" 'eprintprefix :=	% text prefix printed before eprint ref
  "PMID:" 'pubmedprefix :=	% text prefix printed before PUBMED ref
  "URL: " 'urlintro :=	% text prefix before URL

  % The following are internal state variables, not configuration constants,
  % so they shouldn't be fiddled with.
  #0 'makeinlinelink :=     % state variable managed by possibly.setup.inlinelink
  "" 'openinlinelink :=     % ditto
  "" 'closeinlinelink :=    % ditto
}
INTEGERS {
  bracket.state
  outside.brackets
  open.brackets
  within.brackets
  close.brackets
}
% ...urlbst to here
FUNCTION {init.state.consts}
{ #0 'outside.brackets := % urlbst...
  #1 'open.brackets :=
  #2 'within.brackets :=
  #3 'close.brackets := % ...urlbst to here

  #0 'before.all :=
  #1 'mid.sentence :=
  #2 'after.sentence :=
  #3 'after.block :=
}
STRINGS { s t}
% urlbst
FUNCTION {output.nonnull.original}
{ 's :=
  output.state mid.sentence =
    { ", " * write$ }
    { output.state after.block =
        { add.period$ write$
          newline$
          "\newblock " write$
        }
        { output.state before.all =
            'write$
            { add.period$ " " * write$ }
          if$
        }
      if$
      mid.sentence 'output.state :=
    }
  if$
  s
}

% urlbst...
% Minimal DOI parsing.
% Given a DOI on the stack, check whether it starts with 'doiurl' or not.
% In either case, leave on the stack first a DOI with, and then a DOI without, the URL prefix.
FUNCTION {parse.doi}
{
  #1 doiurl text.length$ substring$
  doiurl =
    { doi
      doi doiurl text.length$ #1 + #999 substring$ }
    { doiurl doi *
      doi }
  if$
}
% The following three functions are for handling inlinelink.  They wrap
% a block of text which is potentially output with write$ by multiple
% other functions, so we don't know the content a priori.
% They communicate between each other using the variables makeinlinelink
% (which is true if a link should be made), and closeinlinelink (which holds
% the string which should close any current link.  They can be called
% at any time, but start.inlinelink will be a no-op unless something has
% previously set makeinlinelink true, and the two ...end.inlinelink functions
% will only do their stuff if start.inlinelink has previously set
% closeinlinelink to be non-empty.
% (thanks to 'ijvm' for suggested code here)
FUNCTION {uand}
{ 'skip$ { pop$ #0 } if$ } % 'and' (which isn't defined at this point in the file)
FUNCTION {possibly.setup.inlinelink}
{ makeinlinelink hrefform #0 > uand
    { doi empty$ adddoi uand
        { pubmed empty$ addpubmed uand
            { eprint empty$ addeprints uand
                { url empty$
                    { "" }
                    { url }
                  if$ }
                { eprinturl eprint * }
              if$ }
            { pubmedurl pubmed * }
          if$ }
%        { doiurl doi * }
        { doi empty$
            { "XXX" }
            { doi parse.doi pop$ }
          if$
        }
      if$
      % an appropriately-formatted URL is now on the stack
      hrefform #1 = % hypertex
        { "\special {html:<a href=" quote$ * swap$ * quote$ * "> }{" * 'openinlinelink :=
          "\special {html:</a>}" 'closeinlinelink := }
        { "\href {" swap$ * "} {" * 'openinlinelink := % hrefform=#2 -- hyperref
          % the space between "} {" matters: a URL of just the right length can cause "\% newline em"
          "}" 'closeinlinelink := }
      if$
      #0 'makeinlinelink :=
      }
    'skip$
  if$ % makeinlinelink
}
FUNCTION {add.inlinelink}
{ openinlinelink empty$
    'skip$
    { openinlinelink swap$ * closeinlinelink *
      "" 'openinlinelink :=
      }
  if$
}
FUNCTION {output.nonnull}
{ % Save the thing we've been asked to output
  's :=
  % If the bracket-state is close.brackets, then add a close-bracket to
  % what is currently at the top of the stack, and set bracket.state
  % to outside.brackets
  bracket.state close.brackets =
    { "]" *
      outside.brackets 'bracket.state :=
    }
    'skip$
  if$
  bracket.state outside.brackets =
    { % We're outside all brackets -- this is the normal situation.
      % Write out what's currently at the top of the stack, using the
      % original output.nonnull function.
      s
      add.inlinelink
      output.nonnull.original % invoke the original output.nonnull
    }
    { % Still in brackets.  Add open-bracket or (continuation) comma, add the
      % new text (in s) to the top of the stack, and move to the close-brackets
      % state, ready for next time (unless inbrackets resets it).  If we come
      % into this branch, then output.state is carefully undisturbed.
      bracket.state open.brackets =
        { " [" * }
        { ", " * } % bracket.state will be within.brackets
      if$
      s *
      close.brackets 'bracket.state :=
    }
  if$
}

% Call this function just before adding something which should be presented in
% brackets.  bracket.state is handled specially within output.nonnull.
FUNCTION {inbrackets}
{ bracket.state close.brackets =
    { within.brackets 'bracket.state := } % reset the state: not open nor closed
    { open.brackets 'bracket.state := }
  if$
}

FUNCTION {format.lastchecked}
{ lastchecked empty$
    { "" }
    { inbrackets citedstring lastchecked * }
  if$
}
% ...urlbst to here
FUNCTION {output}
{ duplicate$ empty$
    'pop$
    'output.nonnull
  if$
}
FUNCTION {output.check}
{ 't :=
  duplicate$ empty$
    { pop$ "empty " t * " in " * cite$ * warning$ }
    'output.nonnull
  if$
}
FUNCTION {fin.entry.original} % urlbst (renamed from fin.entry, so it can be wrapped below)
{ add.period$
  write$
  newline$
}

FUNCTION {new.block}
{ output.state before.all =
    'skip$
    { after.block 'output.state := }
  if$
}
FUNCTION {new.sentence}
{ output.state after.block =
    'skip$
    { output.state before.all =
        'skip$
        { after.sentence 'output.state := }
      if$
    }
  if$
}
FUNCTION {add.blank}
{  " " * before.all 'output.state :=
}

FUNCTION {date.block}
{
  new.block
}

FUNCTION {not}
{   { #0 }
    { #1 }
  if$
}
FUNCTION {and}
{   'skip$
    { pop$ #0 }
  if$
}
FUNCTION {or}
{   { pop$ #1 }
    'skip$
  if$
}
FUNCTION {new.block.checkb}
{ empty$
  swap$ empty$
  and
    'skip$
    'new.block
  if$
}
FUNCTION {field.or.null}
{ duplicate$ empty$
    { pop$ "" }
    'skip$
  if$
}
FUNCTION {emphasize}
{ duplicate$ empty$
    { pop$ "" }
    { "\emph{" swap$ * "}" * }
  if$
}
FUNCTION {tie.or.space.prefix} % puts ~ before the preceding part if it is of length <3
{ duplicate$ text.length$ #3 <
    { "~" }
    { " " }
  if$
  swap$
}

FUNCTION {capitalize}
{ "u" change.case$ "t" change.case$ }

FUNCTION {space.word}
{ " " swap$ * " " * }
 % Here are the language-specific definitions for explicit words.
 % Each function has a name bbl.xxx where xxx is the English word.
 % The language selected here is ENGLISH
FUNCTION {bbl.and}
{ "and"}

FUNCTION {bbl.etal}
{ "et~al." }

FUNCTION {bbl.editors}
{ "editors" }

FUNCTION {bbl.editor}
{ "editor" }

FUNCTION {bbl.edby}
{ "edited by" }

FUNCTION {bbl.edition}
{ "edition" }

FUNCTION {bbl.volume}
{ "volume" }

FUNCTION {bbl.of}
{ "of" }

FUNCTION {bbl.number}
{ "number" }

FUNCTION {bbl.nr}
{ "no." }

FUNCTION {bbl.in}
{ "in" }

FUNCTION {bbl.pages}
{ "pages" }

FUNCTION {bbl.page}
{ "page" }

FUNCTION {bbl.chapter}
{ "chapter" }

FUNCTION {bbl.techrep}
{ "Technical Report" }

FUNCTION {bbl.mthesis}
{ "Master's thesis" }

FUNCTION {bbl.phdthesis}
{ "Ph.D. thesis" }

MACRO {jan} {"January"}

MACRO {feb} {"February"}

MACRO {mar} {"March"}

MACRO {apr} {"April"}

MACRO {may} {"May"}

MACRO {jun} {"June"}

MACRO {jul} {"July"}

MACRO {aug} {"August"}

MACRO {sep} {"September"}

MACRO {oct} {"October"}

MACRO {nov} {"November"}

MACRO {dec} {"December"}

MACRO {acmcs} {"ACM Computing Surveys"}

MACRO {acta} {"Acta Informatica"}

MACRO {cacm} {"Communications of the ACM"}

MACRO {ibmjrd} {"IBM Journal of Research and Development"}

MACRO {ibmsj} {"IBM Systems Journal"}

MACRO {ieeese} {"IEEE Transactions on Software Engineering"}

MACRO {ieeetc} {"IEEE Transactions on Computers"}

MACRO {ieeetcad}
 {"IEEE Transactions on Computer-Aided Design of Integrated Circuits"}

MACRO {ipl} {"Information Processing Letters"}

MACRO {jacm} {"Journal of the ACM"}

MACRO {jcss} {"Journal of Computer and System Sciences"}

MACRO {scp} {"Science of Computer Programming"}

MACRO {sicomp} {"SIAM Journal on Computing"}

MACRO {tocs} {"ACM Transactions on Computer Systems"}

MACRO {tods} {"ACM Transactions on Database Systems"}

MACRO {tog} {"ACM Transactions on Graphics"}

MACRO {toms} {"ACM Transactions on Mathematical Software"}

MACRO {toois} {"ACM Transactions on Office Information Systems"}

MACRO {toplas} {"ACM Transactions on Programming Languages and Systems"}

MACRO {tcs} {"Theoretical Computer Science"}

% bibinfo.check avoids acting on missing fields while bibinfo.warn will
% issue a warning message if a missing field is detected. Prior to calling
% the bibinfo functions, the user should push the field value and then its
% name string, in that order.
FUNCTION {bibinfo.check}
{ swap$
  duplicate$ missing$
    {
      pop$ pop$
      ""
    }
    { duplicate$ empty$
        {
          swap$ pop$
        }
        { swap$
          pop$
        }
      if$
    }
  if$
}
FUNCTION {bibinfo.warn}
{ swap$
  duplicate$ missing$
    {
      swap$ "missing " swap$ * " in " * cite$ * warning$ pop$
      ""
    }
    { duplicate$ empty$
        {
          swap$ "empty " swap$ * " in " * cite$ * warning$
        }
        { swap$
          pop$
        }
      if$
    }
  if$
}
INTEGERS { nameptr namesleft numnames truncated }


STRINGS  { bibinfo}

FUNCTION {format.names}
{ 'bibinfo :=
  duplicate$ empty$ 'skip$ {
  's :=
  "" 't :=
  #1 'nameptr :=
  #0 'truncated :=
  s num.names$ 'numnames :=
  numnames 'namesleft :=
    { namesleft #0 > }
    { s nameptr
      "{ff~}{vv~}{ll}{, jj}" % first name first for all authors
      format.name$
      bibinfo bibinfo.check
      't :=
      nameptr #1 >
        {
          nameptr #19	% truncate after 19 names
          #1 + =
          numnames #20	% if there are more than 20 names
          > and
            {
              #1 'namesleft :=
              #1 'truncated := }
            'skip$
          if$		% end truncation of long list of names
          namesleft #1 >
            { ", " * t * }
            {
              s numnames "{ll}" format.name$ duplicate$ "others" =
                { 't := }
                { pop$ }
              if$
              numnames #2 >
                { "," * }
                'skip$
              if$
              t "others" =
                {
		  % The author field literally ended with "and others";
		  % there is no meaningful count, so render "et al."
		  " " * bbl.etal *
		}
		{
		  truncated #0 >
		    {
		      % Author list was truncated (>20 authors): report the
		      % number of remaining authors that were dropped.
		      " and " * numnames nameptr - #1 + int.to.str$ * " others" *
		    }
		    {
                      bbl.and
                      space.word * t *
		    }
		  if$
                }
              if$
            }
          if$
        }
        't
      if$
      nameptr #1 + 'nameptr :=
      namesleft #1 - 'namesleft :=
    }
  while$
  } if$
}
FUNCTION {format.names.ed}
{
  format.names
}
FUNCTION {format.key}
{ empty$
    { key field.or.null }
    { "" }
  if$
}

FUNCTION {format.authors}
{ author "author" format.names
}
FUNCTION {get.bbl.editor}
{ editor num.names$ #1 > 'bbl.editors 'bbl.editor if$ }

FUNCTION {format.editors}
{ editor "editor" format.names duplicate$ empty$ 'skip$
    {
      "," *
      " " *
      get.bbl.editor
      *
    }
  if$
}
FUNCTION {format.note}
{
 note empty$
    { "" }
    { note #1 #1 substring$
      duplicate$ "{" =
        'skip$
        { output.state mid.sentence =
          { "l" }
          { "u" }
        if$
        change.case$
        }
      if$
      note #2 global.max$ substring$ * "note" bibinfo.check
    }
  if$
}

FUNCTION {format.title}
{ title
  duplicate$ empty$ 'skip$
    { "t" change.case$ }
  if$
  "title" bibinfo.check
}
FUNCTION {format.full.names}
{'s :=
 "" 't :=
  #1 'nameptr :=
  s num.names$ 'numnames :=
  numnames 'namesleft :=
    { namesleft #0 > }
    { s nameptr
      "{vv~}{ll}" format.name$
      't :=
      nameptr #1 >
        {
          namesleft #1 >
            { ", " * t * }
            {
              s nameptr "{ll}" format.name$ duplicate$ "others" =
                { 't := }
                { pop$ }
              if$
              t "others" =
                {
                  " " * bbl.etal *
                }
                {
                  numnames #2 >
                    { "," * }
                    'skip$
                  if$
                  bbl.and
                  space.word * t *
                }
              if$
            }
          if$
        }
        't
      if$
      nameptr #1 + 'nameptr :=
      namesleft #1 - 'namesleft :=
    }
  while$
}

FUNCTION {author.editor.key.full}
{ author empty$
    { editor empty$
        { key empty$
            { cite$ #1 #3 substring$ }
            'key
          if$
        }
        { editor format.full.names }
      if$
    }
    { author format.full.names }
  if$
}

FUNCTION {author.key.full}
{ author empty$
    { key empty$
         { cite$ #1 #3 substring$ }
          'key
      if$
    }
    { author format.full.names }
  if$
}

FUNCTION {editor.key.full}
{ editor empty$
    { key empty$
         { cite$ #1 #3 substring$ }
          'key
      if$
    }
    { editor format.full.names }
  if$
}

FUNCTION {make.full.names}
{ type$ "book" =
  type$ "inbook" =
  or
    'author.editor.key.full
    { type$ "proceedings" =
        'editor.key.full
        'author.key.full
      if$
    }
  if$
}

FUNCTION {output.bibitem.original} % urlbst (renamed from output.bibitem, so it can be wrapped below)
{ newline$
  "\bibitem[{" write$
  label write$
  ")" make.full.names duplicate$ short.list =
     { pop$ }
     { * }
   if$
  "}]{" * write$
  cite$ write$
  "}" write$
  newline$
  ""
  before.all 'output.state :=
}

FUNCTION {n.dashify}
{
  't :=
  ""
    { t empty$ not }
    { t #1 #1 substring$ "-" =
        { t #1 #2 substring$ "--" = not
            { "--" *
              t #2 global.max$ substring$ 't :=
            }
            {   { t #1 #1 substring$ "-" = }
                { "-" *
                  t #2 global.max$ substring$ 't :=
                }
              while$
            }
          if$
        }
        { t #1 #1 substring$ *
          t #2 global.max$ substring$ 't :=
        }
      if$
    }
  while$
}

FUNCTION {word.in}
{ bbl.in capitalize
  " " * }

FUNCTION {format.date}
{ year "year" bibinfo.check duplicate$ empty$
    {
    }
    'skip$
  if$
  extra.label *
  before.all 'output.state :=
  after.sentence 'output.state :=
}
FUNCTION {format.btitle}
{ title "title" bibinfo.check
  duplicate$ empty$ 'skip$
    {
      emphasize
    }
  if$
}
FUNCTION {either.or.check}
{ empty$
    'pop$
    { "can't use both " swap$ * " fields in " * cite$ * warning$ }
  if$
}
FUNCTION {format.bvolume}
{ volume empty$
    { "" }
    { bbl.volume volume tie.or.space.prefix
      "volume" bibinfo.check * *
      series "series" bibinfo.check
      duplicate$ empty$ 'pop$
        { swap$ bbl.of space.word * swap$
          emphasize * }
      if$
      "volume and number" number either.or.check
    }
  if$
}
FUNCTION {format.number.series}
{ volume empty$
    { number empty$
        { series field.or.null }
        { series empty$
            { number "number" bibinfo.check }
            { output.state mid.sentence =
                { bbl.number }
                { bbl.number capitalize }
              if$
              number tie.or.space.prefix "number" bibinfo.check * *
              bbl.in space.word *
              series "series" bibinfo.check *
            }
          if$
        }
      if$
    }
    { "" }
  if$
}

FUNCTION {format.edition}
{ edition duplicate$ empty$ 'skip$
    {
      output.state mid.sentence =
        { "l" }
        { "t" }
      if$ change.case$
      "edition" bibinfo.check
      " " * bbl.edition *
    }
  if$
}
INTEGERS { multiresult }
FUNCTION {multi.page.check}
{ 't :=
  #0 'multiresult :=
    { multiresult not
      t empty$ not
      and
    }
    { t #1 #1 substring$
      duplicate$ "-" =
      swap$ duplicate$ "," =
      swap$ "+" =
      or or
        { #1 'multiresult := }
        { t #2 global.max$ substring$ 't := }
      if$
    }
  while$
  multiresult
}
FUNCTION {format.pages}
{ pages duplicate$ empty$ 'skip$
    { duplicate$ multi.page.check
        {
          bbl.pages swap$
          n.dashify
        }
        {
          bbl.page swap$
        }
      if$
      tie.or.space.prefix
      "pages" bibinfo.check
      * *
    }
  if$
}
FUNCTION {format.journal.pages}
{ pages duplicate$ empty$ 'pop$
    { swap$ duplicate$ empty$
        { pop$ pop$ format.pages }
        {
          ":" *
          swap$
          n.dashify
          "pages" bibinfo.check
          *
        }
      if$
    }
  if$
}
FUNCTION {format.journal.eid}
{ eid "eid" bibinfo.check
  duplicate$ empty$ 'pop$
    { swap$ duplicate$ empty$ 'skip$
      {
          ":" *
      }
      if$
      swap$ *
    }
  if$
}
FUNCTION {format.vol.num.pages}
{ volume field.or.null
  duplicate$ empty$ 'skip$
    {
      "volume" bibinfo.check
    }
  if$
  number "number" bibinfo.check duplicate$ empty$ 'skip$
    {
      swap$ duplicate$ empty$
        { "there's a number but no volume in " cite$ * warning$ }
        'skip$
      if$
      swap$
      "(" swap$ * ")" *
    }
  if$ *
  eid empty$
    { format.journal.pages }
    { format.journal.eid }
  if$
}

FUNCTION {format.chapter}
{ chapter empty$
    'format.pages
    { type empty$
        { bbl.chapter }
        { type "l" change.case$
          "type" bibinfo.check
        }
      if$
      chapter tie.or.space.prefix
      "chapter" bibinfo.check
      * *
    }
  if$
}

FUNCTION {format.chapter.pages}
{ chapter empty$
    'format.pages
    { type empty$
        { bbl.chapter }
        { type "l" change.case$
          "type" bibinfo.check
        }
      if$
      chapter tie.or.space.prefix
      "chapter" bibinfo.check
      * *
      pages empty$
        'skip$
        { ", " * format.pages * }
      if$
    }
  if$
}

FUNCTION {format.booktitle}
{
  booktitle "booktitle" bibinfo.check
  emphasize
}
FUNCTION {format.in.booktitle}
{ format.booktitle duplicate$ empty$ 'skip$
    {
      word.in swap$ *
    }
  if$
}
FUNCTION {format.in.ed.booktitle}
{ format.booktitle duplicate$ empty$ 'skip$
    {
      editor "editor" format.names.ed duplicate$ empty$ 'pop$
        {
          "," *
          " " *
          get.bbl.editor
          ", " *
          * swap$
          * }
      if$
      word.in swap$ *
    }
  if$
}
FUNCTION {format.thesis.type}
{ type duplicate$ empty$
    'pop$
    { swap$ pop$
      "t" change.case$ "type" bibinfo.check
    }
  if$
}
FUNCTION {format.tr.number}
{ number "number" bibinfo.check
  type duplicate$ empty$
    { pop$ bbl.techrep }
    'skip$
  if$
  "type" bibinfo.check
  swap$ duplicate$ empty$
    { pop$ "t" change.case$ }
    { tie.or.space.prefix * * }
  if$
}
FUNCTION {format.article.crossref}
{
  word.in
  " \cite{" * crossref * "}" *
}
FUNCTION {format.book.crossref}
{ volume duplicate$ empty$
    { "empty volume in " cite$ * "'s crossref of " * crossref * warning$
      pop$ word.in
    }
    { bbl.volume
      capitalize
      swap$ tie.or.space.prefix "volume" bibinfo.check * * bbl.of space.word *
    }
  if$
  " \cite{" * crossref * "}" *
}
FUNCTION {format.incoll.inproc.crossref}
{
  word.in
  " \cite{" * crossref * "}" *
}
FUNCTION {format.org.or.pub}
{ 't :=
  ""
  address empty$ t empty$ and
    'skip$
    {
      t empty$
        { address "address" bibinfo.check *
        }
        { t *
          address empty$
            'skip$
            { ", " * address "address" bibinfo.check * }
          if$
        }
      if$
    }
  if$
}
FUNCTION {format.publisher.address}
{ publisher "publisher" bibinfo.warn format.org.or.pub
}

FUNCTION {format.organization.address}
{ organization "organization" bibinfo.check format.org.or.pub
}

FUNCTION {archiveprefix.or.eprinttype} % holder for eprinttype with archiveprefix precedence
{
  archiveprefix empty$
  {
    eprinttype empty$
      { "" } % not using 'skip$ to reduce errors like "nothing to pop from stack"
      { eprinttype }
    if$
  }
  { archiveprefix }
  if$
}

FUNCTION {output.eprint} % this is only used with the @misc record type (common for arXiv and other preprint server bibtex records)
{
  eprint empty$
    {% if eprint field is empty
      publisher field.or.null "arXiv" = % field.or.null here helps when no publisher field in the record
        { publisher " preprint" * } % add " preprint" to publisher with the idea that publisher is the name of the preprint server
        { "" } % if publisher != "arXiv" then empty output
      if$
      emphasize % no output function after emphasize because nothing goes after this
    }
    {% if eprint field is not empty
      archiveprefix.or.eprinttype empty$
        { "" } % not using 'skip$ to reduce errors like "nothing to pop from stack"
        {% if archiveprefix or eprinttype fields are not empty
          journal empty$
            { "Preprint" } % if journal field is empty: output just "Preprint" emphasized like a journal name
            { journal } % if journal field is not empty, output it (takes precedence)
          if$
          emphasize output % emphasize what we formed before, setting output as a border to the subblock that follows with the comma delimiter
          archiveprefix.or.eprinttype ":" * eprint * % subblock with eprinttype and eprint number
        }
      if$
    }
  if$
}

% urlbst...
% Functions for making hypertext links.
% In all cases, the stack has (link-text href-url)
%
% make 'null' specials
FUNCTION {make.href.null}
{
  pop$
}
% make hypertex specials
FUNCTION {make.href.hypertex}
{
  "\special {html:<a href=" quote$ *
  swap$ * quote$ * "> }" * swap$ *
  "\special {html:</a>}" *
}
% make hyperref specials
FUNCTION {make.href.hyperref}
{
  "\href {" swap$ * "} {\path{" * swap$ * "}}" *
}
FUNCTION {make.href}
{ hrefform #2 =
    'make.href.hyperref      % hrefform = 2
    { hrefform #1 =
        'make.href.hypertex  % hrefform = 1
        'make.href.null      % hrefform = 0 (or anything else)
      if$
    }
  if$
}

% If inlinelinks is true, then format.url should be a no-op, since it's
% (a) redundant, and (b) could end up as a link-within-a-link.
FUNCTION {format.url}
{ inlinelinks #1 = url empty$ or
   { "" }
   { hrefform #1 =
       { % special case -- add HyperTeX specials
         urlintro "\url{" url * "}" * url make.href.hypertex * }
       { urlintro "\url{" * url * "}" * }
     if$
   }
  if$
}
FUNCTION {format.eprint}
{ eprint empty$
    { "" }
    { eprintprefix eprint * eprinturl eprint * make.href }
  if$
}

FUNCTION {format.doi}
{ doi empty$
    { "" }
    { doi parse.doi % leaves "https://doi.org/DOI" DOI on the stack
      's := 't :=
      doiform #1 =
        { "\doi{" s * "}" * }
        { doiprefix s * t make.href }
      if$
    }
  if$
}

FUNCTION {format.pubmed}
{ pubmed empty$
    { "" }
    { pubmedprefix pubmed * pubmedurl pubmed * make.href }
  if$
}

% Output a URL.  We can't use the more normal idiom (something like
% `format.url output'), because the `inbrackets' within
% format.lastchecked applies to everything between calls to `output',
% so that `format.url format.lastchecked * output' ends up with both
% the URL and the lastchecked in brackets.
FUNCTION {output.url}
{ url empty$
    'skip$
    { new.block
      format.url output
      format.lastchecked output
    }
  if$
}

FUNCTION {output.web.refs}
{
  new.block
  inlinelinks
    'skip$ % links were inline -- don't repeat them
    { % If the generated DOI will be the same as the URL,
      % then don't print the URL (thanks to Joseph Wright
      % for (the original version of) this code,
      % at http://tex.stackexchange.com/questions/5660)
      adddoi
          doi empty$ { "X" } { doi parse.doi pop$ } if$ % DOI URL to be generated
          url empty$ { "Y" } { url } if$          % the URL, or "Y" if empty
          =                                       % are the strings equal?
          and
        'skip$
        { output.url }
      if$
      addeprints eprint empty$ not and
        { format.eprint output.nonnull }
        'skip$
      if$
      adddoi doi empty$ not and
        { format.doi output.nonnull }
        'skip$
      if$
      addpubmed pubmed empty$ not and
        { format.pubmed output.nonnull }
        'skip$
      if$
    }
  if$
}

% Wrapper for output.bibitem.original.
% If the URL field is not empty, set makeinlinelink to be true,
% so that an inline link will be started at the next opportunity
FUNCTION {output.bibitem}
{ outside.brackets 'bracket.state :=
  output.bibitem.original
  inlinelinks url empty$ not doi empty$ not or pubmed empty$ not or eprint empty$ not or and
    { #1 'makeinlinelink := }
    { #0 'makeinlinelink := }
  if$
}

% Wrapper for fin.entry.original
FUNCTION {fin.entry}
{ output.web.refs  % urlbst
  makeinlinelink       % ooops, it appears we didn't have a title for inlinelink
    { possibly.setup.inlinelink % add some artificial link text here, as a fallback
      linktextstring output.nonnull }
    'skip$
  if$
  bracket.state close.brackets = % urlbst
    { "]" * }
    'skip$
  if$
  fin.entry.original
}

% Webpage entry type.
% Title and url fields required;
% author, note, year, month, and lastchecked fields optional
% See references
%   ISO 690-2 http://www.nlc-bnc.ca/iso/tc46sc9/standard/690-2e.htm
%   http://www.classroom.net/classroom/CitingNetResources.html
%   http://neal.ctstateu.edu/history/cite.html
%   http://www.cas.usf.edu/english/walker/mla.html
% for citation formats for web pages.
FUNCTION {webpage}
{ output.bibitem
  author empty$
    { editor empty$
        'skip$  % author and editor both optional
        { format.editors output.nonnull }
      if$
    }
    { editor empty$
        { format.authors output.nonnull }
        { "can't use both author and editor fields in " cite$ * warning$ }
      if$
    }
  if$
  new.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$
  format.title "title" output.check
  inbrackets onlinestring output
  new.block
  year empty$
    'skip$
    { format.date "year" output.check }
  if$
  % We don't need to output the URL details ('lastchecked' and 'url'),
  % because fin.entry does that for us, using output.web.refs.  The only
  % reason we would want to put them here is if we were to decide that
  % they should go in front of the rather miscellaneous information in 'note'.
  new.block
  note output
  fin.entry
}
% ...urlbst to here


FUNCTION {article}
{ output.bibitem
  format.authors "author" output.check
  author format.key output
  format.date "year" output.check
  date.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.title "title" output.check
  new.block
  crossref missing$
    {
      journal
      "journal" bibinfo.check
      emphasize
      "journal" output.check
      possibly.setup.inlinelink format.vol.num.pages output% urlbst
    }
    { format.article.crossref output.nonnull
      format.pages output
    }
  if$
  new.block
  format.note output
  fin.entry
}
FUNCTION {book}
{ output.bibitem
  author empty$
    { format.editors "author and editor" output.check
      editor format.key output
    }
    { format.authors output.nonnull
      crossref missing$
        { "author and editor" editor either.or.check }
        'skip$
      if$
    }
  if$
  format.date "year" output.check
  date.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.btitle "title" output.check
  format.edition output
  crossref missing$
    { format.bvolume output
      new.block
      format.number.series output
      new.sentence
      format.publisher.address output
    }
    {
      new.block
      format.book.crossref output.nonnull
    }
  if$
  new.block
  format.note output
  fin.entry
}
FUNCTION {booklet}
{ output.bibitem
  format.authors output
  author format.key output
  format.date "year" output.check
  date.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.title "title" output.check
  new.block
  howpublished "howpublished" bibinfo.check output
  address "address" bibinfo.check output
  new.block
  format.note output
  fin.entry
}

FUNCTION {inbook}
{ output.bibitem
  author empty$
    { format.editors "author and editor" output.check
      editor format.key output
    }
    { format.authors output.nonnull
      crossref missing$
        { "author and editor" editor either.or.check }
        'skip$
      if$
    }
  if$
  format.date "year" output.check
  date.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.btitle "title" output.check
  crossref missing$
    {
      format.edition output
      format.bvolume output
      format.chapter "chapter" output.check
      new.block
      format.number.series output
      new.sentence
      format.publisher.address output
    }
    {
      format.chapter "chapter" output.check
      new.block
      format.book.crossref output.nonnull
    }
  if$
  new.block
  format.note output
  fin.entry
}

FUNCTION {incollection}
{ output.bibitem
  format.authors "author" output.check
  author format.key output
  format.date "year" output.check
  date.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.title "title" output.check
  new.block
  crossref missing$
    { format.in.ed.booktitle "booktitle" output.check
      format.edition output
      format.bvolume output
      format.number.series output
      format.chapter.pages output
      new.sentence
      format.publisher.address output
    }
    { format.incoll.inproc.crossref output.nonnull
      format.chapter.pages output
    }
  if$
  new.block
  format.note output
  fin.entry
}
FUNCTION {inproceedings}
{ output.bibitem
  format.authors "author" output.check
  author format.key output
  format.date "year" output.check
  date.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.title "title" output.check
  new.block
  crossref missing$
    { format.in.booktitle "booktitle" output.check
      format.bvolume output
      format.number.series output
      format.pages output
      address "address" bibinfo.check output
      new.sentence
      organization "organization" bibinfo.check output
      publisher "publisher" bibinfo.check output
    }
    { format.incoll.inproc.crossref output.nonnull
      format.pages output
    }
  if$
  new.block
  format.note output
  fin.entry
}
FUNCTION {conference} { inproceedings }
FUNCTION {manual}
{ output.bibitem
  format.authors output
  author format.key output
  format.date "year" output.check
  date.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.btitle "title" output.check
  format.edition output
  organization address new.block.checkb
  organization "organization" bibinfo.check output
  address "address" bibinfo.check output
  new.block
  format.note output
  fin.entry
}

FUNCTION {mastersthesis}
{ output.bibitem
  format.authors "author" output.check
  author format.key output
  format.date "year" output.check
  date.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.title
  "title" output.check
  new.block
  bbl.mthesis format.thesis.type output.nonnull
  school "school" bibinfo.warn output
  address "address" bibinfo.check output
  month "month" bibinfo.check output
  new.block
  format.note output
  fin.entry
}

FUNCTION {misc}
{ output.bibitem
  format.authors output
  author format.key output
  format.date "year" output.check
  date.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.title output
  new.block
  howpublished "howpublished" bibinfo.check output
  new.block
  output.eprint output
  new.block
  format.note output
  fin.entry
}
FUNCTION {phdthesis}
{ output.bibitem
  format.authors "author" output.check
  author format.key output
  format.date "year" output.check
  date.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.btitle
  "title" output.check
  new.block
  bbl.phdthesis format.thesis.type output.nonnull
  school "school" bibinfo.warn output
  address "address" bibinfo.check output
  new.block
  format.note output
  fin.entry
}

FUNCTION {presentation}
{ output.bibitem
  format.authors output
  author format.key output
  new.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.title output
  new.block
  format.organization.address "organization and address" output.check
  month "month" output.check
  year "year" output.check
  new.block
  format.note output
  new.sentence
  type missing$ 'skip$
  {"(" type capitalize * ")" * output}
    if$
  fin.entry
}

FUNCTION {proceedings}
{ output.bibitem
  format.editors output
  editor format.key output
  format.date "year" output.check
  date.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.btitle "title" output.check
  format.bvolume output
  format.number.series output
  new.sentence
  publisher empty$
    { format.organization.address output }
    { organization "organization" bibinfo.check output
      new.sentence
      format.publisher.address output
    }
  if$
  new.block
  format.note output
  fin.entry
}

FUNCTION {techreport}
{ output.bibitem
  format.authors "author" output.check
  author format.key output
  format.date "year" output.check
  date.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.title
  "title" output.check
  new.block
  format.tr.number output.nonnull
  institution "institution" bibinfo.warn output
  address "address" bibinfo.check output
  new.block
  format.note output
  fin.entry
}

FUNCTION {unpublished}
{ output.bibitem
  format.authors "author" output.check
  author format.key output
  format.date "year" output.check
  date.block
  title empty$ 'skip$ 'possibly.setup.inlinelink if$ % urlbst
  format.title "title" output.check
  new.block
  format.note "note" output.check
  fin.entry
}

FUNCTION {default.type} { misc }
READ
FUNCTION {sortify}
{ purify$
  "l" change.case$
}
INTEGERS { len }
FUNCTION {chop.word}
{ 's :=
  'len :=
  s #1 len substring$ =
    { s len #1 + global.max$ substring$ }
    's
  if$
}
FUNCTION {format.lab.names}
{ 's :=
  "" 't :=
  s #1 "{vv~}{ll}" format.name$
  s num.names$ duplicate$
  #2 >
    { pop$
      " " * bbl.etal *
    }
    { #2 <
        'skip$
        { s #2 "{ff }{vv }{ll}{ jj}" format.name$ "others" =
            {
              " " * bbl.etal *
            }
            { bbl.and space.word * s #2 "{vv~}{ll}" format.name$
              * }
          if$
        }
      if$
    }
  if$
}

FUNCTION {author.key.label}
{ author empty$
    { key empty$
        { cite$ #1 #3 substring$ }
        'key
      if$
    }
    { author format.lab.names }
  if$
}

FUNCTION {author.editor.key.label}
{ author empty$
    { editor empty$
        { key empty$
            { cite$ #1 #3 substring$ }
            'key
          if$
        }
        { editor format.lab.names }
      if$
    }
    { author format.lab.names }
  if$
}

FUNCTION {editor.key.label}
{ editor empty$
    { key empty$
        { cite$ #1 #3 substring$ }
        'key
      if$
    }
    { editor format.lab.names }
  if$
}

FUNCTION {calc.short.authors}
{ type$ "book" =
  type$ "inbook" =
  or
    'author.editor.key.label
    { type$ "proceedings" =
        'editor.key.label
        'author.key.label
      if$
    }
  if$
  'short.list :=
}

FUNCTION {calc.label}
{ calc.short.authors
  short.list
  "("
  *
  year duplicate$ empty$
  short.list key field.or.null = or
     { pop$ "" }
     'skip$
  if$
  *
  'label :=
}

FUNCTION {sort.format.names}
{ 's :=
  #1 'nameptr :=
  ""
  s num.names$ 'numnames :=
  numnames 'namesleft :=
    { namesleft #0 > }
    { s nameptr
      "{vv{ } }{ll{ }}{  ff{ }}{  jj{ }}"
      format.name$ 't :=
      nameptr #1 >
        {
          "   "  *
          namesleft #1 = t "others" = and
            { "zzzzz" 't := }
            'skip$
          if$
          t sortify *
        }
        { t sortify * }
      if$
      nameptr #1 + 'nameptr :=
      namesleft #1 - 'namesleft :=
    }
  while$
}

FUNCTION {sort.format.title}
{ 't :=
  "A " #2
    "An " #3
      "The " #4 t chop.word
    chop.word
  chop.word
  sortify
  #1 global.max$ substring$
}
FUNCTION {author.sort}
{ author empty$
    { key empty$
        { "to sort, need author or key in " cite$ * warning$
          ""
        }
        { key sortify }
      if$
    }
    { author sort.format.names }
  if$
}
FUNCTION {author.editor.sort}
{ author empty$
    { editor empty$
        { key empty$
            { "to sort, need author, editor, or key in " cite$ * warning$
              ""
            }
            { key sortify }
          if$
        }
        { editor sort.format.names }
      if$
    }
    { author sort.format.names }
  if$
}
FUNCTION {editor.sort}
{ editor empty$
    { key empty$
        { "to sort, need editor or key in " cite$ * warning$
          ""
        }
        { key sortify }
      if$
    }
    { editor sort.format.names }
  if$
}
FUNCTION {presort}
{ calc.label
  label sortify
  "    "
  *
  type$ "book" =
  type$ "inbook" =
  or
    'author.editor.sort
    { type$ "proceedings" =
        'editor.sort
        'author.sort
      if$
    }
  if$
  #1 entry.max$ substring$
  'sort.label :=
  sort.label
  *
  "    "
  *
  title field.or.null
  sort.format.title
  *
  #1 entry.max$ substring$
  'sort.key$ :=
}

ITERATE {presort}
SORT
STRINGS { last.label next.extra }
INTEGERS { last.extra.num last.extra.num.extended last.extra.num.blank number.label }
FUNCTION {initialize.extra.label.stuff}
{ #0 int.to.chr$ 'last.label :=
  "" 'next.extra :=
  #0 'last.extra.num :=
  "a" chr.to.int$ #1 - 'last.extra.num.blank :=
  last.extra.num.blank 'last.extra.num.extended :=
  #0 'number.label :=
}
FUNCTION {forward.pass}
{ last.label label =
    { last.extra.num #1 + 'last.extra.num :=
      last.extra.num "z" chr.to.int$ >
       { "a" chr.to.int$ 'last.extra.num :=
         last.extra.num.extended #1 + 'last.extra.num.extended :=
       }
       'skip$
      if$
      last.extra.num.extended last.extra.num.blank >
        { last.extra.num.extended int.to.chr$
          last.extra.num int.to.chr$
          * 'extra.label := }
        { last.extra.num int.to.chr$ 'extra.label := }
      if$
    }
    { "a" chr.to.int$ 'last.extra.num :=
      "" 'extra.label :=
      label 'last.label :=
    }
  if$
  number.label #1 + 'number.label :=
}
FUNCTION {reverse.pass}
{ next.extra "b" =
    { "a" 'extra.label := }
    'skip$
  if$
  extra.label 'next.extra :=
  extra.label
  duplicate$ empty$
    'skip$
    { year field.or.null #-1 #1 substring$ chr.to.int$ #65 <
      { "{\natexlab{" swap$ * "}}" * }
      { "{(\natexlab{" swap$ * "})}" * }
    if$ }
  if$
  'extra.label :=
  label extra.label * 'label :=
}
EXECUTE {initialize.extra.label.stuff}
ITERATE {forward.pass}
REVERSE {reverse.pass}
FUNCTION {bib.sort.order}
{ sort.label
  "    "
  *
  year field.or.null sortify
  *
  "    "
  *
  title field.or.null
  sort.format.title
  *
  #1 entry.max$ substring$
  'sort.key$ :=
}
ITERATE {bib.sort.order}
SORT
FUNCTION {begin.bib}
{ preamble$ empty$
    'skip$
    { preamble$ write$ newline$ }
  if$
  "\begin{thebibliography}{" number.label int.to.str$ * "}" *
  write$ newline$
  "\providecommand{\natexlab}[1]{#1}"
  write$ newline$
}
EXECUTE {begin.bib}
EXECUTE {init.urlbst.variables} % urlbst
EXECUTE {init.state.consts}
ITERATE {call.type$}
FUNCTION {end.bib}
{ newline$
  "\end{thebibliography}" write$ newline$
}
EXECUTE {end.bib}
%% End of customized bst file
%%
%% End of file `acl_natbib_basic.bst'.

```


## src/features/texademia/assets/arxiv/arxiv.sty

```sty
\NeedsTeXFormat{LaTeX2e}

\ProcessOptions\relax

% fonts
\renewcommand{\rmdefault}{ptm}
\renewcommand{\sfdefault}{phv}

% set page geometry
\usepackage[verbose=true,letterpaper]{geometry}
\AtBeginDocument{
  \newgeometry{
    textheight=9in,
    textwidth=6.5in,
    top=1in,
    headheight=14pt,
    headsep=25pt,
    footskip=30pt
  }
}

\widowpenalty=10000
\clubpenalty=10000
\flushbottom
\sloppy



\newcommand{\headeright}{A Preprint}
\newcommand{\undertitle}{A Preprint}
\newcommand{\shorttitle}{\@title}

\usepackage{fancyhdr}
\fancyhf{}
\pagestyle{fancy}
\renewcommand{\headrulewidth}{0.4pt}
\fancyheadoffset{0pt}
\rhead{\scshape \footnotesize \headeright}
\chead{\shorttitle}
\cfoot{\thepage}


%Handling Keywords
\def\keywordname{{\bfseries \emph{Keywords}}}%
\def\keywords#1{\par\addvspace\medskipamount{\rightskip=0pt plus1cm
\def\and{\ifhmode\unskip\nobreak\fi\ $\cdot$
}\noindent\keywordname\enspace\ignorespaces#1\par}}

% font sizes with reduced leading
\renewcommand{\normalsize}{%
  \@setfontsize\normalsize\@xpt\@xipt
  \abovedisplayskip      7\p@ \@plus 2\p@ \@minus 5\p@
  \abovedisplayshortskip \z@ \@plus 3\p@
  \belowdisplayskip      \abovedisplayskip
  \belowdisplayshortskip 4\p@ \@plus 3\p@ \@minus 3\p@
}
\normalsize
\renewcommand{\small}{%
  \@setfontsize\small\@ixpt\@xpt
  \abovedisplayskip      6\p@ \@plus 1.5\p@ \@minus 4\p@
  \abovedisplayshortskip \z@  \@plus 2\p@
  \belowdisplayskip      \abovedisplayskip
  \belowdisplayshortskip 3\p@ \@plus 2\p@   \@minus 2\p@
}
\renewcommand{\footnotesize}{\@setfontsize\footnotesize\@ixpt\@xpt}
\renewcommand{\scriptsize}{\@setfontsize\scriptsize\@viipt\@viiipt}
\renewcommand{\tiny}{\@setfontsize\tiny\@vipt\@viipt}
\renewcommand{\large}{\@setfontsize\large\@xiipt{14}}
\renewcommand{\Large}{\@setfontsize\Large\@xivpt{16}}
\renewcommand{\LARGE}{\@setfontsize\LARGE\@xviipt{20}}
\renewcommand{\huge}{\@setfontsize\huge\@xxpt{23}}
\renewcommand{\Huge}{\@setfontsize\Huge\@xxvpt{28}}

% sections with less space
\providecommand{\section}{}
\renewcommand{\section}{%
  \@startsection{section}{1}{\z@}%
                {-2.0ex \@plus -0.5ex \@minus -0.2ex}%
                { 1.5ex \@plus  0.3ex \@minus  0.2ex}%
                {\large\bf\raggedright}%
}
\providecommand{\subsection}{}
\renewcommand{\subsection}{%
  \@startsection{subsection}{2}{\z@}%
                {-1.8ex \@plus -0.5ex \@minus -0.2ex}%
                { 0.8ex \@plus  0.2ex}%
                {\normalsize\bf\raggedright}%
}
\providecommand{\subsubsection}{}
\renewcommand{\subsubsection}{%
  \@startsection{subsubsection}{3}{\z@}%
                {-1.5ex \@plus -0.5ex \@minus -0.2ex}%
                { 0.5ex \@plus  0.2ex}%
                {\normalsize\bf\raggedright}%
}
\providecommand{\paragraph}{}
\renewcommand{\paragraph}{%
  \@startsection{paragraph}{4}{\z@}%
                {1.5ex \@plus 0.5ex \@minus 0.2ex}%
                {-1em}%
                {\normalsize\bf}%
}
\providecommand{\subparagraph}{}
\renewcommand{\subparagraph}{%
  \@startsection{subparagraph}{5}{\z@}%
                {1.5ex \@plus 0.5ex \@minus 0.2ex}%
                {-1em}%
                {\normalsize\bf}%
}
\providecommand{\subsubsubsection}{}
\renewcommand{\subsubsubsection}{%
  \vskip5pt{\noindent\normalsize\rm\raggedright}%
}

% float placement
\renewcommand{\topfraction      }{0.85}
\renewcommand{\bottomfraction   }{0.4}
\renewcommand{\textfraction     }{0.1}
\renewcommand{\floatpagefraction}{0.7}

\newlength{\@abovecaptionskip}\setlength{\@abovecaptionskip}{7\p@}
\newlength{\@belowcaptionskip}\setlength{\@belowcaptionskip}{\z@}

\setlength{\abovecaptionskip}{\@abovecaptionskip}
\setlength{\belowcaptionskip}{\@belowcaptionskip}

% swap above/belowcaptionskip lengths for tables
\renewenvironment{table}
  {\setlength{\abovecaptionskip}{\@belowcaptionskip}%
   \setlength{\belowcaptionskip}{\@abovecaptionskip}%
   \@float{table}}
  {\end@float}

% footnote formatting
\setlength{\footnotesep }{6.65\p@}
\setlength{\skip\footins}{9\p@ \@plus 4\p@ \@minus 2\p@}
\renewcommand{\footnoterule}{\kern-3\p@ \hrule width 12pc \kern 2.6\p@}
\setcounter{footnote}{0}

% paragraph formatting
\setlength{\parindent}{\z@}
\setlength{\parskip  }{5.5\p@}

% list formatting
\setlength{\topsep       }{4\p@ \@plus 1\p@   \@minus 2\p@}
\setlength{\partopsep    }{1\p@ \@plus 0.5\p@ \@minus 0.5\p@}
\setlength{\itemsep      }{2\p@ \@plus 1\p@   \@minus 0.5\p@}
\setlength{\parsep       }{2\p@ \@plus 1\p@   \@minus 0.5\p@}
\setlength{\leftmargin   }{3pc}
\setlength{\leftmargini  }{\leftmargin}
\setlength{\leftmarginii }{2em}
\setlength{\leftmarginiii}{1.5em}
\setlength{\leftmarginiv }{1.0em}
\setlength{\leftmarginv  }{0.5em}
\def\@listi  {\leftmargin\leftmargini}
\def\@listii {\leftmargin\leftmarginii
              \labelwidth\leftmarginii
              \advance\labelwidth-\labelsep
              \topsep  2\p@ \@plus 1\p@    \@minus 0.5\p@
              \parsep  1\p@ \@plus 0.5\p@ \@minus 0.5\p@
              \itemsep \parsep}
\def\@listiii{\leftmargin\leftmarginiii
              \labelwidth\leftmarginiii
              \advance\labelwidth-\labelsep
              \topsep    1\p@ \@plus 0.5\p@ \@minus 0.5\p@
              \parsep    \z@
              \partopsep 0.5\p@ \@plus 0\p@ \@minus 0.5\p@
              \itemsep \topsep}
\def\@listiv {\leftmargin\leftmarginiv
              \labelwidth\leftmarginiv
              \advance\labelwidth-\labelsep}
\def\@listv  {\leftmargin\leftmarginv
              \labelwidth\leftmarginv
              \advance\labelwidth-\labelsep}
\def\@listvi {\leftmargin\leftmarginvi
              \labelwidth\leftmarginvi
              \advance\labelwidth-\labelsep}

% create title
\providecommand{\maketitle}{}
\renewcommand{\maketitle}{%
  \par
  \begingroup
    \renewcommand{\thefootnote}{\fnsymbol{footnote}}
    % for perfect author name centering
    %\renewcommand{\@makefnmark}{\hbox to \z@{$^{\@thefnmark}$\hss}}
    % The footnote-mark was overlapping the footnote-text,
    % added the following to fix this problem               (MK)
    \long\def\@makefntext##1{%
      \parindent 1em\noindent
      \hbox to 1.8em{\hss $\m@th ^{\@thefnmark}$}##1
    }
    \thispagestyle{empty}
    \@maketitle
    \@thanks
    %\@notice
  \endgroup
  \let\maketitle\relax
  \let\thanks\relax
}

% rules for title box at top of first page
\newcommand{\@toptitlebar}{
  \hrule height 2\p@
  \vskip 0.25in
  \vskip -\parskip%
}
\newcommand{\@bottomtitlebar}{
  \vskip 0.29in
  \vskip -\parskip
  \hrule height 2\p@
  \vskip 0.09in%
}

% create title (includes both anonymized and non-anonymized versions)
\providecommand{\@maketitle}{}
\renewcommand{\@maketitle}{%
  \vbox{%
    \hsize\textwidth
    \linewidth\hsize
    \vskip 0.1in
    \@toptitlebar
    \centering
    {\LARGE\sc \@title\par}
    \@bottomtitlebar
    \textsc{\undertitle}\\
    \vskip 0.1in
    \def\And{%
      \end{tabular}\hfil\linebreak[0]\hfil%
      \begin{tabular}[t]{c}\bf\rule{\z@}{24\p@}\ignorespaces%
    }
    \def\AND{%
      \end{tabular}\hfil\linebreak[4]\hfil%
      \begin{tabular}[t]{c}\bf\rule{\z@}{24\p@}\ignorespaces%
    }
    \begin{tabular}[t]{c}\bf\rule{\z@}{24\p@}\@author\end{tabular}%
  \vskip 0.4in \@minus 0.1in \center{\@date}   \vskip 0.2in
  }
}

% add conference notice to bottom of first page
\newcommand{\ftype@noticebox}{8}
\newcommand{\@notice}{%
  % give a bit of extra room back to authors on first page
  \enlargethispage{2\baselineskip}%
  \@float{noticebox}[b]%
    \footnotesize\@noticestring%
  \end@float%
}

% abstract styling
\renewenvironment{abstract}
{
  \centerline
  {\large \bfseries \scshape Abstract}
  \begin{quote}
}
{
  \end{quote}
}

\endinput

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
from pathlib import Path

from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, JSON

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
    language: str = Field(default="latex", nullable=False)  # "latex" | "bibtex"
    content: str = Field(default="", nullable=False)
    line_authors: list[dict] | None = Field(default=None, sa_column=Column(JSON))

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
from .routers import profile_router, documents_router, compile_router

router = APIRouter()

router.include_router(profile_router)
router.include_router(documents_router)
router.include_router(compile_router)

```


## src/features/texademia/routers/__init__.py

```py
from .profile import router as profile_router
from .documents import router as documents_router
from .compile import router as compile_router

__all__ = ["profile_router", "documents_router", "compile_router"]

```


## src/features/texademia/routers/compile.py

```py
from fastapi import APIRouter
from src.features.texademia.services.compiler import get_job_status

router = APIRouter(prefix="/compile", tags=["compile"])


@router.get("/{job_id}")
async def poll_compile_status(job_id: str):
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
from src.features.auth.dev_user import get_dev_user
from src.features.texademia.models.document import Document, DocumentFile
from src.features.texademia.schemas.document import (
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    DocumentDuplicate,
    FileUpdate,
)
from src.features.texademia.templates import get_template_files
from src.features.texademia.services.compiler import (
    enqueue_compile_job,
    get_job_status,
    CompileError as CompilerError,
)
from src.features.texademia.services.template_migrator import (
    migrate_files_to_template,
)  # NEW

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


async def _get_owned_document(
    document_id: uuid.UUID, session: AsyncSession, user: User
) -> Document:
    statement = (
        select(Document)
        .where(Document.id == document_id, Document.user_id == user.id)
        .options(selectinload(Document.files))
    )
    result = await session.exec(statement)
    document = result.first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


async def _get_owned_file(
    document_id: uuid.UUID, file_id: uuid.UUID, session: AsyncSession, user: User
) -> DocumentFile:
    await _get_owned_document(document_id, session, user)

    statement = select(DocumentFile).where(
        DocumentFile.id == file_id, DocumentFile.document_id == document_id
    )
    result = await session.exec(statement)
    file = result.first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return file


@router.get("", response_model=List[DocumentRead])
async def list_documents(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
):
    statement = select(Document).where(Document.user_id == user.id)
    result = await session.exec(statement)
    return result.all()


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    doc_in: DocumentCreate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
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
    await session.refresh(document, attribute_names=["files"])
    return document


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
):
    return await _get_owned_document(document_id, session, user)


@router.patch("/{document_id}", response_model=DocumentRead)
async def update_document(
    document_id: uuid.UUID,
    doc_in: DocumentUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
):
    document = await _get_owned_document(document_id, session, user)

    if doc_in.title is not None:
        document.title = doc_in.title
    if doc_in.template is not None:
        document.template = doc_in.template

    session.add(document)
    await session.commit()
    await session.refresh(document, attribute_names=["files"])
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
):
    document = await _get_owned_document(document_id, session, user)
    await session.delete(document)
    await session.commit()


@router.patch("/{document_id}/files/{file_id}", response_model=DocumentRead)
async def update_file(
    document_id: uuid.UUID,
    file_id: uuid.UUID,
    file_in: FileUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
):
    file = await _get_owned_file(document_id, file_id, session, user)
    file.line_authors = _update_line_authors(
        file.content, file_in.content, file.line_authors, user.email
    )
    file.content = file_in.content
    session.add(file)
    await session.commit()

    document = await _get_owned_document(document_id, session, user)
    return document


@router.post("/{document_id}/compile", status_code=status.HTTP_202_ACCEPTED)
async def compile_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
):
    document = await _get_owned_document(document_id, session, user)

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
    user: User = Depends(get_dev_user),
):
    source = await _get_owned_document(document_id, session, user)
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
        source_files = migrate_files_to_template(source_files, target_template)  # NEW

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
    await session.refresh(new_document, attribute_names=["files"])
    return new_document

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
    pdf_url: str | None = None  # NEW

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


def migrate_files_to_template(
    files: list[dict],  # [{"name", "language", "content"}, ...]
    target_template: str,
) -> list[dict]:
    """
    Rebuild each .tex file for the target template: swap \\documentclass and
    the template's own style package, but keep the author's actual title,
    author block, extra \\usepackage lines, custom macros, and full body
    content intact. Non-.tex files (bib, etc.) pass through unchanged.
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

            # NEW — carry over custom \newcommand/\renewcommand macros the body needs
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


## src/features/texademia/templates.py

```py
"""
Starter file sets per document theme. Add a new entry here whenever you
support another style — the .cls/.sty it needs must exist in the server's
TeX distribution (e.g. IEEEtran needs texlive-publishers installed).
"""

_DEFAULT = [
    (
        "main.tex",
        "latex",
        "\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}\n",
    ),
    ("references.bib", "bibtex", ""),
]

_ARXIV = [
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

_IEEE = [
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

_ACL = [
    (
        "main.tex",
        "latex",
        "\\documentclass[11pt]{article}\n"
        "\\usepackage[review]{acl}\n"
        "\\usepackage{times}\n"
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

_TEMPLATES = {"default": _DEFAULT, "arxiv": _ARXIV, "ieee": _IEEE, "acl": _ACL}

TEMPLATE_NAMES = set(_TEMPLATES.keys())


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


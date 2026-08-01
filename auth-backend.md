# Tree View:
```
backend/src
├── config
│   └── settings.py
├── database
│   ├── base.py
│   └── session.py
├── features
│   └── auth
│       ├── manager.py
│       ├── models.py
│       ├── router.py
│       └── schemas.py
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
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 7 * 24 * 60  # 7 days
    REDIS_URL: str = "redis://redis:6379/0"

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

```


## features/auth/router.py

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


## main.py

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


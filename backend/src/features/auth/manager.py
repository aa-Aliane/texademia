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
from src.features.auth.email import send_email

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

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        """Called by fastapi-users when a verification token is requested
        (POST /auth/request-verify-token, and automatically after register
        if the frontend calls it). Email the link to the user."""
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        await send_email(
            to=user.email,
            subject="Verify your TexAdemia account",
            body=(
                f"Hi,\n\n"
                f"Click the link below to verify your email address:\n\n"
                f"{verify_url}\n\n"
                f"If you did not create an account, ignore this email."
            ),
        )

    async def on_after_verify(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} verified their email.")


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

import base64
import io
import uuid

import pyotp
import qrcode
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi_users.jwt import decode_jwt, generate_jwt
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession

from src.config.settings import settings
from src.database.session import get_db
from src.features.auth.manager import (
    access_backend,
    refresh_backend,
    get_user_manager,
)
from src.features.auth.models import User
from src.features.auth.router import _set_auth_cookie, current_active_user

MFA_TOKEN_AUDIENCE = "mfa-pending"
MFA_TOKEN_LIFETIME_SECONDS = 300  # 5 minutes to complete the TOTP challenge

router = APIRouter()


class MFACodeBody(BaseModel):
    code: str


class MFAVerifyBody(BaseModel):
    mfa_token: str
    code: str


def make_mfa_token(user: User) -> str:
    """Short-lived JWT proving the password step succeeded. Not an auth token."""
    return generate_jwt(
        {"sub": str(user.id), "aud": MFA_TOKEN_AUDIENCE},
        secret=f"{settings.SECRET_KEY}:mfa",
        lifetime_seconds=MFA_TOKEN_LIFETIME_SECONDS,
    )


async def _issue_auth_cookies(response: Response, user: User) -> None:
    access_token = await access_backend.get_strategy().write_token(user)
    refresh_token = await refresh_backend.get_strategy().write_token(user)
    _set_auth_cookie(response, access_backend.transport, access_token)
    _set_auth_cookie(response, refresh_backend.transport, refresh_token)


@router.post("/mfa/setup")
async def mfa_setup(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_db),
):
    """Generate a new TOTP secret for the logged-in user.

    The secret is stored but MFA stays disabled until /mfa/enable succeeds.
    Returns the otpauth:// URI plus a base64-encoded PNG QR code.
    """
    if user.is_otp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA_ALREADY_ENABLED",
        )

    secret = pyotp.random_base32()
    user.otp_secret = secret
    session.add(user)
    await session.commit()

    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user.email, issuer_name="TexAdemia"
    )

    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_base64 = base64.b64encode(buf.getvalue()).decode("ascii")

    return {"otpauth_uri": uri, "qr_code_base64": qr_base64, "secret": secret}


@router.post("/mfa/enable")
async def mfa_enable(
    body: MFACodeBody,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_db),
):
    """Enable MFA by proving possession of the secret with a valid code."""
    if not user.otp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA_NOT_SET_UP",
        )
    if not pyotp.TOTP(user.otp_secret).verify(body.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA_INVALID_CODE",
        )

    user.is_otp_enabled = True
    session.add(user)
    await session.commit()
    return {"detail": "MFA enabled"}


@router.post("/mfa/disable")
async def mfa_disable(
    body: MFACodeBody,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_db),
):
    """Disable MFA. Requires a current valid TOTP code."""
    if not user.is_otp_enabled or not user.otp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA_NOT_ENABLED",
        )
    if not pyotp.TOTP(user.otp_secret).verify(body.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA_INVALID_CODE",
        )

    user.is_otp_enabled = False
    user.otp_secret = None
    session.add(user)
    await session.commit()
    return {"detail": "MFA disabled"}


@router.post("/mfa/verify")
async def mfa_verify(
    body: MFAVerifyBody,
    response: Response,
    user_manager=Depends(get_user_manager),
):
    """Second step of login: exchange pre-MFA token + TOTP code for real cookies."""
    try:
        payload = decode_jwt(
            body.mfa_token,
            secret=f"{settings.SECRET_KEY}:mfa",
            audience=[MFA_TOKEN_AUDIENCE],
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="MFA_TOKEN_INVALID",
        )

    try:
        user = await user_manager.get(uuid.UUID(payload["sub"]))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="MFA_TOKEN_INVALID",
        )

    if (
        user is None
        or not user.is_active
        or not user.is_otp_enabled
        or not user.otp_secret
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="MFA_TOKEN_INVALID",
        )

    if not pyotp.TOTP(user.otp_secret).verify(body.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA_INVALID_CODE",
        )

    await _issue_auth_cookies(response, user)
    return {"detail": "Login successful"}

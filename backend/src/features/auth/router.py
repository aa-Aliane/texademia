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

from src.features.auth.dependencies import (
    fastapi_users,
    current_active_user,
    refresh_current_user,
    _set_auth_cookie,
    _clear_auth_cookie,
)


fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [access_backend])
refresh_fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager, [refresh_backend]
)

router = APIRouter()

# Auto-generates /register
router.include_router(fastapi_users.get_register_router(UserRead, UserCreate))

router.include_router(fastapi_users.get_verify_router(UserRead))

router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
)

from src.features.auth.mfa import router as mfa_router

router.include_router(mfa_router)

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

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="LOGIN_USER_NOT_VERIFIED",
        )

    if user.is_otp_enabled:
        from src.features.auth.mfa import make_mfa_token

        return {"mfa_required": True, "mfa_token": make_mfa_token(user)}

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

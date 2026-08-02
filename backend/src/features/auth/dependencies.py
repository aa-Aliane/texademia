import uuid

from fastapi import Response
from fastapi_users import FastAPIUsers

from src.features.auth.manager import access_backend, refresh_backend, get_user_manager
from src.features.auth.models import User

fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [access_backend])
refresh_fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager, [refresh_backend]
)

# Protected endpoints use the short-lived access token only.
current_active_user = fastapi_users.current_user(active=True)

# The refresh endpoint uses the long-lived refresh token only.
refresh_current_user = refresh_fastapi_users.current_user(active=True)


def _set_auth_cookie(response: Response, transport, token: str) -> None:
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

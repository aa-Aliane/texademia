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

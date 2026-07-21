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

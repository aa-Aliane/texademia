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

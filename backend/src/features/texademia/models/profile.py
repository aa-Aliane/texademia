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

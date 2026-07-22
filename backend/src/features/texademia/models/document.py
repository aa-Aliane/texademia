import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.features.auth.models import User


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


class DocumentFile(SQLModel, table=True):
    __tablename__ = "document_files"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(
        foreign_key="documents.id", nullable=False, index=True
    )
    name: str = Field(nullable=False)  # "main.tex", "references.bib"
    language: str = Field(default="latex", nullable=False)  # "latex" | "bibtex"
    content: str = Field(default="", nullable=False)

    document: "Document" = Relationship(back_populates="files")

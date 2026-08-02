import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List
from pathlib import Path

from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, JSON
import enum

if TYPE_CHECKING:
    from src.features.auth.models import User

_COMPILED_PDF_DIR = Path("compiled_pdfs")


class VersionTrigger(str, enum.Enum):
    compile = "compile"
    idle = "idle"
    restore = "restore"


class DocumentFileVersion(SQLModel, table=True):
    __tablename__ = "document_file_versions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    file_id: uuid.UUID = Field(
        foreign_key="document_files.id", nullable=False, index=True
    )

    # ADD THIS LINE:
    commit_id: uuid.UUID = Field(
        foreign_key="document_versions.id", nullable=False, index=True
    )

    created_at: datetime = Field(
        default_factory=datetime.utcnow, nullable=False, index=True
    )
    trigger: VersionTrigger = Field(default=VersionTrigger.idle, nullable=False)
    author: str = Field(nullable=False)
    reverse_patch: str = Field(nullable=False)

    file: "DocumentFile" = Relationship(back_populates="versions")
    commit: "DocumentVersion" = Relationship(back_populates="file_versions")


class DocumentVersion(SQLModel, table=True):
    """A 'commit' — groups the file-level diffs made in one compile/idle/restore event."""

    __tablename__ = "document_versions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(
        foreign_key="documents.id", nullable=False, index=True
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow, nullable=False, index=True
    )
    trigger: VersionTrigger = Field(default=VersionTrigger.idle, nullable=False)
    author: str = Field(nullable=False)

    document: "Document" = Relationship(back_populates="versions")
    file_versions: List["DocumentFileVersion"] = Relationship(
        back_populates="commit",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
    )


class Document(SQLModel, table=True):
    __tablename__ = "documents"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, index=True)
    title: str = Field(default="Untitled", nullable=False)
    template: str = Field(default="default", nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    collaborators: List["DocumentCollaborator"] = Relationship(
        back_populates="document",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
    )

    user: "User" = Relationship()
    files: List["DocumentFile"] = Relationship(
        back_populates="document",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "lazy": "selectin",
        },
    )

    versions: List["DocumentVersion"] = Relationship(
        back_populates="document",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
    )

    @property
    def pdf_url(self) -> str | None:
        pdf_path = _COMPILED_PDF_DIR / f"{self.id}.pdf"
        if pdf_path.exists():
            return f"/static/compiled/{self.id}.pdf"
        return None


class DocumentFile(SQLModel, table=True):
    __tablename__ = "document_files"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(
        foreign_key="documents.id", nullable=False, index=True
    )
    name: str = Field(nullable=False)  # "main.tex", "references.bib"
    language: str = Field(default="latex", nullable=False)  # "latex" | "bibtex" | "log"
    content: str = Field(default="", nullable=False)
    line_authors: list[dict] | None = Field(default=None, sa_column=Column(JSON))

    document: "Document" = Relationship(back_populates="files")

    # snapshot of content at the last checkpoint — lets us diff cheaply
    # without re-reading version history
    last_checkpoint_content: str | None = Field(default=None)

    versions: List["DocumentFileVersion"] = Relationship(
        back_populates="file",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "lazy": "selectin",
            "order_by": "DocumentFileVersion.created_at.desc()",
        },
    )


class CollaboratorRole(str, enum.Enum):
    reader = "reader"
    writer = "writer"


class CollaboratorStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"


class DocumentCollaborator(SQLModel, table=True):
    __tablename__ = "document_collaborators"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(
        foreign_key="documents.id", nullable=False, index=True
    )
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, index=True)
    invited_by_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    role: CollaboratorRole = Field(default=CollaboratorRole.reader, nullable=False)
    status: CollaboratorStatus = Field(
        default=CollaboratorStatus.pending, nullable=False
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    document: "Document" = Relationship(back_populates="collaborators")
    user: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "DocumentCollaborator.user_id"}
    )

    @property
    def email(
        self,
    ) -> str | None:  # NEW — lets CollaboratorRead.model_validate() read it directly
        return self.user.email if self.user else None

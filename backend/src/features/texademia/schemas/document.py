import uuid
from datetime import datetime

from pydantic import BaseModel
from enum import Enum
from pydantic import EmailStr


class CollaboratorRole(str, Enum):
    reader = "reader"
    writer = "writer"


class CollaboratorInvite(BaseModel):
    email: EmailStr
    role: CollaboratorRole = CollaboratorRole.reader


class CollaboratorRoleUpdate(BaseModel):
    role: CollaboratorRole


class CollaboratorRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email: str
    role: CollaboratorRole
    status: str

    model_config = {"from_attributes": True}


class InvitationRead(BaseModel):
    id: uuid.UUID  # collaborator row id
    document_id: uuid.UUID
    document_title: str
    role: CollaboratorRole
    invited_by_email: str


class LineAuthor(BaseModel):
    author: str
    edited_at: datetime


class FileRead(BaseModel):
    id: uuid.UUID
    name: str
    language: str
    content: str

    line_authors: list[LineAuthor] | None = None

    model_config = {"from_attributes": True}


class DocumentCreate(BaseModel):
    title: str = "Untitled"
    template: str = "default"


class DocumentRead(BaseModel):
    id: uuid.UUID
    title: str
    template: str
    created_at: datetime
    updated_at: datetime
    files: list[FileRead] = []
    pdf_url: str | None = None
    role: str = "owner"  #  "owner" | "writer" | "reader"
    collaborators: list[CollaboratorRead] = []

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    title: str | None = None
    template: str | None = None


class DocumentDuplicate(BaseModel):  # NEW
    template: str | None = None
    title: str | None = None


class FileUpdate(BaseModel):
    content: str


class CompileResponse(BaseModel):
    pdf_url: str

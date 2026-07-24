import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

import difflib
from datetime import datetime


from src.database.session import get_db
from src.features.auth.models import User
from src.features.auth.router import current_active_user
from src.features.texademia.models.document import Document, DocumentFile
from src.features.texademia.schemas.document import (
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    DocumentDuplicate,
    FileUpdate,
)
from src.features.texademia.templates import get_template_files
from src.features.texademia.services.compiler import (
    enqueue_compile_job,
    get_job_status,
    CompileError as CompilerError,
)
from src.features.texademia.services.template_migrator import (
    migrate_files_to_template,
)  # NEW

router = APIRouter(prefix="/documents", tags=["documents"])


def _update_line_authors(
    old_content: str, new_content: str, old_meta: list[dict] | None, author: str
) -> list[dict]:
    old_lines = old_content.split("\n")
    new_lines = new_content.split("\n")
    old_meta = list(old_meta or [])
    now = datetime.utcnow().isoformat()

    while len(old_meta) < len(old_lines):
        old_meta.append({"author": author, "edited_at": now})

    matcher = difflib.SequenceMatcher(a=old_lines, b=new_lines, autojunk=False)
    new_meta: list[dict] = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            new_meta.extend(old_meta[i1:i2])
        else:
            new_meta.extend([{"author": author, "edited_at": now}] * (j2 - j1))
    return new_meta


async def _get_owned_document(
    document_id: uuid.UUID, session: AsyncSession, user: User
) -> Document:
    statement = (
        select(Document)
        .where(Document.id == document_id, Document.user_id == user.id)
        .options(selectinload(Document.files))
    )
    result = await session.exec(statement)
    document = result.first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


async def _get_owned_file(
    document_id: uuid.UUID, file_id: uuid.UUID, session: AsyncSession, user: User
) -> DocumentFile:
    await _get_owned_document(document_id, session, user)

    statement = select(DocumentFile).where(
        DocumentFile.id == file_id, DocumentFile.document_id == document_id
    )
    result = await session.exec(statement)
    file = result.first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return file


@router.get("", response_model=List[DocumentRead])
async def list_documents(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    statement = select(Document).where(Document.user_id == user.id)
    result = await session.exec(statement)
    return result.all()


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    doc_in: DocumentCreate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document = Document(title=doc_in.title, template=doc_in.template, user_id=user.id)
    session.add(document)
    await session.flush()

    for name, language, content in get_template_files(doc_in.template):
        session.add(
            DocumentFile(
                document_id=document.id, name=name, language=language, content=content
            )
        )

    await session.commit()
    await session.refresh(document, attribute_names=["files"])
    return document


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    return await _get_owned_document(document_id, session, user)


@router.patch("/{document_id}", response_model=DocumentRead)
async def update_document(
    document_id: uuid.UUID,
    doc_in: DocumentUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document = await _get_owned_document(document_id, session, user)

    if doc_in.title is not None:
        document.title = doc_in.title
    if doc_in.template is not None:
        document.template = doc_in.template

    session.add(document)
    await session.commit()
    await session.refresh(document, attribute_names=["files"])
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document = await _get_owned_document(document_id, session, user)
    await session.delete(document)
    await session.commit()


@router.patch("/{document_id}/files/{file_id}", response_model=DocumentRead)
async def update_file(
    document_id: uuid.UUID,
    file_id: uuid.UUID,
    file_in: FileUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    file = await _get_owned_file(document_id, file_id, session, user)
    file.line_authors = _update_line_authors(
        file.content, file_in.content, file.line_authors, user.email
    )
    file.content = file_in.content
    session.add(file)
    await session.commit()

    document = await _get_owned_document(document_id, session, user)
    return document


@router.post("/{document_id}/compile", status_code=status.HTTP_202_ACCEPTED)
async def compile_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document = await _get_owned_document(document_id, session, user)

    try:
        job_id = enqueue_compile_job(document.id, document.files, document.template)
    except CompilerError as e:
        raise HTTPException(status_code=500, detail=e.message)

    return {"job_id": job_id, "status": "queued"}


@router.post(
    "/{document_id}/duplicate",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
)
async def duplicate_document(
    document_id: uuid.UUID,
    payload: DocumentDuplicate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    source = await _get_owned_document(document_id, session, user)
    target_template = payload.template or source.template

    new_document = Document(
        user_id=user.id,
        title=payload.title or f"{source.title} (copy)",
        template=target_template,
    )
    session.add(new_document)
    await session.flush()  # need new_document.id before creating child files

    source_files = [
        {"name": f.name, "language": f.language, "content": f.content}
        for f in source.files
    ]
    if target_template != source.template:
        source_files = migrate_files_to_template(source_files, target_template)  # NEW

    for f in source_files:
        session.add(
            DocumentFile(
                document_id=new_document.id,
                name=f["name"],
                language=f["language"],
                content=f["content"],
                # line_authors intentionally left unset — content/attribution changed
            )
        )

    await session.commit()
    await session.refresh(new_document, attribute_names=["files"])
    return new_document

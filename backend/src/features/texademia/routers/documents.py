import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.session import get_db
from src.features.auth.models import User
from src.features.auth.dev_user import get_dev_user
from src.features.texademia.models.document import Document, DocumentFile
from src.features.texademia.schemas.document import (
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    FileUpdate,
    CompileResponse,
)
from src.features.texademia.services.compiler import (
    compile_latex,
    CompileError as CompilerError,
)
from src.features.texademia.templates import get_template_files

router = APIRouter(prefix="/documents", tags=["documents"])


async def _get_owned_document(
    document_id: uuid.UUID, session: AsyncSession, user: User
) -> Document:
    statement = select(Document).where(
        Document.id == document_id, Document.user_id == user.id
    )
    result = await session.exec(statement)
    document = result.first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.get("", response_model=List[DocumentRead])
async def list_documents(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
):
    statement = select(Document).where(Document.user_id == user.id)
    result = await session.exec(statement)
    return result.all()


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    doc_in: DocumentCreate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
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
    statement = select(Document).where(Document.id == document.id)
    result = await session.exec(statement)
    return result.first()


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
):
    return await _get_owned_document(document_id, session, user)


@router.patch("/{document_id}", response_model=DocumentRead)
async def update_document(
    document_id: uuid.UUID,
    doc_in: DocumentUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
):
    document = await _get_owned_document(document_id, session, user)
    for key, value in doc_in.model_dump(exclude_unset=True).items():
        setattr(document, key, value)
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
):
    document = await _get_owned_document(document_id, session, user)
    await session.delete(document)
    await session.commit()


@router.patch("/{document_id}/files/{file_id}")
async def update_file(
    document_id: uuid.UUID,
    file_id: uuid.UUID,
    file_in: FileUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
):
    document = await _get_owned_document(document_id, session, user)
    file = next((f for f in document.files if f.id == file_id), None)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    file.content = file_in.content
    session.add(file)
    await session.commit()
    await session.refresh(file)
    return file


@router.post("/{document_id}/compile", response_model=CompileResponse)
async def compile_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_dev_user),
):
    document = await _get_owned_document(document_id, session, user)
    try:
        pdf_url = await compile_latex(document.files, document.id, document.template)
    except CompilerError as e:
        raise HTTPException(
            status_code=422, detail={"message": e.message, "log": e.log}
        )
    return CompileResponse(pdf_url=pdf_url)

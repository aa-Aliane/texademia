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
from src.features.texademia.models.document import (
    Document,
    DocumentFile,
    DocumentCollaborator,
    CollaboratorStatus,
    CollaboratorRole,
    DocumentFileVersion,
    VersionTrigger,
)
from src.features.texademia.schemas.document import (
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    DocumentDuplicate,
    FileUpdate,
    CollaboratorRead,
    FileVersionRead,
)
from src.features.texademia.templates import get_template_files
from src.features.texademia.services.compiler import (
    enqueue_compile_job,
    get_job_status,
    CompileError as CompilerError,
)
from src.features.texademia.services.template_migrator import (
    migrate_files_to_template,
)

from src.features.texademia.services.versioning import (
    create_checkpoint,
    reconstruct_content_at,
)


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


async def _get_accessible_document(
    document_id: uuid.UUID,
    session: AsyncSession,
    user: User,
    require_write: bool = False,
) -> tuple[Document, str]:
    """
    Replaces the old owner-only `_get_owned_document`. Returns the document
    plus the caller's effective role ("owner" | "writer" | "reader") so
    endpoints can both authorize and build the response without a second
    lookup.
    """
    statement = (
        select(Document)
        .where(Document.id == document_id)
        .options(
            selectinload(Document.files),
            selectinload(Document.collaborators).selectinload(
                DocumentCollaborator.user
            ),
        )
    )
    result = await session.exec(statement)
    document = result.first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.user_id == user.id:
        return document, "owner"

    collab = next(
        (
            c
            for c in document.collaborators
            if c.user_id == user.id and c.status == CollaboratorStatus.accepted
        ),
        None,
    )
    if not collab:
        # Not the owner and no accepted collaborator row — treat as not found
        # rather than 403, so we don't leak document existence.
        raise HTTPException(status_code=404, detail="Document not found")

    if require_write and collab.role != CollaboratorRole.writer:
        raise HTTPException(
            status_code=403, detail="You only have read access to this document"
        )

    return document, collab.role.value


async def _get_owned_file(
    document_id: uuid.UUID, file_id: uuid.UUID, session: AsyncSession, user: User
) -> DocumentFile:
    await _get_accessible_document(document_id, session, user, require_write=True)

    statement = select(DocumentFile).where(
        DocumentFile.id == file_id, DocumentFile.document_id == document_id
    )
    result = await session.exec(statement)
    file = result.first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return file


def _role_for(document: Document, user: User) -> str:
    collab = next((c for c in document.collaborators if c.user_id == user.id), None)
    return collab.role.value if collab else "reader"


def _to_document_read(document: Document, role: str) -> DocumentRead:
    base = DocumentRead.model_validate(document)
    collaborators = (
        [
            CollaboratorRead(
                id=c.id,
                user_id=c.user_id,
                email=c.user.email,
                role=c.role,
                status=c.status,
            )
            for c in document.collaborators
        ]
        if role == "owner"
        else []
    )
    return base.model_copy(update={"role": role, "collaborators": collaborators})


@router.get("", response_model=List[DocumentRead])
async def list_documents(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    owned_result = await session.exec(
        select(Document)
        .where(Document.user_id == user.id)
        .options(
            selectinload(Document.files),
            selectinload(Document.collaborators).selectinload(
                DocumentCollaborator.user
            ),
        )
    )
    owned = list(owned_result.all())

    shared_result = await session.exec(
        select(Document)
        .join(DocumentCollaborator, DocumentCollaborator.document_id == Document.id)
        .where(
            DocumentCollaborator.user_id == user.id,
            DocumentCollaborator.status == CollaboratorStatus.accepted,
        )
        .options(
            selectinload(Document.files),
            selectinload(Document.collaborators).selectinload(
                DocumentCollaborator.user
            ),
        )
    )
    shared = list(shared_result.all())

    return [_to_document_read(d, "owner") for d in owned] + [
        _to_document_read(d, _role_for(d, user)) for d in shared
    ]


async def list_accessible_document_ids(
    session: AsyncSession, user: User
) -> list[uuid.UUID]:
    """
    Id-only variant of list_documents, used by the presence websocket so it
    can subscribe to the right Redis channels without paying for the
    files/collaborators eager load.
    """
    owned_result = await session.exec(
        select(Document.id).where(Document.user_id == user.id)
    )
    owned_ids = list(owned_result.all())

    shared_result = await session.exec(
        select(Document.id)
        .join(DocumentCollaborator, DocumentCollaborator.document_id == Document.id)
        .where(
            DocumentCollaborator.user_id == user.id,
            DocumentCollaborator.status == CollaboratorStatus.accepted,
        )
    )
    shared_ids = list(shared_result.all())

    return owned_ids + shared_ids


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    doc_in: DocumentCreate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document = Document(title=doc_in.title, template=doc_in.template, user_id=user.id)
    session.add(document)
    await session.flush()

    for tf in get_template_files(doc_in.template):
        session.add(
            DocumentFile(
                document_id=document.id,
                name=tf["name"],
                language=tf["language"],
                content=tf["content"],
            )
        )

    await session.commit()
    await session.refresh(document, attribute_names=["files", "collaborators"])
    return _to_document_read(document, "owner")


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, role = await _get_accessible_document(document_id, session, user)
    return _to_document_read(document, role)


@router.patch("/{document_id}", response_model=DocumentRead)
async def update_document(
    document_id: uuid.UUID,
    doc_in: DocumentUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, role = await _get_accessible_document(
        document_id, session, user, require_write=True
    )

    if doc_in.title is not None:
        document.title = doc_in.title
    if doc_in.template is not None:
        document.template = doc_in.template

    session.add(document)
    await session.commit()
    await session.refresh(document, attribute_names=["files", "collaborators"])
    return _to_document_read(document, role)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    # Deletion stays owner-only — collaborators, even writers, can't delete
    # the document out from under the owner.
    document, role = await _get_accessible_document(document_id, session, user)
    if role != "owner":
        raise HTTPException(
            status_code=403, detail="Only the owner can delete this document"
        )
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

    document, role = await _get_accessible_document(document_id, session, user)
    return _to_document_read(document, role)


@router.post("/{document_id}/compile", status_code=status.HTTP_202_ACCEPTED)
async def compile_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, _role = await _get_accessible_document(
        document_id, session, user, require_write=True
    )

    for f in document.files:
        version = create_checkpoint(f, VersionTrigger.compile, user.email)
        if version:
            session.add(version)
            session.add(f)
    await session.commit()

    main_file = next((f for f in document.files if f.name.endswith(".tex")), None)
    print(
        f"[compile] doc={document_id} template={document.template} "
        f"files={[(f.name, len(f.content)) for f in document.files]} "
        f"main_snippet={main_file.content[:200]!r}"
        if main_file
        else "no-main"
    )

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
    # Duplicating creates a brand new document owned by the caller — a
    # reader/writer collaborator can do this too, they just end up owning
    # the copy (not the original).
    source, _role = await _get_accessible_document(document_id, session, user)
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
        source_files = migrate_files_to_template(source_files, target_template)

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
    await session.refresh(new_document, attribute_names=["files", "collaborators"])
    return _to_document_read(new_document, "owner")


@router.post(
    "/{document_id}/files/{file_id}/checkpoint",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def checkpoint_file(
    document_id: uuid.UUID,
    file_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """Called by the frontend after an idle-edit debounce window."""
    file = await _get_owned_file(document_id, file_id, session, user)
    version = create_checkpoint(file, VersionTrigger.idle, user.email)
    if version:
        session.add(version)
        session.add(file)
        await session.commit()


@router.get(
    "/{document_id}/files/{file_id}/versions",
    response_model=List[FileVersionRead],
)
async def list_file_versions(
    document_id: uuid.UUID,
    file_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    file = await _get_owned_file(document_id, file_id, session, user)
    return file.versions  # already ordered desc via relationship


@router.post(
    "/{document_id}/files/{file_id}/versions/{version_id}/restore",
    response_model=FileRead,
)
async def restore_file_version(
    document_id: uuid.UUID,
    file_id: uuid.UUID,
    version_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    file = await _get_owned_file(document_id, file_id, session, user)

    if not any(v.id == version_id for v in file.versions):
        raise HTTPException(status_code=404, detail="Version not found")

    restored_content = reconstruct_content_at(file.versions, file.content, version_id)

    # checkpoint the pre-restore state so it isn't lost, then apply restore
    pre_restore_checkpoint = create_checkpoint(file, VersionTrigger.restore, user.email)
    if pre_restore_checkpoint:
        session.add(pre_restore_checkpoint)

    file.line_authors = _update_line_authors(
        file.content, restored_content, file.line_authors, f"{user.email} (restore)"
    )
    file.content = restored_content
    file.last_checkpoint_content = restored_content  # restore point is the new baseline

    session.add(file)
    await session.commit()
    await session.refresh(file)
    return file

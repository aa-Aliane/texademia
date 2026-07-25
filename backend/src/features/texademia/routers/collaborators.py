import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.session import get_db
from src.features.auth.models import User
from src.features.auth.router import current_active_user
from src.features.texademia.models.document import (
    Document,
    DocumentCollaborator,
    CollaboratorStatus,
)
from src.features.texademia.schemas.document import (
    CollaboratorInvite,
    CollaboratorRoleUpdate,
    CollaboratorRead,
    InvitationRead,
)
from .documents import _get_accessible_document

router = APIRouter(tags=["collaborators"])


@router.post(
    "/documents/{document_id}/collaborators",
    response_model=CollaboratorRead,
    status_code=status.HTTP_201_CREATED,
)
async def invite_collaborator(
    document_id: uuid.UUID,
    payload: CollaboratorInvite,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, role = await _get_accessible_document(document_id, session, user)
    if role != "owner":
        raise HTTPException(403, "Only the owner can invite collaborators")

    result = await session.exec(select(User).where(User.email == payload.email))
    invitee = result.first()
    if not invitee:
        raise HTTPException(404, "No user with that email")
    if invitee.id == user.id:
        raise HTTPException(400, "You can't invite yourself")

    existing = await session.exec(
        select(DocumentCollaborator).where(
            DocumentCollaborator.document_id == document_id,
            DocumentCollaborator.user_id == invitee.id,
        )
    )
    if existing.first():
        raise HTTPException(400, "This user is already invited")

    collab = DocumentCollaborator(
        document_id=document_id,
        user_id=invitee.id,
        role=payload.role,
        invited_by_id=user.id,
    )
    session.add(collab)
    await session.commit()
    return CollaboratorRead(
        id=collab.id,
        user_id=invitee.id,
        email=invitee.email,
        role=collab.role,
        status=collab.status,
    )


@router.patch(
    "/documents/{document_id}/collaborators/{collaborator_id}",
    response_model=CollaboratorRead,
)
async def update_collaborator_role(
    document_id: uuid.UUID,
    collaborator_id: uuid.UUID,
    payload: CollaboratorRoleUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, role = await _get_accessible_document(document_id, session, user)
    if role != "owner":
        raise HTTPException(403, "Only the owner can change roles")
    collab = next((c for c in document.collaborators if c.id == collaborator_id), None)
    if not collab:
        raise HTTPException(404, "Collaborator not found")
    collab.role = payload.role
    session.add(collab)
    await session.commit()
    return CollaboratorRead(
        id=collab.id,
        user_id=collab.user_id,
        email=collab.user.email,
        role=collab.role,
        status=collab.status,
    )


@router.delete(
    "/documents/{document_id}/collaborators/{collaborator_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_collaborator(
    document_id: uuid.UUID,
    collaborator_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    document, role = await _get_accessible_document(document_id, session, user)
    collab = next((c for c in document.collaborators if c.id == collaborator_id), None)
    if not collab:
        raise HTTPException(404, "Collaborator not found")
    # owner can remove anyone; a collaborator can remove themself (= "leave")
    if role != "owner" and collab.user_id != user.id:
        raise HTTPException(403, "Not allowed")
    await session.delete(collab)
    await session.commit()


@router.get("/invitations", response_model=list[InvitationRead])
async def list_pending_invitations(
    session: AsyncSession = Depends(get_db), user: User = Depends(current_active_user)
):
    statement = select(DocumentCollaborator).where(
        DocumentCollaborator.user_id == user.id,
        DocumentCollaborator.status == CollaboratorStatus.pending,
    )
    result = await session.exec(statement)
    invites = result.all()
    out = []
    for c in invites:
        doc = await session.get(Document, c.document_id)
        inviter = await session.get(User, c.invited_by_id)
        out.append(
            InvitationRead(
                id=c.id,
                document_id=c.document_id,
                document_title=doc.title,
                role=c.role,
                invited_by_email=inviter.email,
            )
        )
    return out


@router.post(
    "/invitations/{collaborator_id}/accept", status_code=status.HTTP_204_NO_CONTENT
)
async def accept_invitation(
    collaborator_id: uuid.UUID,
    session=Depends(get_db),
    user=Depends(current_active_user),
):
    collab = await session.get(DocumentCollaborator, collaborator_id)
    if not collab or collab.user_id != user.id:
        raise HTTPException(404, "Invitation not found")
    collab.status = CollaboratorStatus.accepted
    session.add(collab)
    await session.commit()


@router.post(
    "/invitations/{collaborator_id}/decline", status_code=status.HTTP_204_NO_CONTENT
)
async def decline_invitation(
    collaborator_id: uuid.UUID,
    session=Depends(get_db),
    user=Depends(current_active_user),
):
    collab = await session.get(DocumentCollaborator, collaborator_id)
    if not collab or collab.user_id != user.id:
        raise HTTPException(404, "Invitation not found")
    await session.delete(collab)
    await session.commit()

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.session import get_db
from src.features.auth.models import User
from src.features.auth.router import current_active_user

from src.features.texademia.models.profile import Profile
from src.features.texademia.schemas.profile import ProfileCreate, ProfileRead, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("", response_model=ProfileRead)
async def get_profile(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user)
):
    statement = select(Profile).where(Profile.user_id == user.id)
    result = await session.exec(statement)
    profile = result.first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.post("", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_in: ProfileCreate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user)
):
    # Check if profile already exists
    statement = select(Profile).where(Profile.user_id == user.id)
    result = await session.exec(statement)
    if result.first():
        raise HTTPException(status_code=400, detail="Profile already exists")

    db_profile = Profile(**profile_in.model_dump(), user_id=user.id)
    session.add(db_profile)
    await session.commit()
    await session.refresh(db_profile)
    return db_profile

@router.patch("", response_model=ProfileRead)
async def update_profile(
    profile_in: ProfileUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user)
):
    statement = select(Profile).where(Profile.user_id == user.id)
    result = await session.exec(statement)
    db_profile = result.first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = profile_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_profile, key, value)

    session.add(db_profile)
    await session.commit()
    await session.refresh(db_profile)
    return db_profile

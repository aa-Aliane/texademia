import uuid
from fastapi import Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.session import get_db
from src.features.auth.models import User

DEV_USER_EMAIL = "dev@local.test"


async def get_dev_user(session: AsyncSession = Depends(get_db)) -> User:
    """
    Stand-in for current_active_user while auth isn't wired up yet.
    Returns (creating if needed) a single fixed local user so ownership
    checks (Document.user_id, Profile.user_id, ...) keep working unchanged.

    Remove this file and revert routers to current_active_user once
    real login is implemented.
    """
    statement = select(User).where(User.email == DEV_USER_EMAIL)
    result = await session.exec(statement)
    user = result.first()
    if user is None:
        user = User(
            email=DEV_USER_EMAIL,
            hashed_password="!",  # unused — no login flow while this is active
            is_active=True,
            is_superuser=False,
            is_verified=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user

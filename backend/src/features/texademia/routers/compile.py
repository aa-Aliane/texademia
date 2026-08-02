from fastapi import APIRouter, Depends
from src.features.auth.models import User
from src.features.texademia.services.compiler import get_job_status
from src.features.auth.router import current_active_user

router = APIRouter(prefix="/compile", tags=["compile"])


@router.get("/{job_id}")
async def poll_compile_status(job_id: str, user: User = Depends(current_active_user)):
    return get_job_status(job_id)

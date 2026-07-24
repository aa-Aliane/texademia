from fastapi import APIRouter
from src.features.texademia.services.compiler import get_job_status

router = APIRouter(prefix="/compile", tags=["compile"])


@router.get("/{job_id}")
async def poll_compile_status(job_id: str):
    return get_job_status(job_id)

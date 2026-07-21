from fastapi import APIRouter
from .routers import profile_router, documents_router

router = APIRouter()

router.include_router(profile_router)
router.include_router(documents_router)

from fastapi import APIRouter
from .routers import (
    profile_router,
    documents_router,
    compile_router,
    collaborators_router,
)

router = APIRouter()

router.include_router(profile_router)
router.include_router(documents_router)
router.include_router(compile_router)
router.include_router(collaborators_router)

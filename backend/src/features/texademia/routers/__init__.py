from .profile import router as profile_router
from .documents import router as documents_router
from .compile import router as compile_router
from .collaborators import router as collaborators_router
from .websocket import router as websocket_router

__all__ = [
    "profile_router",
    "documents_router",
    "compile_router",
    "collaborators_router",
    "websocket_router",
]

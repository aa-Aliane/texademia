from typing import List

from fastapi import APIRouter
from fastapi.param_functions import Depends
from sqlalchemy.ext.asyncio.session import AsyncSession

from src.features.auth.models import User
from src.features.texademia.templates import get_available_templates
from src.features.texademia.schemas import TemplateRead
from src.features.auth.router import current_active_user

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=List[TemplateRead])
def get_available_templates(
    user: User = Depends(current_active_user),
) -> List[TemplateRead]:
    import json

    with open("./src/features/texademia/templates.json", "r", encoding="utf-8") as file:
        data = json.load(file)
    return [TemplateRead(**t) for t in data["templates"]]

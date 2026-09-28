from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.roles import ROLES
from app.models.user import User
from app.schemas.role import Role, RolesResponse
from app.schemas.user import MeResponse
from app.services import group_service, user_service

router = APIRouter(tags=["Служебное"])


@router.get("/roles", response_model=RolesResponse)
async def get_roles(user: User = Depends(get_current_user)):
    """Список ролей с правами и меню."""
    return RolesResponse(roles=[Role(**r) for r in ROLES.values()])


@router.get("/me", response_model=MeResponse)
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Текущий пользователь из initData."""
    group_name = ""
    if user.group_id:
        group_name = await group_service.get_group_name(db, user.group_id)
    return MeResponse(user=user_service.to_current_user(user, group_name))

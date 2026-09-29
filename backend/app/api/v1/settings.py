from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require
from app.models.user import User
from app.schemas.common import OkResponse
from app.schemas.settings import SettingsSchema
from app.services import settings_service

router = APIRouter(prefix="/settings", tags=["Настройки"])


@router.get("", response_model=SettingsSchema)
async def get_settings(
    user: User = Depends(require("settings.edit")),
    db: AsyncSession = Depends(get_db),
):
    if not user.group_id:
        return SettingsSchema()
    payload = await settings_service.get_settings(db, user.group_id)
    return SettingsSchema(**payload)


@router.put("", response_model=OkResponse)
async def save_settings(
    data: SettingsSchema,
    user: User = Depends(require("settings.edit")),
    db: AsyncSession = Depends(get_db),
):
    if not user.group_id:
        return OkResponse()
    await settings_service.save_settings(db, user.group_id, data.model_dump(by_alias=True))
    return OkResponse()

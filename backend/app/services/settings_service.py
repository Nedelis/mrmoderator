from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.settings import GroupSettings


DEFAULT_SETTINGS = {
    "pushNotifications": True,
    "dailySummary": True,
    "debtNotifications": True,
    "newMaterials": False,
    "twoFactor": True,
    "auditLog": True,
}


async def get_settings(db: AsyncSession, group_id: str) -> dict:
    result = await db.execute(
        select(GroupSettings).where(GroupSettings.group_id == group_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return dict(DEFAULT_SETTINGS)
    return {**DEFAULT_SETTINGS, **(row.payload or {})}


async def save_settings(db: AsyncSession, group_id: str, payload: dict) -> dict:
    result = await db.execute(
        select(GroupSettings).where(GroupSettings.group_id == group_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        row = GroupSettings(group_id=group_id, payload=payload)
        db.add(row)
    else:
        row.payload = {**(row.payload or {}), **payload}
    await db.commit()
    return row.payload or {}

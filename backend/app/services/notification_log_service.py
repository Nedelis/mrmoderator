from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification_log import NotificationLog


async def was_sent(
    db: AsyncSession,
    entity_type: str,
    entity_id: int,
    user_id: int,
    kind: str,
) -> bool:
    """Проверяет, отправляли ли уже такое уведомление."""
    stmt = (
        select(NotificationLog)
        .where(NotificationLog.entity_type == entity_type)
        .where(NotificationLog.entity_id == entity_id)
        .where(NotificationLog.user_id == user_id)
        .where(NotificationLog.kind == kind)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def was_sent_recently(
    db: AsyncSession,
    entity_type: str,
    entity_id: int,
    user_id: int,
    kind: str,
    hours: int = 24,
) -> bool:
    """Проверяет, отправляли ли уведомление за последние N часов."""
    threshold = datetime.utcnow() - timedelta(hours=hours)
    stmt = (
        select(NotificationLog)
        .where(NotificationLog.entity_type == entity_type)
        .where(NotificationLog.entity_id == entity_id)
        .where(NotificationLog.user_id == user_id)
        .where(NotificationLog.kind == kind)
        .where(NotificationLog.sent_at >= threshold)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def mark_sent(
    db: AsyncSession,
    entity_type: str,
    entity_id: int,
    user_id: int,
    kind: str,
) -> None:
    """Записывает факт отправки уведомления."""
    log = NotificationLog(
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        kind=kind,
    )
    db.add(log)
    await db.commit()

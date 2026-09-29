from typing import Awaitable, Callable

_send_message_fn: Callable[[str, str], Awaitable[bool]] | None = None


def register_sender(fn: Callable[[str, str], Awaitable[bool]]) -> None:
    global _send_message_fn
    _send_message_fn = fn


async def send_to_user(max_user_id: str, text: str) -> bool:
    if _send_message_fn is None:
        return False
    try:
        return await _send_message_fn(max_user_id, text)
    except Exception:
        return False


async def send_to_group(group_id: str, text: str) -> bool:
    """Отправить сообщение в групповой чат. Требует chat_id в БД."""
    from sqlalchemy import select

    from app.core.database import async_session
    from app.models.group import Group

    async with async_session() as db:
        result = await db.execute(select(Group).where(Group.id == group_id))
        group = result.scalar_one_or_none()

    if group is None or not group.chat_id:
        return False

    if _send_message_fn is None:
        return False

    try:
        return await _send_message_fn(group.chat_id, text)
    except Exception:
        return False

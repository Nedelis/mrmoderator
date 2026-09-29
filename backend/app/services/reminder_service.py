from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reminder import Reminder
from app.models.user import User
from app.schemas.reminder import (
    CreateReminderRequest,
    UpdateReminderRequest,
)
from app.schemas.reminder import (
    Reminder as ReminderSchema,
)
from app.services import notify_service, user_service


def _to_schema(r: Reminder) -> ReminderSchema:
    return ReminderSchema(
        id=str(r.id),
        title=r.title,
        description=r.description or "",
        deadline=r.deadline,
        type=r.type,
        priority=r.priority,
        target_student_ids=[str(x) for x in (r.target_student_ids or [])],
        completed_by=[str(x) for x in (r.completed_by or [])],
    )


def _parse_deadline(date_str: str, time_str: str) -> datetime:
    """Склеивает 'YYYY-MM-DD' + 'HH:mm' в datetime."""
    return datetime.fromisoformat(f"{date_str}T{time_str}")


async def list_reminders(db: AsyncSession, user: User, group_id: str) -> list[ReminderSchema]:
    stmt = (
        select(Reminder)
        .where(Reminder.group_id == group_id)
        .where(
            or_(
                Reminder.type == "group",
                Reminder.author_id == user.id,
            )
        )
        .order_by(Reminder.deadline)
    )
    result = await db.execute(stmt)
    return [_to_schema(r) for r in result.scalars().all()]


async def create_reminder(
    db: AsyncSession,
    user: User,
    group_id: str,
    data: CreateReminderRequest,
) -> ReminderSchema:
    reminder = Reminder(
        title=data.title,
        description=data.description or "",
        deadline=_parse_deadline(data.date, data.time),
        type="personal" if data.scope == "personal" else "group",
        priority="medium",
        target_student_ids=data.student_ids if data.scope == "selected" else [],
        completed_by=[],
        author_id=user.id,
        group_id=group_id,
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return _to_schema(reminder)


async def get_reminder(db: AsyncSession, reminder_id: int) -> Reminder | None:
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    return result.scalar_one_or_none()


async def update_reminder(
    db: AsyncSession,
    reminder: Reminder,
    data: UpdateReminderRequest,
) -> ReminderSchema:
    if data.title is not None:
        reminder.title = data.title
    if data.description is not None:
        reminder.description = data.description
    await db.commit()
    await db.refresh(reminder)
    return _to_schema(reminder)


async def delete_reminder(db: AsyncSession, reminder: Reminder) -> None:
    await db.delete(reminder)
    await db.commit()


async def toggle_completed(
    db: AsyncSession,
    reminder: Reminder,
    user: User,
    completed: bool,
) -> ReminderSchema:
    """Добавляет или убирает user.id из completed_by."""
    completed_list = list(reminder.completed_by or [])
    user_id = str(user.id)

    if completed and user_id not in completed_list:
        completed_list.append(user_id)
    elif not completed and user_id in completed_list:
        completed_list.remove(user_id)

    reminder.completed_by = completed_list
    await db.commit()
    await db.refresh(reminder)
    return _to_schema(reminder)


async def remind_all(db: AsyncSession, reminder: Reminder, group_id: str) -> int:
    students = await user_service.get_group_students(db, group_id)
    text = (
        f"🔔 Напоминание: {reminder.title}\n"
        f"{reminder.description}\n"
        f"Дедлайн: {reminder.deadline.strftime('%d.%m.%Y %H:%M')}"
    )
    sent = 0
    for student in students:
        if await notify_service.send_to_user(student.max_user_id, text):
            sent += 1
    return sent

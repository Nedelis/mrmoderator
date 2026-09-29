from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require
from app.core.roles import ROLES
from app.models.user import User
from app.schemas.common import OkResponse, RemindResponse
from app.schemas.reminder import (
    CompleteReminderRequest,
    CreateReminderRequest,
    Reminder,
    UpdateReminderRequest,
)
from app.services import reminder_service

router = APIRouter(prefix="/reminders", tags=["Напоминалки"])


@router.get("", response_model=list[Reminder])
async def list_reminders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.group_id:
        return []
    return await reminder_service.list_reminders(db, user, user.group_id)


@router.post("", response_model=Reminder, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    data: CreateReminderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.scope == "personal":
        if "reminder.create.personal" not in ROLES[user.role_id]["permissions"]:
            raise HTTPException(403, "Нет права создавать личные напоминалки")
    else:
        if "reminder.create.group" not in ROLES[user.role_id]["permissions"]:
            raise HTTPException(403, "Нет права создавать групповые напоминалки")

    if not user.group_id:
        raise HTTPException(400, "Пользователь не в группе")

    return await reminder_service.create_reminder(db, user, user.group_id, data)


@router.put("/{reminder_id}", response_model=OkResponse)
async def update_reminder(
    reminder_id: int,
    data: UpdateReminderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reminder = await reminder_service.get_reminder(db, reminder_id)
    if reminder is None or reminder.group_id != user.group_id:
        raise HTTPException(404, "Напоминалка не найдена")

    is_author = reminder.author_id == user.id
    can_remind = "reminder.remind" in ROLES[user.role_id]["permissions"]
    if not (is_author or can_remind):
        raise HTTPException(403, "Можно редактировать только свои напоминалки")

    await reminder_service.update_reminder(db, reminder, data)
    return OkResponse()


@router.delete("/{reminder_id}", response_model=OkResponse)
async def delete_reminder(
    reminder_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reminder = await reminder_service.get_reminder(db, reminder_id)
    if reminder is None or reminder.group_id != user.group_id:
        raise HTTPException(404, "Напоминалка не найдена")

    is_author = reminder.author_id == user.id
    can_remind = "reminder.remind" in ROLES[user.role_id]["permissions"]
    if not (is_author or can_remind):
        raise HTTPException(403, "Можно удалять только свои напоминалки")

    await reminder_service.delete_reminder(db, reminder)
    return OkResponse()


@router.put("/{reminder_id}/complete", response_model=OkResponse)
async def complete_reminder(
    reminder_id: int,
    data: CompleteReminderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reminder = await reminder_service.get_reminder(db, reminder_id)
    if reminder is None or reminder.group_id != user.group_id:
        raise HTTPException(404, "Напоминалка не найдена")

    await reminder_service.toggle_completed(db, reminder, user, data.completed)
    return OkResponse()


@router.post("/{reminder_id}/remind", response_model=RemindResponse)
async def remind_reminder(
    reminder_id: int,
    user: User = Depends(require("reminder.remind")),
    db: AsyncSession = Depends(get_db),
):
    reminder = await reminder_service.get_reminder(db, reminder_id)
    if reminder is None or reminder.group_id != user.group_id:
        raise HTTPException(404, "Напоминалка не найдена")

    sent_to = await reminder_service.remind_all(db, reminder, reminder.group_id)
    return RemindResponse(
        id=str(reminder.id),
        title=reminder.title,
        sent_to=sent_to,
        sent_at=datetime.now(timezone.utc),
    )

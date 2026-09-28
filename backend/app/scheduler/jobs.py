from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.core.database import async_session
from app.models.debt import Debt
from app.models.group import Group
from app.models.reminder import Reminder
from app.models.task import Task
from app.models.user import User
from app.services import notification_log_service, notify_service, user_service


async def check_upcoming_deadlines() -> None:
    """Ищет напоминания/задания/долги, до дедлайна которых ~24 часа."""
    now = datetime.now(timezone.utc)
    window_start = now + timedelta(hours=23)
    window_end = now + timedelta(hours=25)

    async with async_session() as db:
        # --- Reminders ---
        result = await db.execute(
            select(Reminder).where(
                Reminder.deadline >= window_start,
                Reminder.deadline <= window_end,
                Reminder.type == "group",
            )
        )
        for reminder in result.scalars().all():
            await _notify_group_about(
                db,
                entity_type="reminder",
                entity_id=reminder.id,
                group_id=reminder.group_id,
                title=reminder.title,
                deadline=reminder.deadline,
                kind="deadline_24h",
                emoji="🔔",
            )

        # --- Tasks ---
        result = await db.execute(
            select(Task).where(
                Task.deadline >= window_start,
                Task.deadline <= window_end,
                Task.type == "group",
            )
        )
        for task in result.scalars().all():
            await _notify_group_about(
                db,
                entity_type="task",
                entity_id=task.id,
                group_id=task.group_id,
                title=task.title,
                deadline=task.deadline,
                kind="deadline_24h",
                emoji="📌",
            )

        # --- Debts (только персонально должнику) ---
        result = await db.execute(
            select(Debt).where(
                Debt.deadline >= window_start,
                Debt.deadline <= window_end,
            )
        )
        for debt in result.scalars().all():
            if await notification_log_service.was_sent(
                db, "debt", debt.id, debt.student_id, "deadline_24h"
            ):
                continue

            student_result = await db.execute(
                select(User).where(User.id == debt.student_id)
            )
            student = student_result.scalar_one_or_none()
            if student is None or not student.max_user_id:
                continue

            text = (
                f"⚠️ Дедлайн по долгу через 24 часа!\n"
                f"Предмет: {debt.subject}\n"
                f"Тип: {debt.type}\n"
                f"Срок: {debt.deadline.strftime('%d.%m.%Y')}"
            )
            if await notify_service.send_to_user(student.max_user_id, text):
                await notification_log_service.mark_sent(
                    db, "debt", debt.id, student.id, "deadline_24h"
                )


async def _notify_group_about(
    db,
    entity_type: str,
    entity_id: int,
    group_id: str,
    title: str,
    deadline: datetime,
    kind: str,
    emoji: str,
) -> None:
    """Рассылает уведомление всем студентам группы."""
    students = await user_service.get_group_students(db, group_id)
    text = (
        f"{emoji} Напоминание: {title}\n"
        f"Дедлайн: {deadline.strftime('%d.%m.%Y %H:%M')}"
    )
    for student in students:
        if not student.max_user_id:
            continue
        if await notification_log_service.was_sent(
            db, entity_type, entity_id, student.id, kind
        ):
            continue
        if await notify_service.send_to_user(student.max_user_id, text):
            await notification_log_service.mark_sent(
                db, entity_type, entity_id, student.id, kind
            )


async def check_overdue_debts() -> None:
    """Раз в день шлёт персональные напоминания должникам."""
    now = datetime.utcnow()

    async with async_session() as db:
        result = await db.execute(
            select(Debt).where(Debt.deadline < now)
        )
        for debt in result.scalars().all():
            # Не чаще, чем раз в 24 часа
            if await notification_log_service.was_sent_recently(
                db, "debt", debt.id, debt.student_id, "overdue", hours=24
            ):
                continue

            student_result = await db.execute(
                select(User).where(User.id == debt.student_id)
            )
            student = student_result.scalar_one_or_none()
            if student is None or not student.max_user_id:
                continue

            days_overdue = (now - debt.deadline).days
            text = (
                f"🚨 Просроченный долг!\n"
                f"Предмет: {debt.subject}\n"
                f"Тип: {debt.type}\n"
                f"Просрочено на {days_overdue} дн.\n"
                f"Срочно свяжись с преподавателем."
            )
            if await notify_service.send_to_user(student.max_user_id, text):
                await notification_log_service.mark_sent(
                    db, "debt", debt.id, student.id, "overdue"
                )


async def send_daily_summary() -> None:
    """Раз в день собирает статистику по группе и шлёт старосте."""
    now = datetime.now(timezone.utc)
    today_end = now + timedelta(days=1)

    async with async_session() as db:
        groups_result = await db.execute(select(Group))
        groups = groups_result.scalars().all()

        for group in groups:
            # Староста группы
            starosta_result = await db.execute(
                select(User).where(
                    User.group_id == group.id,
                    User.role_id == "starosta",
                )
            )
            starosta = starosta_result.scalar_one_or_none()
            if starosta is None or not starosta.max_user_id:
                continue

            # Должники
            debts_result = await db.execute(
                select(Debt).where(Debt.group_id == group.id)
            )
            debts = list(debts_result.scalars().all())
            overdue = [d for d in debts if d.deadline < now]

            # Дедлайны на сегодня
            tasks_result = await db.execute(
                select(Task).where(
                    Task.group_id == group.id,
                    Task.deadline >= now,
                    Task.deadline <= today_end,
                )
            )
            today_tasks = list(tasks_result.scalars().all())

            text = (
                f"☀️ Доброе утро, {starosta.first_name}!\n\n"
                f"📊 Сводка по группе «{group.name}»:\n"
                f"• Долгов всего: {len(debts)}\n"
                f"• Просрочено: {len(overdue)}\n"
                f"• Дедлайнов сегодня: {len(today_tasks)}\n"
            )
            if today_tasks:
                text += "\n📌 Сегодня:\n"
                for t in today_tasks[:5]:
                    text += f"• {t.title} — {t.deadline.strftime('%H:%M')}\n"

            await notify_service.send_to_user(starosta.max_user_id, text)

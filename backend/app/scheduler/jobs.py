from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.database import async_session
from app.core.time import utcnow
from app.models.debt import Debt
from app.models.group import Group
from app.models.reminder import Reminder
from app.models.task import Task
from app.models.user import User
from app.services import notification_log_service, notify_service, user_service

logger = logging.getLogger("scheduler.jobs")


# ═══════════════════════════════════════════════════════════════
# Вехи напоминаний
# ═══════════════════════════════════════════════════════════════
# Формат: (часов до дедлайна, kind, эмодзи, текстовый ярлык)
DEADLINE_MILESTONES = [
    (24 * 7, "deadline_7d", "📅", "через неделю"),
    (24 * 3, "deadline_3d", "📅", "через 3 дня"),
    (24 * 1, "deadline_1d", "⏰", "завтра"),
    (8,      "deadline_8h", "🚨", "через 8 часов"),
    (2,      "deadline_2h", "🚨", "через 2 часа"),
]

# Окно срабатывания вехи (±часов вокруг целевого момента)
MILESTONE_WINDOW_HOURS = 1


def _match_milestone(deadline: datetime, now: datetime) -> tuple[str, str, str] | None:
    """
    Определяет, какая веха сейчас активна для дедлайна.
    Возвращает (kind, emoji, label) или None, если ни одна не подходит.
    """
    hours_left = (deadline - now).total_seconds() / 3600

    for hours, kind, emoji, label in DEADLINE_MILESTONES:
        if hours - MILESTONE_WINDOW_HOURS <= hours_left <= hours + MILESTONE_WINDOW_HOURS:
            return kind, emoji, label

    return None


# ═══════════════════════════════════════════════════════════════
# Задача 1: напоминание о дедлайнах на разных вехах
# ═══════════════════════════════════════════════════════════════

async def check_upcoming_deadlines() -> None:
    now = utcnow()
    # Ищем всё в пределах максимальной вехи + запас
    max_hours = max(h for h, _, _, _ in DEADLINE_MILESTONES)
    max_window = now + timedelta(hours=max_hours + MILESTONE_WINDOW_HOURS + 1)

    logger.info("=== check_upcoming_deadlines START ===")
    logger.info("now=%s, max_window=%s", now, max_window)

    async with async_session() as db:
        # ─── Reminders ───
        result = await db.execute(
            select(Reminder).where(
                Reminder.deadline >= now,
                Reminder.deadline <= max_window,
                Reminder.type == "group",
            )
        )
        reminders = result.scalars().all()
        logger.info("Найдено Reminders: %d", len(reminders))

        for r in reminders:
            milestone = _match_milestone(r.deadline, now)
            if milestone is None:
                continue
            kind, emoji, label = milestone
            logger.info("  Reminder id=%s → веха %s (%s)", r.id, kind, label)
            await _notify_group_about(
                db,
                entity_type="reminder",
                entity_id=r.id,
                group_id=r.group_id,
                title=r.title,
                deadline=r.deadline,
                kind=kind,
                emoji=emoji,
                label=label,
            )

        # ─── Tasks ───
        result = await db.execute(
            select(Task).where(
                Task.deadline >= now,
                Task.deadline <= max_window,
                Task.type == "group",
            )
        )
        tasks = result.scalars().all()
        logger.info("Найдено Tasks: %d", len(tasks))

        for t in tasks:
            milestone = _match_milestone(t.deadline, now)
            if milestone is None:
                continue
            kind, emoji, label = milestone
            logger.info("  Task id=%s → веха %s (%s)", t.id, kind, label)
            await _notify_group_about(
                db,
                entity_type="task",
                entity_id=t.id,
                group_id=t.group_id,
                title=t.title,
                deadline=t.deadline,
                kind=kind,
                emoji=emoji,
                label=label,
            )

        # ─── Debts (персонально должнику) ───
        result = await db.execute(
            select(Debt).where(
                Debt.deadline >= now,
                Debt.deadline <= max_window,
            )
        )
        debts = result.scalars().all()
        logger.info("Найдено Debts: %d", len(debts))

        for debt in debts:
            milestone = _match_milestone(debt.deadline, now)
            if milestone is None:
                continue
            kind, emoji, label = milestone
            logger.info("  Debt id=%s → веха %s (%s)", debt.id, kind, label)

            if await notification_log_service.was_sent(
                db, "debt", debt.id, debt.student_id, kind
            ):
                logger.info("    Debt id=%s — уже отправлено, пропускаем", debt.id)
                continue

            student_result = await db.execute(select(User).where(User.id == debt.student_id))
            student = student_result.scalar_one_or_none()
            if student is None:
                logger.warning("    Студент id=%s не найден", debt.student_id)
                continue
            if not student.max_user_id:
                logger.warning("    У студента id=%s нет max_user_id", student.id)
                continue

            text = (
                f"{emoji} Долг {label}!\n"
                f"Предмет: {debt.subject}\n"
                f"Тип: {debt.type}\n"
                f"Срок: {debt.deadline.strftime('%d.%m.%Y')}"
            )
            logger.info("    Отправка студенту %s (max_user_id=%s)", student.id, student.max_user_id)
            if await notify_service.send_to_user(student.max_user_id, text):
                logger.info("    ✅ УСПЕШНО отправлено %s", student.max_user_id)
                await notification_log_service.mark_sent(
                    db, "debt", debt.id, student.id, kind
                )
            else:
                logger.error("    ❌ НЕ УДАЛОСЬ отправить %s", student.max_user_id)

    logger.info("=== check_upcoming_deadlines END ===")


async def _notify_group_about(
    db,
    entity_type: str,
    entity_id: int,
    group_id: str,
    title: str,
    deadline: datetime,
    kind: str,
    emoji: str,
    label: str,
) -> None:
    """Рассылает уведомление всем студентам группы."""
    students = await user_service.get_group_students(db, group_id)
    logger.info(
        "  _notify_group_about: entity=%s/%s, студентов: %d",
        entity_type, entity_id, len(students),
    )

    text = (
        f"{emoji} Напоминание: {title}\n"
        f"Дедлайн {label}: {deadline.strftime('%d.%m.%Y %H:%M')}"
    )

    for student in students:
        if not student.max_user_id:
            logger.warning("    У студента id=%s нет max_user_id", student.id)
            continue

        if await notification_log_service.was_sent(
            db, entity_type, entity_id, student.id, kind
        ):
            logger.info("    Студент %s — уже отправлено, пропускаем", student.id)
            continue

        logger.info("    Отправка студенту %s (max_user_id=%s)", student.id, student.max_user_id)
        if await notify_service.send_to_user(student.max_user_id, text):
            logger.info("    ✅ УСПЕШНО отправлено %s", student.max_user_id)
            await notification_log_service.mark_sent(
                db, entity_type, entity_id, student.id, kind
            )
        else:
            logger.error("    ❌ НЕ УДАЛОСЬ отправить %s", student.max_user_id)


# ═══════════════════════════════════════════════════════════════
# Задача 2: напоминание о просроченных долгах
# ═══════════════════════════════════════════════════════════════

async def check_overdue_debts() -> None:
    """Раз в день шлёт персональные напоминания должникам."""
    now = utcnow()

    logger.info("=== check_overdue_debts START ===")
    logger.info("now=%s", now)

    async with async_session() as db:
        result = await db.execute(select(Debt).where(Debt.deadline < now))
        debts = result.scalars().all()
        logger.info("Найдено просроченных Debts: %d", len(debts))

        for debt in debts:
            logger.info(
                "  Debt id=%s, subject=%s, student_id=%s",
                debt.id, debt.subject, debt.student_id,
            )

            if await notification_log_service.was_sent_recently(
                db, "debt", debt.id, debt.student_id, "overdue", hours=24
            ):
                logger.info("  Debt id=%s — уже отправлено, пропускаем", debt.id)
                continue

            student_result = await db.execute(select(User).where(User.id == debt.student_id))
            student = student_result.scalar_one_or_none()
            if student is None:
                logger.warning("  Студент id=%s не найден", debt.student_id)
                continue
            if not student.max_user_id:
                logger.warning("  У студента id=%s нет max_user_id", student.id)
                continue

            days_overdue = (now - debt.deadline).days
            text = (
                f"🚨 Просроченный долг!\n"
                f"Предмет: {debt.subject}\n"
                f"Тип: {debt.type}\n"
                f"Просрочено на {days_overdue} дн.\n"
                f"Срочно свяжись с преподавателем."
            )

            logger.info("  Отправка студенту %s (max_user_id=%s)", student.id, student.max_user_id)
            if await notify_service.send_to_user(student.max_user_id, text):
                logger.info("  ✅ УСПЕШНО отправлено %s", student.max_user_id)
                await notification_log_service.mark_sent(
                    db, "debt", debt.id, student.id, "overdue"
                )
            else:
                logger.error("  ❌ НЕ УДАЛОСЬ отправить %s", student.max_user_id)

    logger.info("=== check_overdue_debts END ===")


# ═══════════════════════════════════════════════════════════════
# Задача 3: утренняя сводка старосте
# ═══════════════════════════════════════════════════════════════

async def send_daily_summary() -> None:
    """Раз в день собирает статистику по группе и шлёт старосте."""
    now = utcnow()
    today_end = now + timedelta(days=1)

    logger.info("=== send_daily_summary START ===")
    logger.info("now=%s, today_end=%s", now, today_end)

    async with async_session() as db:
        groups_result = await db.execute(select(Group))
        groups = groups_result.scalars().all()
        logger.info("Найдено групп: %d", len(groups))

        for group in groups:
            logger.info("  Группа id=%s, name=%s", group.id, group.name)

            starosta_result = await db.execute(
                select(User).where(
                    User.group_id == group.id,
                    User.role_id == "starosta",
                )
            )
            starosta = starosta_result.scalar_one_or_none()
            if starosta is None:
                logger.warning("    Староста не найден в группе %s", group.id)
                continue
            if not starosta.max_user_id:
                logger.warning("    У старосты id=%s нет max_user_id", starosta.id)
                continue

            debts_result = await db.execute(
                select(Debt).where(Debt.group_id == group.id)
            )
            debts = list(debts_result.scalars().all())
            overdue = [d for d in debts if d.deadline < now]

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

            logger.info("  Отправка старосте %s (max_user_id=%s)", starosta.id, starosta.max_user_id)
            if await notify_service.send_to_user(starosta.max_user_id, text):
                logger.info("  ✅ УСПЕШНО отправлено %s", starosta.max_user_id)
            else:
                logger.error("  ❌ НЕ УДАЛОСЬ отправить %s", starosta.max_user_id)

    logger.info("=== send_daily_summary END ===")

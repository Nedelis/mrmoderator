"""
Точка входа планировщика.

Запуск:
    python -m app.scheduler
"""

import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from maxapi import Bot

from app.core.config import SETTINGS
from app.scheduler.jobs import (
    check_overdue_debts,
    check_upcoming_deadlines,
    send_daily_summary,
)
from app.services import notify_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("scheduler")


# ────────────────────────────────────────────────────────────
# Регистрация sender'а — чтобы notify_service умел отправлять
# ────────────────────────────────────────────────────────────


def _register_sender() -> None:
    token = SETTINGS.MAX_BOT_TOKEN.get_secret_value()
    if not token:
        raise ValueError("MAX_BOT_TOKEN не задан — скедулер не сможет отправлять сообщения")

    bot = Bot(token=token)

    async def sender(user_id: str, text: str) -> bool:
        # notify_service.send_to_user передаёт max_user_id — это user_id, а не chat_id
        try:
            await bot.send_message(user_id=user_id, text=text)
            return True
        except Exception as e:
            logger.error("Не удалось отправить сообщение пользователю %s: %s", user_id, e)
            return False

    notify_service.register_sender(sender)
    logger.info("Sender зарегистрирован")


# ────────────────────────────────────────────────────────────
# Обёртки для логирования
# ────────────────────────────────────────────────────────────


async def _run_job(name: str, fn) -> None:
    logger.info("Запуск задачи: %s", name)
    try:
        await fn()
        logger.info("Задача %s завершена", name)
    except Exception as e:
        logger.exception("Ошибка в задаче %s: %s", name, e)


async def job_upcoming_deadlines() -> None:
    await _run_job("check_upcoming_deadlines", check_upcoming_deadlines)


async def job_overdue_debts() -> None:
    await _run_job("check_overdue_debts", check_overdue_debts)


async def job_daily_summary() -> None:
    await _run_job("send_daily_summary", send_daily_summary)


# ────────────────────────────────────────────────────────────
# Главная функция
# ────────────────────────────────────────────────────────────


async def main() -> None:
    _register_sender()

    scheduler = AsyncIOScheduler(timezone="Europe/Moscow")

    scheduler.add_job(
        job_upcoming_deadlines,
        trigger=IntervalTrigger(minutes=15),
        id="upcoming_deadlines",
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        job_overdue_debts,
        trigger=CronTrigger(hour=9, minute=0),
        id="overdue_debts",
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        job_daily_summary,
        trigger=CronTrigger(hour=8, minute=0),
        id="daily_summary",
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()
    logger.info("Планировщик запущен. Задачи: %s", [j.id for j in scheduler.get_jobs()])

    # Ждём вечно
    await asyncio.Event().wait()

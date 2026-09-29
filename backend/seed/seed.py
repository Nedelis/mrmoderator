"""
Сидер тестовых данных для API.

Использование:
    python -m seed
    python -m seed --force
    python -m seed --clean

Наполняет БД тестовыми данными из seed/test_data.json.
Очищает БД перед заливкой, если USE_TEST_DATA=true или передан --force.
Просто очищает БД и выходит, если есть флаг --clean.
"""

__all__ = ['is_db_empty', 'clear_db', 'seed', 'main', 'cli']

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import delete, func, select

from app.core.config import SETTINGS
from app.core.database import async_session
from app.models.debt import Debt
from app.models.exam import Exam, ExamMaterial
from app.models.group import Group
from app.models.mail import Mailbox, MailItem
from app.models.material import Material
from app.models.reminder import Reminder
from app.models.settings import GroupSettings
from app.models.task import Task
from app.models.user import User


DATA_FILE = Path(__file__).parent / "test_data.json"


def _parse_dt(value):
    """Строку 'YYYY-MM-DDTHH:MM:SS' → datetime. Иначе возвращает как есть."""
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return value
    return value


def _normalize_dates(record: dict, date_fields: tuple) -> dict:
    """Конвертирует указанные поля-строки в datetime."""
    for field in date_fields:
        if field in record and record[field] is not None:
            record[field] = _parse_dt(record[field])
    return record


async def is_db_empty() -> bool:
    async with async_session() as db:
        result = await db.execute(select(func.count(Group.id)))
        return result.scalar_one() == 0


async def clear_db() -> None:
    """Удаляет все данные из всех таблиц (в правильном порядке)."""
    async with async_session() as db:
        await db.execute(delete(ExamMaterial))
        await db.execute(delete(Exam))
        await db.execute(delete(Mailbox))
        await db.execute(delete(MailItem))
        await db.execute(delete(Material))
        await db.execute(delete(Reminder))
        await db.execute(delete(Debt))
        await db.execute(delete(Task))
        await db.execute(delete(GroupSettings))
        await db.execute(delete(User))
        await db.execute(delete(Group))
        await db.commit()


async def seed() -> None:
    if not DATA_FILE.exists():
        print(f"❌ Файл не найден: {DATA_FILE}")
        sys.exit(1)

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    async with async_session() as db:
        # Группы
        for g in data.get("groups", []):
            db.add(Group(**g))

        # Пользователи
        for u in data.get("users", []):
            db.add(User(**u))

        # Напоминания — deadline и created_at
        for r in data.get("reminders", []):
            _normalize_dates(r, ("deadline", "created_at"))
            db.add(Reminder(**r))

        # Долги — deadline и created_at
        for d in data.get("debts", []):
            _normalize_dates(d, ("deadline", "created_at"))
            db.add(Debt(**d))

        # Задания — deadline и created_at
        for t in data.get("tasks", []):
            _normalize_dates(t, ("deadline", "created_at"))
            db.add(Task(**t))

        # Материалы — created_at
        for m in data.get("materials", []):
            _normalize_dates(m, ("created_at",))
            db.add(Material(**m))

        # Экзамены — date
        for e in data.get("exams", []):
            _normalize_dates(e, ("date",))
            db.add(Exam(**e))

        # Материалы к экзаменам — added_at
        for em in data.get("exam_materials", []):
            _normalize_dates(em, ("added_at",))
            db.add(ExamMaterial(**em))

        # Почта — forwarded_at и created_at
        for mi in data.get("mail_items", []):
            _normalize_dates(mi, ("forwarded_at", "created_at"))
            db.add(MailItem(**mi))

        # Ящики
        for mb in data.get("mailboxes", []):
            db.add(Mailbox(**mb))

        # Настройки группы
        for gs in data.get("group_settings", []):
            db.add(GroupSettings(**gs))

        await db.commit()

    print("✅ Тестовые данные загружены")


async def main(force: bool = False, just_clean: bool = False) -> None:
    # очищаем выходим
    if just_clean:
        if await is_db_empty():
            print("ℹ️  БД пустая, очистка не нужна")
        else:
            print("⚠️ Очистка БД")
            await clear_db()
            print("Успех")
        return

    # Очищаем БД, если USE_TEST_DATA=true или передан --force
    if force or SETTINGS.USE_TEST_DATA:
        if await is_db_empty():
            print("ℹ️  БД пустая, очистка не нужна")
        else:
            print("⚠️  Очистка БД перед заливкой тестовых данных")
            await clear_db()
    elif not await is_db_empty():
        print("ℹ️  БД не пустая и USE_TEST_DATA=false. Сидинг пропущен")
        return

    await seed()


def cli() -> None:
    parser = argparse.ArgumentParser(description="Заполнить БД тестовыми данными или очистить")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Очистить БД и залить данные, даже если USE_TEST_DATA=false",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Очистить БД, не заполняя данными. Приоритет выше --force"
    )
    args = parser.parse_args()
    asyncio.run(main(force=args.force, just_clean=args.clean))

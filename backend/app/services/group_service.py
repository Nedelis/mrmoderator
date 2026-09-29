import secrets
import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.debt import Debt
from app.models.group import Group
from app.models.material import Material
from app.models.reminder import Reminder
from app.models.task import Task
from app.models.user import User
from app.schemas.user import GroupInfo


# ═══════════════════════════════════════════════════════════════
# Чтение
# ═══════════════════════════════════════════════════════════════

async def get_group(db: AsyncSession, group_id: str) -> Group | None:
    result = await db.execute(select(Group).where(Group.id == group_id))
    return result.scalar_one_or_none()


async def get_group_by_invite(db: AsyncSession, invite_code: str) -> Group | None:
    result = await db.execute(select(Group).where(Group.invite_code == invite_code))
    return result.scalar_one_or_none()


async def get_group_info(db: AsyncSession, group_id: str) -> GroupInfo:
    group = await get_group(db, group_id)
    if group is None:
        return GroupInfo(name="Неизвестная группа", course=1, semester=1, students_count=0)

    count_result = await db.execute(select(func.count(User.id)).where(User.group_id == group_id))
    students_count = count_result.scalar_one()

    return GroupInfo(
        name=group.name,
        course=group.course,
        semester=group.semester,
        students_count=students_count,
    )


async def get_group_name(db: AsyncSession, group_id: str) -> str:
    group = await get_group(db, group_id)
    return group.name if group else ""


# ═══════════════════════════════════════════════════════════════
# Утилиты
# ═══════════════════════════════════════════════════════════════

def _generate_invite_code() -> str:
    return secrets.token_urlsafe(6)


# ═══════════════════════════════════════════════════════════════
# Создание группы
# ═══════════════════════════════════════════════════════════════

async def create_group(db: AsyncSession, user: User, name: str) -> Group:
    """
    Создаёт новую группу. Создатель становится старостой.
    Защита: если user уже в группе — ValueError.
    """
    if user.group_id:
        raise ValueError("already_in_group")

    group_id = str(uuid.uuid4())
    invite_code = _generate_invite_code()

    group = Group(
        id=group_id,
        name=name,
        course=1,
        semester=1,
        invite_code=invite_code,
    )
    db.add(group)

    user.group_id = group_id
    user.role_id = "starosta"

    await db.commit()
    await db.refresh(group)
    return group


# ═══════════════════════════════════════════════════════════════
# Вступление в группу
# ═══════════════════════════════════════════════════════════════

async def join_group_by_invite(
    db: AsyncSession,
    user: User,
    invite_code: str,
) -> Group | None:
    """
    Вступает в группу по коду приглашения.

    Защита:
    - если user уже в группе — None.
    - если код пустой — None.
    - если код не найден — None.
    - role_id НЕ сбрасывается.
    """
    if user.group_id:
        return None

    if not invite_code or not invite_code.strip():
        return None

    group = await get_group_by_invite(db, invite_code.strip())
    if group is None:
        return None

    user.group_id = group.id
    # role_id НЕ трогаем — новый юзер и так "student"

    await db.commit()
    await db.refresh(group)
    return group


# ═══════════════════════════════════════════════════════════════
# Привязка chat_id
# ═══════════════════════════════════════════════════════════════

async def save_chat_id(db: AsyncSession, group_id: str, chat_id: str) -> None:
    group = await get_group(db, group_id)
    if group is not None:
        group.chat_id = chat_id
        await db.commit()


# ═══════════════════════════════════════════════════════════════
# Выход из группы
# ═══════════════════════════════════════════════════════════════

async def leave_group(db: AsyncSession, user: User) -> None:
    """
    Мягкое удаление пользователя из группы.

    - Удаляет сущности, где user — автор.
    - Отвязывает от группы (group_id = NULL, role_id = 'student').
    - Сам user остаётся в БД.
    """
    if not user.group_id:
        raise ValueError("not_in_group")

    await db.execute(delete(Debt).where(Debt.student_id == user.id))
    await db.execute(delete(Task).where(Task.author_id == user.id))
    await db.execute(delete(Reminder).where(Reminder.author_id == user.id))
    await db.execute(delete(Material).where(Material.author_id == user.id))

    user.group_id = None
    user.role_id = "student"

    await db.commit()

import secrets
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.group import Group
from app.models.user import User
from app.schemas.user import GroupInfo


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

    count_result = await db.execute(
        select(func.count(User.id)).where(User.group_id == group_id)
    )
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


def _generate_invite_code() -> str:
    return secrets.token_urlsafe(6)


async def create_group(db: AsyncSession, user: User, name: str) -> Group:
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


async def join_group_by_invite(db: AsyncSession, user: User, invite_code: str) -> Group | None:
    group = await get_group_by_invite(db, invite_code)
    if group is None:
        return None

    user.group_id = group.id
    if user.role_id == "starosta":
        user.role_id = "student"

    await db.commit()
    await db.refresh(group)
    return group


async def save_chat_id(db: AsyncSession, group_id: str, chat_id: str) -> None:
    group = await get_group(db, group_id)
    if group is not None:
        group.chat_id = chat_id
        await db.commit()
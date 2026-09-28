from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.group import Group
from app.models.user import User
from app.schemas.user import GroupInfo


async def get_group(db: AsyncSession, group_id: str) -> Group | None:
    result = await db.execute(select(Group).where(Group.id == group_id))
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

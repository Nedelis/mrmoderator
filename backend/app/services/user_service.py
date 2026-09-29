from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import CurrentUser, Student


def build_full_name(user: User) -> str:
    if user.display_name:
        return user.display_name
    parts = [p for p in (user.first_name, user.last_name) if p]
    return " ".join(parts) or "Без имени"


async def get_user_by_max_id(db: AsyncSession, max_user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.max_user_id == max_user_id))
    return result.scalar_one_or_none()


async def get_group_students(db: AsyncSession, group_id: str) -> list[User]:
    result = await db.execute(
        select(User).where(User.group_id == group_id).order_by(User.last_name)
    )
    return list(result.scalars().all())


def to_current_user(user: User, group_name: str) -> CurrentUser:
    return CurrentUser(
        id=str(user.id),
        first_name=user.first_name,
        last_name=user.last_name,
        username=user.username or "",
        photo_url=user.photo_url,
        group_id=user.group_id or "",
        group_name=group_name,
        role_id=user.role_id,
    )


def to_student(user: User, debts_count: int = 0) -> Student:
    return Student(
        id=str(user.id),
        name=build_full_name(user),
        role=user.role_id,
        avg_score=None,
        attendance=None,
        debts=debts_count,
    )

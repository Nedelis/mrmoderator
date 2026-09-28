from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import GroupInfo, Student
from app.services import group_service, user_service

router = APIRouter(tags=["Группа"])


@router.get("/group", response_model=GroupInfo)
async def get_group(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Информация о группе текущего пользователя."""
    if not user.group_id:
        return GroupInfo(name="", course=1, semester=1, students_count=0)
    return await group_service.get_group_info(db, user.group_id)


@router.get("/students", response_model=list[Student])
async def get_students(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список студентов группы."""
    if not user.group_id:
        return []
    students = await user_service.get_group_students(db, user.group_id)
    return [user_service.to_student(s) for s in students]

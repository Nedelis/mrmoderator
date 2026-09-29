from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.common import OkResponse
from app.schemas.user import GroupInfo, Student
from app.services import group_service, user_service

router = APIRouter(tags=["Группа"])


# ═══════════════════════════════════════════════════════════════
# GET /group — инфо о группе
# ═══════════════════════════════════════════════════════════════


@router.get("/group", response_model=GroupInfo)
async def get_group(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Информация о группе текущего пользователя."""
    if not user.group_id:
        return GroupInfo(name="", course=1, semester=1, students_count=0)
    return await group_service.get_group_info(db, user.group_id)


# ═══════════════════════════════════════════════════════════════
# GET /students — список студентов группы
# ═══════════════════════════════════════════════════════════════


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


# ═══════════════════════════════════════════════════════════════
# POST /group/leave — выход из группы
# ═══════════════════════════════════════════════════════════════


@router.post("/group/leave", response_model=OkResponse)
async def leave_group(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Выход из группы.

    Мягкое удаление:
    - удаляются все сущности пользователя (долги, задания, напоминания, материалы)
    - юзер отвязывается от группы (group_id = NULL, role_id = 'student')
    - сам юзер остаётся в БД
    """
    if not user.group_id:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "not_in_group", "message": "Ты не в группе"}},
        )

    # Староста не может выйти, пока не передаст права
    if user.role_id == "starosta":
        raise HTTPException(
            status_code=403,
            detail={
                "error": {
                    "code": "starosta_cannot_leave",
                    "message": "Староста не может выйти из группы. Сначала передай права другому.",
                }
            },
        )

    try:
        await group_service.leave_group(db, user)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "not_in_group", "message": str(e)}},
        )

    return OkResponse()

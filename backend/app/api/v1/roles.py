from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require
from app.core.roles import ROLES
from app.models.user import User
from app.schemas.common import OkResponse, RemovedMemberResponse, RenamedMemberResponse
from app.schemas.role import AssignRoleRequest, RenameMemberRequest

router = APIRouter(tags=["Роли и группа"])


def _role_level(role_id: str) -> int:
    """Возвращает уровень роли. Чем выше — тем приоритетнее."""
    return ROLES.get(role_id, {}).get("level", 0)


# ═══════════════════════════════════════════════════════════════
# НАЗНАЧЕНИЕ РОЛИ
# ═══════════════════════════════════════════════════════════════

@router.post("/roles/assign", response_model=OkResponse)
async def assign_role(
    data: AssignRoleRequest,
    current: User = Depends(require("roles.assign")),
    db: AsyncSession = Depends(get_db),
):
    # 1. Нельзя менять роль самому себе (кроме случая передачи старосты — см. ниже)
    if str(current.id) == str(data.student_id):
        raise HTTPException(403, "Нельзя менять роль самому себе")

    # 2. Найти целевого пользователя
    result = await db.execute(select(User).where(User.id == int(data.student_id)))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(404, "Студент не найден")

    # 3. Нельзя трогать того, кто выше или равен по уровню
    if _role_level(target.role_id) >= _role_level(current.role_id):
        raise HTTPException(
            403,
            "Нельзя менять роль участнику с более высоким или равным уровнем",
        )

    # 4. Назначение старосты — особый случай
    if data.role_id == "starosta":
        # Только староста может назначить нового старосту
        if current.role_id != "starosta":
            raise HTTPException(403, "Только староста может назначить нового старосту")
        # Передача прав: старый староста → студент, новый → староста
        current.role_id = "student"
        target.role_id = "starosta"
        await db.commit()
        return OkResponse()

    # 5. Нельзя назначить роль выше своей
    if _role_level(data.role_id) >= _role_level(current.role_id):
        raise HTTPException(403, "Нельзя назначать роль выше или равную своей")

    target.role_id = data.role_id
    await db.commit()
    return OkResponse()


# ═══════════════════════════════════════════════════════════════
# УДАЛЕНИЕ УЧАСТНИКА
# ═══════════════════════════════════════════════════════════════

@router.delete("/group/members/{student_id}", response_model=RemovedMemberResponse)
async def remove_group_member(
    student_id: str,
    current: User = Depends(require("group.edit")),
    db: AsyncSession = Depends(get_db),
):
    # 1. Нельзя удалить себя
    if str(current.id) == str(student_id):
        raise HTTPException(403, "Нельзя удалить себя")

    # 2. Найти целевого пользователя
    result = await db.execute(select(User).where(User.id == int(student_id)))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(404, "Участник не найден")

    # 3. Нельзя удалить того, кто выше или равен по уровню
    if _role_level(target.role_id) >= _role_level(current.role_id):
        raise HTTPException(
            403,
            "Нельзя исключить участника с более высоким или равным уровнем",
        )

    name = f"{target.last_name} {target.first_name}".strip()
    await db.delete(target)
    await db.commit()
    return RemovedMemberResponse(removed=name)


# ═══════════════════════════════════════════════════════════════
# ПЕРЕИМЕНОВАНИЕ УЧАСТНИКА
# ═══════════════════════════════════════════════════════════════

@router.patch("/group/members/{student_id}/name", response_model=RenamedMemberResponse)
async def rename_member(
    student_id: str,
    data: RenameMemberRequest,
    current: User = Depends(require("group.edit")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == int(student_id)))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(404, "Участник не найден")

    if _role_level(target.role_id) >= _role_level(current.role_id):
        raise HTTPException(
            403,
            "Нельзя переименовать участника с более высоким или равным уровнем",
        )

    old_name = target.display_name or f"{target.first_name} {target.last_name}".strip()
    target.display_name = data.name
    await db.commit()
    return RenamedMemberResponse(old_name=old_name, new_name=data.name)

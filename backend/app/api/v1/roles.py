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


@router.post("/roles/assign", response_model=OkResponse)
async def assign_role(
    data: AssignRoleRequest,
    current: User = Depends(require("roles.assign")),
    db: AsyncSession = Depends(get_db),
):
    if data.role_id == "starosta":
        raise HTTPException(403, "Нельзя назначить старосту через UI")
    if str(current.id) == data.student_id:
        raise HTTPException(403, "Нельзя менять роль самому себе")

    result = await db.execute(select(User).where(User.id == int(data.student_id)))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(404, "Студент не найден")

    # Зам не может назначать роли выше своего уровня
    if current.role_id == "zam":
        target_role = ROLES.get(data.role_id, {})
        if target_role.get("level", 0) >= ROLES["zam"]["level"]:
            raise HTTPException(403, "Зам не может назначать роли выше своего уровня")

    target.role_id = data.role_id
    await db.commit()
    return OkResponse()


@router.delete("/group/members/{student_id}", response_model=RemovedMemberResponse)
async def remove_group_member(
    student_id: str,
    current: User = Depends(require("group.edit")),
    db: AsyncSession = Depends(get_db),
):
    if str(current.id) == student_id:
        raise HTTPException(403, "Нельзя удалить себя")

    result = await db.execute(select(User).where(User.id == int(student_id)))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(404, "Участник не найден")

    name = f"{target.last_name} {target.first_name}".strip()
    await db.delete(target)
    await db.commit()
    return RemovedMemberResponse(removed=name)


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

    old_name = target.display_name or f"{target.first_name} {target.last_name}".strip()
    target.display_name = data.name
    await db.commit()
    return RenamedMemberResponse(old_name=old_name, new_name=data.name)

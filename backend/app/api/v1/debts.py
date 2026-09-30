from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.roles import has_permission
from app.models.user import User
from app.schemas.common import OkResponse
from app.schemas.debt import CreateDebtRequest, Debt, UpdateDebtRequest
from app.services import debt_service

router = APIRouter(prefix="/debts", tags=["Долги"])


@router.get("", response_model=list[Debt])
async def list_debts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.group_id:
        return []
    return await debt_service.list_debts(db, user, user.group_id)


@router.post("", response_model=Debt, status_code=status.HTTP_201_CREATED)
async def create_debt(
    data: CreateDebtRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.group_id:
        raise HTTPException(400, "Пользователь не в группе")
    try:
        return await debt_service.create_debt(db, user, user.group_id, data)
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except LookupError as e:
        raise HTTPException(404, str(e))


async def _get_manageable_debt(db: AsyncSession, user: User, debt_id: int):
    """
    Возвращает долг, которым пользователь может управлять:
    - с правом debts.edit — любой долг своей группы;
    - без него — только собственный долг (право debts.create.own).
    """
    debt = await debt_service.get_debt(db, debt_id)
    if debt is None or debt.group_id != user.group_id:
        raise HTTPException(404, "Долг не найден")

    if has_permission(user.role_id, "debts.edit"):
        return debt
    if debt.student_id == user.id and has_permission(user.role_id, "debts.create.own"):
        return debt
    raise HTTPException(403, "Можно изменять только свои долги")


@router.put("/{debt_id}", response_model=OkResponse)
async def update_debt(
    debt_id: int,
    data: UpdateDebtRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    debt = await _get_manageable_debt(db, user, debt_id)

    # Переназначить долг другому участнику может только обладатель debts.edit
    if (
        data.student_id is not None
        and str(data.student_id) != str(debt.student_id)
        and not has_permission(user.role_id, "debts.edit")
    ):
        raise HTTPException(403, "Нельзя переназначить долг другому участнику")

    try:
        await debt_service.update_debt(db, debt, data)
    except LookupError as e:
        raise HTTPException(404, str(e))
    return OkResponse()


@router.delete("/{debt_id}", response_model=OkResponse)
async def delete_debt(
    debt_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    debt = await _get_manageable_debt(db, user, debt_id)
    await debt_service.delete_debt(db, debt)
    return OkResponse()

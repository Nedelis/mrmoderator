from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require
from app.models.user import User
from app.schemas.common import OkResponse
from app.schemas.debt import Debt, CreateDebtRequest, UpdateDebtRequest
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
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.put("/{debt_id}", response_model=OkResponse)
async def update_debt(
    debt_id: int,
    data: UpdateDebtRequest,
    user: User = Depends(require("debts.edit")),
    db: AsyncSession = Depends(get_db),
):
    debt = await debt_service.get_debt(db, debt_id)
    if debt is None:
        raise HTTPException(404, "Долг не найден")
    await debt_service.update_debt(db, debt, data)
    return OkResponse()


@router.delete("/{debt_id}", response_model=OkResponse)
async def delete_debt(
    debt_id: int,
    user: User = Depends(require("debts.edit")),
    db: AsyncSession = Depends(get_db),
):
    debt = await debt_service.get_debt(db, debt_id)
    if debt is None:
        raise HTTPException(404, "Долг не найден")
    await debt_service.delete_debt(db, debt)
    return OkResponse()

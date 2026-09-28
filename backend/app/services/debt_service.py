import app.services.user_service as user_service
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.roles import has_permission
from app.models.debt import Debt
from app.models.user import User
from app.schemas.debt import Debt as DebtSchema, CreateDebtRequest, UpdateDebtRequest


def _to_schema(d: Debt) -> DebtSchema:
    return DebtSchema(
        id=str(d.id),
        student_name=d.student_name,
        subject=d.subject,
        type=d.type,
        deadline=d.deadline,
        status=d.status,
    )


async def _find_student_by_name(
    db: AsyncSession,
    group_id: str,
    name_query: str,
) -> User | None:
    name_lower = name_query.strip().lower()

    stmt = select(User).where(
        User.group_id == group_id,
        (User.display_name.ilike(f"%{name_lower}%")) |
        (User.first_name.ilike(f"%{name_lower}%")) |
        (User.last_name.ilike(f"%{name_lower}%"))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


def _compute_status(deadline: datetime) -> str:
    if deadline < datetime.now(timezone.utc):
        return "overdue"
    return "active"


async def list_debts(db: AsyncSession, user: User, group_id: str) -> list[DebtSchema]:
    stmt = select(Debt).where(Debt.group_id == group_id)
    if not has_permission(user.role_id, "debts.view.all"):
        stmt = stmt.where(Debt.student_id == user.id)
    stmt = stmt.order_by(Debt.deadline)
    result = await db.execute(stmt)
    return [_to_schema(d) for d in result.scalars().all()]


def _parse_date(date_str: str) -> datetime:
    return datetime.strptime(date_str, "%Y-%m-%d")


async def create_debt(
    db: AsyncSession,
    user: User,
    group_id: str,
    data: CreateDebtRequest,
) -> DebtSchema:
    can_edit_any = has_permission(user.role_id, "debts.edit")
    is_self = data.student_name.strip().lower() == user_service.build_full_name(user).lower()

    if is_self:
        target_user = user
    elif can_edit_any:
        target_user = await _find_student_by_name(db, group_id, data.student_name)
        if target_user is None:
            raise ValueError(f"Студент '{data.student_name}' не найден в группе")
    else:
        raise PermissionError("Можно создавать долги только себе")

    deadline = _parse_date(data.deadline)
    debt = Debt(
        student_id=target_user.id,
        student_name=data.student_name,
        subject=data.subject,
        type=data.type,
        deadline=deadline,
        status=_compute_status(deadline),
        group_id=group_id,
    )
    db.add(debt)
    await db.commit()
    await db.refresh(debt)
    return _to_schema(debt)


async def get_debt(db: AsyncSession, debt_id: int) -> Debt | None:
    result = await db.execute(select(Debt).where(Debt.id == debt_id))
    return result.scalar_one_or_none()


async def update_debt(
    db: AsyncSession,
    debt: Debt,
    data: UpdateDebtRequest,
) -> DebtSchema:
    if data.student_name is not None:
        debt.student_name = data.student_name
    if data.subject is not None:
        debt.subject = data.subject
    if data.type is not None:
        debt.type = data.type
    if data.deadline is not None:
        debt.deadline = _parse_date(data.deadline)
        debt.status = _compute_status(debt.deadline)
    await db.commit()
    await db.refresh(debt)
    return _to_schema(debt)


async def delete_debt(db: AsyncSession, debt: Debt) -> None:
    await db.delete(debt)
    await db.commit()

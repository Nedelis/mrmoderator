from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import has_permission
from app.models.debt import Debt
from app.models.user import User
from app.schemas.debt import (
    CreateDebtRequest,
    UpdateDebtRequest,
)
from app.schemas.debt import (
    Debt as DebtSchema,
)


def _build_full_name(u: User) -> str:
    """Собирает ФИО из display_name или last_name + first_name."""
    if u.display_name:
        return u.display_name
    parts = [p for p in (u.last_name, u.first_name) if p]
    return " ".join(parts).strip() or "Без имени"


def _to_schema(d: Debt, actual_name: str | None = None) -> DebtSchema:
    """
    actual_name — актуальное имя из БД.
    Если не передано — используем снимок d.student_name.
    """
    return DebtSchema(
        id=str(d.id),
        student_id=str(d.student_id),
        student_name=actual_name or d.student_name or "Неизвестный",
        subject=d.subject,
        type=d.type,
        deadline=d.deadline,
        status=d.status,
    )


def _compute_status(deadline: datetime) -> str:
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    if deadline < datetime.now(timezone.utc):
        return "overdue"
    return "active"


def _parse_date(date_str: str) -> datetime:
    return datetime.fromisoformat(date_str)


async def _get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def list_debts(db: AsyncSession, user: User, group_id: str) -> list[DebtSchema]:
    stmt = select(Debt).where(Debt.group_id == group_id)

    if not has_permission(user.role_id, "debts.view.all"):
        stmt = stmt.where(Debt.student_id == user.id)

    stmt = stmt.order_by(Debt.deadline)
    result = await db.execute(stmt)
    debts = result.scalars().all()

    # Собираем актуальные имена одним запросом
    user_ids = {d.student_id for d in debts}
    names_map: dict[int, str] = {}
    if user_ids:
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in users_result.scalars().all():
            names_map[u.id] = _build_full_name(u)

    return [_to_schema(d, names_map.get(d.student_id)) for d in debts]


async def create_debt(
    db: AsyncSession,
    user: User,
    group_id: str,
    data: CreateDebtRequest,
) -> DebtSchema:
    can_edit_any = has_permission(user.role_id, "debts.edit")
    is_self = str(user.id) == str(data.student_id)

    # 1. Определяем целевого студента
    if is_self:
        target_user = user
    elif can_edit_any:
        target_user = await _get_user_by_id(db, int(data.student_id))
        if target_user is None or target_user.group_id != group_id:
            raise LookupError(f"Студент с id={data.student_id} не найден в группе")
    else:
        raise PermissionError("Можно создавать долги только себе")

    # 2. Собираем снимок ФИО
    snapshot_name = _build_full_name(target_user)

    # 3. Создаём запись
    deadline = _parse_date(data.deadline)
    debt = Debt(
        student_id=target_user.id,
        student_name=snapshot_name,
        subject=data.subject,
        type=data.type,
        deadline=deadline,
        status=_compute_status(deadline),
        group_id=group_id,
    )
    db.add(debt)
    await db.commit()
    await db.refresh(debt)
    return _to_schema(debt, snapshot_name)


async def get_debt(db: AsyncSession, debt_id: int) -> Debt | None:
    result = await db.execute(select(Debt).where(Debt.id == debt_id))
    return result.scalar_one_or_none()


async def update_debt(
    db: AsyncSession,
    debt: Debt,
    data: UpdateDebtRequest,
) -> DebtSchema:
    # 1. Если меняется студент — обновляем и student_id, и student_name
    if data.student_id is not None:
        target = await _get_user_by_id(db, int(data.student_id))
        if target is None or target.group_id != debt.group_id:
            raise LookupError(f"Студент с id={data.student_id} не найден в группе")
        debt.student_id = target.id
        debt.student_name = _build_full_name(target)

    # 2. Остальные поля
    if data.subject is not None:
        debt.subject = data.subject
    if data.type is not None:
        debt.type = data.type
    if data.deadline is not None:
        debt.deadline = _parse_date(data.deadline)
        debt.status = _compute_status(debt.deadline)

    await db.commit()
    await db.refresh(debt)

    # 3. Возвращаем актуальное имя
    actual = await _get_user_by_id(db, debt.student_id)
    actual_name = _build_full_name(actual) if actual else debt.student_name
    return _to_schema(debt, actual_name)


async def delete_debt(db: AsyncSession, debt: Debt) -> None:
    await db.delete(debt)
    await db.commit()

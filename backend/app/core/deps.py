from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import SETTINGS
from app.core.database import get_db
from app.core.roles import has_permission
from app.core.security import validate_init_data
from app.models.user import User


# =============================================================================
# Получение текущего пользователя
# =============================================================================

async def _get_or_create_test_user(db: AsyncSession) -> User:
    """
    Заглушка для локальной разработки.
    Возвращает (или создаёт) тестового старосту.
    Используется, когда STRICT_AUTH=false.
    """
    TEST_MAX_ID = "test_user_001"

    result = await db.execute(select(User).where(User.max_user_id == TEST_MAX_ID))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            max_user_id=TEST_MAX_ID,
            first_name="Тест",
            last_name="Тестов",
            username="test_user",
            photo_url=None,
            role_id="starosta",
            group_id="TEST-GROUP-01",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


async def _get_or_create_user_from_init_data(
    db: AsyncSession,
    init_data_raw: str,
) -> User:
    """
    Реальная логика: валидирует initData от MAX и возвращает/создаёт пользователя.
    """
    data = validate_init_data(init_data_raw)
    max_user_id = str(data["user"].get("id", ""))

    if not max_user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Нет user.id в initData")

    result = await db.execute(select(User).where(User.max_user_id == max_user_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            max_user_id=max_user_id,
            first_name=data["user"].get("first_name", ""),
            last_name=data["user"].get("last_name", ""),
            username=data["user"].get("username"),
            photo_url=data["user"].get("photo_url"),
            role_id="student",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


async def get_current_user(
    x_max_init_data: str | None = Header(None, alias="X-Max-Init-Data"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Главная точка входа.

    - STRICT_AUTH=true  → обязательная валидация X-Max-Init-Data
    - STRICT_AUTH=false → подставляется тестовый пользователь (для разработки)
    """
    if not SETTINGS.STRICT_AUTH:
        return await _get_or_create_test_user(db)

    if not x_max_init_data:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "no_init_data", "message": "Заголовок X-Max-Init-Data обязателен"}},
        )

    return await _get_or_create_user_from_init_data(db, x_max_init_data)


# =============================================================================
# Проверка прав
# =============================================================================

def require(permission: str):
    async def checker(user: User = Depends(get_current_user)) -> User:
        if not has_permission(user.role_id, permission):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "permission_denied", "message": f"Нет права {permission}"}},
            )
        return user
    return 

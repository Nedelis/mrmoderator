from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.roles import has_permission
from app.core.security import validate_init_data
from app.models.user import User


async def get_current_user(
    x_max_init_data: str = Header(..., alias="X-Max-Init-Data"),
    db: AsyncSession = Depends(get_db),
) -> User:
    data = validate_init_data(x_max_init_data)
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


def require(permission: str):
    async def checker(user: User = Depends(get_current_user)) -> User:
        if not has_permission(user.role_id, permission):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "permission_denied", "message": f"Нет права {permission}"}},
            )
        return user
    return checker

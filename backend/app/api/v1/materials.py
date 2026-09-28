from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require
from app.core.roles import has_permission
from app.models.user import User
from app.schemas.common import OkResponse
from app.schemas.material import Material
from app.services import material_service

router = APIRouter(prefix="/materials", tags=["Материалы"])


@router.get("", response_model=list[Material])
async def list_materials(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.group_id:
        return []
    return await material_service.list_materials(db, user.group_id)


@router.post("", response_model=Material, status_code=status.HTTP_201_CREATED)
async def upload_material(
    title: str = Form(...),
    type: str = Form(...),
    url: str | None = Form(None),
    user: User = Depends(require("material.upload")),
    db: AsyncSession = Depends(get_db),
):
    """
    Загрузка материала.
    В новой логике файл уже лежит в MAX — мы принимаем метаданные.
    Если есть url — сохраняем прямую ссылку.
    """
    if not user.group_id:
        raise HTTPException(400, "Пользователь не в группе")

    if url:
        return await material_service.create_material_with_url(
            db, user, user.group_id, title, type, url,
        )

    # Если файла нет и url нет — это заглушка для регистрации материала,
    # который уже лежит в чате. Фронт передаёт метаданные.
    raise HTTPException(400, "Нужно передать url или зарегистрировать материал через бота")


@router.get("/{material_id}/download")
async def download_material(
    material_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Скачивание материала.
    Возвращает редирект на прямой URL или метаданные для MAX Bridge.
    """
    info = await material_service.get_material_file_info(db, material_id)
    if info is None:
        raise HTTPException(404, "Материал не найден")

    if info["download_url"]:
        return RedirectResponse(info["download_url"])

    # Если файл лежит в MAX — возвращаем метаданные для скачивания через Bridge
    return info


@router.delete("/{material_id}", response_model=OkResponse)
async def delete_material(
    material_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    material = await material_service.get_material(db, material_id)
    if material is None:
        raise HTTPException(404, "Материал не найден")

    can_any = has_permission(user.role_id, "material.delete.any")
    can_own = has_permission(user.role_id, "material.delete.own")
    is_author = material.author_id == user.id

    if not can_any and not (can_own and is_author):
        raise HTTPException(403, "Нельзя удалить этот материал")

    await material_service.delete_material(db, material)
    return OkResponse()

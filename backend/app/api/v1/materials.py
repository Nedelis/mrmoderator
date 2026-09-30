from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require
from app.core.roles import has_permission
from app.models.user import User
from app.schemas.common import OkResponse
from app.schemas.material import Material, UploadMaterialRequest
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
    data: UploadMaterialRequest,
    user: User = Depends(require("material.upload")),
    db: AsyncSession = Depends(get_db),
):
    """
    Добавление материала по ссылке.
    Файл лежит в MAX/облаке — сохраняем метаданные и ссылку.
    """
    if not user.group_id:
        raise HTTPException(400, "Пользователь не в группе")

    return await material_service.create_material_with_url(
        db,
        user,
        user.group_id,
        data.title,
        data.type,
        data.url,
    )


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
    material = await material_service.get_material(db, material_id)
    if material is None or material.group_id != user.group_id:
        raise HTTPException(404, "Материал не найден")
    info = await material_service.get_material_file_info(db, material_id)

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
    if material is None or material.group_id != user.group_id:
        raise HTTPException(404, "Материал не найден")

    can_any = has_permission(user.role_id, "material.delete.any")
    can_own = has_permission(user.role_id, "material.delete.own")
    is_author = material.author_id == user.id

    if not can_any and not (can_own and is_author):
        raise HTTPException(403, "Нельзя удалить этот материал")

    await material_service.delete_material(db, material)
    return OkResponse()

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Material
from app.models.user import User
from app.schemas.material import Material as MaterialSchema


def _humanize(dt: datetime) -> str:
    # SQLite возвращает naive datetime — считаем его UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = datetime.now(timezone.utc) - dt
    seconds = delta.total_seconds()
    if seconds < 60:
        return "только что"
    if seconds < 3600:
        return f"{int(seconds // 60)} мин назад"
    if seconds < 86400:
        return f"{int(seconds // 3600)} ч назад"
    days = int(seconds // 86400)
    if days == 1:
        return "вчера"
    if days < 7:
        return f"{days} дн назад"
    return dt.strftime("%d.%m.%Y")


def _author_name(user: User) -> str:
    parts = []
    if user.last_name:
        parts.append(user.last_name)
    if user.first_name:
        parts.append(f"{user.first_name[0]}.")
    return " ".join(parts) or "Без имени"


def _to_schema(m: Material, author_name: str) -> MaterialSchema:
    return MaterialSchema(
        id=str(m.id),
        title=m.title,
        author=author_name,
        type=m.type,
        created_at=_humanize(m.created_at),
        max_url=m.download_url,
    )


async def _resolve_author_name(db: AsyncSession, author_id: int | None) -> str:
    if not author_id:
        return "Неизвестный"
    result = await db.execute(select(User).where(User.id == author_id))
    user = result.scalar_one_or_none()
    return _author_name(user) if user else "Неизвестный"


async def list_materials(db: AsyncSession, group_id: str) -> list[MaterialSchema]:
    result = await db.execute(
        select(Material).where(Material.group_id == group_id).order_by(Material.created_at.desc())
    )
    materials = result.scalars().all()

    out = []
    for m in materials:
        author_name = await _resolve_author_name(db, m.author_id)
        out.append(_to_schema(m, author_name))
    return out


async def get_material(db: AsyncSession, material_id: int) -> Material | None:
    result = await db.execute(select(Material).where(Material.id == material_id))
    return result.scalar_one_or_none()


async def get_download_url(db: AsyncSession, material_id: int) -> str | None:
    material = await get_material(db, material_id)
    if material is None:
        return None

    # Если есть прямая ссылка — отдаём её
    if material.download_url:
        return material.download_url

    # Если есть file_id — отдаём URL-заглушку для MAX (фронт скачает через MAX Bridge)
    if material.max_file_id:
        return f"max://file/{material.max_file_id}"

    return None


async def get_material_file_info(db: AsyncSession, material_id: int) -> dict | None:
    material = await get_material(db, material_id)
    if material is None:
        return None

    return {
        "id": str(material.id),
        "title": material.title,
        "type": material.type,
        "max_file_id": material.max_file_id,
        "max_message_id": material.max_message_id,
        "max_chat_id": material.max_chat_id,
        "download_url": material.download_url,
    }


async def register_material_from_chat(
    db: AsyncSession,
    user: User,
    group_id: str,
    title: str,
    type_: str,
    max_file_id: str | None,
    max_message_id: str | None,
    max_chat_id: str | None,
    download_url: str | None = None,
) -> MaterialSchema:
    material = Material(
        title=title,
        author_id=user.id,
        type=type_,
        max_file_id=max_file_id,
        max_message_id=max_message_id,
        max_chat_id=max_chat_id,
        download_url=download_url,
        group_id=group_id,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    return _to_schema(material, _author_name(user))


async def create_material_with_url(
    db: AsyncSession,
    user: User,
    group_id: str,
    title: str,
    type_: str,
    download_url: str,
) -> MaterialSchema:
    material = Material(
        title=title,
        author_id=user.id,
        type=type_,
        download_url=download_url,
        group_id=group_id,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    return _to_schema(material, _author_name(user))


async def delete_material(db: AsyncSession, material: Material) -> None:
    await db.delete(material)
    await db.commit()

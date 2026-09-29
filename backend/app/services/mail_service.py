from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mail import Mailbox, MailItem
from app.schemas.mail import (
    AddMailboxRequest, ConfigureMailboxesRequest
)
from app.schemas.mail import (
    Mailbox as MailboxSchema,
)
from app.schemas.mail import (
    MailItem as MailItemSchema,
)


def _to_mail_schema(m: MailItem) -> MailItemSchema:
    return MailItemSchema(
        id=str(m.id),
        from_=m.sender,
        subject=m.subject,
        preview=m.preview or "",
        source=m.source,
        auto_forward=m.auto_forward,
    )


def _to_mailbox_schema(m: Mailbox) -> MailboxSchema:
    return MailboxSchema(
        id=str(m.id),
        email=m.email,
        label=m.label,
        connected=m.connected,
        auto_forward=m.auto_forward,
    )


async def list_mail(db: AsyncSession, group_id: str) -> list[MailItemSchema]:
    result = await db.execute(
        select(MailItem).where(MailItem.group_id == group_id).order_by(MailItem.created_at.desc())
    )
    return [_to_mail_schema(m) for m in result.scalars().all()]


async def list_mailboxes(db: AsyncSession, group_id: str) -> list[MailboxSchema]:
    result = await db.execute(select(Mailbox).where(Mailbox.group_id == group_id))
    return [_to_mailbox_schema(m) for m in result.scalars().all()]


async def configure_mailboxes(
    db: AsyncSession,
    group_id: str,
    mailboxes: list,
) -> None:
    """Обновляет настройки ящиков: connected и auto_forward."""
    for item in mailboxes:
        # item может быть dict или Pydantic-модель — приводим к dict
        if hasattr(item, "model_dump"):
            item = item.model_dump()
        elif hasattr(item, "dict"):
            item = item.dict()

        mb_id = item.get("id")
        if not mb_id:
            continue

        result = await db.execute(
            select(Mailbox).where(
                Mailbox.id == int(mb_id),
                Mailbox.group_id == group_id,
            )
        )
        mb = result.scalar_one_or_none()
        if mb is None:
            continue

        if "connected" in item:
            mb.connected = bool(item["connected"])
        if "autoForward" in item:
            mb.auto_forward = bool(item["autoForward"])
        elif "auto_forward" in item:
            mb.auto_forward = bool(item["auto_forward"])

    await db.commit()


async def add_mailbox(db: AsyncSession, group_id: str, data: AddMailboxRequest) -> MailboxSchema:
    mb = Mailbox(
        email=data.email,
        label=data.label,
        connected=False,
        auto_forward=data.auto_forward,
        group_id=group_id,
    )
    db.add(mb)
    await db.commit()
    await db.refresh(mb)
    return _to_mailbox_schema(mb)


async def get_mailbox(db: AsyncSession, mb_id: int) -> Mailbox | None:
    result = await db.execute(select(Mailbox).where(Mailbox.id == mb_id))
    return result.scalar_one_or_none()


async def remove_mailbox(db: AsyncSession, mb: Mailbox) -> None:
    await db.delete(mb)
    await db.commit()

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mail import MailItem, Mailbox
from app.schemas.mail import (
    MailItem as MailItemSchema,
    Mailbox as MailboxSchema,
    AddMailboxRequest,
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

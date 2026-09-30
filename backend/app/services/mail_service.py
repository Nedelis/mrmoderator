from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mail import Mailbox, MailItem
from app.schemas.mail import AddMailboxRequest, MailboxSettings
from app.schemas.mail import (
    Mailbox as MailboxSchema,
)
from app.schemas.mail import (
    MailItem as MailItemSchema,
)
from app.services import notify_service, user_service


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
    mailboxes: list[MailboxSettings],
) -> None:
    """Обновляет настройки ящиков группы: меняются только переданные поля."""
    for item in mailboxes:
        if not item.id.isdigit():
            continue

        result = await db.execute(
            select(Mailbox).where(
                Mailbox.id == int(item.id),
                Mailbox.group_id == group_id,
            )
        )
        mb = result.scalar_one_or_none()
        if mb is None:
            continue

        if item.connected is not None:
            mb.connected = item.connected
        if item.auto_forward is not None:
            mb.auto_forward = item.auto_forward

    await db.commit()


async def get_mail_item(db: AsyncSession, mail_id: int) -> MailItem | None:
    result = await db.execute(select(MailItem).where(MailItem.id == mail_id))
    return result.scalar_one_or_none()


async def forward_mail(db: AsyncSession, mail: MailItem) -> int:
    """
    Пересылает письмо участникам группы личным сообщением от бота.
    Возвращает число доставленных сообщений и отмечает письмо пересланным.
    """
    students = await user_service.get_group_students(db, mail.group_id)
    text = f"✉️ Письмо от {mail.sender}\n{mail.subject}"
    if mail.preview:
        text += f"\n\n{mail.preview}"

    sent = 0
    for student in students:
        if await notify_service.send_to_user(student.max_user_id, text):
            sent += 1

    mail.forwarded_at = datetime.now(UTC).replace(tzinfo=None)
    await db.commit()
    return sent


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

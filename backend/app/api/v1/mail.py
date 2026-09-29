from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require
from app.models.user import User
from app.schemas.common import ForwardMailResponse, OkResponse, RefreshMailResponse
from app.schemas.mail import AddMailboxRequest, ConfigureMailboxesRequest, Mailbox, MailItem
from app.services import mail_service

router = APIRouter(prefix="/mail", tags=["Почта"])


@router.get("", response_model=list[MailItem])
async def list_mail(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.group_id:
        return []
    return await mail_service.list_mail(db, user.group_id)


@router.post("/{mail_id}/forward", response_model=ForwardMailResponse)
async def forward_mail(
    mail_id: int,
    user: User = Depends(require("mail.forward")),
    db: AsyncSession = Depends(get_db),
):
    # Заглушка — реальная пересылка через бота позже
    return ForwardMailResponse(id=str(mail_id), forwarded_to="Группа")


@router.post("/refresh", response_model=RefreshMailResponse)
async def refresh_mail(
    user: User = Depends(get_current_user),
):
    # Заглушка — реальная синхронизация через IMAP позже
    return RefreshMailResponse(new_messages=0)


@router.post("/configure", response_model=OkResponse)
async def configure_mailboxes(
    data: ConfigureMailboxesRequest,
    user: User = Depends(require("mail.configure")),
    db: AsyncSession = Depends(get_db),
):
    if not user.group_id:
        raise HTTPException(400, "Пользователь не в группе")

    await mail_service.configure_mailboxes(
        db,
        user.group_id,
        data.mailboxes,
    )
    return OkResponse()


@router.get("/mailboxes", response_model=list[Mailbox])
async def list_mailboxes(
    user: User = Depends(require("mail.configure")),
    db: AsyncSession = Depends(get_db),
):
    if not user.group_id:
        return []
    return await mail_service.list_mailboxes(db, user.group_id)


@router.post("/mailboxes", response_model=Mailbox, status_code=status.HTTP_201_CREATED)
async def add_mailbox(
    data: AddMailboxRequest,
    user: User = Depends(require("mail.configure")),
    db: AsyncSession = Depends(get_db),
):
    if not user.group_id:
        raise HTTPException(400, "Пользователь не в группе")
    return await mail_service.add_mailbox(db, user.group_id, data)


@router.delete("/mailboxes/{mailbox_id}", response_model=OkResponse)
async def remove_mailbox(
    mailbox_id: int,
    user: User = Depends(require("mail.configure")),
    db: AsyncSession = Depends(get_db),
):
    mb = await mail_service.get_mailbox(db, mailbox_id)
    if mb is None or mb.group_id != user.group_id:
        raise HTTPException(404, "Ящик не найден")
    await mail_service.remove_mailbox(db, mb)
    return OkResponse()

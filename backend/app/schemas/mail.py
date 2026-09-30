from pydantic import Field

from app.schemas.base import BaseSchema


class MailItem(BaseSchema):
    id: str
    from_: str = Field(alias="from")
    subject: str
    preview: str
    source: str
    auto_forward: bool


class Mailbox(BaseSchema):
    id: str
    email: str
    label: str
    connected: bool
    auto_forward: bool


class MailboxSettings(BaseSchema):
    id: str
    connected: bool | None = None
    auto_forward: bool | None = None


class ConfigureMailboxesRequest(BaseSchema):
    mailboxes: list[MailboxSettings]


class AddMailboxRequest(BaseSchema):
    email: str
    label: str
    auto_forward: bool = False

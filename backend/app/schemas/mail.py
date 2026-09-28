from typing import Literal
from pydantic import Field
from app.schemas.base import BaseSchema

MailSource = Literal["dean", "kafedra", "prepod"]


class MailItem(BaseSchema):
    id: str
    from_: str = Field(alias="from")
    subject: str
    preview: str
    source: MailSource
    auto_forward: bool


class Mailbox(BaseSchema):
    id: str
    email: str
    label: str
    connected: bool
    auto_forward: bool


class ConfigureMailboxesRequest(BaseSchema):
    mailboxes: list[dict]


class AddMailboxRequest(BaseSchema):
    email: str
    label: str
    auto_forward: bool = False

from datetime import datetime

from app.schemas.base import BaseSchema


class OkResponse(BaseSchema):
    ok: bool = True


class RemindResponse(BaseSchema):
    ok: bool = True
    id: str
    title: str = ""
    sent_to: int
    sent_at: datetime


class ErrorBody(BaseSchema):
    code: str
    message: str


class ErrorResponse(BaseSchema):
    error: ErrorBody


class ForwardMailResponse(BaseSchema):
    ok: bool = True
    id: str
    forwarded_to: str


class RefreshMailResponse(BaseSchema):
    ok: bool = True
    new_messages: int


class RemovedMemberResponse(BaseSchema):
    ok: bool = True
    removed: str


class RenamedMemberResponse(BaseSchema):
    ok: bool = True
    old_name: str
    new_name: str

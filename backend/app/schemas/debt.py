from datetime import datetime

from app.schemas.base import BaseSchema


class Debt(BaseSchema):
    id: str
    student_id: str
    student_name: str
    subject: str
    type: str
    deadline: datetime
    status: str


class CreateDebtRequest(BaseSchema):
    student_id: str
    subject: str
    type: str
    deadline: str


class UpdateDebtRequest(BaseSchema):
    student_id: str | None = None
    subject: str | None = None
    type: str | None = None
    deadline: str | None = None

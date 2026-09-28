from datetime import datetime
from typing import Literal
from app.schemas.base import BaseSchema


DebtType = Literal["Экзамен", "Зачёт", "Лаба", "Курсовая"]
DebtStatus = Literal["active", "overdue", "closed"]


class Debt(BaseSchema):
    id: str
    student_name: str
    subject: str
    type: str
    deadline: datetime
    status: DebtStatus


class CreateDebtRequest(BaseSchema):
    student_name: str
    subject: str
    type: DebtType
    deadline: str


class UpdateDebtRequest(BaseSchema):
    student_name: str | None = None
    subject: str | None = None
    type: str | None = None
    deadline: str | None = None

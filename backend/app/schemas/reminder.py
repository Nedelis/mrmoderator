from datetime import datetime
from typing import Literal

from app.schemas.base import BaseSchema

ReminderType = Literal["personal", "group"]
ReminderPriority = Literal["low", "medium", "high"]
ReminderScope = Literal["personal", "group", "selected"]


class Reminder(BaseSchema):
    id: str
    title: str
    description: str
    deadline: datetime
    type: ReminderType
    priority: ReminderPriority
    target_student_ids: list[str] = []
    completed_by: list[str] = []


class CreateReminderRequest(BaseSchema):
    title: str
    description: str = ""
    date: str
    time: str
    scope: ReminderScope
    student_ids: list[str] = []


class UpdateReminderRequest(BaseSchema):
    title: str | None = None
    description: str | None = None
    date: str | None = None
    time: str | None = None
    scope: str | None = None
    student_ids: list[str] | None = None


class CompleteReminderRequest(BaseSchema):
    completed: bool

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


class CreateReminderRequest(BaseSchema):
    title: str
    description: str = ""
    date: str
    time: str
    scope: ReminderScope


class UpdateReminderRequest(BaseSchema):
    title: str | None = None
    description: str | None = None

from datetime import datetime
from typing import Literal
from app.schemas.base import BaseSchema


TaskType = Literal["group", "personal"]
TaskStatus = Literal["active", "soon", "done", "overdue"]


class Task(BaseSchema):
    id: str
    title: str
    description: str
    deadline: datetime
    type: TaskType
    status: TaskStatus


class CreateTaskRequest(BaseSchema):
    title: str
    description: str = ""
    deadline: str
    type: TaskType


class UpdateTaskRequest(BaseSchema):
    title: str | None = None
    description: str | None = None
    deadline: str | None = None
    type: TaskType | None = None

from typing import Literal

from app.schemas.base import BaseSchema

ExamType = Literal["exam", "consultation"]


class ExamMaterial(BaseSchema):
    id: str
    exam_id: str
    title: str
    url: str | None = None
    added_by: str
    added_at: str


class Exam(BaseSchema):
    id: str
    subject: str
    date: str
    time: str
    room: str
    teacher: str
    icon: str
    type: ExamType
    materials: list[ExamMaterial] = []


class CreateExamMaterialRequest(BaseSchema):
    title: str
    url: str | None = None


class CreateExamRequest(BaseSchema):
    subject: str
    date: str
    time: str = ""
    room: str = ""
    teacher: str = ""
    icon: str = "📚"
    type: ExamType = "exam"


class UpdateExamRequest(BaseSchema):
    subject: str | None = None
    date: str | None = None
    time: str | None = None
    room: str | None = None
    teacher: str | None = None
    icon: str | None = None
    type: ExamType | None = None

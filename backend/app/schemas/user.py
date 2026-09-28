from app.schemas.base import BaseSchema


class CurrentUser(BaseSchema):
    id: str
    first_name: str
    last_name: str
    username: str
    photo_url: str | None = None
    group_id: str
    group_name: str
    role_id: str


class MeResponse(BaseSchema):
    user: CurrentUser


class GroupInfo(BaseSchema):
    name: str
    course: int
    semester: int
    students_count: int


class Student(BaseSchema):
    id: str
    name: str
    role: str
    avg_score: float | None = None
    attendance: int | None = None
    debts: int | None = None

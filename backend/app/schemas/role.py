from app.schemas.base import BaseSchema


class Role(BaseSchema):
    id: str
    label: str
    short_label: str
    description: str
    level: int
    badge_class: str
    badge_icon: str
    badge_text: str
    menu: list[str]
    permissions: list[str]


class RolesResponse(BaseSchema):
    roles: list[Role]


class AssignRoleRequest(BaseSchema):
    student_id: str
    role_id: str


class RenameMemberRequest(BaseSchema):
    name: str

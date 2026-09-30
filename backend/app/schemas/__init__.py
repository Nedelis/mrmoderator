from app.schemas.base import BaseSchema
from app.schemas.common import (
    ErrorResponse,
    ForwardMailResponse,
    OkResponse,
    RefreshMailResponse,
    RemindResponse,
    RemovedMemberResponse,
    RenamedMemberResponse,
)
from app.schemas.debt import CreateDebtRequest, Debt, UpdateDebtRequest
from app.schemas.exam import CreateExamMaterialRequest, Exam, ExamMaterial
from app.schemas.mail import (
    AddMailboxRequest,
    ConfigureMailboxesRequest,
    Mailbox,
    MailItem,
)
from app.schemas.material import Material, UploadMaterialRequest
from app.schemas.reminder import (
    CreateReminderRequest,
    Reminder,
    UpdateReminderRequest,
)
from app.schemas.role import Role, RolesResponse
from app.schemas.task import CreateTaskRequest, Task, UpdateTaskRequest
from app.schemas.user import CurrentUser, GroupInfo, MeResponse, Student

__all__ = [
    "BaseSchema",
    "Role",
    "RolesResponse",
    "CurrentUser",
    "MeResponse",
    "GroupInfo",
    "Student",
    "Reminder",
    "CreateReminderRequest",
    "UpdateReminderRequest",
    "Debt",
    "CreateDebtRequest",
    "UpdateDebtRequest",
    "Task",
    "CreateTaskRequest",
    "UpdateTaskRequest",
    "Material",
    "UploadMaterialRequest",
    "Exam",
    "ExamMaterial",
    "CreateExamMaterialRequest",
    "MailItem",
    "Mailbox",
    "ConfigureMailboxesRequest",
    "AddMailboxRequest",
    "OkResponse",
    "RemindResponse",
    "ErrorResponse",
    "ForwardMailResponse",
    "RefreshMailResponse",
    "RemovedMemberResponse",
    "RenamedMemberResponse",
]

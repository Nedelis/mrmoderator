from app.schemas.base import BaseSchema
from app.schemas.role import Role, RolesResponse
from app.schemas.user import CurrentUser, MeResponse, GroupInfo, Student
from app.schemas.reminder import (
    Reminder, CreateReminderRequest, UpdateReminderRequest,
)
from app.schemas.debt import Debt, CreateDebtRequest, UpdateDebtRequest
from app.schemas.task import Task, CreateTaskRequest, UpdateTaskRequest
from app.schemas.material import Material, UploadMaterialRequest
from app.schemas.exam import Exam, ExamMaterial, CreateExamMaterialRequest
from app.schemas.mail import (
    MailItem, Mailbox, ConfigureMailboxesRequest, AddMailboxRequest,
)
from app.schemas.settings import SettingsSchema
from app.schemas.common import (
    OkResponse, RemindResponse, ErrorResponse,
    ForwardMailResponse, RefreshMailResponse,
    RemovedMemberResponse, RenamedMemberResponse,
)

__all__ = [
    "BaseSchema",
    "Role", "RolesResponse",
    "CurrentUser", "MeResponse", "GroupInfo", "Student",
    "Reminder", "CreateReminderRequest", "UpdateReminderRequest",
    "Debt", "CreateDebtRequest", "UpdateDebtRequest",
    "Task", "CreateTaskRequest", "UpdateTaskRequest",
    "Material", "UploadMaterialRequest",
    "Exam", "ExamMaterial", "CreateExamMaterialRequest",
    "MailItem", "Mailbox", "ConfigureMailboxesRequest", "AddMailboxRequest",
    "SettingsSchema",
    "OkResponse", "RemindResponse", "ErrorResponse",
    "ForwardMailResponse", "RefreshMailResponse",
    "RemovedMemberResponse", "RenamedMemberResponse",
]

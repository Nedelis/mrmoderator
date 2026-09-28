from datetime import datetime
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task
from app.models.user import User
from app.schemas.task import Task as TaskSchema, CreateTaskRequest, UpdateTaskRequest
from app.services import notify_service, user_service


def _compute_status(deadline: datetime) -> str:
    now = datetime.utcnow()
    delta = (deadline - now).days
    if deadline < now:
        return "overdue"
    if delta <= 3:
        return "soon"
    return "active"


def _to_schema(t: Task) -> TaskSchema:
    return TaskSchema(
        id=str(t.id),
        title=t.title,
        description=t.description or "",
        deadline=t.deadline,
        type=t.type,
        status=_compute_status(t.deadline),
    )


async def list_tasks(db: AsyncSession, user: User, group_id: str) -> list[TaskSchema]:
    stmt = (
        select(Task)
        .where(Task.group_id == group_id)
        .where(or_(Task.type == "group", Task.author_id == user.id))
        .order_by(Task.deadline)
    )
    result = await db.execute(stmt)
    return [_to_schema(t) for t in result.scalars().all()]


async def create_task(
    db: AsyncSession,
    user: User,
    group_id: str,
    data: CreateTaskRequest,
) -> TaskSchema:
    deadline = datetime.strptime(data.deadline, "%Y-%m-%d")
    task = Task(
        title=data.title,
        description=data.description or "",
        deadline=deadline,
        type=data.type,
        status=_compute_status(deadline),
        author_id=user.id,
        group_id=group_id,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return _to_schema(task)


async def get_task(db: AsyncSession, task_id: int) -> Task | None:
    result = await db.execute(select(Task).where(Task.id == task_id))
    return result.scalar_one_or_none()


async def update_task(db: AsyncSession, task: Task, data: UpdateTaskRequest) -> TaskSchema:
    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.deadline is not None:
        task.deadline = datetime.strptime(data.deadline, "%Y-%m-%d")
        task.status = _compute_status(task.deadline)
    if data.type is not None:
        task.type = data.type
    await db.commit()
    await db.refresh(task)
    return _to_schema(task)


async def delete_task(db: AsyncSession, task: Task) -> None:
    await db.delete(task)
    await db.commit()


async def remind_all(db: AsyncSession, task: Task, group_id: str) -> int:
    students = await user_service.get_group_students(db, group_id)
    text = f"📌 Задание: {task.title}\n{task.description}\nДедлайн: {task.deadline.strftime('%d.%m.%Y')}"
    sent = 0
    for student in students:
        if await notify_service.send_to_user(student.max_user_id, text):
            sent += 1
    return sent

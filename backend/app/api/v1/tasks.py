from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require
from app.core.roles import ROLES
from app.models.user import User
from app.schemas.common import OkResponse, RemindResponse
from app.schemas.task import CreateTaskRequest, Task, UpdateTaskRequest
from app.services import task_service

router = APIRouter(prefix="/tasks", tags=["Задания"])


@router.get("", response_model=list[Task])
async def list_tasks(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.group_id:
        return []
    return await task_service.list_tasks(db, user, user.group_id)


@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: CreateTaskRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    perm = "task.create.personal" if data.type == "personal" else "task.create.group"
    if perm not in ROLES[user.role_id]["permissions"]:
        raise HTTPException(403, f"Нет права {perm}")

    if not user.group_id:
        raise HTTPException(400, "Пользователь не в группе")
    return await task_service.create_task(db, user, user.group_id, data)


@router.put("/{task_id}", response_model=OkResponse)
async def update_task(
    task_id: int,
    data: UpdateTaskRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await task_service.get_task(db, task_id)
    if task is None or task.group_id != user.group_id:
        raise HTTPException(404, "Задание не найдено")

    is_author = task.author_id == user.id
    can_edit = "task.edit" in ROLES[user.role_id]["permissions"]
    if task.type == "personal" and not is_author:
        raise HTTPException(403, "Личное задание может править только автор")
    if task.type == "group" and not can_edit:
        raise HTTPException(403, "Нет права редактировать групповые задания")

    await task_service.update_task(db, task, data)
    return OkResponse()


@router.delete("/{task_id}", response_model=OkResponse)
async def delete_task(
    task_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await task_service.get_task(db, task_id)
    if task is None or task.group_id != user.group_id:
        raise HTTPException(404, "Задание не найдено")

    is_author = task.author_id == user.id
    can_delete = "task.delete" in ROLES[user.role_id]["permissions"]
    if task.type == "personal" and not is_author:
        raise HTTPException(403, "Личное задание может удалить только автор")
    if task.type == "group" and not can_delete:
        raise HTTPException(403, "Нет права удалять групповые задания")

    await task_service.delete_task(db, task)
    return OkResponse()


@router.post("/{task_id}/remind", response_model=RemindResponse)
async def remind_task(
    task_id: int,
    user: User = Depends(require("task.remind")),
    db: AsyncSession = Depends(get_db),
):
    task = await task_service.get_task(db, task_id)
    if task is None or task.group_id != user.group_id:
        raise HTTPException(404, "Задание не найдено")

    sent_to = await task_service.remind_all(db, task, task.group_id)
    return RemindResponse(
        id=str(task.id),
        title=task.title,
        sent_to=sent_to,
        sent_at=datetime.utcnow(),
    )

from fastapi import APIRouter, Depends, HTTPException, Form, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require
from app.models.user import User
from app.schemas.common import OkResponse
from app.schemas.exam import Exam, ExamMaterial, CreateExamRequest
from app.services import exam_service, material_service

router = APIRouter(prefix="/exams", tags=["Экзамены"])


@router.get("", response_model=list[Exam])
async def list_exams(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.group_id:
        return []
    return await exam_service.list_exams(db, user.group_id)


@router.post("", response_model=Exam, status_code=status.HTTP_201_CREATED)
async def create_exam(
    data: CreateExamRequest,
    user: User = Depends(require("exam.addMaterial")),
    db: AsyncSession = Depends(get_db),
):
    """Создать новый экзамен в расписании группы."""
    if not user.group_id:
        raise HTTPException(400, "Пользователь не в группе")
    try:
        return await exam_service.create_exam(db, user.group_id, data)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{exam_id}/materials", response_model=ExamMaterial, status_code=status.HTTP_201_CREATED)
async def add_exam_material(
    exam_id: int,
    title: str = Form(...),
    url: str | None = Form(None),
    user: User = Depends(require("exam.addMaterial")),
    db: AsyncSession = Depends(get_db),
):
    exam = await exam_service.get_exam(db, exam_id)
    if exam is None:
        raise HTTPException(404, "Экзамен не найден")

    return await exam_service.add_exam_material(db, user, exam, title, url, None)


@router.delete("/{exam_id}/materials/{material_id}", response_model=OkResponse)
async def delete_exam_material(
    exam_id: int,
    material_id: int,
    user: User = Depends(require("exam.addMaterial")),
    db: AsyncSession = Depends(get_db),
):
    m = await exam_service.get_exam_material(db, material_id)
    if m is None or m.exam_id != exam_id:
        raise HTTPException(404, "Материал не найден")

    await exam_service.delete_exam_material(db, m)
    return OkResponse()

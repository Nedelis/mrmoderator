from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.exam import Exam, ExamMaterial
from app.models.user import User
from app.schemas.exam import CreateExamRequest as CreateExamRequestSchema
from app.schemas.exam import Exam as ExamSchema
from app.schemas.exam import ExamMaterial as ExamMaterialSchema
from app.schemas.exam import UpdateExamRequest


def _to_material_schema(m: ExamMaterial, added_by_name: str) -> ExamMaterialSchema:
    return ExamMaterialSchema(
        id=str(m.id),
        exam_id=str(m.exam_id),
        title=m.title,
        url=m.url,
        added_by=added_by_name,
        added_at=m.added_at.strftime("%d.%m.%Y"),
    )


async def list_exams(db: AsyncSession, group_id: str) -> list[ExamSchema]:
    result = await db.execute(
        select(Exam)
        .options(selectinload(Exam.materials))
        .where(Exam.group_id == group_id)
        .order_by(Exam.date)
    )
    exams = result.scalars().all()

    out = []
    for e in exams:
        materials = []
        for m in e.materials:
            added_by_name = ""
            if m.added_by:
                u = await db.execute(select(User).where(User.id == m.added_by))
                u = u.scalar_one_or_none()
                if u:
                    added_by_name = f"{u.last_name} {u.first_name[0]}."
            materials.append(_to_material_schema(m, added_by_name))

        out.append(_to_schema(e, materials))
    return out


async def get_exam(db: AsyncSession, exam_id: int) -> Exam | None:
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    return result.scalar_one_or_none()


def _parse_exam_datetime(date_str: str, time_str: str | None) -> datetime:
    """
    Собирает дату экзамена из 'YYYY-MM-DD' (или 'YYYY-MM-DDTHH:MM') и 'HH:MM'.
    Если в дате нет времени, а time задано — время берётся из time.
    """
    try:
        if "T" not in date_str and time_str:
            return datetime.fromisoformat(f"{date_str}T{time_str}")
        return datetime.fromisoformat(date_str)
    except ValueError:
        raise ValueError(f"Неверный формат даты или времени: {date_str} {time_str or ''}".strip())


def _to_schema(exam: Exam, materials: list[ExamMaterialSchema]) -> ExamSchema:
    return ExamSchema(
        id=str(exam.id),
        subject=exam.subject,
        date=exam.date.isoformat(timespec="minutes"),
        time=exam.time,
        room=exam.room,
        teacher=exam.teacher,
        icon=exam.icon,
        type=exam.type,
        materials=materials,
    )


async def create_exam(db: AsyncSession, group_id: str, data: CreateExamRequestSchema) -> ExamSchema:
    """Создаёт новый экзамен в расписании группы."""
    exam = Exam(
        subject=data.subject,
        date=_parse_exam_datetime(data.date, data.time),
        time=data.time or "",
        room=data.room or "",
        teacher=data.teacher or "",
        icon=data.icon or "📚",
        type=data.type or "exam",
        group_id=group_id,
    )
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return _to_schema(exam, [])


async def update_exam(db: AsyncSession, exam: Exam, data: UpdateExamRequest) -> None:
    """Частичное обновление экзамена: меняются только переданные поля."""
    if data.subject is not None:
        exam.subject = data.subject
    if data.room is not None:
        exam.room = data.room
    if data.teacher is not None:
        exam.teacher = data.teacher
    if data.icon is not None:
        exam.icon = data.icon
    if data.type is not None:
        exam.type = data.type

    # Дата и время хранятся вместе в exam.date, время дублируется в exam.time
    if data.date is not None or data.time is not None:
        new_time = data.time if data.time is not None else exam.time
        new_date = data.date if data.date is not None else exam.date.date().isoformat()
        exam.date = _parse_exam_datetime(new_date, new_time)
        exam.time = new_time or ""

    await db.commit()


async def delete_exam(db: AsyncSession, exam: Exam) -> None:
    await db.delete(exam)
    await db.commit()


async def add_exam_material(
    db: AsyncSession,
    user: User,
    exam: Exam,
    title: str,
    url: str | None,
    file_path: str | None,
) -> ExamMaterialSchema:
    m = ExamMaterial(
        exam_id=exam.id,
        title=title,
        url=url,
        file_path=file_path,
        added_by=user.id,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return _to_material_schema(m, f"{user.last_name} {user.first_name[0]}.")


async def get_exam_material(db: AsyncSession, material_id: int) -> ExamMaterial | None:
    result = await db.execute(select(ExamMaterial).where(ExamMaterial.id == material_id))
    return result.scalar_one_or_none()


async def delete_exam_material(db: AsyncSession, m: ExamMaterial) -> None:
    await db.delete(m)
    await db.commit()

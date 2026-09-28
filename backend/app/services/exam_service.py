from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam import Exam, ExamMaterial
from app.models.user import User
from app.schemas.exam import Exam as ExamSchema, ExamMaterial as ExamMaterialSchema


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

        out.append(ExamSchema(
            id=str(e.id),
            subject=e.subject,
            date=e.date.isoformat(timespec="minutes"),
            time=e.time,
            room=e.room,
            teacher=e.teacher,
            icon=e.icon,
            type=e.type,
            materials=materials,
        ))
    return out


async def get_exam(db: AsyncSession, exam_id: int) -> Exam | None:
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    return result.scalar_one_or_none()


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

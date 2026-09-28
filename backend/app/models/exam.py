from datetime import datetime, timezone
from functools import partial
from sqlalchemy import Column, DateTime, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    time = Column(String, default="")  # "10:00"
    room = Column(String, default="")
    teacher = Column(String, default="")
    icon = Column(String, default="📚")
    type = Column(String, default="exam")

    group_id = Column(String, ForeignKey("groups.id"), index=True)
    materials = relationship("ExamMaterial", back_populates="exam", cascade="all, delete-orphan")


class ExamMaterial(Base):
    __tablename__ = "exam_materials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), index=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    added_by = Column(Integer, ForeignKey("users.id"))
    added_at = Column(DateTime, default=partial(datetime.now, timezone.utc))

    exam = relationship("Exam", back_populates="materials")

from datetime import datetime, timezone
from functools import partial

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.core.database import Base


class Debt(Base):
    __tablename__ = "debts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    student_name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    type = Column(String, nullable=False)
    deadline = Column(DateTime, nullable=False)
    status = Column(String, default="active")

    group_id = Column(String, ForeignKey("groups.id"), index=True)
    created_at = Column(DateTime, default=partial(datetime.now, timezone.utc))

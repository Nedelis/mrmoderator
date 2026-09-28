from datetime import datetime, timezone
from functools import partial
from sqlalchemy import Column, DateTime, Integer, String, ForeignKey
from app.core.database import Base


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(String, default="")
    deadline = Column(DateTime, nullable=False)
    type = Column(String, nullable=False)
    priority = Column(String, default="medium")

    author_id = Column(Integer, ForeignKey("users.id"), index=True)
    group_id = Column(String, ForeignKey("groups.id"), index=True)
    created_at = Column(DateTime, default=partial(datetime.now, timezone.utc))

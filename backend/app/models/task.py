from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, ForeignKey
from app.core.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(String, default="")
    deadline = Column(DateTime, nullable=False)
    type = Column(String, nullable=False)
    status = Column(String, default="active")

    author_id = Column(Integer, ForeignKey("users.id"), index=True)
    group_id = Column(String, ForeignKey("groups.id"), index=True)
    created_at = Column(DateTime, default=datetime.now)

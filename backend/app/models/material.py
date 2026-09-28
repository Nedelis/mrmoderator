from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from datetime import datetime
from app.core.database import Base


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), index=True)
    type = Column(String, nullable=False)

    max_file_id = Column(String, nullable=True)
    max_message_id = Column(String, nullable=True)
    max_chat_id = Column(String, nullable=True)

    download_url = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.now)
    group_id = Column(String, ForeignKey("groups.id"), index=True)
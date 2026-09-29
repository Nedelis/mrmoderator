from sqlalchemy import JSON, Column, ForeignKey, Integer, String

from app.core.database import Base


class GroupSettings(Base):
    __tablename__ = "group_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    group_id = Column(String, ForeignKey("groups.id"), unique=True, index=True)
    payload = Column(JSON, default=dict)

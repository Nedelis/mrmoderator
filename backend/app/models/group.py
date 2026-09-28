from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    course = Column(Integer, default=1)
    semester = Column(Integer, default=1)
    chat_id = Column(String, nullable=True)

    students = relationship("User", back_populates="group")

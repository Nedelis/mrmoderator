from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    max_user_id = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False, default="")
    last_name = Column(String, nullable=False, default="")
    username = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)

    group_id = Column(String, ForeignKey("groups.id"), index=True, nullable=True)
    role_id = Column(String, nullable=False, default="student")

    display_name = Column(String, nullable=True)

    group = relationship("Group", back_populates="students")

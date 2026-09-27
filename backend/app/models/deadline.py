from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class Deadline(Base):
    __tablename__ = "deadlines"

    id = Column(Integer, primary_key=True)
    group_id = Column(String, index=True)
    title = Column(String)
    due_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now)

from datetime import datetime, timezone
from functools import partial
from sqlalchemy import Column, DateTime, Integer, String
from app.core.database import Base


class NotificationLog(Base):
    __tablename__ = "notifications_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String, nullable=False, index=True)
    entity_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    kind = Column(String, nullable=False, index=True)
    sent_at = Column(DateTime, default=partial(datetime.now, timezone.utc), nullable=False)

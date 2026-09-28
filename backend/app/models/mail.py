from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String, ForeignKey
from app.core.database import Base


class MailItem(Base):
    __tablename__ = "mail_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sender = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    preview = Column(String, default="")
    source = Column(String, default="dean")
    auto_forward = Column(Boolean, default=False)
    forwarded_at = Column(DateTime, nullable=True)

    group_id = Column(String, ForeignKey("groups.id"), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Mailbox(Base):
    __tablename__ = "mailboxes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, nullable=False)
    label = Column(String, nullable=False)
    connected = Column(Boolean, default=False)
    auto_forward = Column(Boolean, default=False)

    group_id = Column(String, ForeignKey("groups.id"), index=True)

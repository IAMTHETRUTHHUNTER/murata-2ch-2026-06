from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

JST = timezone(timedelta(hours=9))


def now_jst():
    return datetime.now(JST).replace(tzinfo=None)


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    login_id = Column(String(100), unique=True, index=True)
    password_hash = Column(String(255))


class Thread(Base):
    __tablename__ = "threads"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=now_jst)
    updated_at = Column(DateTime, default=now_jst)

    comments = relationship(
        "Comment", back_populates="thread", cascade="all, delete-orphan"
    )


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("threads.id"), nullable=False)
    number = Column(Integer, nullable=False)
    name = Column(String(100), default="名無しさん")
    email = Column(String(255), default="")
    trip = Column(String(50), default="")
    content = Column(Text, nullable=False)
    session_id = Column(String(100), nullable=False)
    user_id = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=now_jst)

    thread = relationship("Thread", back_populates="comments")


class NGWord(Base):
    __tablename__ = "ng_words"

    id = Column(Integer, primary_key=True, index=True)
    word = Column(String(500), unique=True, nullable=False)
    created_at = Column(DateTime, default=now_jst)


class AdminSession(Base):
    __tablename__ = "admin_sessions"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=now_jst)

from sqlalchemy import ARRAY, Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from datetime import datetime
from typing import Optional
from sqlalchemy.sql import func

class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "User"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    password: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[DateTime] = mapped_column("createdAt", DateTime, nullable=False)
    updated_at: Mapped[DateTime] = mapped_column("updatedAt", DateTime, nullable=False)


class StudentProfile(Base):
    __tablename__ = "StudentProfile"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column("userId", ForeignKey("User.id"), nullable=False, unique=True)
    class_id: Mapped[str] = mapped_column("classId", ForeignKey("Class.id"), nullable=False)


class TeacherProfile(Base):
    __tablename__ = "TeacherProfile"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column("userId", ForeignKey("User.id"), nullable=False, unique=True)
    subjects: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)


class ParentProfile(Base):
    __tablename__ = "ParentProfile"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column("userId", ForeignKey("User.id"), nullable=False, unique=True)
    child_id: Mapped[str] = mapped_column("childId", ForeignKey("StudentProfile.id"), nullable=False)


class Grade(Base):
    __tablename__ = "Grade"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column("studentId", ForeignKey("StudentProfile.id"), nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    topic: Mapped[str] = mapped_column(String, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    max_score: Mapped[float] = mapped_column("maxScore", Float, nullable=False, default=10.0)
    type: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    attendance: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[DateTime] = mapped_column("createdAt", DateTime, nullable=False)


class Topic(Base):
    __tablename__ = "Topic"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    prerequisites: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)


class Class(Base):
    __tablename__ = "Class"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    grade: Mapped[int] = mapped_column(Integer, nullable=False)


class ScheduleSlot(Base):
    __tablename__ = "ScheduleSlot"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    class_id: Mapped[str] = mapped_column("classId", ForeignKey("Class.id"), nullable=False)
    teacher_id: Mapped[Optional[str]] = mapped_column("teacherId", ForeignKey("TeacherProfile.id"), nullable=True)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    room: Mapped[str] = mapped_column(String, nullable=False)
    day_of_week: Mapped[int] = mapped_column("dayOfWeek", Integer, nullable=False)
    time_slot: Mapped[int] = mapped_column("timeSlot", Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column("isActive", Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, nullable=False, server_default=func.now())


class Substitution(Base):
    __tablename__ = "Substitution"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    original_teacher_id: Mapped[str] = mapped_column(
        "originalTeacherId", ForeignKey("TeacherProfile.id"), nullable=False
    )
    substitute_teacher_id: Mapped[str | None] = mapped_column(
        "substituteTeacherId", ForeignKey("TeacherProfile.id"), nullable=True
    )
    date: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[DateTime] = mapped_column("createdAt", DateTime, nullable=False)


class Notification(Base):
    __tablename__ = "Notification"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False)
    target_role: Mapped[str | None] = mapped_column("targetRole", String, nullable=True)
    target_class_id: Mapped[str | None] = mapped_column(
        "targetClassId", ForeignKey("Class.id"), nullable=True
    )
    read_by: Mapped[list[str] | None] = mapped_column("readBy", ARRAY(String), nullable=True)
    created_at: Mapped[DateTime] = mapped_column("createdAt", DateTime, nullable=False)


class Announcement(Base):
    __tablename__ = "Announcement"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False)
    target_grade: Mapped[int | None] = mapped_column("targetGrade", Integer, nullable=True)
    author_id: Mapped[str] = mapped_column("authorId", ForeignKey("User.id"), nullable=False)
    created_at: Mapped[DateTime] = mapped_column("createdAt", DateTime, nullable=False)

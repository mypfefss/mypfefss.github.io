from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional

from sqlalchemy import JSON, Column, UniqueConstraint
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ── Users ──────────────────────────────────────────────────────────────────────

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: str = Field(default_factory=_uuid, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=254)
    password_hash: str
    role: str = Field(default="editor")  # "admin" | "editor"
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=_now)


# ── Schedule ───────────────────────────────────────────────────────────────────

class ScheduleItem(SQLModel, table=True):
    __tablename__ = "schedule_items"

    id: str = Field(default_factory=_uuid, primary_key=True)
    edition: int = Field(default=15)
    position: int = Field(default=0)
    time: str = Field(max_length=50)
    title: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    location: Optional[str] = Field(default=None, max_length=200)
    featured: bool = Field(default=False)
    speaker_name: Optional[str] = Field(default=None, max_length=200)
    speaker_company: Optional[str] = Field(default=None, max_length=200)
    # JSON columns stored as TEXT in SQLite, JSONB in Postgres
    sections: Optional[List[Any]] = Field(default=None, sa_column=Column(JSON))
    chips: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    is_published: bool = Field(default=True)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ── Workshops ──────────────────────────────────────────────────────────────────

class Workshop(SQLModel, table=True):
    __tablename__ = "workshops"

    id: str = Field(default_factory=_uuid, primary_key=True)
    icon: str = Field(default="fas fa-clock", max_length=100)
    title: str = Field(max_length=200)
    time: str = Field(max_length=100)
    description: str = Field(max_length=1000)
    features: Optional[List[Any]] = Field(default=None, sa_column=Column(JSON))
    position: int = Field(default=0)
    is_published: bool = Field(default=True)


# ── Registrations ──────────────────────────────────────────────────────────────

class Registration(SQLModel, table=True):
    __tablename__ = "registrations"
    __table_args__ = (
        UniqueConstraint("email", "edition", "type", name="uq_registration"),
    )

    id: str = Field(default_factory=_uuid, primary_key=True)
    type: str  # "student" | "company"
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    email: str = Field(index=True, max_length=254)
    phone: str = Field(max_length=20)
    university: str = Field(max_length=200)
    field: Optional[str] = Field(default=None, max_length=200)
    level: str = Field(max_length=50)
    graduation: Optional[str] = Field(default=None, max_length=50)
    workshops: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    interests: Optional[str] = Field(default=None, max_length=500)
    experience: Optional[str] = Field(default=None, max_length=50)
    company_name: Optional[str] = Field(default=None, max_length=200)
    edition: int = Field(default=15)
    # CV upload metadata
    cv_key: Optional[str] = Field(default=None, max_length=300)
    cv_original_name: Optional[str] = Field(default=None, max_length=255)
    cv_size: Optional[int] = Field(default=None)
    cv_consent: bool = Field(default=False)
    created_at: datetime = Field(default_factory=_now)


# ── CV access audit log ────────────────────────────────────────────────────────

class CvAccessLog(SQLModel, table=True):
    __tablename__ = "cv_access_logs"

    id: str = Field(default_factory=_uuid, primary_key=True)
    requested_by_user_id: str = Field(index=True)
    registration_id: str = Field(index=True)
    accessed_at: datetime = Field(default_factory=_now)

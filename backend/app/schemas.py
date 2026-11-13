from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Auth ───────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Schedule ───────────────────────────────────────────────────────────────────

class SectionLine(BaseModel):
    text: str
    sub: Optional[str] = None
    meta: Optional[str] = None


class Section(BaseModel):
    label: Optional[str] = None
    lines: List[SectionLine] = []


class SpeakerOut(BaseModel):
    name: str
    company: Optional[str] = None


class ScheduleItemIn(BaseModel):
    edition: int = 15
    position: int = 0
    time: str = Field(max_length=50)
    title: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    location: Optional[str] = Field(default=None, max_length=200)
    featured: bool = False
    speaker_name: Optional[str] = Field(default=None, max_length=200)
    speaker_company: Optional[str] = Field(default=None, max_length=200)
    sections: Optional[List[Dict[str, Any]]] = None
    chips: Optional[List[str]] = None
    is_published: bool = True


class ScheduleItemOut(BaseModel):
    id: str
    edition: int
    position: int
    time: str
    title: str
    description: Optional[str]
    location: Optional[str]
    featured: bool
    speaker_name: Optional[str]
    speaker_company: Optional[str]
    sections: Optional[List[Any]]
    chips: Optional[List[str]]
    is_published: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SchedulePublicOut(BaseModel):
    """Shape the public website already consumes."""
    time: str
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    featured: bool = False
    speaker: Optional[SpeakerOut] = None
    sections: List[Any] = []
    chips: List[str] = []


class ReorderRequest(BaseModel):
    ids: List[str]


# ── Workshops ──────────────────────────────────────────────────────────────────

class WorkshopIn(BaseModel):
    icon: str = Field(default="fas fa-clock", max_length=100)
    title: str = Field(max_length=200)
    time: str = Field(max_length=100)
    description: str = Field(max_length=1000)
    features: Optional[List[Dict[str, Any]]] = None
    position: int = 0
    is_published: bool = True


class WorkshopOut(BaseModel):
    id: str
    icon: str
    title: str
    time: str
    description: str
    features: Optional[List[Any]]
    position: int
    is_published: bool

    model_config = {"from_attributes": True}


class WorkshopPublicOut(BaseModel):
    icon: str
    title: str
    time: str
    description: str
    features: List[Any] = []


# ── Registrations ──────────────────────────────────────────────────────────────

VALID_TYPES = {"student", "company"}
VALID_FIELDS = {"pre-engineering", "engineering", "licence", "master"}
VALID_LEVELS = {"1", "2", "3"}
LEVEL_ALIASES = {
    "1": "1",
    "2": "2",
    "3": "3",
    "1st": "1",
    "2nd": "2",
    "3rd": "3",
    "first": "1",
    "second": "2",
    "third": "3",
    "l1": "1",
    "l2": "2",
    "l3": "3",
    "year1": "1",
    "year-1": "1",
    "year 1": "1",
    "year2": "2",
    "year-2": "2",
    "year 2": "2",
    "year3": "3",
    "year-3": "3",
    "year 3": "3",
}
VALID_EXPERIENCE = {"none", "internship", "part-time", "full-time"}


class RegistrationIn(BaseModel):
    """
    Parsed from multipart form fields (all strings from Form()).
    Students submit a shareable CV URL instead of uploading a PDF file.
    """
    type: str
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    email: EmailStr
    phone: str = Field(min_length=6, max_length=20)
    university: str = Field(max_length=200)
    field: str = Field(max_length=200)
    level: str = Field(max_length=50)
    graduation: Optional[str] = Field(default=None, max_length=50)
    workshops: Optional[List[str]] = None
    interests: Optional[str] = Field(default=None, max_length=500)
    experience: Optional[str] = Field(default=None, max_length=50)
    company_name: Optional[str] = Field(default=None, max_length=200)
    edition: int = 15
    cv_url: Optional[str] = Field(default=None, max_length=2048)
    cv_consent: bool = False
    # Honeypot – must be empty
    website: Optional[str] = Field(default=None, max_length=200)

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in VALID_TYPES:
            raise ValueError(f"type must be one of {VALID_TYPES}")
        return v

    @field_validator("level")
    @classmethod
    def validate_level(cls, v: str) -> str:
        value = (v or "").strip().lower().replace("_", " ").replace("-", " ")
        normalized = " ".join(value.split())
        canonical = LEVEL_ALIASES.get(normalized)
        if canonical is None and normalized in VALID_LEVELS:
            canonical = normalized
        if canonical is None:
            raise ValueError(f"level must be one of {sorted(VALID_LEVELS)} or common aliases like 1st/2nd/3rd")
        return canonical

    @field_validator("field")
    @classmethod
    def validate_field(cls, v: str) -> str:
        if v not in VALID_FIELDS:
            raise ValueError(f"field must be one of {VALID_FIELDS}")
        return v

    @field_validator("experience")
    @classmethod
    def validate_experience(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_EXPERIENCE:
            raise ValueError(f"experience must be one of {VALID_EXPERIENCE}")
        return v

    @field_validator("cv_url")
    @classmethod
    def validate_cv_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        value = v.strip()
        if not value:
            return None
        if not re.match(r"^https?://", value, flags=re.IGNORECASE):
            raise ValueError("cv_url must be a valid http or https URL")
        return value


class RegistrationOut(BaseModel):
    id: str
    type: str
    first_name: str
    last_name: str
    email: str
    phone: str
    university: str
    field: Optional[str]
    level: str
    graduation: Optional[str]
    workshops: Optional[List[str]]
    interests: Optional[str]
    experience: Optional[str]
    company_name: Optional[str]
    edition: int
    cv_url: Optional[str]
    has_cv: bool
    cv_consent: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RegistrationCreatedOut(BaseModel):
    id: str
    cv_saved: bool
    message: str = "Registration successful"


# ── Users (admin) ──────────────────────────────────────────────────────────────

class UserCreateIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    role: str = Field(default="editor")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in {"admin", "editor"}:
            raise ValueError("role must be 'admin' or 'editor'")
        return v


class UserPatchIn(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"admin", "editor"}:
            raise ValueError("role must be 'admin' or 'editor'")
        return v


# ── Stats ──────────────────────────────────────────────────────────────────────

class StatsOut(BaseModel):
    total: int
    cv_count: int = 0
    by_type: Dict[str, int]
    by_level: Dict[str, int]
    top_universities: List[Dict[str, Any]]
    per_day: List[Dict[str, Any]]

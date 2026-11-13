import json
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import get_settings
from app.db import get_session
from app.models import Registration, ScheduleItem, Workshop
from app.schemas import RegistrationCreatedOut, VALID_FIELDS, VALID_LEVELS, VALID_EXPERIENCE
from app.storage import StorageError, delete_cv, upload_cv, validate_pdf_bytes

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ── Health ─────────────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    return {"status": "ok"}


# ── Schedule ───────────────────────────────────────────────────────────────────

@router.get("/schedule")
async def get_schedule(session: AsyncSession = Depends(get_session)):
    result = await session.exec(
        select(ScheduleItem)
        .where(ScheduleItem.is_published == True)
        .order_by(ScheduleItem.position)
    )
    items = result.all()

    out = []
    for it in items:
        speaker = None
        if it.speaker_name:
            speaker = {"name": it.speaker_name, "company": it.speaker_company}
        out.append({
            "time": it.time,
            "title": it.title,
            "description": it.description,
            "location": it.location,
            "featured": it.featured,
            "speaker": speaker,
            "sections": it.sections or [],
            "chips": it.chips or [],
        })

    response = JSONResponse(content={"schedule": out})
    response.headers["Cache-Control"] = "public, max-age=60"
    return response


# ── Workshops ──────────────────────────────────────────────────────────────────

@router.get("/workshops")
async def get_workshops(session: AsyncSession = Depends(get_session)):
    result = await session.exec(
        select(Workshop)
        .where(Workshop.is_published == True)
        .order_by(Workshop.position)
    )
    workshops = result.all()

    out = [{
        "icon": w.icon,
        "title": w.title,
        "time": w.time,
        "description": w.description,
        "features": w.features or [],
    } for w in workshops]

    response = JSONResponse(content={"workshops": out})
    response.headers["Cache-Control"] = "public, max-age=60"
    return response


# ── Registration ───────────────────────────────────────────────────────────────

@router.post("/registrations", response_model=RegistrationCreatedOut, status_code=201)
@limiter.limit("10/hour")
async def create_registration(
    request: Request,
    type: str = Form(...),
    first_name: str = Form(..., max_length=100),
    last_name: str = Form(..., max_length=100),
    email: str = Form(..., max_length=254),
    phone: str = Form(..., min_length=6, max_length=20),
    university: str = Form(..., max_length=200),
    field: str = Form(..., max_length=200),
    level: str = Form(..., max_length=50),
    graduation: Optional[str] = Form(None),
    workshops: Optional[str] = Form(None),
    interests: Optional[str] = Form(None),
    experience: Optional[str] = Form(None),
    company_name: Optional[str] = Form(None),
    edition: int = Form(15),
    cv_consent: bool = Form(False),
    website: Optional[str] = Form(None),
    cv: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()

    # Honeypot
    if website:
        return JSONResponse(
            status_code=200,
            content={"id": "honeypot", "cv_saved": False, "message": "Registration received"},
        )

    # Validation
    if type not in {"student", "company"}:
        raise HTTPException(422, "type must be 'student' or 'company'")
    first_name = first_name.strip()
    last_name = last_name.strip()
    email = email.strip()
    phone = phone.strip()
    university = university.strip()
    field = field.strip()
    level = level.strip()
    if not all((first_name, last_name, email, phone, university, field, level)):
        raise HTTPException(422, "All registration fields are required except the CV")
    if not _EMAIL_RE.match(email):
        raise HTTPException(422, "Invalid email address")
    if field not in VALID_FIELDS:
        raise HTTPException(422, "Invalid field of study")
    if level not in VALID_LEVELS:
        raise HTTPException(422, "Invalid level")
    if experience and experience not in VALID_EXPERIENCE:
        raise HTTPException(422, "Invalid experience value")

    # Parse workshops JSON list
    workshops_list: Optional[List[str]] = None
    if workshops:
        try:
            workshops_list = json.loads(workshops)
            if not isinstance(workshops_list, list):
                raise ValueError
        except (ValueError, TypeError):
            workshops_list = [w.strip() for w in workshops.split(",") if w.strip()]

    # CV handling
    cv_key: Optional[str] = None
    cv_original_name: Optional[str] = None
    cv_size: Optional[int] = None
    cv_saved = False

    if cv is not None and cv.filename:
        if not cv_consent:
            raise HTTPException(422, "You must consent to CV storage before uploading a file.")
        data = await cv.read()
        try:
            validate_pdf_bytes(data, settings.cv_max_bytes)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        try:
            cv_key = await upload_cv(data, edition, cv.filename)
            cv_original_name = cv.filename[:255]
            cv_size = len(data)
            cv_saved = True
        except StorageError as exc:
            raise HTTPException(
                status_code=503,
                detail="CV upload failed; your registration was not saved. Please try again later.",
            ) from exc

    # Persist
    reg = Registration(
        type=type,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        university=university,
        field=field,
        level=level,
        graduation=graduation,
        workshops=workshops_list,
        interests=interests,
        experience=experience,
        company_name=company_name,
        edition=edition,
        cv_key=cv_key,
        cv_original_name=cv_original_name,
        cv_size=cv_size,
        cv_consent=cv_consent,
    )
    session.add(reg)

    try:
        await session.commit()
        await session.refresh(reg)
    except IntegrityError:
        await session.rollback()
        if cv_key:
            try:
                await delete_cv(cv_key)
            except Exception:
                pass
        raise HTTPException(
            status_code=409,
            detail="You have already registered for this edition. If you think this is an error, please contact us.",
        )

    return RegistrationCreatedOut(id=reg.id, cv_saved=cv_saved)

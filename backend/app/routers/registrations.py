import csv
import io
from datetime import datetime, timezone
from typing import List, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlmodel import col, or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import require_admin, require_any_admin
from app.db import get_session
from app.models import CvAccessLog, Registration
from app.schemas import RegistrationOut, StatsOut
from app.storage import StorageError, delete_cv, download_cv

router = APIRouter(prefix="/admin/registrations")

# ── CSV injection protection ───────────────────────────────────────────────────
_INJECTION_CHARS = ("=", "+", "-", "@", "\t", "\r")


def _csv_safe(value: str) -> str:
    """Prefix cells that start with formula-injection characters."""
    s = str(value) if value is not None else ""
    if s and s[0] in _INJECTION_CHARS:
        return "'" + s
    return s


# ── List ───────────────────────────────────────────────────────────────────────

@router.get("", dependencies=[Depends(require_any_admin)])
async def list_registrations(
    search: Optional[str] = Query(default=None, max_length=100),
    type: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    query = select(Registration)
    if search:
        like = f"%{search}%"
        query = query.where(
            or_(
                col(Registration.first_name).ilike(like),
                col(Registration.last_name).ilike(like),
                col(Registration.email).ilike(like),
                col(Registration.university).ilike(like),
            )
        )
    if type in {"student", "company"}:
        query = query.where(Registration.type == type)

    count_result = await session.exec(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.one()

    query = query.order_by(col(Registration.created_at).desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await session.exec(query)
    items = result.all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_reg_out(r) for r in items],
    }


def _reg_out(r: Registration) -> dict:
    return {
        "id": r.id,
        "type": r.type,
        "first_name": r.first_name,
        "last_name": r.last_name,
        "email": r.email,
        "phone": r.phone,
        "university": r.university,
        "field": r.field,
        "level": r.level,
        "graduation": r.graduation,
        "workshops": r.workshops,
        "interests": r.interests,
        "experience": r.experience,
        "company_name": r.company_name,
        "edition": r.edition,
        "has_cv": bool(r.cv_key),
        "cv_consent": r.cv_consent,
        "created_at": r.created_at.isoformat(),
    }


# ── CV download ────────────────────────────────────────────────────────────────

@router.get("/{reg_id}/cv", dependencies=[Depends(require_any_admin)])
async def get_cv_file(
    reg_id: str,
    payload: dict = Depends(require_any_admin),
    session: AsyncSession = Depends(get_session),
):
    reg = await session.get(Registration, reg_id)
    if not reg or not reg.cv_key:
        raise HTTPException(404, "CV not found for this registration")

    # Audit log (no PII or file content logged)
    log = CvAccessLog(
        requested_by_user_id=payload["sub"],
        registration_id=reg_id,
        accessed_at=datetime.now(timezone.utc),
    )
    session.add(log)
    await session.commit()

    try:
        data = await download_cv(reg.cv_key)
    except StorageError as exc:
        raise HTTPException(503, "Could not download the CV. Try again later.") from exc

    filename = quote(reg.cv_original_name or "cv.pdf", safe="")
    return StreamingResponse(
        iter([data]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"},
    )


# ── Delete CV only ─────────────────────────────────────────────────────────────

@router.delete("/{reg_id}/cv", status_code=204, dependencies=[Depends(require_admin)])
async def delete_cv_only(reg_id: str, session: AsyncSession = Depends(get_session)):
    reg = await session.get(Registration, reg_id)
    if not reg:
        raise HTTPException(404, "Registration not found")
    if reg.cv_key:
        try:
            await delete_cv(reg.cv_key)
        except StorageError:
            pass  # Best-effort; clear the DB reference regardless
        reg.cv_key = None
        reg.cv_original_name = None
        reg.cv_size = None
        session.add(reg)
        await session.commit()


# ── Delete registration ────────────────────────────────────────────────────────

@router.delete("/{reg_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_registration(reg_id: str, session: AsyncSession = Depends(get_session)):
    reg = await session.get(Registration, reg_id)
    if not reg:
        raise HTTPException(404, "Registration not found")
    if reg.cv_key:
        try:
            await delete_cv(reg.cv_key)
        except StorageError:
            pass  # Best-effort
    await session.delete(reg)
    await session.commit()


# ── Export CSV ─────────────────────────────────────────────────────────────────

@router.get("/export.csv", dependencies=[Depends(require_admin)])
async def export_csv(session: AsyncSession = Depends(get_session)):
    result = await session.exec(
        select(Registration).order_by(col(Registration.created_at).desc())
    )
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "type", "first_name", "last_name", "email", "phone",
        "university", "field", "level", "graduation", "workshops",
        "interests", "experience", "company_name", "edition",
        "has_cv", "cv_consent", "created_at",
    ])
    for r in rows:
        writer.writerow([
            _csv_safe(r.id),
            _csv_safe(r.type),
            _csv_safe(r.first_name),
            _csv_safe(r.last_name),
            _csv_safe(r.email),
            _csv_safe(r.phone),
            _csv_safe(r.university),
            _csv_safe(r.field or ""),
            _csv_safe(r.level),
            _csv_safe(r.graduation or ""),
            _csv_safe(",".join(r.workshops) if r.workshops else ""),
            _csv_safe(r.interests or ""),
            _csv_safe(r.experience or ""),
            _csv_safe(r.company_name or ""),
            _csv_safe(str(r.edition)),
            _csv_safe("yes" if r.cv_key else "no"),   # presence only, never the key
            _csv_safe("yes" if r.cv_consent else "no"),
            _csv_safe(r.created_at.isoformat()),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=registrations.csv"},
    )


# ── Stats ──────────────────────────────────────────────────────────────────────

@router.get("/stats", dependencies=[Depends(require_any_admin)])
async def get_stats(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Registration))
    all_regs = result.all()

    total = len(all_regs)
    by_type: dict = {}
    by_level: dict = {}
    uni_counts: dict = {}
    per_day: dict = {}

    for r in all_regs:
        by_type[r.type] = by_type.get(r.type, 0) + 1
        by_level[r.level] = by_level.get(r.level, 0) + 1
        uni_counts[r.university] = uni_counts.get(r.university, 0) + 1
        day = r.created_at.date().isoformat()
        per_day[day] = per_day.get(day, 0) + 1

    top_unis = sorted(uni_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    cv_count = sum(1 for r in all_regs if r.cv_key)

    return {
        "total": total,
        "cv_count": cv_count,
        "by_type": by_type,
        "by_level": by_level,
        "top_universities": [{"university": k, "count": v} for k, v in top_unis],
        "per_day": [{"date": k, "count": v} for k, v in sorted(per_day.items())],
    }

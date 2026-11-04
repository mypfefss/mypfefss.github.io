from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import require_any_admin
from app.db import get_session
from app.models import Workshop
from app.schemas import ReorderRequest, WorkshopIn, WorkshopOut

router = APIRouter(prefix="/admin/workshops", dependencies=[Depends(require_any_admin)])


@router.get("", response_model=List[WorkshopOut])
async def list_workshops(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Workshop).order_by(Workshop.position))
    return result.all()


@router.post("", response_model=WorkshopOut, status_code=201)
async def create_workshop(body: WorkshopIn, session: AsyncSession = Depends(get_session)):
    w = Workshop(**body.model_dump())
    session.add(w)
    await session.commit()
    await session.refresh(w)
    return w


@router.get("/{workshop_id}", response_model=WorkshopOut)
async def get_workshop(workshop_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Workshop, workshop_id)
    if not w:
        raise HTTPException(404, "Workshop not found")
    return w


@router.put("/{workshop_id}", response_model=WorkshopOut)
async def update_workshop(
    workshop_id: str,
    body: WorkshopIn,
    session: AsyncSession = Depends(get_session),
):
    w = await session.get(Workshop, workshop_id)
    if not w:
        raise HTTPException(404, "Workshop not found")
    for k, v in body.model_dump().items():
        setattr(w, k, v)
    session.add(w)
    await session.commit()
    await session.refresh(w)
    return w


@router.delete("/{workshop_id}", status_code=204)
async def delete_workshop(workshop_id: str, session: AsyncSession = Depends(get_session)):
    w = await session.get(Workshop, workshop_id)
    if not w:
        raise HTTPException(404, "Workshop not found")
    await session.delete(w)
    await session.commit()


@router.post("/reorder", status_code=200)
async def reorder_workshops(
    body: ReorderRequest,
    session: AsyncSession = Depends(get_session),
):
    for pos, wid in enumerate(body.ids):
        w = await session.get(Workshop, wid)
        if w:
            w.position = pos
            session.add(w)
    await session.commit()
    return {"reordered": len(body.ids)}

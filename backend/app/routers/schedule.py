from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import require_any_admin
from app.db import get_session
from app.models import ScheduleItem
from app.schemas import ReorderRequest, ScheduleItemIn, ScheduleItemOut

router = APIRouter(prefix="/admin/schedule", dependencies=[Depends(require_any_admin)])


@router.get("", response_model=List[ScheduleItemOut])
async def list_schedule(session: AsyncSession = Depends(get_session)):
    result = await session.exec(
        select(ScheduleItem).order_by(ScheduleItem.position)
    )
    return result.all()


@router.post("", response_model=ScheduleItemOut, status_code=201)
async def create_schedule_item(
    body: ScheduleItemIn,
    session: AsyncSession = Depends(get_session),
):
    item = ScheduleItem(**body.model_dump())
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


@router.get("/{item_id}", response_model=ScheduleItemOut)
async def get_schedule_item(item_id: str, session: AsyncSession = Depends(get_session)):
    item = await session.get(ScheduleItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Schedule item not found")
    return item


@router.put("/{item_id}", response_model=ScheduleItemOut)
async def update_schedule_item(
    item_id: str,
    body: ScheduleItemIn,
    session: AsyncSession = Depends(get_session),
):
    item = await session.get(ScheduleItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Schedule item not found")
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    item.updated_at = datetime.now(timezone.utc)
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_schedule_item(item_id: str, session: AsyncSession = Depends(get_session)):
    item = await session.get(ScheduleItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Schedule item not found")
    await session.delete(item)
    await session.commit()


@router.post("/reorder", status_code=200)
async def reorder_schedule(
    body: ReorderRequest,
    session: AsyncSession = Depends(get_session),
):
    for pos, item_id in enumerate(body.ids):
        item = await session.get(ScheduleItem, item_id)
        if item:
            item.position = pos
            item.updated_at = datetime.now(timezone.utc)
            session.add(item)
    await session.commit()
    return {"reordered": len(body.ids)}

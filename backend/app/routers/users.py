from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import hash_password, require_admin
from app.db import get_session
from app.models import User
from app.schemas import UserCreateIn, UserOut, UserPatchIn

router = APIRouter(prefix="/admin/users", dependencies=[Depends(require_admin)])


@router.get("", response_model=List[UserOut])
async def list_users(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(User))
    return result.all()


@router.post("", response_model=UserOut, status_code=201)
async def create_user(body: UserCreateIn, session: AsyncSession = Depends(get_session)):
    existing = await session.exec(select(User).where(User.email == body.email))
    if existing.first():
        raise HTTPException(409, "A user with this email already exists")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
async def patch_user(
    user_id: str,
    body: UserPatchIn,
    payload: dict = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    # Prevent admin from deactivating themselves
    if body.is_active is False and user_id == payload["sub"]:
        raise HTTPException(400, "You cannot deactivate your own account")
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.role is not None:
        user.role = body.role
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

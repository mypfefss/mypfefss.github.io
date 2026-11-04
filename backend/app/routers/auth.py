from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth import (
    create_access_token,
    get_current_user_payload,
    verify_password,
)
from app.db import get_session
from app.models import User
from app.schemas import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth")
limiter = Limiter(key_func=get_remote_address)

# Generic message to prevent user enumeration
_BAD_CREDS = "Invalid credentials"


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(User).where(User.email == body.email))
    user = result.first()

    if not user or not user.is_active or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_BAD_CREDS)

    return TokenResponse(access_token=create_access_token(user))


@router.get("/me", response_model=UserOut)
async def me(
    payload: dict = Depends(get_current_user_payload),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(select(User).where(User.id == payload["sub"]))
    user = result.first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

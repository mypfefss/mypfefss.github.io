from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import get_settings

settings = get_settings()

# Convert sync postgres:// URL to async asyncpg dialect if needed
_url = settings.database_url
if _url.startswith("postgresql://"):
    _url = _url.replace("postgresql://", "postgresql+asyncpg://", 1)
if _url.startswith("postgres://"):
    _url = _url.replace("postgres://", "postgresql+asyncpg://", 1)
# asyncpg doesn't accept sslmode= or channel_binding=
_url = _url.replace("sslmode=require", "ssl=require")
_url = _url.replace("channel_binding=require&", "").replace("&channel_binding=require", "").replace("channel_binding=require", "")

connect_args: dict = {}
if _url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif "ssl=require" in _url:
    import ssl as _ssl
    connect_args = {"ssl": _ssl.create_default_context()}

engine = create_async_engine(
    _url,
    echo=False,
    future=True,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def create_db_and_tables() -> None:
    """Used only for SQLite in tests / local dev (not for prod migrations)."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

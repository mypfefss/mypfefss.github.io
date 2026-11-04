"""
Create the first admin user.

Usage:
    python -m app.create_admin

Reads ADMIN_EMAIL and ADMIN_PASSWORD from the environment (or .env).
If not set, prompts interactively. Never stores a default password.
"""
from __future__ import annotations

import asyncio
import getpass
import sys

from sqlmodel import select

from app.auth import hash_password
from app.config import get_settings
from app.db import AsyncSessionLocal, engine
from app.models import User, SQLModel


async def main() -> None:
    settings = get_settings()

    email = settings.admin_email.strip()
    if not email:
        email = input("Admin email: ").strip()
    if not email:
        print("Error: email is required", file=sys.stderr)
        sys.exit(1)

    password = settings.admin_password.strip()
    if not password:
        password = getpass.getpass("Admin password (min 12 chars): ")
    if len(password) < 12:
        print("Error: password must be at least 12 characters", file=sys.stderr)
        sys.exit(1)

    # Ensure tables exist (for local dev without Alembic)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with AsyncSessionLocal() as session:
        result = await session.exec(select(User).where(User.email == email))
        if result.first():
            print(f"User {email} already exists. No changes made.")
            return

        user = User(
            email=email,
            password_hash=hash_password(password),
            role="admin",
            is_active=True,
        )
        session.add(user)
        await session.commit()
        print(f"Admin user '{email}' created successfully.")


if __name__ == "__main__":
    asyncio.run(main())

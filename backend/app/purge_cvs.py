"""
Purge CVs older than N days from Drive/legacy R2 storage and the database.

Usage:
    python -m app.purge_cvs --older-than-days 90

Dry-run (no changes):
    python -m app.purge_cvs --older-than-days 90 --dry-run
"""
from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timedelta, timezone

from sqlmodel import select

from app.db import AsyncSessionLocal
from app.models import Registration
from app.storage import StorageError, delete_cv


async def purge(days: int, dry_run: bool) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    print(f"{'[DRY RUN] ' if dry_run else ''}Purging CVs from registrations created before {cutoff.date()}")

    async with AsyncSessionLocal() as session:
        result = await session.exec(
            select(Registration).where(
                Registration.cv_key != None,
                Registration.created_at < cutoff,
            )
        )
        rows = result.all()
        print(f"Found {len(rows)} registration(s) with CVs to purge.")

        deleted = 0
        failed = 0
        for reg in rows:
            if dry_run:
                print(f"  [DRY RUN] Would delete cv_key={reg.cv_key} for reg id={reg.id}")
                continue
            try:
                await delete_cv(reg.cv_key)
                reg.cv_key = None
                reg.cv_original_name = None
                reg.cv_size = None
                session.add(reg)
                deleted += 1
            except StorageError as exc:
                print(f"  WARNING: could not delete {reg.cv_key}: {exc}")
                failed += 1

        if not dry_run:
            await session.commit()
            print(f"Done. Deleted: {deleted}, Failed: {failed}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Purge old CVs from Drive/R2 and DB")
    parser.add_argument("--older-than-days", type=int, required=True)
    parser.add_argument("--dry-run", action="store_true", default=False)
    args = parser.parse_args()
    asyncio.run(purge(args.older_than_days, args.dry_run))


if __name__ == "__main__":
    main()

from __future__ import annotations

"""
Thin wrapper around boto3 for Cloudflare R2 (S3-compatible).
All operations are synchronous boto3 calls run in a thread pool via
asyncio.to_thread so they don't block the event loop.
"""

import asyncio
import uuid
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import get_settings

# Magic bytes that identify a valid PDF file
_PDF_MAGIC = b"%PDF-"


def _make_client():
    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=s.r2_endpoint_url,
        aws_access_key_id=s.r2_access_key_id,
        aws_secret_access_key=s.r2_secret_access_key,
        region_name="auto",
    )


# ── Validation ────────────────────────────────────────────────────────────────

def validate_pdf_bytes(data: bytes, max_bytes: int) -> None:
    """
    Raises ValueError with a user-friendly message if the file is
    invalid, empty, too large, or not a PDF (magic bytes check).
    """
    if not data:
        raise ValueError("CV file is empty.")
    if len(data) > max_bytes:
        raise ValueError(
            f"CV file exceeds the maximum allowed size of {max_bytes // 1024 // 1024} MB."
        )
    if not data.startswith(_PDF_MAGIC):
        raise ValueError("CV must be a PDF file. The uploaded file is not a valid PDF.")


# ── Upload ─────────────────────────────────────────────────────────────────────

async def upload_cv(data: bytes, edition: int, original_name: str) -> str:
    """
    Upload *data* to R2 and return the storage key.
    Raises StorageError on failure.
    """
    key = f"cvs/{edition}/{uuid.uuid4()}.pdf"
    settings = get_settings()

    # Sanitize: keep only the base filename, strip path components
    safe_name = original_name.replace("\x00", "").split("/")[-1].split("\\")[-1][:255]

    def _put():
        client = _make_client()
        client.put_object(
            Bucket=settings.r2_bucket_name,
            Key=key,
            Body=data,
            ContentType="application/pdf",
            ContentDisposition=f'attachment; filename="{safe_name}"',
            # Server-side metadata – never exposed publicly
            Metadata={"original-name": safe_name},
        )

    try:
        await asyncio.to_thread(_put)
    except (BotoCoreError, ClientError) as exc:
        raise StorageError(str(exc)) from exc

    return key


# ── Presigned URL ──────────────────────────────────────────────────────────────

async def presign_cv(key: str, original_name: str, expires: int = 300) -> str:
    """Return a presigned GET URL valid for *expires* seconds (default 5 min)."""
    settings = get_settings()
    safe_name = original_name.replace("\x00", "").split("/")[-1].split("\\")[-1][:255]

    def _sign():
        client = _make_client()
        return client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.r2_bucket_name,
                "Key": key,
                "ResponseContentDisposition": f'attachment; filename="{safe_name}"',
                "ResponseContentType": "application/pdf",
            },
            ExpiresIn=expires,
        )

    try:
        return await asyncio.to_thread(_sign)
    except (BotoCoreError, ClientError) as exc:
        raise StorageError(str(exc)) from exc


# ── Delete ─────────────────────────────────────────────────────────────────────

async def delete_cv(key: str) -> None:
    """Delete an object from R2. Silently ignores NoSuchKey."""
    settings = get_settings()

    def _del():
        client = _make_client()
        client.delete_object(Bucket=settings.r2_bucket_name, Key=key)

    try:
        await asyncio.to_thread(_del)
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code == "NoSuchKey":
            return
        raise StorageError(str(exc)) from exc
    except BotoCoreError as exc:
        raise StorageError(str(exc)) from exc


# ── Custom exception ───────────────────────────────────────────────────────────

class StorageError(Exception):
    """Raised when an R2/S3 operation fails."""

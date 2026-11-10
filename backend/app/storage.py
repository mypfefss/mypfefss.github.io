"""Private Google Drive storage for CVs (OAuth), with legacy R2 read/delete support."""
from __future__ import annotations

import asyncio
import io
import uuid

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

from app.config import get_settings

# Magic bytes that identify a valid PDF file
_PDF_MAGIC = b"%PDF-"
_DRIVE_KEY_PREFIX = "gdrive:"
# drive.file: the app can only see files/folders it created itself
_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"
_TOKEN_URI = "https://oauth2.googleapis.com/token"


# ── Custom exception ───────────────────────────────────────────────────────────

class StorageError(Exception):
    """Raised when a Drive or R2/S3 operation fails."""


def _make_r2_client():
    s = get_settings()
    if not (s.r2_endpoint_url and s.r2_access_key_id and s.r2_secret_access_key):
        raise StorageError("Legacy R2 storage is not configured.")
    return boto3.client(
        "s3",
        endpoint_url=s.r2_endpoint_url,
        aws_access_key_id=s.r2_access_key_id,
        aws_secret_access_key=s.r2_secret_access_key,
        region_name="auto",
    )


def _make_drive_service():
    s = get_settings()
    if not s.storage_configured:
        raise StorageError("Google Drive storage is not configured.")
    # No access token yet: the library exchanges the refresh token for one
    # automatically on the first request and renews it when it expires.
    credentials = Credentials(
        token=None,
        refresh_token=s.google_refresh_token,
        client_id=s.google_client_id,
        client_secret=s.google_client_secret,
        token_uri=_TOKEN_URI,
        scopes=[_DRIVE_SCOPE],
    )
    return build("drive", "v3", credentials=credentials, cache_discovery=False)


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
    Upload *data* to the configured private Google Drive folder and return its key.
    Raises StorageError on failure.
    """
    settings = get_settings()
    safe_name = original_name.replace("\x00", "").split("/")[-1].split("\\")[-1][:255]
    drive_name = f"{edition}-{uuid.uuid4()}-{safe_name or 'cv.pdf'}"

    def _put() -> str:
        service = _make_drive_service()
        result = service.files().create(
            body={"name": drive_name, "parents": [settings.google_drive_folder_id]},
            media_body=MediaIoBaseUpload(io.BytesIO(data), mimetype="application/pdf"),
            fields="id",
        ).execute()
        return f"{_DRIVE_KEY_PREFIX}{result['id']}"

    try:
        return await asyncio.to_thread(_put)
    except Exception as exc:
        raise StorageError(str(exc)) from exc


# ── Download ───────────────────────────────────────────────────────────────────

async def download_cv(key: str) -> bytes:
    """Download a CV from Drive or legacy R2 storage."""
    if key.startswith(_DRIVE_KEY_PREFIX):
        file_id = key.removeprefix(_DRIVE_KEY_PREFIX)

        def _get_drive() -> bytes:
            return _make_drive_service().files().get_media(fileId=file_id).execute()

        try:
            return await asyncio.to_thread(_get_drive)
        except Exception as exc:
            raise StorageError(str(exc)) from exc

    def _get_r2() -> bytes:
        response = _make_r2_client().get_object(
            Bucket=get_settings().r2_bucket_name,
            Key=key,
        )
        return response["Body"].read()

    try:
        return await asyncio.to_thread(_get_r2)
    except (BotoCoreError, ClientError) as exc:
        raise StorageError(str(exc)) from exc


# ── Delete ─────────────────────────────────────────────────────────────────────

async def delete_cv(key: str) -> None:
    """Delete a Drive CV or legacy R2 object."""
    if key.startswith(_DRIVE_KEY_PREFIX):
        file_id = key.removeprefix(_DRIVE_KEY_PREFIX)

        def _delete_drive() -> None:
            _make_drive_service().files().delete(fileId=file_id).execute()

        try:
            await asyncio.to_thread(_delete_drive)
        except Exception as exc:
            raise StorageError(str(exc)) from exc
        return

    def _delete_r2() -> None:
        _make_r2_client().delete_object(
            Bucket=get_settings().r2_bucket_name,
            Key=key,
        )

    try:
        await asyncio.to_thread(_delete_r2)
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code == "NoSuchKey":
            return
        raise StorageError(str(exc)) from exc
    except BotoCoreError as exc:
        raise StorageError(str(exc)) from exc
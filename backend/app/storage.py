"""Private Google Drive storage for CVs (OAuth), with legacy R2 read/delete support."""
from __future__ import annotations

import asyncio
import io
import logging
import uuid

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseUpload

from app.config import get_settings

logger = logging.getLogger(__name__)

# Magic bytes that identify a valid PDF file
_PDF_MAGIC = b"%PDF-"
_DRIVE_KEY_PREFIX = "gdrive:"
# drive.file: the app can only see files/folders created by this same OAuth client
_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"
_TOKEN_URI = "https://oauth2.googleapis.com/token"
_FOLDER_NAME = "MyPFE CVs"
_FOLDER_MIME = "application/vnd.google-apps.folder"

# Resolved folder id, cached for the life of the process
_folder_cache: str | None = None


# ── Custom exception ───────────────────────────────────────────────────────────

class StorageError(Exception):
    """Raised when a Drive or R2/S3 operation fails."""


def _describe(exc: Exception) -> str:
    """Readable error text, including the Google API response when available."""
    if isinstance(exc, HttpError):
        body = ""
        try:
            body = exc.content.decode("utf-8", errors="ignore")[:400]
        except Exception:
            pass
        return f"Drive API {exc.resp.status}: {body or exc.reason}"
    return f"{type(exc).__name__}: {exc}"


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
        raise StorageError(
            "Google Drive storage is not configured "
            "(need GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)."
        )
    credentials = Credentials(
        token=None,
        refresh_token=s.google_refresh_token,
        client_id=s.google_client_id,
        client_secret=s.google_client_secret,
        token_uri=_TOKEN_URI,
        scopes=[_DRIVE_SCOPE],
    )
    return build("drive", "v3", credentials=credentials, cache_discovery=False)


def _resolve_folder_id(service) -> str:
    """
    Return a folder id this OAuth client can use.
    1. Use GOOGLE_DRIVE_FOLDER_ID if the app can actually access it.
    2. Otherwise reuse a "MyPFE CVs" folder the app created before.
    3. Otherwise create one.
    """
    global _folder_cache
    if _folder_cache:
        return _folder_cache

    configured = get_settings().google_drive_folder_id
    if configured:
        try:
            service.files().get(fileId=configured, fields="id").execute()
            _folder_cache = configured
            return configured
        except HttpError as exc:
            logger.warning(
                "Configured GOOGLE_DRIVE_FOLDER_ID is not accessible with drive.file "
                "(%s). Falling back to a folder managed by the app.",
                _describe(exc),
            )

    query = (
        f"name = '{_FOLDER_NAME}' and mimeType = '{_FOLDER_MIME}' "
        "and trashed = false"
    )
    found = (
        service.files()
        .list(q=query, fields="files(id, name)", pageSize=1, spaces="drive")
        .execute()
        .get("files", [])
    )
    if found:
        _folder_cache = found[0]["id"]
        logger.info("Using existing Drive folder %s", _folder_cache)
        return _folder_cache

    created = (
        service.files()
        .create(body={"name": _FOLDER_NAME, "mimeType": _FOLDER_MIME}, fields="id")
        .execute()
    )
    _folder_cache = created["id"]
    logger.info("Created Drive folder %s", _folder_cache)
    return _folder_cache


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
    Upload *data* to the private Google Drive folder and return its key.
    Raises StorageError on failure.
    """
    safe_name = original_name.replace("\x00", "").split("/")[-1].split("\\")[-1][:255]
    drive_name = f"{edition}-{uuid.uuid4()}-{safe_name or 'cv.pdf'}"

    def _put() -> str:
        service = _make_drive_service()
        folder_id = _resolve_folder_id(service)
        result = service.files().create(
            body={"name": drive_name, "parents": [folder_id]},
            media_body=MediaIoBaseUpload(io.BytesIO(data), mimetype="application/pdf"),
            fields="id",
        ).execute()
        return f"{_DRIVE_KEY_PREFIX}{result['id']}"

    try:
        return await asyncio.to_thread(_put)
    except StorageError as exc:
        logger.error("CV upload to Google Drive failed: %s", exc)
        raise
    except Exception as exc:
        detail = _describe(exc)
        logger.error("CV upload to Google Drive failed: %s", detail)
        raise StorageError(detail) from exc


# ── Download ───────────────────────────────────────────────────────────────────

async def download_cv(key: str) -> bytes:
    """Download a CV from Drive or legacy R2 storage."""
    if key.startswith(_DRIVE_KEY_PREFIX):
        file_id = key.removeprefix(_DRIVE_KEY_PREFIX)

        def _get_drive() -> bytes:
            return _make_drive_service().files().get_media(fileId=file_id).execute()

        try:
            return await asyncio.to_thread(_get_drive)
        except StorageError:
            raise
        except Exception as exc:
            detail = _describe(exc)
            logger.error("CV download from Google Drive failed: %s", detail)
            raise StorageError(detail) from exc

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
        except StorageError:
            raise
        except Exception as exc:
            detail = _describe(exc)
            logger.error("CV delete from Google Drive failed: %s", detail)
            raise StorageError(detail) from exc
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
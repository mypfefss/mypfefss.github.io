"""Supabase Storage for CVs, with local fallback and legacy R2 support for old CVs."""
from __future__ import annotations

import asyncio
import logging
import uuid
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from supabase import create_client, Client

from app.config import get_settings

logger = logging.getLogger(__name__)

# Magic bytes that identify a valid PDF file
_PDF_MAGIC = b"%PDF-"
_SUPABASE_KEY_PREFIX = "supabase:"
_LOCAL_KEY_PREFIX = "local:"

# Cached Supabase client
_supabase_client: Client | None = None


# ── Custom exception ───────────────────────────────────────────────────────────

class StorageError(Exception):
    """Raised when a storage operation fails."""


# ── Helper functions ───────────────────────────────────────────────────────────

def _get_supabase_client() -> Client:
    """Return cached Supabase client instance."""
    global _supabase_client
    if _supabase_client is None:
        settings = get_settings()
        if not settings.storage_configured:
            raise StorageError("Supabase storage is not configured (need SUPABASE_URL and SUPABASE_SERVICE_KEY).")
        _supabase_client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _supabase_client


def _local_storage_dir() -> Path:
    """Return the writable CV storage directory, falling back to a repo-local uploads folder."""
    settings = get_settings()
    configured_dir = getattr(settings, "cv_storage_dir", "")
    base_dir = Path(configured_dir) if configured_dir else Path(__file__).resolve().parent.parent / "uploads" / "cvs"
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir


def _local_cv_path(key: str) -> Path:
    """Get the path to a local CV file."""
    filename = key.removeprefix(_LOCAL_KEY_PREFIX)
    if not filename or "/" in filename or "\\" in filename:
        raise StorageError("Invalid local CV reference.")
    path = _local_storage_dir() / filename
    if not path.is_file():
        raise StorageError("Local CV file not found.")
    return path


def _make_r2_client():
    """Create R2 client for legacy CV access."""
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
    Upload *data* to Supabase Storage and return its key.
    Falls back to a local disk copy when Supabase is unavailable.
    """
    # Sanitize filename: keep original name but clean it
    safe_name = original_name.replace("\x00", "").split("/")[-1].split("\\")[-1][:255]
    
    # Remove extension and re-add it to ensure consistency
    name_without_ext = safe_name.rsplit(".", 1)[0] if "." in safe_name else safe_name
    
    # Create a cleaner filename with original name + short UUID
    short_uuid = str(uuid.uuid4())[:8]  # Use only first 8 chars of UUID
    clean_filename = f"{name_without_ext}_{short_uuid}.pdf"
    
    # Supabase path: edition/filename
    file_path = f"{edition}/{clean_filename}"

    def _put_supabase() -> str:
        client = _get_supabase_client()
        settings = get_settings()
        
        response = client.storage.from_(settings.supabase_bucket_name).upload(
            path=file_path,
            file=data,
            file_options={"content-type": "application/pdf"}
        )
        
        if hasattr(response, 'error') and response.error:
            raise StorageError(f"Supabase upload failed: {response.error}")
        
        return f"{_SUPABASE_KEY_PREFIX}{file_path}"

    def _put_local() -> str:
        # Local filename: edition-filename
        filename = f"{edition}_{clean_filename}"
        path = _local_storage_dir() / filename
        path.write_bytes(data)
        return f"{_LOCAL_KEY_PREFIX}{filename}"

    settings = get_settings()
    try:
        if not settings.storage_configured:
            logger.warning("Supabase storage is not configured; storing CV locally instead.")
            return await asyncio.to_thread(_put_local)
        return await asyncio.to_thread(_put_supabase)
    except StorageError as exc:
        logger.warning("CV upload to Supabase failed: %s. Falling back to local storage.", exc)
        try:
            return await asyncio.to_thread(_put_local)
        except Exception as local_exc:
            raise StorageError(f"Supabase upload failed: {exc}; local fallback failed: {local_exc}") from local_exc
    except Exception as exc:
        detail = str(exc)
        logger.warning("CV upload to Supabase failed: %s. Falling back to local storage.", detail)
        try:
            return await asyncio.to_thread(_put_local)
        except Exception as local_exc:
            raise StorageError(f"Supabase upload failed: {detail}; local fallback failed: {local_exc}") from local_exc


# ── Download ───────────────────────────────────────────────────────────────────

async def download_cv(key: str) -> bytes:
    """Download a CV from Supabase, local fallback storage, or legacy R2 storage."""
    if key.startswith(_LOCAL_KEY_PREFIX):
        try:
            return _local_cv_path(key).read_bytes()
        except StorageError:
            raise
        except Exception as exc:
            raise StorageError(f"Local CV retrieval failed: {exc}") from exc

    if key.startswith(_SUPABASE_KEY_PREFIX):
        file_path = key.removeprefix(_SUPABASE_KEY_PREFIX)

        def _get_supabase() -> bytes:
            client = _get_supabase_client()
            settings = get_settings()
            
            response = client.storage.from_(settings.supabase_bucket_name).download(file_path)
            
            if isinstance(response, bytes):
                return response
            else:
                raise StorageError("Unexpected response type from Supabase download")

        try:
            return await asyncio.to_thread(_get_supabase)
        except StorageError:
            raise
        except Exception as exc:
            detail = str(exc)
            logger.error("CV download from Supabase failed: %s", detail)
            raise StorageError(detail) from exc

    # Legacy R2 support (keys without prefix)
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
    """Delete a Supabase CV, local fallback CV, or legacy R2 object."""
    if key.startswith(_LOCAL_KEY_PREFIX):
        try:
            _local_cv_path(key).unlink(missing_ok=True)
        except StorageError:
            raise
        except Exception as exc:
            raise StorageError(f"Local CV deletion failed: {exc}") from exc
        return

    if key.startswith(_SUPABASE_KEY_PREFIX):
        file_path = key.removeprefix(_SUPABASE_KEY_PREFIX)

        def _delete_supabase() -> None:
            client = _get_supabase_client()
            settings = get_settings()
            
            response = client.storage.from_(settings.supabase_bucket_name).remove([file_path])
            
            if hasattr(response, 'error') and response.error:
                raise StorageError(f"Supabase delete failed: {response.error}")

        try:
            await asyncio.to_thread(_delete_supabase)
        except StorageError:
            raise
        except Exception as exc:
            detail = str(exc)
            logger.error("CV delete from Supabase failed: %s", detail)
            raise StorageError(detail) from exc
        return

    # Legacy R2 deletion
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

from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str

    # Auth
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_seconds: int = 28800  # 8 hours

    # CORS – comma-separated string in env, parsed to list
    allowed_origins: str = "http://localhost:5500"

    # First-admin bootstrap
    admin_email: str = ""
    admin_password: str = ""

    # Supabase storage for CV uploads
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_bucket_name: str = "cvs"

    # Legacy Cloudflare R2 settings (used only for CVs uploaded before migration)
    r2_endpoint_url: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "mypfe-cvs"

    # CV constraints
    cv_max_bytes: int = 3 * 1024 * 1024  # 3 MB
    cv_storage_dir: str = ""

    # Request body cap
    max_request_body_bytes: int = 5 * 1024 * 1024  # 5 MB

    @property
    def origins_list(self) -> List[str]:
        """Return ALLOWED_ORIGINS as a Python list."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def storage_configured(self) -> bool:
        """Check if Supabase storage is configured."""
        return bool(self.supabase_url and self.supabase_service_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
import asyncio

from app.schemas import RegistrationIn
import app.storage as storage_module


PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"


class DummySettings:
    google_client_id = ""
    google_client_secret = ""
    google_refresh_token = ""
    google_drive_folder_id = ""
    r2_endpoint_url = ""
    r2_access_key_id = ""
    r2_secret_access_key = ""
    r2_bucket_name = "mypfe-cvs"
    cv_storage_dir = ""


def test_upload_cv_falls_back_to_local_storage(monkeypatch):
    monkeypatch.setattr(storage_module, "get_settings", lambda: DummySettings())

    key = asyncio.run(storage_module.upload_cv(PDF_BYTES, 15, "example.pdf"))

    assert key.startswith("local:")
    assert asyncio.run(storage_module.download_cv(key)) == PDF_BYTES

    asyncio.run(storage_module.delete_cv(key))


def test_registration_accepts_shareable_cv_link():
    payload = {
        "type": "student",
        "first_name": "Alice",
        "last_name": "Example",
        "email": "alice@example.com",
        "phone": "+123456789",
        "university": "Test University",
        "field": "engineering",
        "level": "2",
        "cv_url": "https://drive.google.com/file/d/abc123/view?usp=sharing",
        "cv_consent": True,
    }

    parsed = RegistrationIn.model_validate(payload)

    assert parsed.cv_url == payload["cv_url"]
    assert parsed.cv_consent is True


def test_registration_accepts_level_aliases():
    for value in ["1", "2", "3", "1st", "2nd", "3rd", "L1", "L2", "L3", "year 2"]:
        parsed = RegistrationIn.model_validate({
            "type": "student",
            "first_name": "Alice",
            "last_name": "Example",
            "email": "alice@example.com",
            "phone": "+123456789",
            "university": "Test University",
            "field": "engineering",
            "level": value,
            "cv_url": "https://drive.google.com/file/d/abc123/view?usp=sharing",
            "cv_consent": True,
        })
        assert parsed.level in {"1", "2", "3"}

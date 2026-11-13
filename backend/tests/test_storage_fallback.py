import asyncio

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

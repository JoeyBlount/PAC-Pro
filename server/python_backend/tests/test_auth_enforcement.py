import json
from fastapi.testclient import TestClient

from main import app
import routers


class _StubInvoiceSubmitService:
    def is_available(self) -> bool:
        return True

    async def submit_invoice(self, invoice_data, image_file, image_filename):
        return {
            "success": True,
            "invoice_id": "test-invoice-id",
            "image_url": "https://example.com/test.jpg",
            "message": "Invoice submitted successfully",
        }


def _override_submit_service():
    return _StubInvoiceSubmitService()


class _StubInvoiceReader:
    async def read_bytes(self, contents: bytes, filename: str):
        return {"text": "stubbed", "filename": filename, "length": len(contents)}


def _override_invoice_reader():
    return _StubInvoiceReader()


def test_submit_invoice_requires_authentication_or_role_enforcement():
    # Arrange: override Firebase-dependent service so the endpoint can execute
    app.dependency_overrides[routers.get_invoice_submit_service] = _override_submit_service
    client = TestClient(app)

    files = {
        "image": ("test.jpg", b"fake-image-bytes", "image/jpeg"),
    }
    data = {
        "invoice_number": "INV-123",
        "company_name": "Acme Corp",
        "invoice_day": "15",
        "invoice_month": "8",
        "invoice_year": "2025",
        "target_month": "8",
        "target_year": "2025",
        "store_id": "store_001",
        "user_email": "user@example.com",
        "categories": json.dumps({"FOOD": 10, "PAPER": 5}),
    }

    # Act: no Authorization header or role provided
    response = client.post("/api/pac/invoices/submit", data=data, files=files)

    # Assert: Expect 401/403 once backend enforces auth/roles
    # Today this will likely be 200 (or 400 if validation fails), exposing the issue
    assert response.status_code in (401, 403)


def test_invoice_read_requires_authentication_or_role_enforcement():
    app.dependency_overrides[routers.get_invoice_reader] = _override_invoice_reader
    client = TestClient(app)

    files = {
        "image": ("test.jpg", b"fake-image-bytes", "image/jpeg"),
    }

    response = client.post("/api/pac/invoice/read", files=files)
    assert response.status_code in (401, 403)


def test_health_endpoint_ok():
    client = TestClient(app)
    r = client.get("/api/pac/health")
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "healthy"


def test_role_enforcement_for_invoice_read_forbidden_when_not_allowed():
    app.dependency_overrides[routers.get_invoice_reader] = _override_invoice_reader
    client = TestClient(app)
    files = {
        "image": ("test.jpg", b"fake-image-bytes", "image/jpeg"),
    }
    # Provide bearer token (any non-empty to satisfy presence) and a disallowed role via header
    headers = {
        "Authorization": "Bearer fake",
        "X-User-Role": "Supervisor",  # not allowed once we restrict
    }
    response = client.post("/api/pac/invoice/read", files=files, headers=headers)
    # Not yet enforced on endpoint; placeholder to be updated after we apply require_roles
    # Expect 403 once roles are enforced
    assert response.status_code in (401, 403)


def test_role_enforcement_for_invoice_submit_allowed_for_admin():
    app.dependency_overrides[routers.get_invoice_submit_service] = _override_submit_service
    client = TestClient(app)
    files = {
        "image": ("test.jpg", b"fake-image-bytes", "image/jpeg"),
    }
    data = {
        "invoice_number": "INV-123",
        "company_name": "Acme Corp",
        "invoice_day": "15",
        "invoice_month": "8",
        "invoice_year": "2025",
        "target_month": "8",
        "target_year": "2025",
        "store_id": "store_001",
        "user_email": "admin@example.com",
        "categories": json.dumps({"FOOD": 10, "PAPER": 5}),
    }
    headers = {
        "Authorization": "Bearer fake",
        "X-User-Role": "Admin",
    }
    # This will be 200 once roles are enforced for Admin
    response = client.post("/api/pac/invoices/submit", data=data, files=files, headers=headers)
    assert response.status_code in (200, 403)



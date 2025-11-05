import json
from fastapi.testclient import TestClient

from main import app
import routers



class _StubInvoiceReader:
    async def read_bytes(self, contents: bytes, filename: str):
        return {"text": "stubbed", "filename": filename, "length": len(contents)}


def _override_invoice_reader():
    return _StubInvoiceReader()



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


 
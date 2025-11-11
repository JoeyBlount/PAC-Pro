import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import uuid
import time
import pytest
from fastapi.testclient import TestClient
from google.cloud import firestore
import google.auth
from google.auth.exceptions import DefaultCredentialsError


# --------------------------
# Config / guards
# --------------------------
DEFAULT_PROJECT_ID = "pacpro-ef499"

def _using_emulator() -> bool:
    return bool(os.environ.get("FIRESTORE_EMULATOR_HOST"))

def _allow_live() -> bool:
    return os.environ.get("CI_ALLOW_LIVE_DB") == "1"

def _credentials_available() -> bool:
    try:
        google.auth.default()
        return True
    except DefaultCredentialsError:
        return False

def _require_db_or_skip():
    """
    We only run against:
      - Firestore Emulator, or
      - Live project when CI_ALLOW_LIVE_DB=1 and ADC creds are present
    Otherwise, skip portably.
    """
    if _using_emulator():
        return
    if _allow_live():
        if not _credentials_available():
            pytest.skip(
                "CI_ALLOW_LIVE_DB=1 but no Google credentials found. "
                "Run 'gcloud auth application-default login' or set "
                "GOOGLE_APPLICATION_CREDENTIALS to a service account JSON."
            )
        return
    pytest.skip(
        "No emulator detected and CI_ALLOW_LIVE_DB!=1. "
        "Start Firestore emulator or set CI_ALLOW_LIVE_DB=1 with credentials."
    )


# --------------------------
# Pytest fixtures
# --------------------------
@pytest.fixture(scope="session")
def app():
    # Import the same FastAPI app your server exports
    from main import app as fastapi_app
    return fastapi_app

@pytest.fixture(scope="session")
def client(app):
    return TestClient(app)

@pytest.fixture(scope="session")
def db():
    _require_db_or_skip()
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", DEFAULT_PROJECT_ID)
    os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
    client = firestore.Client(project=project_id)
    if _using_emulator():
        print(f"🧪 FIRESTORE_EMULATOR_HOST={os.environ['FIRESTORE_EMULATOR_HOST']}")
    else:
        print(f"⚠️ Using LIVE Firestore project: {project_id}")
    return client

@pytest.fixture(scope="session")
def run_id():
    return uuid.uuid4().hex[:8]

@pytest.fixture
def admin_headers():
    # Your require_auth enforces presence of Authorization header.
    # require_roles checks X-User-Role when token isn’t verifiable in dev.
    return {
        "Authorization": "Bearer test-token",
        "X-User-Role": "Admin",
        "X-Dev-Email": "pytest@example.com",
    }

@pytest.fixture
def seeded_data(db, run_id):
    """
    Seed minimal announcements and a user notification.
    Cleanup after each test.
    """
    # --- announcements ---
    a1 = {"id": f"a_{run_id}_1", "title": "Welcome (API Test)", "message": "Hello from tests", "visible_to": "All"}
    a2 = {"id": f"a_{run_id}_2", "title": "Maintenance (API Test)", "message": "Planned downtime", "visible_to": "All"}
    b = db.batch()
    for a in (a1, a2):
        b.set(db.collection("announcements").document(a["id"]), a)
    b.commit()

    # --- notifications ---
    to_email = f"tester-{run_id}@example.com"
    n1 = {
        "title": "API Test Notification",
        "message": "This is a test notification",
        "toEmail": to_email,
        "type": "info",
        "createdAt": firestore.SERVER_TIMESTAMP,
        "read": False,
    }
    doc_ref = db.collection("notifications").document()
    doc_ref.set(n1)

    time.sleep(0.2)

    yield {
        "announcement_ids": [a1["id"], a2["id"]],
        "to_email": to_email,
        "notification_id": doc_ref.id,
    }

    # Cleanup
    try:
        b2 = db.batch()
        for aid in [a1["id"], a2["id"]]:
            b2.delete(db.collection("announcements").document(aid))
        b2.delete(db.collection("notifications").document(doc_ref.id))
        b2.commit()
    except Exception:
        pass


# --------------------------
# Helpers
# --------------------------
def _skip_if_firebase_not_initialized(resp):
    if resp.status_code == 503:
        try:
            detail = resp.json().get("detail", "")
        except Exception:
            detail = ""
        pytest.skip(f"Endpoint unavailable (503): {detail}")


# --------------------------
# Tests
# --------------------------
def test_announcements_get(client, seeded_data):
    r = client.get("/api/pac/announcements")
    _skip_if_firebase_not_initialized(r)
    assert r.status_code == 200, r.text
    items = r.json()
    assert isinstance(items, list)
    titles = {x.get("title") for x in items if isinstance(x, dict)}
    assert "Welcome (API Test)" in titles
    assert "Maintenance (API Test)" in titles


def test_invoice_categories_get(client, admin_headers):
    r = client.get("/api/pac/invoice-settings/categories", headers=admin_headers)
    _skip_if_firebase_not_initialized(r)
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, dict)
    assert "categories" in body and isinstance(body["categories"], list)
    assert "count" in body and isinstance(body["count"], int)


def test_notifications_get(client, seeded_data):
    to_email = seeded_data["to_email"]
    r = client.get(f"/api/pac/notifications", params={"toEmail": to_email})
    _skip_if_firebase_not_initialized(r)
    assert r.status_code == 200, r.text
    items = r.json()
    assert isinstance(items, list)
    assert any(i.get("toEmail") == to_email for i in items), f"Expected a notification for {to_email}"

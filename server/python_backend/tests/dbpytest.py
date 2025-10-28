import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from main import app

client = TestClient(app)

@pytest.fixture
def mock_firestore():
    """
    Patch the Firestore client used in _firestore()
    so it returns a fake Firestore object.
    """
    with patch("main._firestore") as mock_fs:
        mock_db = MagicMock()
        mock_fs.return_value = mock_db
        yield mock_db


def test_list_stores(mock_firestore):
    """Test GET /api/account/stores returns a list of stores."""

    # Mock Firestore collection
    mock_store_snap = MagicMock()
    mock_store_snap.id = "store1"
    mock_store_snap.to_dict.return_value = {"name": "Downtown", "address": "123 Main St"}

    mock_firestore.collection.return_value.stream.return_value = [mock_store_snap]

    # Add dev header bypass since Firebase auth is disabled in tests
    response = client.get("/api/account/stores", headers={"x-dev-email": "test@example.com"})

    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == "store1"
    assert data[0]["name"] == "Downtown"
    assert data[0]["address"] == "123 Main St"


def test_get_me(mock_firestore):
    """Test GET /api/account/me retrieves user profile data."""

    # Mock user Firestore document
    mock_user_snap = MagicMock()
    mock_user_snap.id = "user1"
    mock_user_snap.to_dict.return_value = {
        "firstName": "Chris",
        "lastName": "Bozionelos",
        "email": "test@example.com",
        "role": "Admin",
        "assignedStores": []
    }

    # Stream returns an iterable (simulate .where(...).limit(1).stream())
    mock_firestore.collection.return_value.where.return_value.limit.return_value.stream.return_value = [mock_user_snap]

    response = client.get("/api/account/me", headers={"x-dev-email": "test@example.com"})

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["firstName"] == "Chris"
    assert data["role"] == "Admin"

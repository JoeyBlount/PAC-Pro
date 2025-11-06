# auth_context_service.py
from fastapi import APIRouter, HTTPException, Query
from google.cloud import firestore
from typing import Optional

db = firestore.Client()
router = APIRouter(prefix="/api/auth", tags=["auth"])

def build_full_name(first: Optional[str], last: Optional[str]) -> Optional[str]:
    parts = [p for p in [(first or "").strip(), (last or "").strip()] if p]
    return " ".join(parts) if parts else None

def get_user_info_by_email(email: str) -> dict:
    doc = db.collection("users").document(email).get()
    if not doc.exists:
        return {"email": email, "firstName": None, "lastName": None, "name": None, "role": None}
    data = doc.to_dict() or {}
    first = data.get("firstName")
    last = data.get("lastName")
    return {
        "email": email,
        "firstName": first,
        "lastName": last,
        "name": build_full_name(first, last),
        "role": data.get("role"),
    }

@router.get("/user-info")
def user_info(email: str = Query(..., description="User email to lookup")):
    try:
        return get_user_info_by_email(email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read user info: {e}")

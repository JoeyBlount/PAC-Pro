from __future__ import annotations

import os
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Firebase Admin / Firestore
import firebase_admin
from firebase_admin import credentials, auth as admin_auth  # type: ignore
from google.cloud import firestore  # type: ignore

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# ----- Env / Firebase init -----

FIREBASE_CRED_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
USERS_COLLECTION = os.getenv("USERS_COLLECTION", "users")

def _init_firebase():
    if not firebase_admin._apps:
        if FIREBASE_CRED_PATH and os.path.exists(FIREBASE_CRED_PATH):
            cred = credentials.Certificate(FIREBASE_CRED_PATH)
        else:
            cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)

_init_firebase()
_db = firestore.Client()

# ----- Models -----

class GoogleVerifyBody(BaseModel):
    idToken: Optional[str] = None  # optional if using Authorization header

class VerifyResponse(BaseModel):
    allowed: bool
    email: Optional[str] = None
    uid: Optional[str] = None
    email_verified: Optional[bool] = None
    reason: Optional[str] = None

# ----- Helpers -----

def _user_exists(email: str) -> bool:
    return _db.collection(USERS_COLLECTION).document(email).get().exists

def _extract_id_token(request: Request, body: GoogleVerifyBody) -> str:
    # Prefer Authorization header: "Bearer <idToken>"
    authz = request.headers.get("authorization") or request.headers.get("Authorization")
    if authz and authz.lower().startswith("bearer "):
        return authz.split(" ", 1)[1].strip()
    if body and body.idToken:
        return body.idToken
    raise HTTPException(status_code=400, detail="Missing Firebase ID token (Authorization: Bearer <token> or JSON body idToken)")

# ----- Routes -----

@router.post("/google/verify", response_model=VerifyResponse)
async def google_verify(request: Request, body: GoogleVerifyBody = Depends()):
    # 1) Get ID token (header or body)
    id_token = _extract_id_token(request, body)

    # 2) Verify token with Firebase Admin
    try:
        decoded = admin_auth.verify_id_token(id_token, check_revoked=True)
    except Exception:
        logging.exception("Firebase ID token verification failed")
        raise HTTPException(status_code=401, detail="Invalid or expired Google ID token")

    email = decoded.get("email")
    uid = decoded.get("uid")
    email_verified = bool(decoded.get("email_verified", False))

    if not email:
        return VerifyResponse(allowed=False, uid=uid, email_verified=email_verified, reason="No email in token")

    # 3) Allowlist check
    try:
        allowed = _user_exists(email)
    except Exception:
        logging.exception("Firestore read failed")
        raise HTTPException(status_code=500, detail="Database error")

    return JSONResponse(VerifyResponse(
        allowed=allowed,
        email=email,
        uid=uid,
        email_verified=email_verified,
        reason=None if allowed else "Email not in allowlist",
    ).model_dump())

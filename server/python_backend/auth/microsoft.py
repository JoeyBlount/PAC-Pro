from __future__ import annotations

import os
import time
import secrets
from typing import Optional, Tuple

import jwt
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from itsdangerous import URLSafeSerializer, BadSignature
import httpx
import msal
import hashlib
import base64


router = APIRouter(prefix="/api/auth", tags=["Auth"])


# ----- Configuration -----
def _get_env(name: str, default: Optional[str] = None) -> str:
    val = os.getenv(name, default)
    if val is None:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return val


def _get_confidential_client() -> msal.ConfidentialClientApplication:
    tenant_id = _get_env("AZURE_TENANT_ID")
    client_id = _get_env("AZURE_CLIENT_ID")
    client_secret = _get_env("AZURE_CLIENT_SECRET")
    authority = f"https://login.microsoftonline.com/{tenant_id}"
    return msal.ConfidentialClientApplication(
        client_id=client_id,
        client_credential=client_secret,
        authority=authority,
    )


def _get_redirect_uri() -> str:
    # Must match Azure app registration redirect URI
    return _get_env("AZURE_REDIRECT_URI")


def _get_frontend_base() -> str:
    return os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")


def _get_auth_secret() -> str:
    return _get_env("AUTH_SECRET")


def _get_cookie_settings(request: Request) -> dict:
    is_secure = request.url.scheme == "https"
    return {
        "httponly": True,
        "secure": is_secure,
        "samesite": "lax",
        "path": "/",
    }


def _sign_state(data: dict) -> str:
    s = URLSafeSerializer(_get_auth_secret())
    return s.dumps(data)


def _unsign_state(state: str) -> dict:
    s = URLSafeSerializer(_get_auth_secret())
    try:
        return s.loads(state)
    except BadSignature as e:
        raise HTTPException(status_code=400, detail="Invalid state") from e


def _generate_pkce_pair() -> Tuple[str, str]:
    """Generate (code_verifier, code_challenge) per RFC 7636 using S256."""
    # verifier: 43-128 chars, unreserved URL-safe
    verifier = secrets.token_urlsafe(64)[:128]
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return verifier, challenge


def _create_session_token(email: str, name: Optional[str]) -> str:
    now = int(time.time())
    payload = {
        "sub": email,
        "email": email,
        "name": name,
        "iat": now,
        "exp": now + 60 * 60 * 24 * 7,  # 7 days
    }
    return jwt.encode(payload, _get_auth_secret(), algorithm="HS256")


def _decode_session_token(token: str) -> dict:
    return jwt.decode(token, _get_auth_secret(), algorithms=["HS256"])  # type: ignore[no-any-return]


async def _is_user_allowed(email: str) -> bool:
    """Check if user exists in Firestore users collection.
    Falls back to allow in dev if Firebase not initialized.
    """
    try:
        import firebase_admin  # type: ignore
        from firebase_admin import firestore  # type: ignore
        if getattr(firebase_admin, "_apps", None):
            db = firestore.client()
            user_doc = db.collection("users").document(email).get()
            return bool(user_doc.exists)
        # Firebase not initialized; dev fallback: allow
        return True
    except Exception:
        # Firestore not available; dev fallback: allow
        return True


def _extract_email_and_name_from_id_token(id_token_claims: dict) -> Tuple[Optional[str], Optional[str]]:
    # Common claims to check for email/UPN
    email = (
        id_token_claims.get("email")
        or id_token_claims.get("preferred_username")
        or id_token_claims.get("upn")
    )
    name = id_token_claims.get("name")
    return email, name


@router.get("/microsoft/login")
async def microsoft_login(request: Request, redirect: Optional[str] = None):
    app = _get_confidential_client()
    redirect_uri = _get_redirect_uri()

    # PKCE pair
    code_verifier, code_challenge = _generate_pkce_pair()

    # Protect with signed state including nonce and optional redirect
    state = _sign_state({
        "nonce": secrets.token_urlsafe(16),
        "redirect": redirect or f"{_get_frontend_base()}/navi/dashboard",
        "ts": int(time.time()),
        "cv": code_verifier,
    })

    # Build authorization URL manually to ensure PKCE params are present
    import urllib.parse as _url
    tenant_id = _get_env("AZURE_TENANT_ID")
    authorize_base = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize"
    params = {
        "client_id": _get_env("AZURE_CLIENT_ID"),
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "response_mode": "query",
        "scope": "User.Read",
        "state": state,
        "prompt": "select_account",
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    auth_url = authorize_base + "?" + _url.urlencode(params)

    return RedirectResponse(url=auth_url, status_code=302)


@router.get("/microsoft/callback")
async def microsoft_callback(request: Request):
    params = dict(request.query_params)
    error = params.get("error")
    if error:
        desc = params.get("error_description", "")
        raise HTTPException(status_code=400, detail=f"Azure error: {error} {desc}")

    code = params.get("code")
    state = params.get("state")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    state_data = _unsign_state(state)
    desired_redirect = state_data.get("redirect") or f"{_get_frontend_base()}/navi/dashboard"
    code_verifier = state_data.get("cv")
    if not code_verifier:
        raise HTTPException(status_code=400, detail="Missing PKCE verifier in state")

    # Manually redeem code with PKCE to avoid library inconsistencies
    tenant_id = _get_env("AZURE_TENANT_ID")
    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    form = {
        "client_id": _get_env("AZURE_CLIENT_ID"),
        "client_secret": _get_env("AZURE_CLIENT_SECRET"),
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": _get_redirect_uri(),
        "code_verifier": code_verifier,
        "scope": "User.Read",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        tok_resp = await client.post(token_url, data=form)
        if tok_resp.status_code >= 400:
            try:
                errj = tok_resp.json()
                msg = errj.get("error_description") or errj.get("error") or tok_resp.text
            except Exception:
                msg = tok_resp.text
            raise HTTPException(status_code=400, detail=f"Token exchange failed: {msg}")
        token_result = tok_resp.json()

    # Always use Graph to obtain user identity with User.Read
    access_token = token_result.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Missing access token for Microsoft Graph")
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=400, detail="Failed to fetch user profile from Graph")
        me = resp.json()

        mail = me.get("mail")
        userPrincipalName = me.get("userPrincipalName")
        displayName = me.get("displayName")

        email = mail or userPrincipalName
        name = displayName

    if not email:
        raise HTTPException(status_code=400, detail="Unable to determine user email from Microsoft account")

    if not await _is_user_allowed(email):
        # Not allowed — redirect to not-allowed page without a session
        response = RedirectResponse(url=f"{_get_frontend_base()}/not-allowed", status_code=302)
        return response

    token = _create_session_token(email=email, name=name)
    response = RedirectResponse(url=desired_redirect, status_code=302)
    response.set_cookie("session_token", token, **_get_cookie_settings(request))
    return response


@router.get("/me")
async def get_me(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        data = _decode_session_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")
    return JSONResponse({
        "email": data.get("email"),
        "name": data.get("name"),
    })


@router.get("/validate-session")
async def validate_session(request: Request):
    """Validate current session and return user info"""
    token = request.cookies.get("session_token")
    if not token:
        return JSONResponse({"valid": False, "user": None})

    try:
        data = _decode_session_token(token)
        email = data.get("email")
        name = data.get("name")

        # Check if user is still allowed
        if not await _is_user_allowed(email):
            return JSONResponse({"valid": False, "user": None})

        # Get user role from Firestore
        try:
            import firebase_admin  # type: ignore
            from firebase_admin import firestore  # type: ignore
            if getattr(firebase_admin, "_apps", None):
                db = firestore.client()
                user_doc = db.collection("users").document(email).get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    return JSONResponse({
                        "valid": True,
                        "user": {
                            "email": email,
                            "name": name,
                            "role": user_data.get("role", "user")
                        }
                    })
        except Exception:
            pass

        return JSONResponse({
            "valid": True,
            "user": {
                "email": email,
                "name": name,
                "role": "user"  # default role
            }
        })
    except Exception:
        return JSONResponse({"valid": False, "user": None})


@router.post("/microsoft/validate-token")
async def validate_microsoft_token(request: Request):
    """Validate Microsoft access token and create session"""
    try:
        # Get the authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

        access_token = auth_header.split(" ")[1]

        # Validate the token with Microsoft Graph
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code >= 400:
                raise HTTPException(status_code=401, detail="Invalid Microsoft access token")

            me = resp.json()
            email = me.get("mail") or me.get("userPrincipalName")
            name = me.get("displayName")

            if not email:
                raise HTTPException(status_code=400, detail="Unable to determine user email from Microsoft account")

            # Check if user is allowed
            if not await _is_user_allowed(email):
                return JSONResponse({"allowed": False, "message": "User not found in system"})

            # Create session token
            token = _create_session_token(email=email, name=name)

            # Set session cookie
            response = JSONResponse({"allowed": True, "message": "Authentication successful"})
            response.set_cookie("session_token", token, **_get_cookie_settings(request))
            return response

    except httpx.RequestError:
        raise HTTPException(status_code=500, detail="Failed to validate token with Microsoft Graph")


@router.post("/logout")
async def logout(request: Request):
    frontend = _get_frontend_base()
    response = RedirectResponse(url=f"{frontend}/", status_code=302)
    response.delete_cookie("session_token", path="/")
    return response
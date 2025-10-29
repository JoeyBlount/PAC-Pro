"""
Cross-platform FastAPI application for PAC (Profit and Controllable) calculations
Compatible with x86, ARM64 (Windows/macOS/Linux)
"""
import os
import platform
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter
from dotenv import load_dotenv

# Load env first so services see OPENAI_API_KEY, etc.
load_dotenv()

# -------------------------
# Optional Firebase support
# -------------------------
try:
    import firebase_admin
    from firebase_admin import credentials, firestore  # noqa: F401
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False

def initialize_firebase() -> bool:
    """Initialize Firebase if available. Safe to call multiple times."""
    if not FIREBASE_AVAILABLE:
        return False
    if firebase_admin._apps:
        print("✅ Firebase already initialized")
        return True

    base_path = os.environ.get("PROJECT_ROOT", ".")
    cred_path = os.path.join(base_path, "server", "python_backend", "config", "firebase-service-account.json")
    if not os.path.exists(cred_path):
        cred_path = "config/firebase-service-account.json"

    if os.path.exists(cred_path):
        print(f"🔑 Initializing Firebase with credentials: {cred_path}")
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase initialized successfully")
            return True
        except Exception as e:
            print(f"❌ Firebase initialization failed: {e}")
            return False
    else:
        print(f"⚠️ Firebase service account key not found at: {cred_path}")
        print('📝 Set PROJECT_ROOT env to your project root (e.g., setx PROJECT_ROOT "C:\\path\\to\\PAC-Pro")')
        return False

FIREBASE_INITIALIZED = initialize_firebase()

# -------------
# FastAPI app
# -------------
app = FastAPI(
    title="PAC Calculation API",
    description="API for calculating Profit and Controllable expenses",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS (tighten in prod)
UI_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=UI_ORIGINS,   # <— NO "*"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],        # includes Authorization
)


# Include routers...
try:
    from routers import router as api_router, compat as compat_router
    app.include_router(api_router)
    app.include_router(compat_router)
except ImportError as e:
    print(f"Warning: Failed to import routers ({e}). Starting with no API routes.")
    app.include_router(APIRouter())

# Auth (Microsoft) router
try:
    from auth.microsoft import router as microsoft_auth_router
    app.include_router(microsoft_auth_router)  # /api/auth/...
except Exception as e:
    print(f"Warning: Failed to include Microsoft auth router: {e}")

# =======================================================================
# Account page backend
# =======================================================================
from typing import List, Optional, Dict
from fastapi import Depends, Header, HTTPException
from pydantic import BaseModel
import json, base64

# -- Firestore client getter (reuse original firebase init) --
def _firestore():
    if FIREBASE_AVAILABLE and firebase_admin._apps:
        from firebase_admin import firestore as _fs
        return _fs.client()
    return None

# ---------- Accout and store models ----------
class Store(BaseModel):
    id: str
    name: str
    address: str

class Me(BaseModel):
    id: str
    firstName: str
    lastName: str
    email: str
    role: str
    assignedStores: List[Store] = []

class AssignPayload(BaseModel):
    storeId: str

# ---------- Helpers for mock token parsing ----------
def _base64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def _extract_email_from_bearer(id_token: str) -> Optional[str]:
    try:
        parts = id_token.split(".")
        if len(parts) < 2:
            return None
        payload = json.loads(_base64url_decode(parts[1]).decode("utf-8"))
        return payload.get("email")
    except Exception:
        return None

# ---------- Auth dependency ----------
def get_identity(authorization: Optional[str] = Header(None),
                 x_dev_email: Optional[str] = Header(None)) -> Dict[str, str]:
    if FIREBASE_AVAILABLE and firebase_admin._apps:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing/invalid Authorization header")
        token = authorization.split(" ", 1)[1]
        try:
            from firebase_admin import auth as _auth
            decoded = _auth.verify_id_token(token)
            return {"email": decoded.get("email", ""), "uid": decoded.get("uid", "")}
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid Firebase ID token")

    # In non-firebase environments, reject unauthenticated access instead of mock
    if x_dev_email:
        return {"email": x_dev_email, "uid": "dev-bypass"}
    raise HTTPException(status_code=401, detail="Authentication required")

# ---------- Firestore helpers ----------
def _get_user_doc_by_email(db, email: str):
    q = db.collection("users").where("email", "==", email).limit(1).stream()
    doc = next(q, None)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return doc

def _normalize_assigned_stores(assigned) -> List[Store]:
    if not assigned:
        return []
    out: List[Store] = []
    for s in assigned:
        if hasattr(s, "id") and hasattr(s, "get"):  # DocumentReference
            snap = s.get()
            data = snap.to_dict() or {}
            out.append(Store(id=str(snap.id), name=str(data.get("name", "")), address=str(data.get("address", ""))))
        else:  # dict
            out.append(Store(id=str(s.get("id","")), name=str(s.get("name","")), address=str(s.get("address",""))))
    return out

# ---------- Router ----------
account_router = APIRouter(prefix="/api/account", tags=["Account"])

@account_router.get("/me", response_model=Me)
def get_me(identity=Depends(get_identity)):
    db = _firestore()
    email = identity["email"]

    if db:
        user_doc = _get_user_doc_by_email(db, email)
        user_data = user_doc.to_dict() or {}
        assigned = _normalize_assigned_stores(user_data.get("assignedStores", []))
        return Me(
            id=str(user_doc.id),
            firstName=str(user_data.get("firstName","")),
            lastName=str(user_data.get("lastName","")),
            email=str(user_data.get("email","")),
            role=str(user_data.get("role","")),
            assignedStores=assigned,
        )

    raise HTTPException(status_code=503, detail="Firebase not initialized")

@account_router.get("/stores", response_model=List[Store])
def list_stores(identity=Depends(get_identity)):
    db = _firestore()
    if db:
        snaps = db.collection("stores").stream()
        stores: List[Store] = []
        for d in snaps:
            data = d.to_dict() or {}
            # Explicit mapping to avoid 'id' collision when Firestore doc has an 'id' field
            stores.append(
                Store(
                    id=str(d.id),
                    name=str(data.get("name", "")),
                    address=str(data.get("address", "")),
                )
            )
        return stores

    raise HTTPException(status_code=503, detail="Firebase not initialized")

@account_router.post("/me/assigned-stores", response_model=Me)
def assign_store(payload: AssignPayload, identity=Depends(get_identity)):
    db = _firestore()
    email = identity["email"]

    if db:
        user_doc = _get_user_doc_by_email(db, email)
        user_ref = db.collection("users").document(user_doc.id)
        store_doc = db.collection("stores").document(payload.storeId).get()
        if not store_doc.exists:
            raise HTTPException(status_code=404, detail="Store not found")

        store_data = Store(
            id=str(store_doc.id),
            name=str(store_doc.get("name") or ""),
            address=str(store_doc.get("address") or ""),
        )

        data = user_doc.to_dict() or {}
        assigned = data.get("assignedStores", [])
        # Prevent duplicates for dict/ref cases
        already = False
        for s in assigned:
            sid = (s.id if hasattr(s, "id") else s.get("id"))
            if str(sid) == store_data.id:
                already = True
                break
        if not already:
            assigned.append(store_data.dict())
            user_ref.update({"assignedStores": assigned})
        updated = user_ref.get().to_dict() or {}
        return Me(
            id=str(user_doc.id),
            firstName=str(updated.get("firstName","")),
            lastName=str(updated.get("lastName","")),
            email=str(updated.get("email","")),
            role=str(updated.get("role","")),
            assignedStores=_normalize_assigned_stores(updated.get("assignedStores", [])),
        )

    raise HTTPException(status_code=503, detail="Firebase not initialized")

@account_router.delete("/me/assigned-stores/{store_id}", response_model=Me)
def unassign_store(store_id: str, identity=Depends(get_identity)):
    db = _firestore()
    email = identity["email"]

    if db:
        user_doc = _get_user_doc_by_email(db, email)
        user_ref = db.collection("users").document(user_doc.id)
        data = user_doc.to_dict() or {}
        assigned = data.get("assignedStores", [])
        def _sid(s):
            return s.id if hasattr(s, "id") else s.get("id")
        new_assigned = [s for s in assigned if str(_sid(s)) != store_id]
        user_ref.update({"assignedStores": new_assigned})
        updated = user_ref.get().to_dict() or {}
        return Me(
            id=str(user_doc.id),
            firstName=str(updated.get("firstName","")),
            lastName=str(updated.get("lastName","")),
            email=str(updated.get("email","")),
            role=str(updated.get("role","")),
            assignedStores=_normalize_assigned_stores(updated.get("assignedStores", [])),
        )

    raise HTTPException(status_code=503, detail="Firebase not initialized")

#new Account router
app.include_router(account_router)

# =======================================================
# PAC generate back end
# =======================================================
from fastapi import Depends
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

pac_router = APIRouter(prefix="/api/pac", tags=["PAC (generate)"])

class GenerateIn(BaseModel):
    storeId: str
    month: str
    year: int
    period: str  # YYYY-MM

    # Sales
    productNetSales: float
    cash: float
    promo: float
    allNetSales: float
    advertising: float

    # Labor
    crewLabor: float
    totalLabor: float
    payrollTax: float

    # Food
    completeWaste: float
    rawWaste: float
    condiment: float
    variance: float
    unexplained: float
    discounts: float
    baseFood: float

    # Starting inventory
    startingFood: float
    startingCondiment: float
    startingPaper: float
    startingNonProduct: float
    startingOpsSupplies: float

    # Ending inventory
    endingFood: float
    endingCondiment: float
    endingPaper: float
    endingNonProduct: float
    endingOpsSupplies: float

class GenerateOut(GenerateIn):
    id: str
    savedAt: str

# Legacy pacGen endpoints removed; use pac-projections and invoices instead

# mount the router
app.include_router(pac_router)

    # No mock endpoints; backend requires real data


@app.get("/")
async def root():
    return {
        "message": "PAC Calculation API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/pac/health",
        "platform": {
            "system": platform.system(),
            "architecture": platform.machine(),
            "python_version": platform.python_version(),
        },
        "firebase": {
            "available": FIREBASE_AVAILABLE,
            "initialized": FIREBASE_INITIALIZED,
            "mode": "live" if FIREBASE_INITIALIZED else "mock",
        },
        "mock_endpoints": "/api/pac-mock/*" if (not FIREBASE_AVAILABLE or not FIREBASE_INITIALIZED) else None,
    }

@app.get("/api/pac/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "PAC API is running",
        "platform": {
            "system": platform.system(),
            "architecture": platform.machine(),
            "python_version": platform.python_version(),
            "project_root": os.environ.get("PROJECT_ROOT", "not set"),
        },
        "firebase": {
            "available": FIREBASE_AVAILABLE,
            "initialized": FIREBASE_INITIALIZED,
            "mode": "live" if FIREBASE_INITIALIZED else "mock",
        },
    }

# --------------
# Entrypoint
# --------------
if __name__ == "__main__":
    import uvicorn

    system = platform.system()
    print("🚀 Starting PAC Backend Server...")
    print(f"📱 Platform: {system} {platform.machine()}")
    print(f"🐍 Python: {platform.python_version()}")
    print(f"📁 PROJECT_ROOT: {os.environ.get('PROJECT_ROOT', 'not set (using relative paths)')}")
    print(f"🔥 Firebase: {'✅ Available & Initialized' if FIREBASE_INITIALIZED else '⚠️ Not Available (Mock Mode)'}")
    print("🌐 Server: http://127.0.0.1:5140")
    print("📚 Docs:   http://127.0.0.1:5140/docs")
    print("❤️ Health: http://127.0.0.1:5140/api/pac/health\n")

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=5140,
        reload=(system != "Windows"),
        log_level="info",
    )

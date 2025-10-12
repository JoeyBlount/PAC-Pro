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


# -----------------
# Include routers
# -----------------
try:
    # Expect these in your routers module (per earlier messages)
    from routers import router as api_router, compat as compat_router
    app.include_router(api_router)     # /api/pac/...
    app.include_router(compat_router)  # /api/invoiceread/read + /api/invoice-read/read
except ImportError as e:
    print(f"Warning: Failed to import routers ({e}). Starting with no API routes.")
    app.include_router(APIRouter())

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

    # Mock mode
    if x_dev_email:
        return {"email": x_dev_email, "uid": "mock-uid"}
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        email = _extract_email_from_bearer(token)
        if email:
            return {"email": email, "uid": "mock-uid"}
    return {"email": "dev@example.com", "uid": "mock-uid"}

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

    # Mock mode
    _ensure_mock_seed()
    if email not in _mock_users:
        _mock_users[email] = Me(
            id="mock-user-id",
            firstName="Dev",
            lastName="User",
            email=email,
            role="Admin",
            assignedStores=[],
        )
    return _mock_users[email]

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

    _ensure_mock_seed()
    return list(_mock_stores.values())

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

    # Mock mode
    _ensure_mock_seed()
    user = _mock_users.get(email) or Me(
        id="mock-user-id", firstName="Dev", lastName="User", email=email, role="Admin", assignedStores=[]
    )
    store = _mock_stores.get(payload.storeId)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    if not any(s.id == store.id for s in user.assignedStores):
        user.assignedStores.append(store)
    _mock_users[email] = user
    return user

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

    # Mock mode
    user = _mock_users.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.assignedStores = [s for s in user.assignedStores if s.id != store_id]
    _mock_users[email] = user
    return user

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

# simple in-memory store for mock mode
_mock_pacgen: dict[str, dict[str, GenerateOut]] = {}  # keyed by [storeId][period]

@pac_router.post("/generate", response_model=GenerateOut)
def save_generate(payload: GenerateIn, identity=Depends(get_identity)):
    db = _firestore()
    now_iso = datetime.utcnow().isoformat() + "Z"

    if db:
        # Firestore live mode
        doc_data = payload.dict()
        doc_data["uid"] = identity.get("uid")
        doc_data["email"] = identity.get("email")
        doc_data["savedAt"] = now_iso

        # Use auto ID; alternatively build deterministic docId
        # docId = f"{payload.storeId}_{payload.period.replace('-', '')}"
        ref = db.collection("pacGen").document()
        # server timestamp if you'd like: firestore.SERVER_TIMESTAMP
        ref.set({**doc_data, "createdAt": firestore.SERVER_TIMESTAMP})

        return GenerateOut(id=ref.id, savedAt=now_iso, **payload.dict())

    # Mock mode
    store = _mock_pacgen.setdefault(payload.storeId, {})
    mock_id = f"mock-{payload.storeId}-{payload.period}"
    out = GenerateOut(id=mock_id, savedAt=now_iso, **payload.dict())
    store[payload.period] = out
    return out

# (optional) fetch last saved Generate for a store/period
@pac_router.get("/generate/{store_id}/{year_month}", response_model=Optional[GenerateOut])
def get_generate(store_id: str, year_month: str, identity=Depends(get_identity)):
    db = _firestore()
    if db:
        # naive: scan latest match (optimize with a composite index if you need)
        q = (db.collection("pacGen")
                .where("storeId", "==", store_id)
                .where("period", "==", year_month)
                .order_by("createdAt", direction=firestore.Query.DESCENDING)
                .limit(1)
             )
        snaps = list(q.stream())
        if not snaps:
            return None
        d = snaps[0]
        data = d.to_dict() or {}
        return GenerateOut(
            id=str(d.id),
            savedAt=(data.get("savedAt") or ""),
            **{k: data[k] for k in GenerateIn.__fields__.keys()}
        )
    # mock
    return _mock_pacgen.get(store_id, {}).get(year_month)

# mount the router
app.include_router(pac_router)

# ---------------------------------------------------
# Mock PAC endpoints (including projections) for dev
# ---------------------------------------------------
# These do NOT collide with real routes; they live under /api/pac-mock/...
# Use them while Firebase is disabled or uninitialized.
mock_router = APIRouter(prefix="/api/pac-mock", tags=["PAC (mock)"])

def _mock_pac_data(entity_id: str, year_month: str):
    """Generate realistic-ish PAC data with variations."""
    import random
    random.seed(hash(entity_id + year_month))

    base_sales = 155000.00 + random.uniform(-10000, 15000)
    all_sales = base_sales + random.uniform(15000, 25000)

    base_food_var = random.uniform(0.85, 1.15)
    labor_var = random.uniform(0.90, 1.10)
    other_var = random.uniform(0.85, 1.15)

    base_food = 46500.00 * base_food_var
    crew_labor = 36167.00 * labor_var
    management_labor = 15500.00 * labor_var
    payroll_tax = (crew_labor + management_labor) * 0.11

    employee_meal = 3100.00 * other_var
    condiment = 2067.00 * other_var
    total_waste = 5167.00 * base_food_var
    paper = 8267.00 * other_var
    travel = 1033.00 * other_var
    advertising = 3100.00 * other_var
    advertising_other = 1550.00 * other_var
    promotion = 2067.00 * other_var
    outside_services = 1240.00 * other_var
    linen = 827.00 * other_var
    op_supply = 1550.00 * other_var
    maintenance_repair = 2583.00 * other_var
    small_equipment = 1860.00 * other_var
    utilities = 4133.00 * other_var
    office = 620.00 * other_var
    cash_adjustments = 517.00 * other_var
    misc_cr_tr_ds = 310.00 * other_var

    total_controllable = (
        base_food + employee_meal + condiment + total_waste + paper +
        crew_labor + management_labor + payroll_tax + travel + advertising +
        advertising_other + promotion + outside_services + linen + op_supply +
        maintenance_repair + small_equipment + utilities + office +
        cash_adjustments + misc_cr_tr_ds
    )

    pac_dollars = base_sales - total_controllable
    pac_percent = (pac_dollars / base_sales) * 100 if base_sales > 0 else 0

    return {
        "entity_id": entity_id,
        "year_month": year_month,
        "product_net_sales": round(base_sales, 2),
        "all_net_sales": round(all_sales, 2),
        "amount_used": {
            "food": round(base_food, 2),
            "paper": round(paper, 2),
            "condiment": round(condiment, 2),
            "non_product": round(employee_meal + total_waste, 2),
            "op_supplies": round(op_supply, 2),
        },
        "controllable_expenses": {
            "base_food": {"dollars": round(base_food, 2), "percent": round((base_food / base_sales) * 100, 2)},
            "employee_meal": {"dollars": round(employee_meal, 2), "percent": round((employee_meal / base_sales) * 100, 2)},
            "condiment": {"dollars": round(condiment, 2), "percent": round((condiment / base_sales) * 100, 2)},
            "total_waste": {"dollars": round(total_waste, 2), "percent": round((total_waste / base_sales) * 100, 2)},
            "paper": {"dollars": round(paper, 2), "percent": round((paper / base_sales) * 100, 2)},
            "crew_labor": {"dollars": round(crew_labor, 2), "percent": round((crew_labor / base_sales) * 100, 2)},
            "management_labor": {"dollars": round(management_labor, 2), "percent": round((management_labor / base_sales) * 100, 2)},
            "payroll_tax": {"dollars": round(payroll_tax, 2), "percent": round((payroll_tax / base_sales) * 100, 2)},
            "travel": {"dollars": round(travel, 2), "percent": round((travel / base_sales) * 100, 2)},
            "advertising": {"dollars": round(advertising, 2), "percent": round((advertising / base_sales) * 100, 2)},
            "advertising_other": {"dollars": round(advertising_other, 2), "percent": round((advertising_other / base_sales) * 100, 2)},
            "promotion": {"dollars": round(promotion, 2), "percent": round((promotion / base_sales) * 100, 2)},
            "outside_services": {"dollars": round(outside_services, 2), "percent": round((outside_services / base_sales) * 100, 2)},
            "linen": {"dollars": round(linen, 2), "percent": round((linen / base_sales) * 100, 2)},
            "op_supply": {"dollars": round(op_supply, 2), "percent": round((op_supply / base_sales) * 100, 2)},
            "maintenance_repair": {"dollars": round(maintenance_repair, 2), "percent": round((maintenance_repair / base_sales) * 100, 2)},
            "small_equipment": {"dollars": round(small_equipment, 2), "percent": round((small_equipment / base_sales) * 100, 2)},
            "utilities": {"dollars": round(utilities, 2), "percent": round((utilities / base_sales) * 100, 2)},
            "office": {"dollars": round(office, 2), "percent": round((office / base_sales) * 100, 2)},
            "cash_adjustments": {"dollars": round(cash_adjustments, 2), "percent": round((cash_adjustments / base_sales) * 100, 2)},
            "misc_cr_tr_ds": {"dollars": round(misc_cr_tr_ds, 2), "percent": round((misc_cr_tr_ds / base_sales) * 100, 2)},
        },
        "total_controllable_dollars": round(total_controllable, 2),
        "total_controllable_percent": round((total_controllable / base_sales) * 100, 2),
        "pac_dollars": round(pac_dollars, 2),
        "pac_percent": round(pac_percent, 2),
        "status": "calculated (mock)",
    }

@mock_router.get("/{entity_id}/{year_month}")
async def get_pac_data_mock(entity_id: str, year_month: str):
    """Mock PAC calculations (dev mode)"""
    return _mock_pac_data(entity_id, year_month)

@mock_router.get("/{entity_id}/{year_month}/input")
async def get_input_data_mock(entity_id: str, year_month: str):
    """Mock PAC input data (dev mode)"""
    return {
        "entity_id": entity_id,
        "year_month": year_month,
        "input_data": {
            "sales_data": {"food_sales": 150000.00, "labor_sales": 80000.00},
            "cost_data": {"food_cost": 120000.00, "labor_cost": 60000.00},
            "expenses": {"utilities": 5000.00, "maintenance": 3000.00, "supplies": 2000.00},
        },
        "status": "retrieved (mock mode)",
    }

@mock_router.get("/projections/{entity_id}/{year_month}")
async def get_projections_mock(entity_id: str, year_month: str):
    """Mock projections (consistent baseline) with totals."""
    projected_sales = 155000.00
    projected_all_sales = 175000.00

    projected_base_food = 46500.00
    projected_employee_meal = 3100.00
    projected_condiment = 2067.00
    projected_total_waste = 5167.00
    projected_paper = 8267.00
    projected_crew_labor = 36167.00
    projected_management_labor = 15500.00
    projected_payroll_tax = 4133.00
    projected_travel = 1033.00
    projected_advertising = 3100.00
    projected_advertising_other = 1550.00
    projected_promotion = 2067.00
    projected_outside_services = 1240.00
    projected_linen = 827.00
    projected_op_supply = 1550.00
    projected_maintenance_repair = 2583.00
    projected_small_equipment = 1860.00
    projected_utilities = 4133.00
    projected_office = 620.00
    projected_cash_adjustments = 517.00
    projected_misc_cr_tr_ds = 310.00

    projected_total_controllable = (
        projected_base_food + projected_employee_meal + projected_condiment +
        projected_total_waste + projected_paper + projected_crew_labor +
        projected_management_labor + projected_payroll_tax + projected_travel +
        projected_advertising + projected_advertising_other + projected_promotion +
        projected_outside_services + projected_linen + projected_op_supply +
        projected_maintenance_repair + projected_small_equipment + projected_utilities +
        projected_office + projected_cash_adjustments + projected_misc_cr_tr_ds
    )
    projected_pac = projected_sales - projected_total_controllable

    return {
        "entity_id": entity_id,
        "year_month": year_month,
        "product_net_sales": projected_sales,
        "all_net_sales": projected_all_sales,
        "controllable_expenses": {
            "base_food": {"dollars": projected_base_food, "percent": 30.0},
            "employee_meal": {"dollars": projected_employee_meal, "percent": 2.0},
            "condiment": {"dollars": projected_condiment, "percent": 1.33},
            "total_waste": {"dollars": projected_total_waste, "percent": 3.33},
            "paper": {"dollars": projected_paper, "percent": 5.33},
            "crew_labor": {"dollars": projected_crew_labor, "percent": 23.33},
            "management_labor": {"dollars": projected_management_labor, "percent": 10.0},
            "payroll_tax": {"dollars": projected_payroll_tax, "percent": 2.67},
            "travel": {"dollars": projected_travel, "percent": 0.67},
            "advertising": {"dollars": projected_advertising, "percent": 2.0},
            "advertising_other": {"dollars": projected_advertising_other, "percent": 1.0},
            "promotion": {"dollars": projected_promotion, "percent": 1.33},
            "outside_services": {"dollars": projected_outside_services, "percent": 0.8},
            "linen": {"dollars": projected_linen, "percent": 0.53},
            "op_supply": {"dollars": projected_op_supply, "percent": 1.0},
            "maintenance_repair": {"dollars": projected_maintenance_repair, "percent": 1.67},
            "small_equipment": {"dollars": projected_small_equipment, "percent": 1.2},
            "utilities": {"dollars": projected_utilities, "percent": 2.67},
            "office": {"dollars": projected_office, "percent": 0.4},
            "cash_adjustments": {"dollars": projected_cash_adjustments, "percent": 0.33},
            "misc_cr_tr_ds": {"dollars": projected_misc_cr_tr_ds, "percent": 0.2},
        },
        "total_controllable_dollars": projected_total_controllable,
        "total_controllable_percent": 84.0,
        "pac_dollars": projected_pac,
        "pac_percent": 16.0,
        "status": "projected (mock mode)",
    }

if not FIREBASE_AVAILABLE or not FIREBASE_INITIALIZED:
    app.include_router(mock_router)


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

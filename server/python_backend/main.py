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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://[::1]:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

# Mount mock endpoints only if Firebase is off/uninitialized (dev)
if not FIREBASE_AVAILABLE or not FIREBASE_INITIALIZED:
    app.include_router(mock_router)

# ----------------
# Basic endpoints
# ----------------
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

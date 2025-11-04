"""
FastAPI routers for PAC calculations
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import json

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Security, Request, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from models import PacCalculationResult, PacInputData
from services.pac_calculation_service import PacCalculationService
from services.data_ingestion_service import DataIngestionService
from services.account_mapping_service import AccountMappingService
from services.proj_calculation_service import (
    ProjCalculationService,
    get_proj_calculation_service,
)
from services.invoice_reader import InvoiceReader
from services.invoice_submit import InvoiceSubmitService
from services.user_management_service import UserManagementService
from services.navBar_service import NavBarService
from services.invoice_settings_service import InvoiceSettingsService
import logging

from pydantic import BaseModel
from typing import Any, Dict, List

class ProjectionsSeedIn(BaseModel):
    store_id: str
    year: int
    month_index_1: int

class ProjectionsSaveIn(BaseModel):
    store_id: str
    year: int
    month_index_1: int
    pacGoal: float
    projections: List[Dict[str, Any]]

class ApplyRowsIn(BaseModel):
    rows: List[Dict[str, Any]]

class HistoricalIn(BaseModel):
    store_id: str
    year: int
    month_index_1: int


class UpdateInvoiceCategoryIn(BaseModel):
    bankAccountNum: str



# ---------------------------
# Main API router (/api/pac)
# ---------------------------
router = APIRouter(prefix="/api/pac", tags=["PAC"])
logger = logging.getLogger(__name__)


# ---- Dependencies ----
security_scheme = HTTPBearer(auto_error=False)


def require_auth(credentials: HTTPAuthorizationCredentials = Security(security_scheme)) -> Dict[str, Any]:
    """Basic auth requirement: ensure a Bearer token is provided.

    In production, this should validate the token (e.g., Firebase ID token).
    For now, we enforce presence of the header to prevent unauthenticated access.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = credentials.credentials

    # If Firebase Admin SDK is available and initialized, verify the token.
    # Otherwise, accept any non-empty token but still require presence (dev fallback).
    try:
        import firebase_admin  # type: ignore
        from firebase_admin import auth as fb_auth  # type: ignore
        if firebase_admin._apps:
            try:
                decoded = fb_auth.verify_id_token(token)
                return {"uid": decoded.get("uid"), "email": decoded.get("email"), "claims": decoded}
            except Exception:
                # Provided token is present but invalid
                raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        # Firebase not available; proceed with minimal context in dev
        pass

    return {"uid": None, "email": None, "claims": None}


def require_roles(allowed_roles: List[str]):
    def _checker(
        auth_ctx: Dict[str, Any] = Depends(require_auth),
        request: Request = None,
    ) -> Dict[str, Any]:
        role: Optional[str] = None

        # 1) Prefer role from verified token claims
        claims = auth_ctx.get("claims") or {}
        if isinstance(claims, dict):
            if "role" in claims and isinstance(claims["role"], str):
                role = claims["role"]

        # 2) If not in claims, and we have an email + Firebase, look up Firestore 'users' doc
        if role is None and auth_ctx.get("email"):
            try:
                import firebase_admin  # type: ignore
                from firebase_admin import firestore  # type: ignore
                if firebase_admin._apps:
                    db = firestore.client()
                    user_doc = db.collection("users").document(auth_ctx["email"]).get()
                    if user_doc.exists:
                        data = user_doc.to_dict() or {}
                        r = data.get("role")
                        if isinstance(r, str):
                            role = r
            except Exception:
                # Firestore not available or lookup failed; fall back below
                pass

        # 3) Dev/test fallback: allow header override if Firebase not available
        if role is None and request is not None:
            hdr = request.headers.get("X-User-Role")
            if hdr and isinstance(hdr, str):
                role = hdr

        if role is None:
            raise HTTPException(status_code=403, detail="Role not found for user")

        if role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient role")

        return {"role": role}

    return _checker


def get_pac_calculation_service() -> PacCalculationService:
    data_ingestion_service = DataIngestionService()
    account_mapping_service = AccountMappingService()
    return PacCalculationService(data_ingestion_service, account_mapping_service)


def get_invoice_reader() -> InvoiceReader:
    """
    Lazily construct the InvoiceReader so the app can start
    even if OPENAI_API_KEY isn't set yet. You'll only need it
    when the invoice endpoint is called.
    """
    return InvoiceReader()


def get_invoice_submit_service() -> InvoiceSubmitService:
    """
    Get the invoice submission service instance.
    """
    return InvoiceSubmitService()


def get_user_management_service() -> UserManagementService:
    """
    Get the user management service instance.
    """
    return UserManagementService()

def get_navbar_service() -> NavBarService:
    """
    Get the NavBar service instance.
    """
    return NavBarService()


def get_invoice_settings_service() -> InvoiceSettingsService:
    """
    Get the invoice settings service instance.
    """
    return InvoiceSettingsService()


# ---- Invoice Settings Routes ----
@router.get("/invoice-settings/categories")
async def get_invoice_categories(
    svc: InvoiceSettingsService = Depends(get_invoice_settings_service),
    _auth: Dict[str, Any] = Depends(require_roles(["Admin"])), #potentially add more users roles later
) -> Dict[str, Any]:
    """
    Ensure default invoice categories exist and return them in canonical order.
    Visible to Admins, Accountants, and Office Managers.
    """
    if not svc.is_available():
        raise HTTPException(status_code=503, detail="Invoice settings service not available - Firebase not initialized")
    try:
        cats = await svc.get_categories()
        return {"categories": cats, "count": len(cats)}
    except Exception as e:
        logger.error(f"Error fetching invoice categories: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch invoice categories: {str(e)}")


@router.put("/invoice-settings/category/{category_id}")
async def update_invoice_category(
    category_id: str,
    payload: UpdateInvoiceCategoryIn,
    svc: InvoiceSettingsService = Depends(get_invoice_settings_service),
    _auth: Dict[str, Any] = Depends(require_roles(["Admin"])),
) -> Dict[str, Any]:
    """
    Update (or create) a category's bank account number. Admin only.
    """
    if not svc.is_available():
        raise HTTPException(status_code=503, detail="Invoice settings service not available - Firebase not initialized")
    try:
        if not payload.bankAccountNum or not payload.bankAccountNum.strip():
            raise HTTPException(status_code=400, detail="bankAccountNum is required")

        # Enforce numeric-only like the client previously did
        if not payload.bankAccountNum.isdigit():
            raise HTTPException(status_code=400, detail="account number must be numeric")

        updated = await svc.update_category(category_id, payload.bankAccountNum.strip())
        return {"success": True, "category": updated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating invoice category {category_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update category: {str(e)}")


# ---- Helpers ----
def is_valid_year_month(year_month: str) -> bool:
    """Validate yearMonth format (YYYYMM)"""
    if not year_month or len(year_month) != 6:
        return False
    try:
        parsed = int(year_month)
        year = parsed // 100
        month = parsed % 100
        return 2000 <= year <= 2100 and 1 <= month <= 12
    except ValueError:
        return False


# ---- User Management Routes ----
@router.get("/userManagement/fetch")
async def fetch_users(
    user_service: UserManagementService = Depends(get_user_management_service),
) -> Dict[str, Any]:
    """
    Fetch all users from the 'users' collection in Firestore.
    """
    if not user_service.is_available():
        raise HTTPException(
            status_code=503, 
            detail="User management service not available - Firebase not initialized"
        )
    
    try:
        users = await user_service.fetch_users()
        return {"users": users, "count": len(users)}
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")


@router.post("/userManagement/add")
async def add_user(
    user_data: Dict[str, Any],
    user_service: UserManagementService = Depends(get_user_management_service),
) -> Dict[str, Any]:
    """
    Add a new user to the 'users' collection in Firestore.
    """
    if not user_service.is_available():
        raise HTTPException(
            status_code=503, 
            detail="User management service not available - Firebase not initialized"
        )
    
    try:
        # Validate required fields
        required_fields = ["firstName", "lastName", "email", "role"]
        for field in required_fields:
            if not user_data.get(field):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Missing required field: {field}"
                )
        
        # Add timestamp and accept state
        user_data["createdAt"] = datetime.now().isoformat()
        user_data["acceptState"] = False

        # Normalize and validate assigned stores
        role_val = str(user_data.get("role", "")).strip()
        assigned_stores = user_data.get("assignedStores")
        if assigned_stores is None:
            assigned_stores = []
        if not isinstance(assigned_stores, list):
            raise HTTPException(status_code=400, detail="assignedStores must be an array")

        # For Admins, treat as access to all (store empty array for compatibility)
        if role_val.lower() == "admin":
            user_data["assignedStores"] = []
        else:
            # For non-admins, at least one store must be assigned
            if len(assigned_stores) == 0:
                raise HTTPException(status_code=400, detail="At least one assigned store is required for non-Admin users")

            # Sanitize store entries to expected shape
            sanitized: List[Dict[str, Any]] = []
            for s in assigned_stores:
                if not isinstance(s, dict):
                    raise HTTPException(status_code=400, detail="Each assigned store must be an object")
                sid = s.get("id")
                if not sid:
                    raise HTTPException(status_code=400, detail="Assigned store is missing 'id'")
                sanitized.append({
                    "id": str(s.get("id", "")),
                    "name": str(s.get("name", "")),
                    "address": str(s.get("address", "")),
                })
            user_data["assignedStores"] = sanitized
        
        result = await user_service.add_user(user_data)
        return {"success": True, "message": "User added successfully", "user": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add user: {str(e)}")


@router.put("/userManagement/edit")
async def edit_user(
    user_email: str = Query(..., description="Email of the user to edit"),
    user_data: Dict[str, Any] = None,
    user_service: UserManagementService = Depends(get_user_management_service),
) -> Dict[str, Any]:
    """
    Edit a user in the 'users' collection in Firestore.
    """
    if not user_service.is_available():
        raise HTTPException(
            status_code=503, 
            detail="User management service not available - Firebase not initialized"
        )
    
    try:
        if not user_email:
            raise HTTPException(status_code=400, detail="User email is required")
        
        # Normalize assignedStores if provided and enforce role/store rules
        role_val = str((user_data or {}).get("role", "")).strip()
        if user_data is None:
            user_data = {}

        if role_val:
            if role_val.lower() == "admin":
                # Clear assigned stores for admins
                user_data["assignedStores"] = []
            else:
                # For non-admins, ensure assignedStores is present and valid when provided
                if "assignedStores" in user_data:
                    assigned_stores = user_data.get("assignedStores")
                    if not isinstance(assigned_stores, list):
                        raise HTTPException(status_code=400, detail="assignedStores must be an array")
                    sanitized: List[Dict[str, Any]] = []
                    for s in assigned_stores:
                        if not isinstance(s, dict):
                            raise HTTPException(status_code=400, detail="Each assigned store must be an object")
                        sid = s.get("id")
                        if not sid:
                            raise HTTPException(status_code=400, detail="Assigned store is missing 'id'")
                        sanitized.append({
                            "id": str(s.get("id", "")),
                            "name": str(s.get("name", "")),
                            "address": str(s.get("address", "")),
                        })
                    if len(sanitized) == 0:
                        raise HTTPException(status_code=400, detail="At least one assigned store is required for non-Admin users")
                    user_data["assignedStores"] = sanitized

        result = await user_service.edit_user(user_email, user_data)
        return {"success": True, "message": "User updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error editing user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to edit user: {str(e)}")


@router.delete("/userManagement/delete")
async def delete_user(
    user_email: str = Query(..., description="Email of the user to delete"),
    user_service: UserManagementService = Depends(get_user_management_service),
) -> Dict[str, Any]:
    """
    Delete a user from the 'users' collection in Firestore.
    """
    if not user_service.is_available():
        raise HTTPException(
            status_code=503, 
            detail="User management service not available - Firebase not initialized"
        )
    
    try:
        if not user_email:
            raise HTTPException(status_code=400, detail="User email is required")
        
        result = await user_service.delete_user(user_email)
        return {"success": True, "message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")


# ---- NavBar Routes ----
@router.get("/nav/allowed-stores")
async def get_allowed_stores(
    auth_ctx: Dict[str, Any] = Depends(require_auth),
    svc: NavBarService = Depends(get_navbar_service),
) -> Dict[str, Any]:
    """
    Return list of stores the current user can access.
    Admins receive all stores; non-admins receive their assigned stores.
    """
    if not svc.is_available():
        raise HTTPException(status_code=503, detail="NavBar service not available - Firebase not initialized")

    email = auth_ctx.get("email")
    if not email:
        # In dev/test, allow header override for email
        raise HTTPException(status_code=401, detail="Email not found; ensure Authorization token includes email")

    try:
        stores = svc.fetch_allowed_stores(email)
        return {"stores": stores, "count": len(stores)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching allowed stores: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch allowed stores")

# ---- PAC Routes ----
@router.get("/{entity_id}/{year_month}", response_model=PacCalculationResult)
async def get_pac_calculations(
    entity_id: str,
    year_month: str,
    pac_service: PacCalculationService = Depends(get_pac_calculation_service),
) -> PacCalculationResult:
    """
    Get PAC calculations for a specific store and month (YYYYMM).
    """
    if not is_valid_year_month(year_month):
        raise HTTPException(
            status_code=400,
            detail="Invalid yearMonth format. Expected YYYYMM (e.g., 202501)",
        )
    try:
        return await pac_service.calculate_pac_async(entity_id, year_month)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Error calculating PAC: {str(ex)}")


@router.get("/{entity_id}/{year_month}/input", response_model=PacInputData)
async def get_pac_input_data(
    entity_id: str,
    year_month: str,
    pac_service: PacCalculationService = Depends(get_pac_calculation_service),
) -> PacInputData:
    """
    Get PAC input data used for calculations for a specific store and month (YYYYMM).
    """
    if not is_valid_year_month(year_month):
        raise HTTPException(
            status_code=400,
            detail="Invalid yearMonth format. Expected YYYYMM (e.g., 202501)",
        )
    try:
        return await pac_service.get_input_data_async(entity_id, year_month)
    except Exception as ex:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving PAC input data: {str(ex)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {"status": "healthy", "service": "PAC Calculation API"}


# ---- Invoice OCR Route (under /api/pac) ----
@router.post("/invoice/read")
async def read_invoice(
    image: UploadFile = File(...),
    reader: InvoiceReader = Depends(get_invoice_reader),
    _auth: Dict[str, Any] = Depends(require_roles(["Admin", "Accountant"])),
) -> Dict[str, Any]:
    """
    Read invoice image using OpenAI Vision API via the InvoiceReader service.
    """
    logger.info("📥 Received invoice image for reading")

    if not image:
        raise HTTPException(status_code=400, detail="No image uploaded.")

    contents = await image.read()
    await image.close()
    if not contents or len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty image upload.")

    try:
        result = await reader.read_bytes(contents, image.filename)
        logger.info("✅ Invoice parsed successfully")
        return result
    except ValueError as e:
        logger.error(f"❌ JSON parse error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"❌ OpenAI error: {e}")
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error processing invoice: {str(e)}"
        )


@router.post("/invoices/submit")
async def submit_invoice(
    image: UploadFile = File(...),
    invoice_number: str = Form(...),
    company_name: str = Form(...),
    invoice_day: int = Form(...),
    invoice_month: int = Form(...),
    invoice_year: int = Form(...),
    target_month: int = Form(...),
    target_year: int = Form(...),
    store_id: str = Form(...),
    user_email: str = Form(...),
    categories: str = Form(...),  # JSON string of categories
    submit_service: InvoiceSubmitService = Depends(get_invoice_submit_service),
) -> Dict[str, Any]:
    """
    Submit invoice data and image to Firebase.
    """
    logger.info("Received invoice submission request")
    
    if not image:
        raise HTTPException(status_code=400, detail="No image uploaded.")
    
    if not submit_service.is_available():
        raise HTTPException(
            status_code=503, 
            detail="Invoice submission service not available - Firebase not initialized"
        )
    
    # Read image data
    contents = await image.read()
    await image.close()
    if not contents or len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty image upload.")
    
    try:
        # Validate required fields
        validation_errors = []
        
        if not invoice_number:
            validation_errors.append("Invoice number is required")
        if not company_name:
            validation_errors.append("Company name is required")
        if not invoice_day or not invoice_month or not invoice_year:
            validation_errors.append("Invoice date (day, month, year) is required")
        if not target_month or not target_year:
            validation_errors.append("Target month/year is required")
        if not store_id:
            validation_errors.append("Store ID is required")
        if not user_email:
            validation_errors.append("User email is required")
        if not categories:
            validation_errors.append("Categories are required")
        
        if validation_errors:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required fields: {', '.join(validation_errors)}"
            )
        
        # Parse categories
        try:
            categories_dict = json.loads(categories)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid categories format")
        
        # Validate date
        try:
            invoice_date = f"{invoice_month:02d}/{invoice_day:02d}/{invoice_year}"
            # Test if the date is valid
            datetime.strptime(invoice_date, "%m/%d/%Y")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
        
        # Prepare invoice data
        invoice_data = {
            'invoiceNumber': invoice_number,
            'companyName': company_name,
            'invoiceDate': invoice_date,
            'targetMonth': target_month,
            'targetYear': target_year,
            'storeID': store_id,
            'user_email': user_email,
            'categories': categories_dict,
            'dateSubmitted': datetime.now().strftime("%m/%d/%Y")
        }
        
        # Submit invoice
        result = await submit_service.submit_invoice(
            invoice_data=invoice_data,
            image_file=contents,
            image_filename=image.filename or "invoice.jpg"
        )
            
        
        logger.info("Invoice submitted successfully")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting invoice: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error submitting invoice: {str(e)}"
        )
    
@router.post("/projections/seed")
async def seed_projections(
    payload: ProjectionsSeedIn,
    svc: ProjCalculationService = Depends(get_proj_calculation_service),
):
    return await svc.seed_projections(payload.store_id, payload.year, payload.month_index_1)

@router.post("/projections/save")
async def save_projections(
    payload: ProjectionsSaveIn,
    svc: ProjCalculationService = Depends(get_proj_calculation_service),
):
    await svc.save_projections(
        payload.store_id, payload.year, payload.month_index_1, payload.pacGoal, payload.projections
    )
    return {"ok": True}

@router.post("/apply")
async def apply_projections_math(
    payload: ApplyRowsIn,
    svc: ProjCalculationService = Depends(get_proj_calculation_service),
):
    applied = svc.apply_all(payload.rows)
    return {"rows": applied}

@router.post("/historical")
async def get_historical_rows(
    payload: HistoricalIn,
    svc: ProjCalculationService = Depends(get_proj_calculation_service),
):
    rows = await svc.load_historical_rows(payload.store_id, payload.year, payload.month_index_1)
    return {"rows": rows}


@router.get("/projections/{entity_id}/{year_month}")
async def get_pac_projections(
    entity_id: str,
    year_month: str,
    pac_service: PacCalculationService = Depends(get_pac_calculation_service),
):
    """
    Get PAC projections for a specific store and month (YYYYMM) from Firebase,
    then compute the full PAC result using those projections.
    """
    if not entity_id or not year_month:
        raise HTTPException(
            status_code=400, detail="Entity ID and year_month are required"
        )
    if not is_valid_year_month(year_month):
        raise HTTPException(
            status_code=400, detail="Invalid year_month format. Use YYYYMM (e.g., 202501)"
        )

    # Guard Firebase presence/initialization
    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            raise HTTPException(status_code=503, detail="Firebase not initialized")
    except ModuleNotFoundError:
        raise HTTPException(status_code=503, detail="Firebase not installed/available")

    try:
        db = firestore.client()
        doc_id = f"{entity_id}_{year_month}"
        doc_ref = db.collection("pac-projections").document(doc_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(
                status_code=404,
                detail=f"No projections data found for {entity_id} in {year_month}",
            )

        projections_data = doc.to_dict()

        # --- Fallback: derive structured fields from legacy `rows` documents ---
        # Some older projection docs only contain raw `rows` and `pacGoal`.
        # The Actual tab and calculation service expect structured fields like
        # `product_net_sales`, `cash_adjustments`, and a `purchases` map.
        # If those are missing, derive them from rows so older data still works.
        try:
            if projections_data is not None:
                needs_structured = (
                    "product_net_sales" not in projections_data
                    and isinstance(projections_data.get("rows"), list)
                )

                if needs_structured:
                    rows = projections_data.get("rows", [])

                    def by_name(name: str) -> dict:
                        for r in rows:
                            nm = str(r.get("name", "")).strip().lower()
                            if nm == name.strip().lower():
                                return r
                        return {}

                    def get_dollar(row_name: str) -> float:
                        r = by_name(row_name)
                        try:
                            return float(r.get("projectedDollar") or 0.0)
                        except Exception:
                            return 0.0

                    # Top-level sales fields
                    product_net_sales = get_dollar("Product Sales") or get_dollar("Product Net Sales")
                    cash_adjustments = get_dollar("Cash +/-")

                    # Purchases mapping (aligns with DataIngestionService.save_projections)
                    purchase_map = {
                        "travel": ["Travel"],
                        "advertising_other": ["Adv Other", "Advertising Other"],
                        "promotion": ["Promotion"],
                        "outside_services": ["Outside Services"],
                        "linen": ["Linen"],
                        "operating_supply": ["OP. Supply", "Operating Supply"],
                        "maintenance_repair": ["Maint. & Repair", "Maintenance & Repair"],
                        "small_equipment": ["Small Equipment"],
                        "utilities": ["Utilities"],
                        "office": ["Office"],
                        "training": ["Training"],
                        # Crew Relations only (legacy CR/TR/D&S kept separate)
                        "crew_relations": ["Crew Relations"],
                    }

                    purchases: Dict[str, float] = {}
                    for key, names in purchase_map.items():
                        amt = 0.0
                        for nm in names:
                            v = get_dollar(nm)
                            if v:
                                amt = v
                                break
                        purchases[key] = amt

                    # Merge derived structured fields back into the payload
                    projections_data = {
                        **projections_data,
                        "product_net_sales": float(product_net_sales or 0.0),
                        "cash_adjustments": float(cash_adjustments or 0.0),
                        "purchases": purchases,
                    }
        except Exception:
            # If any derivation fails, continue with whatever we have
            pass

        # If the document contains rows, transform them directly to the response so
        # the Actual tab's Projected columns mirror the Projections tab entries exactly.
        rows = projections_data.get("rows") or []
        if rows:
            def find_row(*names: str):
                name_set = {n.strip().lower() for n in names}
                for r in rows:
                    if str(r.get("name", "")).strip().lower() in name_set:
                        return r or {}
                return {}

            def as_expense(*names: str):
                r = find_row(*names)
                return {
                    "dollars": float(r.get("projectedDollar") or 0.0),
                    "percent": float(r.get("projectedPercent") or 0.0),
                }

            # Some deployments saved structured purchases without explicit Training/Crew Relations rows.
            # Fallback to structured purchases when a row is missing (dollars/percent = 0).
            def expense_from_rows_or_purchases(row_names: list[str], purchase_key: str):
                e = as_expense(*row_names)
                if (e.get("dollars") or 0.0) > 0.0 or (e.get("percent") or 0.0) > 0.0:
                    return e
                try:
                    purchases = projections_data.get("purchases") or {}
                    amt = float(purchases.get(purchase_key) or 0.0)
                    if amt > 0.0:
                        base = product_sales or all_net_sales or 0.0
                        pct = (amt / base * 100.0) if base > 0 else 0.0
                        return {"dollars": amt, "percent": pct}
                except Exception:
                    pass
                return e

            product_sales = float(find_row("Product Net Sales", "Product Sales").get("projectedDollar") or 0.0)
            all_net_sales = float(find_row("All Net Sales").get("projectedDollar") or 0.0)

            return {
                "product_net_sales": product_sales,
                "all_net_sales": all_net_sales,
                "controllable_expenses": {
                    "base_food": as_expense("Base Food"),
                    "employee_meal": as_expense("Employee Meal"),
                    "condiment": as_expense("Condiment"),
                    "total_waste": as_expense("Total Waste"),
                    "paper": as_expense("Paper"),
                    "crew_labor": as_expense("Crew Labor"),
                    "management_labor": as_expense("Management Labor"),
                    "payroll_tax": as_expense("Payroll Tax"),
                    "travel": as_expense("Travel"),
                    "advertising": as_expense("Advertising"),
                    "advertising_other": as_expense("Adv Other", "Advertising Other"),
                    "promotion": as_expense("Promotion"),
                    "outside_services": as_expense("Outside Services"),
                    "linen": as_expense("Linen"),
                    "op_supply": as_expense("OP. Supply", "Operating Supply"),
                    "maintenance_repair": as_expense("Maint. & Repair", "Maintenance & Repair"),
                    "small_equipment": as_expense("Small Equipment"),
                    "utilities": as_expense("Utilities"),
                    "office": as_expense("Office"),
                    "cash_adjustments": as_expense("Cash +/-"),
                    "crew_relations": expense_from_rows_or_purchases(["Crew Relations"], "crew_relations"),
                    "training": expense_from_rows_or_purchases(["Training"], "training"),
                },
                "total_controllable_dollars": float(find_row("Total Controllable").get("projectedDollar") or 0.0),
                "total_controllable_percent": float(find_row("Total Controllable").get("projectedPercent") or 0.0),
                "pac_percent": float(find_row("P.A.C.").get("projectedPercent") or 0.0),
                "pac_dollars": float(find_row("P.A.C.").get("projectedDollar") or 0.0),
            }

        # Otherwise fall back to computed service (rare)
        from services.data_ingestion_service import DataIngestionService
        class ProjectionsDataIngestionService(DataIngestionService):
            def __init__(self, projections):
                super().__init__()
                self._projections = projections
            async def get_input_data(self, entity_id: str, year_month: str):
                from models import PacInputData, InventoryData, PurchaseData
                from decimal import Decimal
                d = self._projections
                return PacInputData(
                    product_net_sales=Decimal(str(d.get("product_net_sales", 0))),
                    cash_adjustments=Decimal(str(d.get("cash_adjustments", 0))),
                    promotions=Decimal(str(d.get("promotions", 0))),
                    manager_meals=Decimal(str(d.get("manager_meals", 0))),
                    crew_labor_percent=Decimal(str(d.get("crew_labor_percent", 0))),
                    total_labor_percent=Decimal(str(d.get("total_labor_percent", 0))),
                    payroll_tax_rate=Decimal(str(d.get("payroll_tax_rate", 0))),
                    complete_waste_percent=Decimal(str(d.get("complete_waste_percent", 0))),
                    raw_waste_percent=Decimal(str(d.get("raw_waste_percent", 0))),
                    condiment_percent=Decimal(str(d.get("condiment_percent", 0))),
                    advertising_percent=Decimal(str(d.get("advertising_percent", 0))),
                    beginning_inventory=InventoryData(),
                    ending_inventory=InventoryData(),
                    purchases=PurchaseData(),
                )
        projections_ingestion_service = ProjectionsDataIngestionService(projections_data)
        account_mapping_service = AccountMappingService()
        projections_pac_service = PacCalculationService(
            projections_ingestion_service, account_mapping_service
        )
        result = await projections_pac_service.calculate_pac_async(entity_id, year_month)
        return result.dict()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting projections: {str(e)}")


# ---- Dashboard Routes -----
@router.get("/info/sales/{entity_id}/{year_month}")
async def get_chart_years_sales(entity_id: str, year_month: str):
    if not entity_id or not year_month:
        raise HTTPException(
            status_code=400, detail="Entity ID and year_month are required"
        )
    if not is_valid_year_month(year_month):
        raise HTTPException(
            status_code=400, detail="Invalid year_month format. Use YYYYMM (e.g., 202501)"
        )
    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            raise HTTPException(status_code=503, detail="Firebase not initialized")
    except ModuleNotFoundError:
        raise HTTPException(status_code=503, detail="Firebase not installed/available")
    
    endDate = year_month

    # Calculate Start Date
    startYear = int(year_month[:4]) - 1
    startMonth = int(year_month[4:]) + 1
    
    if startMonth < 0:
        r = -(startMonth)
        startMonth = 12 - r
        startYear -= 1

    startDate = f"{startYear}{startMonth:02d}"

    try:
        db = firestore.client()
        doc_ref = db.collection("pac_actual")
        docs = doc_ref.stream()

        totalSales = []

        for doc in docs:
            doc_id = doc.id
            storeID = doc_id[:9]
            yyyymm = doc_id[-6:]
            if storeID == entity_id and startDate <= yyyymm <= endDate:
                result = doc.to_dict()
                amt = result.get("sales", {}).get("allNetSales", {}).get("dollars")
                totalSales.append({"key": yyyymm, "netsales": amt})
        return {"totalsales": totalSales}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting sales info: {str(e)}")
    

@router.get("/info/budget/{entity_id}/{year_month}")
async def get_chart_budget_and_spending(entity_id: str, year_month: str):
    if not entity_id or not year_month:
        raise HTTPException(
            status_code=400, detail="Entity ID and year_month are required"
        )
    if not is_valid_year_month(year_month):
        raise HTTPException(
            status_code=400, detail="Invalid year_month format. Use YYYYMM (e.g., 202501)"
        )
    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            raise HTTPException(status_code=503, detail="Firebase not initialized")
    except ModuleNotFoundError:
        raise HTTPException(status_code=503, detail="Firebase not installed/available")
    
    try:
        db = firestore.client()
        doc_id = f"{entity_id}_{year_month}"

        budgetSpending = []

        ## Spending cacluation.

        foodpaperspending = 0
        laborspending = 0
        purchasespending = 0

        doc_ref = db.collection("pac_actual").document(doc_id)
        doc = doc_ref.get()

        if doc.exists:
            result = doc.to_dict()
            if "foodAndPaper" in result:
                foodpaperspending = result.get("foodAndPaper", {}).get("total", {}).get("dollars")
            if "labor" in result:
                laborspending = result.get("labor", {}).get("total", {}).get("dollars")
            if "purchases" in result:
                purchasespending = result.get("purchases", {}).get("total", {}).get("dollars")

        ## Budget cacluation 

        foodpaperbudget = 0
        laborbudget = 0
        purchasebudget = 0        

        foodpaper = ["Base Food", "Employee Meal", "Condiment", "Total Waste", "Paper" ]
        labor = ["Crew Labor", "Management Labor", "Payroll Tax"]
        purchase = ["Advertising", "Travel", "Adv Other", "Promotion", "Outside Services", "Linen", "OP. Supply", "Maint. & Repair", "Small Equipment", "Utilities", "Office", "Cash +/-", "Crew Relations", "Training"]

        doc_ref = db.collection("pac-projections").document(doc_id)
        doc = doc_ref.get()

        if doc.exists:
            result = doc.to_dict()
            rows = result.get("rows", {})

            values = [row['projectedDollar'] for row in rows if row['name'] in foodpaper]
            foodpaperbudget = sum(values)

            values = [row['projectedDollar'] for row in rows if row['name'] in labor]
            laborbudget = sum(values)

            values = [row['projectedDollar'] for row in rows if row['name'] in purchase]
            purchasebudget = sum(values)
                

        budgetSpending.append(
            {"key": year_month, 
             "foodpaperbudget": foodpaperbudget, "foodpaperspending": foodpaperspending, 
             "laborbudget": laborbudget, "laborspending": laborspending,
             "purchasebudget": purchasebudget, "purchasespending": purchasespending})

        return {"budgetspending": budgetSpending}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting sales info: {str(e)}")
    

@router.get("/info/pac/{entity_id}/{year_month}")
async def get_chart_PAC_and_projection(entity_id: str, year_month: str):
    if not entity_id or not year_month:
        raise HTTPException(
            status_code=400, detail="Entity ID and year_month are required"
        )
    if not is_valid_year_month(year_month):
        raise HTTPException(
            status_code=400, detail="Invalid year_month format. Use YYYYMM (e.g., 202501)"
        )
    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            raise HTTPException(status_code=503, detail="Firebase not initialized")
    except ModuleNotFoundError:
        raise HTTPException(status_code=503, detail="Firebase not installed/available")
    
    endDate = year_month

    # Calculate Start Date
    startYear = int(year_month[:4])
    startMonth = int(year_month[4:]) - 2

    if startMonth < 0:
        r = -(startMonth)
        startMonth = 12 - r
        startYear -= 1

    startDate = f"{startYear}{startMonth:02d}"

    try:
        db = firestore.client()
        doc_ref = db.collection("pac_actual")
        docs = doc_ref.stream()

        pacAndProjections = []
        pac = {}
        projections = {}

        for doc in docs:
            doc_id = doc.id
            storeID = doc_id[:9]
            yyyymm = doc_id[-6:]

            if storeID == entity_id and startDate <= yyyymm <= endDate:
                result = doc.to_dict()
                pac[yyyymm] = 0                
                if "totals" in result:
                    pac[yyyymm] = result.get("totals", {}).get("pac", {}).get("dollars")

        doc_ref = db.collection("pac-projections")
        docs = doc_ref.stream()

        for doc in docs:
            doc_id = doc.id
            storeID = doc_id[:9]
            yyyymm = doc_id[-6:]
            if storeID == entity_id and startDate <= yyyymm <= endDate:
                result = doc.to_dict()
                projections[yyyymm] = 0
                rows = result.get("rows", [])
                projections[yyyymm] = next((row['projectedDollar'] for row in rows if row['name'] == 'P.A.C.'), 0)

        pap = {}

        for key in set(pac) | set(projections):
            if key in pac and key in projections:
                pap[key] = [pac[key], projections[key]]
            elif key in pac:
                pap[key] = [pac[key], 0]
            else:
                pap[key] = [0, projections[key]]

        for x in pap:
            p = pap[x][0]
            pr = pap[x][1]

            pacAndProjections.append({"key": x, "pac": p, "projections": pr })

        # pacAndProjections.append({"key": yyyymm, "pac": pac, "projections": projections }) # output json
        return {"pacprojections": pacAndProjections}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting sales info: {str(e)}")


# ----------------------------------
# Compatibility router (legacy paths)
# ----------------------------------
compat = APIRouter(tags=["Compat"])

@compat.post("/api/invoiceread/read")
@compat.post("/api/invoice-read/read")
async def read_invoice_compat(
    image: UploadFile = File(...),
    reader: InvoiceReader = Depends(get_invoice_reader),
) -> Dict[str, Any]:
    """
    Legacy invoice OCR paths to match old C# routes.
    """
    data = await image.read()
    await image.close()
    if not data:
        raise HTTPException(status_code=400, detail="No image uploaded.")
    try:
        return await reader.read_bytes(data, image.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


# ---------------------------
# Month Lock Models
# ---------------------------

class MonthLockRequest(BaseModel):
    store_id: str
    month: str
    year: int
    user_email: str
    user_role: str

class MonthLockResponse(BaseModel):
    success: bool
    message: str
    is_locked: bool
    locked_by: str = None
    locked_at: str = None

class MonthLockStatus(BaseModel):
    is_locked: bool
    locked_by: str = None
    locked_at: str = None
    unlocked_by: str = None
    unlocked_at: str = None
    store_id: str
    year_month: str


# ---------------------------
# Month Lock Endpoints
# ---------------------------

@router.get("/month-locks/{store_id}/{year_month}")
async def get_month_lock_status(
    store_id: str,
    year_month: str,
) -> MonthLockStatus:
    """
    Get the lock status for a specific store and month (YYYYMM format).
    """
    try:
        # Guard Firebase presence/initialization
        try:
            import firebase_admin
            from firebase_admin import firestore
            if not firebase_admin._apps:
                raise HTTPException(status_code=503, detail="Firebase not initialized")
        except ModuleNotFoundError:
            raise HTTPException(status_code=503, detail="Firebase not installed/available")

        db = firestore.client()
        doc_id = f"{store_id}_{year_month}"
        
        lock_ref = db.collection("month_locks").document(doc_id)
        lock_doc = lock_ref.get()
        
        if lock_doc.exists:
            data = lock_doc.to_dict()
            return MonthLockStatus(
                is_locked=data.get("is_locked", False),
                locked_by=data.get("locked_by"),
                locked_at=data.get("locked_at").isoformat() if data.get("locked_at") else None,
                unlocked_by=data.get("unlocked_by"),
                unlocked_at=data.get("unlocked_at").isoformat() if data.get("unlocked_at") else None,
                store_id=data.get("store_id", store_id),
                year_month=data.get("year_month", year_month)
            )
        else:
            return MonthLockStatus(
                is_locked=False,
                store_id=store_id,
                year_month=year_month
            )
            
    except Exception as e:
        logger.error(f"Error getting month lock status: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting month lock status: {str(e)}")


@router.post("/month-locks/lock")
async def lock_month(request: MonthLockRequest) -> MonthLockResponse:
    """
    Lock a specific month for a store.
    Only General Managers, Supervisors, and Admins can lock months.
    """
    try:
        # Check permissions
        user_role_lower = request.user_role.lower()
        if user_role_lower not in ["admin", "general manager", "supervisor"]:
            raise HTTPException(
                status_code=403, 
                detail="Only General Managers, Supervisors, and Admins can lock months."
            )

        # Guard Firebase presence/initialization
        try:
            import firebase_admin
            from firebase_admin import firestore
            if not firebase_admin._apps:
                raise HTTPException(status_code=503, detail="Firebase not initialized")
        except ModuleNotFoundError:
            raise HTTPException(status_code=503, detail="Firebase not installed/available")

        db = firestore.client()
        
        # Convert month name to number
        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        
        if request.month not in month_names:
            raise HTTPException(status_code=400, detail="Invalid month name")
            
        month_index = month_names.index(request.month)
        year_month = f"{request.year}{month_index + 1:02d}"
        doc_id = f"{request.store_id}_{year_month}"
        
        lock_ref = db.collection("month_locks").document(doc_id)
        
        # Get existing lock data to preserve audit trail
        existing_doc = lock_ref.get()
        existing_data = existing_doc.to_dict() if existing_doc.exists else {}
        
        lock_data = {
            "store_id": request.store_id,
            "year_month": year_month,
            "is_locked": True,
            "locked_by": request.user_email,
            "locked_at": firestore.SERVER_TIMESTAMP,
            "locked_by_role": request.user_role,
            # Preserve existing audit trail
            "lock_history": [
                *existing_data.get("lock_history", []),
                {
                    "action": "locked",
                    "user": request.user_email,
                    "role": request.user_role,
                    "timestamp": firestore.SERVER_TIMESTAMP
                }
            ]
        }
        
        lock_ref.set(lock_data)
        
        return MonthLockResponse(
            success=True,
            message="Month locked successfully.",
            is_locked=True,
            locked_by=request.user_email,
            locked_at=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error locking month: {e}")
        raise HTTPException(status_code=500, detail=f"Error locking month: {str(e)}")


@router.post("/month-locks/unlock")
async def unlock_month(request: MonthLockRequest) -> MonthLockResponse:
    """
    Unlock a specific month for a store.
    Only Admins can unlock months.
    """
    try:
        # Check permissions - only admins can unlock
        if request.user_role.lower() != "admin":
            raise HTTPException(
                status_code=403, 
                detail="Only Administrators can unlock months."
            )

        # Guard Firebase presence/initialization
        try:
            import firebase_admin
            from firebase_admin import firestore
            if not firebase_admin._apps:
                raise HTTPException(status_code=503, detail="Firebase not initialized")
        except ModuleNotFoundError:
            raise HTTPException(status_code=503, detail="Firebase not installed/available")

        db = firestore.client()
        
        # Convert month name to number
        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        
        if request.month not in month_names:
            raise HTTPException(status_code=400, detail="Invalid month name")
            
        month_index = month_names.index(request.month)
        year_month = f"{request.year}{month_index + 1:02d}"
        doc_id = f"{request.store_id}_{year_month}"
        
        lock_ref = db.collection("month_locks").document(doc_id)
        
        # Get existing lock data to preserve audit trail
        existing_doc = lock_ref.get()
        existing_data = existing_doc.to_dict() if existing_doc.exists else {}
        
        unlock_data = {
            "store_id": request.store_id,
            "year_month": year_month,
            "is_locked": False,
            "unlocked_by": request.user_email,
            "unlocked_at": firestore.SERVER_TIMESTAMP,
            "unlocked_by_role": request.user_role,
            # Preserve existing lock data
            "locked_by": existing_data.get("locked_by"),
            "locked_at": existing_data.get("locked_at"),
            "locked_by_role": existing_data.get("locked_by_role"),
            # Add to audit trail
            "lock_history": [
                *existing_data.get("lock_history", []),
                {
                    "action": "unlocked",
                    "user": request.user_email,
                    "role": request.user_role,
                    "timestamp": firestore.SERVER_TIMESTAMP
                }
            ]
        }
        
        lock_ref.set(unlock_data)
        
        return MonthLockResponse(
            success=True,
            message="Month unlocked successfully.",
            is_locked=False,
            locked_by=existing_data.get("locked_by"),
            locked_at=existing_data.get("locked_at").isoformat() if existing_data.get("locked_at") else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unlocking month: {e}")
        raise HTTPException(status_code=500, detail=f"Error unlocking month: {str(e)}")


@router.get("/month-locks/{store_id}")
async def get_all_locked_months(store_id: str) -> Dict[str, Any]:
    """
    Get all locked months for a specific store.
    """
    try:
        # Guard Firebase presence/initialization
        try:
            import firebase_admin
            from firebase_admin import firestore
            if not firebase_admin._apps:
                raise HTTPException(status_code=503, detail="Firebase not initialized")
        except ModuleNotFoundError:
            raise HTTPException(status_code=503, detail="Firebase not installed/available")

        db = firestore.client()
        
        locks_ref = db.collection("month_locks")
        query = locks_ref.where("store_id", "==", store_id).where("is_locked", "==", True)
        
        locked_months = []
        for doc in query.stream():
            data = doc.to_dict()
            locked_months.append({
                "id": doc.id,
                "store_id": data.get("store_id"),
                "year_month": data.get("year_month"),
                "locked_by": data.get("locked_by"),
                "locked_at": data.get("locked_at").isoformat() if data.get("locked_at") else None,
                "locked_by_role": data.get("locked_by_role")
            })
        
        return {
            "store_id": store_id,
            "locked_months": locked_months,
            "count": len(locked_months)
        }
        
    except Exception as e:
        logger.error(f"Error getting locked months: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting locked months: {str(e)}")

class Announcement(BaseModel):
    id: Optional[str] = None
    title: str
    message: str
    visible_to: str

@router.get("/announcements", response_model=List[Announcement])
async def getAnnouncements(role: Optional[str] = Query("All")):    
    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            raise HTTPException(status_code=503, detail="Firebase not initialized")
    except ModuleNotFoundError:
        raise HTTPException(status_code=503, detail="Firebase not installed/available")

    try:
        db = firestore.client()
        collection = db.collection("announcements")
        docs = collection.stream()

        results = []

        for doc in docs:
           data = doc.to_dict()
           if data.get("visible_to") == "All" or data.get("visible_to") == role:
               data["id"] = doc.id
               results.append(data)

        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting sales info: {str(e)}")
    
@router.get("/announcements/all/", response_model=List[Announcement])
async def getAllAnnouncements():    
    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            raise HTTPException(status_code=503, detail="Firebase not initialized")
    except ModuleNotFoundError:
        raise HTTPException(status_code=503, detail="Firebase not installed/available")

    try:
        db = firestore.client()
        collection = db.collection("announcements")
        docs = collection.stream()

        results = []

        for doc in docs:
           data = doc.to_dict()
           data["id"] = doc.id
           results.append(data)

        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting sales info: {str(e)}")
    
@router.post("/announcements", response_model=Announcement)
async def add_announcement(announcement: Announcement):
    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            raise HTTPException(status_code=503, detail="Firebase not initialized")
    except ModuleNotFoundError:
        raise HTTPException(status_code=503, detail="Firebase not installed/available")

    db = firestore.client()
    collection = db.collection("announcements")
    doc_ref = collection.document()
    doc_ref.set(announcement.dict(exclude_unset=True))
    announcement.id = doc_ref.id
    return announcement


@router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str):
    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            raise HTTPException(status_code=503, detail="Firebase not initialized")
    except ModuleNotFoundError:
        raise HTTPException(status_code=503, detail="Firebase not installed/available")

    db = firestore.client()
    collection = db.collection("announcements")
    doc_ref = collection.document(announcement_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Announcement not found")
    doc_ref.delete()
    return {"status": "deleted"}

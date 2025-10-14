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
    _auth: Dict[str, Any] = Depends(require_roles(["Admin"])),
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

        # Create a custom ingestion service that returns the projections as PacInputData
        from services.data_ingestion_service import DataIngestionService

        class ProjectionsDataIngestionService(DataIngestionService):
            def __init__(self, projections):
                super().__init__()
                self._projections = projections

            async def get_input_data_async(self, entity_id: str, year_month: str):
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
                    beginning_inventory=InventoryData(
                        food=Decimal(str(d.get("beginning_inventory", {}).get("food", 0))),
                        paper=Decimal(str(d.get("beginning_inventory", {}).get("paper", 0))),
                        condiment=Decimal(str(d.get("beginning_inventory", {}).get("condiment", 0))),
                        non_product=Decimal(str(d.get("beginning_inventory", {}).get("non_product", 0))),
                        op_supplies=Decimal(str(d.get("beginning_inventory", {}).get("op_supplies", 0))),
                    ),
                    ending_inventory=InventoryData(
                        food=Decimal(str(d.get("ending_inventory", {}).get("food", 0))),
                        paper=Decimal(str(d.get("ending_inventory", {}).get("paper", 0))),
                        condiment=Decimal(str(d.get("ending_inventory", {}).get("condiment", 0))),
                        non_product=Decimal(str(d.get("ending_inventory", {}).get("non_product", 0))),
                        op_supplies=Decimal(str(d.get("ending_inventory", {}).get("op_supplies", 0))),
                    ),
                    purchases=PurchaseData(
                        food=Decimal(str(d.get("purchases", {}).get("food", 0))),
                        paper=Decimal(str(d.get("purchases", {}).get("paper", 0))),
                        condiment=Decimal(str(d.get("purchases", {}).get("condiment", 0))),
                        non_product=Decimal(str(d.get("purchases", {}).get("non_product", 0))),
                        op_supplies=Decimal(str(d.get("purchases", {}).get("op_supplies", 0))),
                        travel=Decimal(str(d.get("purchases", {}).get("travel", 0))),
                        advertising_other=Decimal(str(d.get("purchases", {}).get("advertising_other", 0))),
                        promotion=Decimal(str(d.get("purchases", {}).get("promotion", 0))),
                        outside_services=Decimal(str(d.get("purchases", {}).get("outside_services", 0))),
                        linen=Decimal(str(d.get("purchases", {}).get("linen", 0))),
                        operating_supply=Decimal(str(d.get("purchases", {}).get("operating_supply", 0))),
                        maintenance_repair=Decimal(str(d.get("purchases", {}).get("maintenance_repair", 0))),
                        small_equipment=Decimal(str(d.get("purchases", {}).get("small_equipment", 0))),
                        utilities=Decimal(str(d.get("purchases", {}).get("utilities", 0))),
                        office=Decimal(str(d.get("purchases", {}).get("office", 0))),
                        training=Decimal(str(d.get("purchases", {}).get("training", 0))),
                        crew_relations=Decimal(str(d.get("purchases", {}).get("crew_relations", 0))),
                    ),
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
        doc_ref = db.collection("pac-projections")
        docs = doc_ref.stream()

        totalSales = []

        for doc in docs:
            doc_id = doc.id
            storeID = doc_id[:9]
            yyyymm = doc_id[-6:]
            if storeID == entity_id and startDate <= yyyymm <= endDate:
                result = doc.to_dict()
                totalSales.append({"key": yyyymm, "netsales": result.get("product_net_sales")})
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
        doc_ref = db.collection("pac-projections").document(doc_id)
        doc = doc_ref.get()

        budgetSpending = []

        if not doc.exists:
            raise HTTPException(
                status_code=404,
                detail=f"No projections data found for {entity_id} in {year_month}",
            )

        foodpaper = ["condiment", "food", "paper"]
        labor = ["crew_labor_percent"]
        purchase = ["advertising_other", "crew_relations", "linen", "maintenance_repair", "non_product", "office", "op_supplies", "outside_services", "promotion", "small_equipment", "training", "travel", "utilities"]

        foodpaperbudget = 0
        foodpaperspending = 0
        laborbudget = 0
        laborspending = 0
        purchasebudget = 0
        purchasespending = 0

        result = doc.to_dict()

        ## Spending cacluation.
        ## Will need to be redone to reflect actual calculation
        for i in foodpaper:
            data = (result.get("purchases", {})).get(i)
            if data is not None:
                foodpaperspending = foodpaperspending + data
            #else:
                # print("ERROR: Unknown database field", doc_id + ".purchases." + i) # Uncomment for debug

        for i in purchase:
            data = (result.get("purchases", {})).get(i)
            if data is not None:
                purchasespending = purchasespending + (result.get("purchases", {})).get(i)
            #else:
                # print("ERROR: Unknown database field", doc_id + ".purchases." + i) # Uncomment for debug

        laborspending = 10000 

        ## Budget cacluation 
        ## To be added. Temp using spending values.

        foodpaperbudget = foodpaperspending
        purchasebudget = purchasespending
        laborbudget = laborspending
        

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
        doc_ref = db.collection("pac-projections")
        docs = doc_ref.stream()

        pacAndProjections = []

        ## PAC Calulations.
        ## To be added. Temp using set values.

        for doc in docs:
            pac = 0
            projections = 0

            doc_id = doc.id
            storeID = doc_id[:9]
            yyyymm = doc_id[-6:]
            if storeID == entity_id and startDate <= yyyymm <= endDate:
                result = doc.to_dict()
                
                if "product_net_sales" in result:
                    pac = result.get("product_net_sales")

                if "product_net_sales" in result:
                    projections = result.get("product_net_sales")
                    projections = projections * 1.1

                pacAndProjections.append({"key": yyyymm, "pac": pac, "projections": projections })
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
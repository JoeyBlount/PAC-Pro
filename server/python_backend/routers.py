"""
FastAPI routers for PAC calculations
"""
from typing import Dict, Any
from datetime import datetime
import json

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from models import PacCalculationResult, PacInputData
from services.pac_calculation_service import PacCalculationService
from services.data_ingestion_service import DataIngestionService
from services.account_mapping_service import AccountMappingService
from services.invoice_reader import InvoiceReader
from services.invoice_submit import InvoiceSubmitService
from services.user_management_service import UserManagementService
import logging


# ---------------------------
# Main API router (/api/pac)
# ---------------------------
router = APIRouter(prefix="/api/pac", tags=["PAC"])
logger = logging.getLogger(__name__)


# ---- Dependencies ----
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
        doc_ref = db.collection("pac_projections").document(doc_id)
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
        doc_ref = db.collection("pac_projections")
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
        doc_ref = db.collection("pac_projections").document(doc_id)
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
        doc_ref = db.collection("pac_projections")
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

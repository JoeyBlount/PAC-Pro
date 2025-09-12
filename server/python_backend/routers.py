"""
FastAPI routers for PAC calculations
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Dict, Any
from models import PacCalculationResult, PacInputData
from services.pac_calculation_service import PacCalculationService
from services.data_ingestion_service import DataIngestionService
from services.account_mapping_service import AccountMappingService
import httpx
import base64
import json
import os
import logging

# Create router
router = APIRouter(prefix="/api/pac", tags=["PAC"])

# Dependency injection
def get_pac_calculation_service() -> PacCalculationService:
    """Get PAC calculation service instance"""
    data_ingestion_service = DataIngestionService()
    account_mapping_service = AccountMappingService()
    return PacCalculationService(data_ingestion_service, account_mapping_service)


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


@router.get("/{entity_id}/{year_month}", response_model=PacCalculationResult)
async def get_pac_calculations(
    entity_id: str,
    year_month: str,
    pac_service: PacCalculationService = Depends(get_pac_calculation_service)
) -> PacCalculationResult:
    """
    Get PAC calculations for a specific store and month
    
    Args:
        entity_id: Store/entity identifier
        year_month: Year and month in YYYYMM format (e.g., 202501)
        
    Returns:
        Complete PAC calculation results
        
    Raises:
        HTTPException: If year_month format is invalid or calculation fails
    """
    try:
        # Validate yearMonth format
        if not is_valid_year_month(year_month):
            raise HTTPException(
                status_code=400,
                detail="Invalid yearMonth format. Expected YYYYMM (e.g., 202501)"
            )
        
        result = await pac_service.calculate_pac_async(entity_id, year_month)
        return result
        
    except HTTPException:
        raise
    except Exception as ex:
        raise HTTPException(
            status_code=500,
            detail=f"Error calculating PAC: {str(ex)}"
        )


@router.get("/{entity_id}/{year_month}/input", response_model=PacInputData)
async def get_pac_input_data(
    entity_id: str,
    year_month: str,
    pac_service: PacCalculationService = Depends(get_pac_calculation_service)
) -> PacInputData:
    """
    Get PAC input data for a specific store and month
    
    Args:
        entity_id: Store/entity identifier
        year_month: Year and month in YYYYMM format (e.g., 202501)
        
    Returns:
        Input data used for PAC calculations
        
    Raises:
        HTTPException: If year_month format is invalid or data retrieval fails
    """
    try:
        # Validate yearMonth format
        if not is_valid_year_month(year_month):
            raise HTTPException(
                status_code=400,
                detail="Invalid yearMonth format. Expected YYYYMM (e.g., 202501)"
            )
        
        result = await pac_service.get_input_data_async(entity_id, year_month)
        return result
        
    except HTTPException:
        raise
    except Exception as ex:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving PAC input data: {str(ex)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {"status": "healthy", "service": "PAC Calculation API"}


@router.post("/invoice/read")
async def read_invoice(image: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Read invoice image using OpenAI Vision API
    
    Args:
        image: Invoice image file
        
    Returns:
        Extracted invoice data as JSON
        
    Raises:
        HTTPException: If image processing fails
    """
    logger = logging.getLogger(__name__)
    logger.info("📥 Received invoice image for reading")
    
    if not image or image.size == 0:
        logger.warning("⚠️ No image uploaded")
        raise HTTPException(status_code=400, detail="No image uploaded.")
    
    try:
        # Read and convert image to base64
        image_content = await image.read()
        base64_image = base64.b64encode(image_content).decode('utf-8')
        data_url = f"data:image/png;base64,{base64_image}"
        
        logger.info("🖼️ Image converted to base64 format")
        
        # Prepare OpenAI request
        prompt = ("Extract the following from this invoice image and return a raw JSON object with fields: "
                 "invoiceNumber (string), companyName (string), invoiceDate (MM/DD/YYYY string), "
                 "items (array of { category: string, amount: number }). Return ONLY valid JSON. Do NOT wrap in code blocks.")
        
        request_body = {
            "model": "gpt-4-turbo",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}}
                    ]
                }
            ],
            "max_tokens": 1000
        }
        
        # Get API key from environment
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        logger.info("📡 Sending request to OpenAI...")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=request_body,
                timeout=30.0
            )
        
        if not response.is_success:
            logger.error(f"❌ OpenAI API failed: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail=response.text)
        
        logger.info("✅ OpenAI response received")
        
        # Parse response
        result_json = response.json()
        content = result_json["choices"][0]["message"]["content"]
        
        logger.info(f"🧠 Raw content from OpenAI:\n{content}")
        
        # Clean up content: remove ```json wrappers if present
        content = content.strip().strip('`')
        if content.lower().startswith("json"):
            content = content[4:].strip()
        
        try:
            parsed = json.loads(content)
            logger.info("✅ Successfully parsed content to JSON.")
            return parsed
        except json.JSONDecodeError as ex:
            logger.error(f"❌ Failed to parse JSON from content: {ex}")
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to parse JSON from OpenAI output:\n{content}"
            )
            
    except httpx.TimeoutException:
        logger.error("❌ OpenAI API request timed out")
        raise HTTPException(status_code=504, detail="OpenAI API request timed out")
    except Exception as ex:
        logger.error(f"❌ Error processing invoice: {ex}")
        raise HTTPException(status_code=500, detail=f"Error processing invoice: {str(ex)}")


@router.get("/projections/{entity_id}/{year_month}")
async def get_pac_projections(
    entity_id: str,
    year_month: str,
    pac_service: PacCalculationService = Depends(get_pac_calculation_service)
):
    """
    Get PAC projections for a specific store and month
    
    Args:
        entity_id: Store/entity identifier (e.g., "store_001")
        year_month: Year and month in YYYYMM format (e.g., "202501")
        
    Returns:
        PAC projections data
    """
    # Validate inputs
    if not entity_id or not year_month:
        raise HTTPException(status_code=400, detail="Entity ID and year_month are required")
    
    if not is_valid_year_month(year_month):
        raise HTTPException(status_code=400, detail="Invalid year_month format. Use YYYYMM (e.g., 202501)")
    
    try:
        # Get projections data from Firebase and calculate PAC
        import firebase_admin
        from firebase_admin import firestore
        
        db = firestore.client()
        doc_id = f"{entity_id}_{year_month}"
        doc_ref = db.collection('pac_projections').document(doc_id)
        doc = doc_ref.get()
        
        if doc.exists:
            # Get the raw projections data
            projections_data = doc.to_dict()
            
            # Calculate PAC using the projections data
            # We need to create a temporary data ingestion service that uses projections data
            from services.data_ingestion_service import DataIngestionService
            from services.pac_calculation_service import PacCalculationService
            
            # Create a custom data ingestion service for projections
            class ProjectionsDataIngestionService(DataIngestionService):
                def __init__(self, projections_data):
                    super().__init__()
                    self.projections_data = projections_data
                
                async def get_input_data_async(self, entity_id: str, year_month: str):
                    # Use the projections data instead of fetching from Firebase
                    data = self.projections_data
                    from models import PacInputData, InventoryData, PurchaseData
                    from decimal import Decimal
                    
                    return PacInputData(
                        product_net_sales=Decimal(str(data.get('product_net_sales', 0))),
                        cash_adjustments=Decimal(str(data.get('cash_adjustments', 0))),
                        promotions=Decimal(str(data.get('promotions', 0))),
                        manager_meals=Decimal(str(data.get('manager_meals', 0))),
                        crew_labor_percent=Decimal(str(data.get('crew_labor_percent', 0))),
                        total_labor_percent=Decimal(str(data.get('total_labor_percent', 0))),
                        payroll_tax_rate=Decimal(str(data.get('payroll_tax_rate', 0))),
                        complete_waste_percent=Decimal(str(data.get('complete_waste_percent', 0))),
                        raw_waste_percent=Decimal(str(data.get('raw_waste_percent', 0))),
                        condiment_percent=Decimal(str(data.get('condiment_percent', 0))),
                        advertising_percent=Decimal(str(data.get('advertising_percent', 0))),
                        beginning_inventory=InventoryData(
                            food=Decimal(str(data.get('beginning_inventory', {}).get('food', 0))),
                            paper=Decimal(str(data.get('beginning_inventory', {}).get('paper', 0))),
                            condiment=Decimal(str(data.get('beginning_inventory', {}).get('condiment', 0))),
                            non_product=Decimal(str(data.get('beginning_inventory', {}).get('non_product', 0))),
                            op_supplies=Decimal(str(data.get('beginning_inventory', {}).get('op_supplies', 0)))
                        ),
                        ending_inventory=InventoryData(
                            food=Decimal(str(data.get('ending_inventory', {}).get('food', 0))),
                            paper=Decimal(str(data.get('ending_inventory', {}).get('paper', 0))),
                            condiment=Decimal(str(data.get('ending_inventory', {}).get('condiment', 0))),
                            non_product=Decimal(str(data.get('ending_inventory', {}).get('non_product', 0))),
                            op_supplies=Decimal(str(data.get('ending_inventory', {}).get('op_supplies', 0)))
                        ),
                        purchases=PurchaseData(
                            food=Decimal(str(data.get('purchases', {}).get('food', 0))),
                            paper=Decimal(str(data.get('purchases', {}).get('paper', 0))),
                            condiment=Decimal(str(data.get('purchases', {}).get('condiment', 0))),
                            non_product=Decimal(str(data.get('purchases', {}).get('non_product', 0))),
                            op_supplies=Decimal(str(data.get('purchases', {}).get('op_supplies', 0))),
                            travel=Decimal(str(data.get('purchases', {}).get('travel', 0))),
                            advertising_other=Decimal(str(data.get('purchases', {}).get('advertising_other', 0))),
                            promotion=Decimal(str(data.get('purchases', {}).get('promotion', 0))),
                            outside_services=Decimal(str(data.get('purchases', {}).get('outside_services', 0))),
                            linen=Decimal(str(data.get('purchases', {}).get('linen', 0))),
                            operating_supply=Decimal(str(data.get('purchases', {}).get('operating_supply', 0))),
                            maintenance_repair=Decimal(str(data.get('purchases', {}).get('maintenance_repair', 0))),
                            small_equipment=Decimal(str(data.get('purchases', {}).get('small_equipment', 0))),
                            utilities=Decimal(str(data.get('purchases', {}).get('utilities', 0))),
                            office=Decimal(str(data.get('purchases', {}).get('office', 0))),
                            training=Decimal(str(data.get('purchases', {}).get('training', 0))),
                            crew_relations=Decimal(str(data.get('purchases', {}).get('crew_relations', 0)))
                        )
                    )
            
            # Create projections data ingestion service and calculate PAC
            projections_ingestion_service = ProjectionsDataIngestionService(projections_data)
            from services.account_mapping_service import AccountMappingService
            account_mapping_service = AccountMappingService()
            projections_pac_service = PacCalculationService(projections_ingestion_service, account_mapping_service)
            
            # Calculate PAC for projections
            result = await projections_pac_service.calculate_pac_async(entity_id, year_month)
            
            # Convert to dict for JSON serialization
            return result.dict()
        else:
            raise HTTPException(status_code=404, detail=f"No projections data found for {entity_id} in {year_month}")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting projections: {str(e)}")

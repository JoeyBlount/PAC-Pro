"""
Tests for Data Ingestion Service
"""
import pytest
from decimal import Decimal
from services.data_ingestion_service import DataIngestionService
from models import InventoryData, PurchaseData


@pytest.fixture
def data_ingestion_service():
    """Create data ingestion service instance"""
    return DataIngestionService()


@pytest.mark.asyncio
async def test_get_product_net_sales_async(data_ingestion_service):
    """Test getting product net sales"""
    result = await data_ingestion_service.get_product_net_sales_async("test_store", "202401")
    assert result == Decimal('100000')


@pytest.mark.asyncio
async def test_get_cash_adjustments_async(data_ingestion_service):
    """Test getting cash adjustments"""
    result = await data_ingestion_service.get_cash_adjustments_async("test_store", "202401")
    assert result == Decimal('500')


@pytest.mark.asyncio
async def test_get_promotions_async(data_ingestion_service):
    """Test getting promotions"""
    result = await data_ingestion_service.get_promotions_async("test_store", "202401")
    assert result == Decimal('2000')


@pytest.mark.asyncio
async def test_get_manager_meals_async(data_ingestion_service):
    """Test getting manager meals"""
    result = await data_ingestion_service.get_manager_meals_async("test_store", "202401")
    assert result == Decimal('300')


@pytest.mark.asyncio
async def test_get_crew_labor_percent_async(data_ingestion_service):
    """Test getting crew labor percentage"""
    result = await data_ingestion_service.get_crew_labor_percent_async("test_store", "202401")
    assert result == Decimal('25.5')


@pytest.mark.asyncio
async def test_get_total_labor_percent_async(data_ingestion_service):
    """Test getting total labor percentage"""
    result = await data_ingestion_service.get_total_labor_percent_async("test_store", "202401")
    assert result == Decimal('35.0')


@pytest.mark.asyncio
async def test_get_payroll_tax_rate_async(data_ingestion_service):
    """Test getting payroll tax rate"""
    result = await data_ingestion_service.get_payroll_tax_rate_async("test_store", "202401")
    assert result == Decimal('8.5')


@pytest.mark.asyncio
async def test_get_complete_waste_percent_async(data_ingestion_service):
    """Test getting complete waste percentage"""
    result = await data_ingestion_service.get_complete_waste_percent_async("test_store", "202401")
    assert result == Decimal('2.5')


@pytest.mark.asyncio
async def test_get_raw_waste_percent_async(data_ingestion_service):
    """Test getting raw waste percentage"""
    result = await data_ingestion_service.get_raw_waste_percent_async("test_store", "202401")
    assert result == Decimal('1.8')


@pytest.mark.asyncio
async def test_get_condiment_percent_async(data_ingestion_service):
    """Test getting condiment percentage"""
    result = await data_ingestion_service.get_condiment_percent_async("test_store", "202401")
    assert result == Decimal('3.2')


@pytest.mark.asyncio
async def test_get_beginning_inventory_async(data_ingestion_service):
    """Test getting beginning inventory"""
    result = await data_ingestion_service.get_beginning_inventory_async("test_store", "202401")
    
    assert isinstance(result, InventoryData)
    assert result.food == Decimal('15000')
    assert result.condiment == Decimal('2000')
    assert result.paper == Decimal('3000')
    assert result.non_product == Decimal('1000')
    assert result.op_supplies == Decimal('500')


@pytest.mark.asyncio
async def test_get_ending_inventory_async(data_ingestion_service):
    """Test getting ending inventory"""
    result = await data_ingestion_service.get_ending_inventory_async("test_store", "202401")
    
    assert isinstance(result, InventoryData)
    assert result.food == Decimal('12000')
    assert result.condiment == Decimal('1800')
    assert result.paper == Decimal('2500')
    assert result.non_product == Decimal('800')
    assert result.op_supplies == Decimal('500')


@pytest.mark.asyncio
async def test_get_purchases_async(data_ingestion_service):
    """Test getting purchases data"""
    result = await data_ingestion_service.get_purchases_async("test_store", "202401")
    
    assert isinstance(result, PurchaseData)
    assert result.food == Decimal('45000')
    assert result.condiment == Decimal('3000')
    assert result.paper == Decimal('2000')
    assert result.non_product == Decimal('1500')
    assert result.travel == Decimal('800')
    assert result.advertising_other == Decimal('1200')
    assert result.promotion == Decimal('1000')
    assert result.outside_services == Decimal('600')
    assert result.linen == Decimal('400')
    assert result.operating_supply == Decimal('300')
    assert result.maintenance_repair == Decimal('500')
    assert result.small_equipment == Decimal('200')
    assert result.utilities == Decimal('1200')
    assert result.office == Decimal('150')
    assert result.training == Decimal('300')
    assert result.crew_relations == Decimal('200')


@pytest.mark.asyncio
async def test_get_advertising_percent_async(data_ingestion_service):
    """Test getting advertising percentage"""
    result = await data_ingestion_service.get_advertising_percent_async("test_store", "202401")
    assert result == Decimal('2.0')


@pytest.mark.asyncio
async def test_get_input_data_integration(data_ingestion_service):
    """Test getting complete input data"""
    result = await data_ingestion_service.get_input_data("test_store", "202401")
    
    # Verify all fields are populated
    assert result.product_net_sales == Decimal('100000')
    assert result.cash_adjustments == Decimal('500')
    assert result.promotions == Decimal('2000')
    assert result.manager_meals == Decimal('300')
    assert result.crew_labor_percent == Decimal('25.5')
    assert result.total_labor_percent == Decimal('35.0')
    assert result.payroll_tax_rate == Decimal('8.5')
    assert result.complete_waste_percent == Decimal('2.5')
    assert result.raw_waste_percent == Decimal('1.8')
    assert result.condiment_percent == Decimal('3.2')
    assert result.advertising_percent == Decimal('2.0')
    
    # Verify inventory data
    assert isinstance(result.beginning_inventory, InventoryData)
    assert isinstance(result.ending_inventory, InventoryData)
    assert isinstance(result.purchases, PurchaseData)

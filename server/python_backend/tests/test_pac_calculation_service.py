"""
Tests for PAC Calculation Service
Includes tests for both standard PAC calculations and PAC actual calculations
"""
import pytest
from decimal import Decimal
from services.pac_calculation_service import (
    PacCalculationService,
    calculate_pac_actual,
    normalize_store_id
)
from services.data_ingestion_service import DataIngestionService
from services.account_mapping_service import AccountMappingService
from models import PacInputData, InventoryData, PurchaseData


class MockDataIngestionService(DataIngestionService):
    """Mock data ingestion service for testing"""
    
    async def get_input_data_async(self, entity_id: str, year_month: str) -> PacInputData:
        """Return test input data"""
        return PacInputData(
            # POS / Sales Data
            product_net_sales=Decimal('100000'),
            cash_adjustments=Decimal('500'),
            promotions=Decimal('2000'),
            manager_meals=Decimal('300'),
            
            # Labor / Payroll Data
            crew_labor_percent=Decimal('25.5'),
            total_labor_percent=Decimal('35.0'),
            payroll_tax_rate=Decimal('8.5'),
            
            # Waste / Operations Data
            complete_waste_percent=Decimal('2.5'),
            raw_waste_percent=Decimal('1.8'),
            condiment_percent=Decimal('3.2'),
            
            # Inventory Counts
            beginning_inventory=InventoryData(
                food=Decimal('15000'),
                condiment=Decimal('2000'),
                paper=Decimal('3000'),
                non_product=Decimal('1000'),
                op_supplies=Decimal('500')
            ),
            ending_inventory=InventoryData(
                food=Decimal('12000'),
                condiment=Decimal('1800'),
                paper=Decimal('2500'),
                non_product=Decimal('800'),
                op_supplies=Decimal('500')
            ),
            
            # Purchases / Invoices
            purchases=PurchaseData(
                food=Decimal('45000'),
                condiment=Decimal('3000'),
                paper=Decimal('2000'),
                non_product=Decimal('1500'),
                travel=Decimal('800'),
                advertising_other=Decimal('1200'),
                promotion=Decimal('1000'),
                outside_services=Decimal('600'),
                linen=Decimal('400'),
                operating_supply=Decimal('300'),
                maintenance_repair=Decimal('500'),
                small_equipment=Decimal('200'),
                utilities=Decimal('1200'),
                office=Decimal('150'),
                training=Decimal('300'),
                crew_relations=Decimal('200')
            ),
            
            # Settings / Budgets
            advertising_percent=Decimal('2.0')
        )


class MockAccountMappingService(AccountMappingService):
    """Mock account mapping service for testing"""
    
    def get_account_mapping(self) -> dict:
        """Return test account mapping"""
        return {
            "food": "food",
            "paper": "paper",
            "condiment": "condiment",
            "non_product": "non_product",
            "travel": "travel",
            "advertising_other": "advertising_other",
            "promotion": "promotion",
            "outside_services": "outside_services",
            "linen": "linen",
            "operating_supply": "operating_supply",
            "maintenance_repair": "maintenance_repair",
            "small_equipment": "small_equipment",
            "utilities": "utilities",
            "office": "office",
            "training": "training",
            "crew_relations": "crew_relations"
        }


@pytest.fixture
def pac_service():
    """Create PAC calculation service with mock dependencies"""
    mock_data_service = MockDataIngestionService()
    mock_account_service = MockAccountMappingService()
    return PacCalculationService(mock_data_service, mock_account_service)


@pytest.fixture
def test_input_data():
    """Create test input data"""
    return PacInputData(
        # POS / Sales Data
        product_net_sales=Decimal('100000'),
        cash_adjustments=Decimal('500'),
        promotions=Decimal('2000'),
        manager_meals=Decimal('300'),
        
        # Labor / Payroll Data
        crew_labor_percent=Decimal('25.5'),
        total_labor_percent=Decimal('35.0'),
        payroll_tax_rate=Decimal('8.5'),
        
        # Waste / Operations Data
        complete_waste_percent=Decimal('2.5'),
        raw_waste_percent=Decimal('1.8'),
        condiment_percent=Decimal('3.2'),
        
        # Inventory Counts
        beginning_inventory=InventoryData(
            food=Decimal('15000'),
            condiment=Decimal('2000'),
            paper=Decimal('3000'),
            non_product=Decimal('1000'),
            op_supplies=Decimal('500')
        ),
        ending_inventory=InventoryData(
            food=Decimal('12000'),
            condiment=Decimal('1800'),
            paper=Decimal('2500'),
            non_product=Decimal('800'),
            op_supplies=Decimal('500')
        ),
        
        # Purchases / Invoices
        purchases=PurchaseData(
            food=Decimal('45000'),
            condiment=Decimal('3000'),
            paper=Decimal('2000'),
            non_product=Decimal('1500'),
            travel=Decimal('800'),
            advertising_other=Decimal('1200'),
            promotion=Decimal('1000'),
            outside_services=Decimal('600'),
            linen=Decimal('400'),
            operating_supply=Decimal('300'),
            maintenance_repair=Decimal('500'),
            small_equipment=Decimal('200'),
            utilities=Decimal('1200'),
            office=Decimal('150'),
            training=Decimal('300'),
            crew_relations=Decimal('200')
        ),
        
        # Settings / Budgets
        advertising_percent=Decimal('2.0')
    )


@pytest.fixture
def sample_generate_input():
    """Sample generate_input data for PAC actual tests"""
    return {
        "sales": {
            "productNetSales": 100000,
            "allNetSales": 102800,
            "promo": 2000,
            "managerMeal": 300,
            "cash": 500,
            "advertising": 2.0,
            "duesAndSubscriptions": 150
        },
        "food": {
            "rawWaste": 1.8,
            "completeWaste": 2.5,
            "condiment": 3.2
        },
        "labor": {
            "crewLabor": 25.5,
            "totalLabor": 35.0,
            "payrollTax": 8.5,
            "additionalLaborDollars": 0
        },
        "inventoryStarting": {
            "food": 15000,
            "condiment": 2000,
            "paper": 3000
        },
        "inventoryEnding": {
            "food": 12000,
            "condiment": 1800,
            "paper": 2500
        }
    }


@pytest.fixture
def sample_invoice_log_totals():
    """Sample invoice_log_totals data for PAC actual tests"""
    return {
        "totals": {
            "FOOD": 45000,
            "PAPER": 2000,
            "CONDIMENT": 3000,
            "TRAVEL": 800,
            "ADV-OTHER": 1200,
            "PROMOTION": 0,
            "ADVERTISING": 0,
            "OUTSIDE SVC": 600,
            "LINEN": 400,
            "OP. SUPPLY": 300,
            "M+R": 500,
            "SML EQUIP": 200,
            "UTILITIES": 1200,
            "OFFICE": 150,
            "CREW RELATIONS": 200,
            "TRAINING": 300
        }
    }


# ============================================================================
# Tests for PacCalculationService (Standard PAC Calculations)
# ============================================================================

@pytest.mark.asyncio
async def test_calculate_pac_async_with_valid_input_returns_correct_results(pac_service):
    """Test PAC calculation with valid input returns correct results"""
    # Arrange
    entity_id = "test_store"
    year_month = "202401"
    
    # Act
    result = await pac_service.calculate_pac_async(entity_id, year_month)
    
    # Assert
    assert result is not None
    assert result.product_net_sales == Decimal('100000')
    assert result.all_net_sales == Decimal('102800')  # 100000 + 500 + 2000 + 300
    assert result.total_controllable_dollars > 0, "Total controllable should be positive"
    # PAC can be negative if expenses exceed sales (which is the case with this test data)
    assert result.pac_percent is not None
    assert result.pac_dollars is not None


@pytest.mark.asyncio
async def test_get_input_data_async(pac_service):
    """Test getting input data"""
    # Arrange
    entity_id = "test_store"
    year_month = "202401"
    
    # Act
    result = await pac_service.get_input_data_async(entity_id, year_month)
    
    # Assert
    assert result is not None
    assert result.product_net_sales == Decimal('100000')
    assert result.cash_adjustments == Decimal('500')
    assert result.promotions == Decimal('2000')
    assert result.manager_meals == Decimal('300')


def test_calculate_amount_used_food_calculation_is_correct(pac_service, test_input_data):
    """Test amount used food calculation is correct"""
    # Act
    result = pac_service.calculate_amount_used(test_input_data)
    
    # Assert
    # Expected: 15000 + 45000 - 12000 - (0.30*2000 + 0.30*300 + 1.8%*100000 + 2.5%*100000)
    # = 15000 + 45000 - 12000 - (600 + 90 + 1800 + 2500) = 48000 - 4990 = 43010
    expected_food = Decimal('43010')
    assert abs(result.food - expected_food) < Decimal('0.01')


def test_calculate_amount_used_paper_calculation_is_correct(pac_service, test_input_data):
    """Test amount used paper calculation is correct"""
    # Act
    result = pac_service.calculate_amount_used(test_input_data)
    
    # Assert
    # Expected: 3000 + 2000 - 2500 = 2500
    expected_paper = Decimal('2500')
    assert abs(result.paper - expected_paper) < Decimal('0.01')


def test_calculate_amount_used_condiment_calculation_is_correct(pac_service, test_input_data):
    """Test amount used condiment calculation is correct"""
    # Act
    result = pac_service.calculate_amount_used(test_input_data)
    
    # Assert
    # Expected: 2000 + 3000 - 1800 = 3200
    expected_condiment = Decimal('3200')
    assert abs(result.condiment - expected_condiment) < Decimal('0.01')


def test_calculate_controllable_expenses_base_food_is_correct(pac_service, test_input_data):
    """Test controllable expenses base food calculation is correct"""
    # Arrange
    amount_used = pac_service.calculate_amount_used(test_input_data)
    S = test_input_data.product_net_sales
    
    # Act
    expenses = pac_service.calculate_controllable_expenses(test_input_data, amount_used, S)
    
    # Assert
    expected_dollars = Decimal('43010')
    expected_percent = Decimal('43.01')
    assert abs(expenses.base_food.dollars - expected_dollars) < Decimal('0.01')
    assert abs(expenses.base_food.percent - expected_percent) < Decimal('0.01')


def test_calculate_controllable_expenses_employee_meal_is_correct(pac_service, test_input_data):
    """Test employee meal calculation is correct"""
    # Arrange
    amount_used = pac_service.calculate_amount_used(test_input_data)
    S = test_input_data.product_net_sales
    
    # Act
    expenses = pac_service.calculate_controllable_expenses(test_input_data, amount_used, S)
    
    # Assert
    # Employee Meal = 0.30 * Manager Meals = 0.30 * 300 = 90
    expected_dollars = Decimal('90')
    expected_percent = Decimal('0.09')
    assert abs(expenses.employee_meal.dollars - expected_dollars) < Decimal('0.01')
    assert abs(expenses.employee_meal.percent - expected_percent) < Decimal('0.01')


def test_calculate_controllable_expenses_condiment_is_correct(pac_service, test_input_data):
    """Test condiment calculation is correct"""
    # Arrange
    amount_used = pac_service.calculate_amount_used(test_input_data)
    S = test_input_data.product_net_sales
    
    # Act
    expenses = pac_service.calculate_controllable_expenses(test_input_data, amount_used, S)
    
    # Assert
    # Condiment = S * Condiment% = 100000 * 3.2% = 3200
    expected_dollars = Decimal('3200')
    expected_percent = Decimal('3.2')
    assert abs(expenses.condiment.dollars - expected_dollars) < Decimal('0.01')
    assert abs(expenses.condiment.percent - expected_percent) < Decimal('0.01')


def test_calculate_controllable_expenses_total_waste_is_correct(pac_service, test_input_data):
    """Test total waste calculation is correct"""
    # Arrange
    amount_used = pac_service.calculate_amount_used(test_input_data)
    S = test_input_data.product_net_sales
    
    # Act
    expenses = pac_service.calculate_controllable_expenses(test_input_data, amount_used, S)
    
    # Assert
    # Total Waste = S * (CompleteWaste% + RawWaste%) = 100000 * (2.5% + 1.8%) = 4300
    expected_dollars = Decimal('4300')
    expected_percent = Decimal('4.3')
    assert abs(expenses.total_waste.dollars - expected_dollars) < Decimal('0.01')
    assert abs(expenses.total_waste.percent - expected_percent) < Decimal('0.01')


def test_calculate_controllable_expenses_crew_labor_is_correct(pac_service, test_input_data):
    """Test crew labor calculation is correct"""
    # Arrange
    amount_used = pac_service.calculate_amount_used(test_input_data)
    S = test_input_data.product_net_sales
    
    # Act
    expenses = pac_service.calculate_controllable_expenses(test_input_data, amount_used, S)
    
    # Assert
    # Crew Labor = S * CrewLabor% = 100000 * 25.5% = 25500
    expected_dollars = Decimal('25500')
    expected_percent = Decimal('25.5')
    assert abs(expenses.crew_labor.dollars - expected_dollars) < Decimal('0.01')
    assert abs(expenses.crew_labor.percent - expected_percent) < Decimal('0.01')


def test_calculate_controllable_expenses_management_labor_is_correct(pac_service, test_input_data):
    """Test management labor calculation is correct"""
    # Arrange
    amount_used = pac_service.calculate_amount_used(test_input_data)
    S = test_input_data.product_net_sales
    
    # Act
    expenses = pac_service.calculate_controllable_expenses(test_input_data, amount_used, S)
    
    # Assert
    # Management Labor = S * (TotalLabor% - CrewLabor%) = 100000 * (35.0% - 25.5%) = 9500
    expected_dollars = Decimal('9500')
    expected_percent = Decimal('9.5')
    assert abs(expenses.management_labor.dollars - expected_dollars) < Decimal('0.01')
    assert abs(expenses.management_labor.percent - expected_percent) < Decimal('0.01')


def test_calculate_controllable_expenses_payroll_tax_is_correct(pac_service, test_input_data):
    """Test payroll tax calculation is correct"""
    # Arrange
    amount_used = pac_service.calculate_amount_used(test_input_data)
    S = test_input_data.product_net_sales
    
    # Act
    expenses = pac_service.calculate_controllable_expenses(test_input_data, amount_used, S)
    
    # Assert
    # Payroll Tax = S * (PayrollTaxRate% * TotalLabor%) = 100000 * (8.5% * 35.0%) = 2975
    expected_dollars = Decimal('2975')
    expected_percent = Decimal('2.975')
    assert abs(expenses.payroll_tax.dollars - expected_dollars) < Decimal('0.01')
    assert abs(expenses.payroll_tax.percent - expected_percent) < Decimal('0.01')


def test_calculate_controllable_expenses_advertising_is_correct(pac_service, test_input_data):
    """Test advertising calculation is correct"""
    # Arrange
    amount_used = pac_service.calculate_amount_used(test_input_data)
    S = test_input_data.product_net_sales
    
    # Act
    expenses = pac_service.calculate_controllable_expenses(test_input_data, amount_used, S)
    
    # Assert
    # Advertising = All Net Sales * Advertising% = 102800 * 2.0% = 2056
    all_net_sales = test_input_data.product_net_sales + test_input_data.cash_adjustments + test_input_data.promotions + test_input_data.manager_meals
    expected_dollars = all_net_sales * (test_input_data.advertising_percent / 100)
    expected_percent = (expected_dollars / S) * 100
    assert abs(expenses.advertising.dollars - expected_dollars) < Decimal('0.01')
    assert abs(expenses.advertising.percent - expected_percent) < Decimal('0.01')


def test_calculate_controllable_expenses_promotion_is_correct(pac_service, test_input_data):
    """Test promotion calculation is correct"""
    # Arrange
    amount_used = pac_service.calculate_amount_used(test_input_data)
    S = test_input_data.product_net_sales
    
    # Act
    expenses = pac_service.calculate_controllable_expenses(test_input_data, amount_used, S)
    
    # Assert
    # Promotion = 0.30 * Promotions = 0.30 * 2000 = 600
    expected_dollars = Decimal('600')
    expected_percent = Decimal('0.6')
    assert abs(expenses.promotion.dollars - expected_dollars) < Decimal('0.01')
    assert abs(expenses.promotion.percent - expected_percent) < Decimal('0.01')


def test_calculate_controllable_expenses_cash_adjustments_is_correct(pac_service, test_input_data):
    """Test cash adjustments calculation is correct"""
    # Arrange
    amount_used = pac_service.calculate_amount_used(test_input_data)
    S = test_input_data.product_net_sales
    
    # Act
    expenses = pac_service.calculate_controllable_expenses(test_input_data, amount_used, S)
    
    # Assert
    # Cash +/- = CashAdjustments = 500 (treated as positive expense)
    expected_dollars = Decimal('500')
    expected_percent = Decimal('0.5')
    assert abs(expenses.cash_adjustments.dollars - expected_dollars) < Decimal('0.01')
    assert abs(expenses.cash_adjustments.percent - expected_percent) < Decimal('0.01')


def test_calculate_total_controllable_dollars(pac_service, test_input_data):
    """Test total controllable dollars calculation"""
    # Arrange
    amount_used = pac_service.calculate_amount_used(test_input_data)
    S = test_input_data.product_net_sales
    
    # Act
    expenses = pac_service.calculate_controllable_expenses(test_input_data, amount_used, S)
    total = pac_service.calculate_total_controllable_dollars(expenses)
    
    # Assert
    assert total > 0
    # Should be sum of all expense dollars
    expected_total = (
        expenses.base_food.dollars +
        expenses.employee_meal.dollars +
        expenses.condiment.dollars +
        expenses.total_waste.dollars +
        expenses.paper.dollars +
        expenses.crew_labor.dollars +
        expenses.management_labor.dollars +
        expenses.payroll_tax.dollars +
        expenses.additional_labor_dollars.dollars +
        expenses.travel.dollars +
        expenses.advertising.dollars +
        expenses.advertising_other.dollars +
        expenses.promotion.dollars +
        expenses.outside_services.dollars +
        expenses.linen.dollars +
        expenses.op_supply.dollars +
        expenses.maintenance_repair.dollars +
        expenses.small_equipment.dollars +
        expenses.utilities.dollars +
        expenses.office.dollars +
        expenses.cash_adjustments.dollars +
        expenses.crew_relations.dollars +
        expenses.training.dollars +
        expenses.dues_and_subscriptions.dollars +
        expenses.misc_cr_tr_ds.dollars
    )
    assert abs(total - expected_total) < Decimal('0.01')


def test_calculate_pac_totals(pac_service, test_input_data):
    """Test PAC totals calculation"""
    # Arrange
    amount_used = pac_service.calculate_amount_used(test_input_data)
    S = test_input_data.product_net_sales
    
    # Act
    expenses = pac_service.calculate_controllable_expenses(test_input_data, amount_used, S)
    totals = pac_service.calculate_pac_totals(expenses, S)
    
    # Assert
    assert totals["total_controllable_dollars"] > 0
    assert totals["total_controllable_percent"] > 0
    # PAC can be negative if expenses exceed sales (which is the case with this test data)
    assert totals["pac_percent"] is not None
    assert totals["pac_dollars"] is not None
    
    # Verify the relationship: P.A.C. % = 100 - Total Controllable %
    expected_pac_percent = 100 - totals["total_controllable_percent"]
    assert abs(totals["pac_percent"] - expected_pac_percent) < Decimal('0.01')
    
    # Verify the relationship: P.A.C. dollars = Product Sales - Total Controllable Dollars
    expected_pac_dollars = S - totals["total_controllable_dollars"]
    assert abs(totals["pac_dollars"] - expected_pac_dollars) < Decimal('0.01')


# ============================================================================
# Tests for PAC Actual Calculation Functions
# ============================================================================

def test_normalize_store_id_with_numeric_suffix():
    """Test normalize_store_id with numeric suffix"""
    assert normalize_store_id("store_1") == "store_001"
    assert normalize_store_id("store_12") == "store_012"
    assert normalize_store_id("store_123") == "store_123"
    assert normalize_store_id("1") == "store_001"
    assert normalize_store_id("12") == "store_012"
    assert normalize_store_id("123") == "store_123"


def test_normalize_store_id_with_existing_format():
    """Test normalize_store_id with already normalized format"""
    assert normalize_store_id("store_001") == "store_001"
    assert normalize_store_id("store_012") == "store_012"
    assert normalize_store_id("store_123") == "store_123"


def test_normalize_store_id_with_empty_or_none():
    """Test normalize_store_id with empty or None values"""
    assert normalize_store_id("") == ""
    assert normalize_store_id(None) == None


def test_normalize_store_id_with_non_numeric():
    """Test normalize_store_id with non-numeric strings"""
    assert normalize_store_id("test_store") == "test_store"
    assert normalize_store_id("STORE_001") == "store_001"


def test_calculate_pac_actual_returns_correct_structure(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual returns correct structure"""
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    assert result is not None
    assert "sales" in result
    assert "foodAndPaper" in result
    assert "labor" in result
    assert "purchases" in result
    assert "totals" in result
    
    # Check sales structure
    assert "productSales" in result["sales"]
    assert "allNetSales" in result["sales"]
    assert "dollars" in result["sales"]["productSales"]
    assert "percent" in result["sales"]["productSales"]


def test_calculate_pac_actual_product_sales_is_correct(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual product sales calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    assert result["sales"]["productSales"]["dollars"] == 100000.0
    assert result["sales"]["productSales"]["percent"] == 100.0


def test_calculate_pac_actual_base_food_calculation(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual base food calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    # Base Food = Beginning Inventory + Purchases - Ending Inventory - RTI - Other Food Components
    # RTI = (3.2% * 100000) + 1800 - 2000 - 3000 = 3200 + 1800 - 2000 - 3000 = 0
    # Other Food Components = (0.3 * 2000) + (0.3 * 300) + (1.8% * 100000) + (2.5% * 100000)
    #   = 600 + 90 + 1800 + 2500 = 4990
    # Base Food = 15000 + 45000 - 12000 - 0 - 4990 = 43010
    expected_base_food = 43010.0
    assert abs(result["foodAndPaper"]["baseFood"]["dollars"] - expected_base_food) < 0.01


def test_calculate_pac_actual_employee_meal_calculation(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual employee meal calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    # Employee Meal = 0.30 * Manager Meals = 0.30 * 300 = 90
    expected_employee_meal = 90.0
    assert abs(result["foodAndPaper"]["employeeMeal"]["dollars"] - expected_employee_meal) < 0.01


def test_calculate_pac_actual_condiment_calculation(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual condiment calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    # Condiment = (Condiment% / 100) * Product Sales = (3.2 / 100) * 100000 = 3200
    expected_condiment = 3200.0
    assert abs(result["foodAndPaper"]["condiment"]["dollars"] - expected_condiment) < 0.01


def test_calculate_pac_actual_total_waste_calculation(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual total waste calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    # Total Waste = (CompleteWaste% / 100) * Product Sales + (RawWaste% / 100) * Product Sales
    #   = (2.5 / 100) * 100000 + (1.8 / 100) * 100000 = 2500 + 1800 = 4300
    expected_total_waste = 4300.0
    assert abs(result["foodAndPaper"]["totalWaste"]["dollars"] - expected_total_waste) < 0.01


def test_calculate_pac_actual_paper_calculation(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual paper calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    # Paper = Beginning Inventory + Purchases - Ending Inventory
    #   = 3000 + 2000 - 2500 = 2500
    expected_paper = 2500.0
    assert abs(result["foodAndPaper"]["paper"]["dollars"] - expected_paper) < 0.01


def test_calculate_pac_actual_crew_labor_calculation(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual crew labor calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    # Crew Labor = (CrewLabor% / 100) * Product Sales = (25.5 / 100) * 100000 = 25500
    expected_crew_labor = 25500.0
    assert abs(result["labor"]["crewLabor"]["dollars"] - expected_crew_labor) < 0.01


def test_calculate_pac_actual_management_labor_calculation(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual management labor calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    # Management Labor = ((TotalLabor% - CrewLabor%) / 100) * Product Sales
    #   = ((35.0 - 25.5) / 100) * 100000 = 9500
    expected_management_labor = 9500.0
    assert abs(result["labor"]["managementLabor"]["dollars"] - expected_management_labor) < 0.01


def test_calculate_pac_actual_payroll_tax_calculation(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual payroll tax calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    # Payroll Tax = (Crew Labor + Management Labor) * (PayrollTax% / 100)
    #   = (25500 + 9500) * (8.5 / 100) = 35000 * 0.085 = 2975
    expected_payroll_tax = 2975.0
    assert abs(result["labor"]["payrollTax"]["dollars"] - expected_payroll_tax) < 0.01


def test_calculate_pac_actual_cash_plus_minus_sign_flip(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual cash plus/minus sign flip"""
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    # Cash Plus/Minus = -(Cash) = -(500) = -500
    expected_cash = -500.0
    assert abs(result["purchases"]["cashPlusMinus"]["dollars"] - expected_cash) < 0.01


def test_calculate_pac_actual_promotion_combines_sources(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual promotion combines generate input and invoices"""
    # Arrange - add promotion to invoice totals
    sample_invoice_log_totals["totals"]["PROMOTION"] = 500
    
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    # Promotion = (0.30 * Promo from generate input) + Promotion from invoices
    #   = (0.30 * 2000) + 500 = 600 + 500 = 1100
    expected_promotion = 1100.0
    assert abs(result["purchases"]["promotion"]["dollars"] - expected_promotion) < 0.01


def test_calculate_pac_actual_advertising_combines_sources(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual advertising combines generate input and invoices"""
    # Arrange - add advertising to invoice totals
    sample_invoice_log_totals["totals"]["ADVERTISING"] = 300
    
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    # Advertising = (Advertising% / 100) * All Net Sales + Advertising from invoices
    #   = (2.0 / 100) * 102800 + 300 = 2056 + 300 = 2356
    expected_advertising = 2356.0
    assert abs(result["purchases"]["advertising"]["dollars"] - expected_advertising) < 0.01


def test_calculate_pac_actual_totals_calculation(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual totals calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    assert "totalControllable" in result["totals"]
    assert "pac" in result["totals"]
    assert "dollars" in result["totals"]["totalControllable"]
    assert "percent" in result["totals"]["totalControllable"]
    assert "dollars" in result["totals"]["pac"]
    assert "percent" in result["totals"]["pac"]
    
    # PAC should be Product Sales - Total Controllable
    product_sales = result["sales"]["productSales"]["dollars"]
    total_controllable = result["totals"]["totalControllable"]["dollars"]
    pac_dollars = result["totals"]["pac"]["dollars"]
    
    assert abs(pac_dollars - (product_sales - total_controllable)) < 0.01
    assert result["totals"]["pac"]["percent"] == 100 - result["totals"]["totalControllable"]["percent"]


def test_calculate_pac_actual_with_missing_data():
    """Test calculate_pac_actual handles missing data gracefully"""
    # Arrange - minimal data
    generate_input = {
        "sales": {"productNetSales": 100000, "allNetSales": 100000},
        "food": {},
        "labor": {},
        "inventoryStarting": {},
        "inventoryEnding": {}
    }
    invoice_log_totals = {"totals": {}}
    
    # Act
    result = calculate_pac_actual(generate_input, invoice_log_totals)
    
    # Assert
    assert result is not None
    assert result["sales"]["productSales"]["dollars"] == 100000.0
    # Should handle missing data without errors
    assert "foodAndPaper" in result
    assert "labor" in result
    assert "purchases" in result


# ============================================================================
# Tests for New PAC Actual Features (Gross Profit, Food Cost, Non-Product & Supplies)
# ============================================================================

@pytest.fixture
def sample_generate_input_with_food_cost():
    """Sample generate_input data with food cost module fields for PAC actual tests"""
    return {
        "sales": {
            "productNetSales": 100000,
            "allNetSales": 102800,
            "promo": 2000,
            "managerMeal": 300,
            "cash": 500,
            "advertising": 2.0,
            "duesAndSubscriptions": 150
        },
        "food": {
            "rawWaste": 1.8,
            "completeWaste": 2.5,
            "condiment": 3.2,
            "baseFood": 28.5,
            "discounts": 0.5,
            "variance": 0.3,
            "unexplained": -0.2,
            "empMgrMealsPercent": 0.15
        },
        "labor": {
            "crewLabor": 25.5,
            "totalLabor": 35.0,
            "payrollTax": 8.5,
            "additionalLaborDollars": 0
        },
        "inventoryStarting": {
            "food": 15000,
            "condiment": 2000,
            "paper": 3000,
            "opsSupplies": 500,
            "nonProduct": 1000
        },
        "inventoryEnding": {
            "food": 12000,
            "condiment": 1800,
            "paper": 2500,
            "opsSupplies": 400,
            "nonProduct": 800
        }
    }


@pytest.fixture
def sample_invoice_log_totals_with_non_product():
    """Sample invoice_log_totals data with non-product for PAC actual tests"""
    return {
        "totals": {
            "FOOD": 45000,
            "PAPER": 2000,
            "CONDIMENT": 3000,
            "TRAVEL": 800,
            "ADV-OTHER": 1200,
            "PROMOTION": 0,
            "ADVERTISING": 0,
            "OUTSIDE SVC": 600,
            "LINEN": 400,
            "OP. SUPPLY": 300,
            "M+R": 500,
            "SML EQUIP": 200,
            "UTILITIES": 1200,
            "OFFICE": 150,
            "CREW RELATIONS": 200,
            "TRAINING": 300,
            "NONPRODUCT": 500
        }
    }


def test_calculate_pac_actual_gross_profit_calculation(sample_generate_input, sample_invoice_log_totals):
    """Test calculate_pac_actual gross profit calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input, sample_invoice_log_totals)
    
    # Assert
    # Gross Profit % = 100 - Food & Paper Total %
    assert "grossProfit" in result["totals"]
    assert "percent" in result["totals"]["grossProfit"]
    
    # Calculate expected food & paper total %
    food_and_paper_total = result["foodAndPaper"]["total"]["dollars"]
    product_sales = result["sales"]["productSales"]["dollars"]
    food_and_paper_percent = (food_and_paper_total / product_sales * 100) if product_sales > 0 else 0
    expected_gross_profit = 100 - food_and_paper_percent
    
    assert abs(result["totals"]["grossProfit"]["percent"] - expected_gross_profit) < 0.01


def test_calculate_pac_actual_gross_profit_with_zero_sales():
    """Test calculate_pac_actual gross profit handles zero sales gracefully"""
    # Arrange - zero sales
    generate_input = {
        "sales": {"productNetSales": 0, "allNetSales": 0},
        "food": {},
        "labor": {},
        "inventoryStarting": {},
        "inventoryEnding": {}
    }
    invoice_log_totals = {"totals": {}}
    
    # Act
    result = calculate_pac_actual(generate_input, invoice_log_totals)
    
    # Assert - should handle zero sales without errors
    assert "grossProfit" in result["totals"]
    assert result["totals"]["grossProfit"]["percent"] == 100  # 100 - 0%


def test_calculate_pac_actual_food_cost_module(sample_generate_input_with_food_cost, sample_invoice_log_totals):
    """Test calculate_pac_actual food cost module fields"""
    # Act
    result = calculate_pac_actual(sample_generate_input_with_food_cost, sample_invoice_log_totals)
    
    # Assert
    assert "foodCost" in result
    food_cost = result["foodCost"]
    
    # Verify all food cost fields are present
    assert "baseFood" in food_cost
    assert "discount" in food_cost
    assert "rawWaste" in food_cost
    assert "completeWaste" in food_cost
    assert "statVariance" in food_cost
    assert "foodOverBase" in food_cost
    assert "empMgrMealsPercent" in food_cost
    
    # Verify values match input
    assert food_cost["baseFood"] == 28.5
    assert food_cost["discount"] == 0.5
    assert food_cost["rawWaste"] == 1.8
    assert food_cost["completeWaste"] == 2.5
    assert food_cost["statVariance"] == 0.3
    assert food_cost["empMgrMealsPercent"] == 0.15


def test_calculate_pac_actual_food_over_base_calculation(sample_generate_input_with_food_cost, sample_invoice_log_totals):
    """Test calculate_pac_actual food over base calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input_with_food_cost, sample_invoice_log_totals)
    
    # Assert
    # Food Over Base = Raw Waste + Complete Waste + Condiment + Stat Variance + Unexplained
    # = 1.8 + 2.5 + 3.2 + 0.3 + (-0.2) = 7.6
    expected_food_over_base = 1.8 + 2.5 + 3.2 + 0.3 + (-0.2)
    assert abs(result["foodCost"]["foodOverBase"] - expected_food_over_base) < 0.01


def test_calculate_pac_actual_food_cost_with_missing_fields():
    """Test calculate_pac_actual food cost handles missing fields gracefully"""
    # Arrange - minimal data with no food cost fields
    generate_input = {
        "sales": {"productNetSales": 100000, "allNetSales": 100000},
        "food": {"rawWaste": 1.0, "completeWaste": 2.0},  # partial data
        "labor": {},
        "inventoryStarting": {},
        "inventoryEnding": {}
    }
    invoice_log_totals = {"totals": {}}
    
    # Act
    result = calculate_pac_actual(generate_input, invoice_log_totals)
    
    # Assert - should have food cost section with defaults
    assert "foodCost" in result
    assert result["foodCost"]["baseFood"] == 0  # default
    assert result["foodCost"]["rawWaste"] == 1.0
    assert result["foodCost"]["completeWaste"] == 2.0


def test_calculate_pac_actual_non_product_and_supplies(sample_generate_input_with_food_cost, sample_invoice_log_totals_with_non_product):
    """Test calculate_pac_actual non-product and supplies calculations"""
    # Act
    result = calculate_pac_actual(sample_generate_input_with_food_cost, sample_invoice_log_totals_with_non_product)
    
    # Assert
    assert "nonProductAndSupplies" in result
    non_product_supplies = result["nonProductAndSupplies"]
    
    # Verify operating supplies structure
    assert "operatingSupplies" in non_product_supplies
    ops = non_product_supplies["operatingSupplies"]
    assert "starting" in ops
    assert "purchases" in ops
    assert "ending" in ops
    assert "usage" in ops
    
    # Verify non-product structure
    assert "nonProduct" in non_product_supplies
    np = non_product_supplies["nonProduct"]
    assert "starting" in np
    assert "purchases" in np
    assert "ending" in np
    assert "usage" in np


def test_calculate_pac_actual_operating_supplies_usage_calculation(sample_generate_input_with_food_cost, sample_invoice_log_totals_with_non_product):
    """Test calculate_pac_actual operating supplies usage calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input_with_food_cost, sample_invoice_log_totals_with_non_product)
    
    # Assert
    ops = result["nonProductAndSupplies"]["operatingSupplies"]
    
    # Operating Supplies Usage = Starting + Purchases - Ending
    # = 500 + 300 - 400 = 400
    expected_usage = 500 + 300 - 400
    
    assert ops["starting"] == 500
    assert ops["purchases"] == 300
    assert ops["ending"] == 400
    assert ops["usage"] == expected_usage


def test_calculate_pac_actual_non_product_usage_calculation(sample_generate_input_with_food_cost, sample_invoice_log_totals_with_non_product):
    """Test calculate_pac_actual non-product usage calculation"""
    # Act
    result = calculate_pac_actual(sample_generate_input_with_food_cost, sample_invoice_log_totals_with_non_product)
    
    # Assert
    np = result["nonProductAndSupplies"]["nonProduct"]
    
    # Non-Product Usage = Starting + Purchases - Ending
    # = 1000 + 500 - 800 = 700
    expected_usage = 1000 + 500 - 800
    
    assert np["starting"] == 1000
    assert np["purchases"] == 500
    assert np["ending"] == 800
    assert np["usage"] == expected_usage


def test_calculate_pac_actual_non_product_supplies_with_missing_data():
    """Test calculate_pac_actual non-product and supplies handles missing data"""
    # Arrange - no inventory or non-product data
    generate_input = {
        "sales": {"productNetSales": 100000, "allNetSales": 100000},
        "food": {},
        "labor": {},
        "inventoryStarting": {},
        "inventoryEnding": {}
    }
    invoice_log_totals = {"totals": {}}
    
    # Act
    result = calculate_pac_actual(generate_input, invoice_log_totals)
    
    # Assert - should have section with zeros
    assert "nonProductAndSupplies" in result
    assert result["nonProductAndSupplies"]["operatingSupplies"]["usage"] == 0
    assert result["nonProductAndSupplies"]["nonProduct"]["usage"] == 0


# ============================================================================
# Tests for PacCalculationService New Result Fields
# ============================================================================

def test_calculate_amount_used_op_supplies_includes_purchases(pac_service, test_input_data):
    """Test amount used op supplies calculation includes purchases"""
    # Act
    result = pac_service.calculate_amount_used(test_input_data)
    
    # Assert
    # Op Supplies = Beginning Inventory + Purchases - Ending Inventory
    # = 500 + 300 - 500 = 300
    expected_op_supplies = Decimal('300')
    assert abs(result.op_supplies - expected_op_supplies) < Decimal('0.01')


def test_calculate_amount_used_non_product_calculation(pac_service, test_input_data):
    """Test amount used non-product calculation"""
    # Act
    result = pac_service.calculate_amount_used(test_input_data)
    
    # Assert
    # Non-Product = Beginning Inventory + Purchases - Ending Inventory
    # = 1000 + 1500 - 800 = 1700
    expected_non_product = Decimal('1700')
    assert abs(result.non_product - expected_non_product) < Decimal('0.01')


@pytest.mark.asyncio
async def test_pac_result_includes_non_product_and_supplies_data(pac_service):
    """Test PAC calculation result includes non_product_and_supplies data"""
    # Arrange
    entity_id = "test_store"
    year_month = "202401"
    
    # Act
    result = await pac_service.calculate_pac_async(entity_id, year_month)
    
    # Assert
    assert result.non_product_and_supplies is not None
    
    # Check operating supplies breakdown
    ops = result.non_product_and_supplies.operatingSupplies
    assert ops.starting == Decimal('500')
    assert ops.purchases == Decimal('300')
    assert ops.ending == Decimal('500')
    assert ops.usage == Decimal('300')  # 500 + 300 - 500
    
    # Check non-product breakdown
    np = result.non_product_and_supplies.nonProduct
    assert np.starting == Decimal('1000')
    assert np.purchases == Decimal('1500')
    assert np.ending == Decimal('800')
    assert np.usage == Decimal('1700')  # 1000 + 1500 - 800


@pytest.mark.asyncio
async def test_pac_result_includes_sales_comparison_data(pac_service):
    """Test PAC calculation result includes sales_comparison data"""
    # Arrange
    entity_id = "test_store"
    year_month = "202401"
    
    # Act
    result = await pac_service.calculate_pac_async(entity_id, year_month)
    
    # Assert
    assert result.sales_comparison is not None
    
    # Check sales comparison fields exist (default to 0 in mock data)
    assert result.sales_comparison.lastYearProductSales == Decimal('0')
    assert result.sales_comparison.lastMonthProductSales == Decimal('0')
    assert result.sales_comparison.lastMonthLastYearProductSales == Decimal('0')
    assert result.sales_comparison.lastYearLastYearProductSales == Decimal('0')


@pytest.fixture
def test_input_data_with_sales_comparison():
    """Create test input data with sales comparison fields"""
    return PacInputData(
        # POS / Sales Data
        product_net_sales=Decimal('100000'),
        cash_adjustments=Decimal('500'),
        promotions=Decimal('2000'),
        manager_meals=Decimal('300'),
        
        # Historical Sales Data
        last_year_product_sales=Decimal('95000'),
        last_month_product_sales=Decimal('98000'),
        last_month_last_year_product_sales=Decimal('92000'),
        last_year_last_year_product_sales=Decimal('90000'),
        
        # Labor / Payroll Data
        crew_labor_percent=Decimal('25.5'),
        total_labor_percent=Decimal('35.0'),
        payroll_tax_rate=Decimal('8.5'),
        
        # Waste / Operations Data
        complete_waste_percent=Decimal('2.5'),
        raw_waste_percent=Decimal('1.8'),
        condiment_percent=Decimal('3.2'),
        
        # Inventory Counts
        beginning_inventory=InventoryData(
            food=Decimal('15000'),
            condiment=Decimal('2000'),
            paper=Decimal('3000'),
            non_product=Decimal('1000'),
            op_supplies=Decimal('500')
        ),
        ending_inventory=InventoryData(
            food=Decimal('12000'),
            condiment=Decimal('1800'),
            paper=Decimal('2500'),
            non_product=Decimal('800'),
            op_supplies=Decimal('500')
        ),
        
        # Purchases / Invoices
        purchases=PurchaseData(
            food=Decimal('45000'),
            condiment=Decimal('3000'),
            paper=Decimal('2000'),
            non_product=Decimal('1500'),
            travel=Decimal('800'),
            advertising_other=Decimal('1200'),
            promotion=Decimal('1000'),
            outside_services=Decimal('600'),
            linen=Decimal('400'),
            operating_supply=Decimal('300'),
            maintenance_repair=Decimal('500'),
            small_equipment=Decimal('200'),
            utilities=Decimal('1200'),
            office=Decimal('150'),
            training=Decimal('300'),
            crew_relations=Decimal('200')
        ),
        
        # Settings / Budgets
        advertising_percent=Decimal('2.0')
    )


def test_pac_result_sales_comparison_populated(pac_service, test_input_data_with_sales_comparison):
    """Test PAC calculation properly populates sales comparison from input data"""
    # Act
    result = pac_service.calculate_pac_from_input(test_input_data_with_sales_comparison)
    
    # Assert
    assert result.sales_comparison is not None
    assert result.sales_comparison.lastYearProductSales == Decimal('95000')
    assert result.sales_comparison.lastMonthProductSales == Decimal('98000')
    assert result.sales_comparison.lastMonthLastYearProductSales == Decimal('92000')
    assert result.sales_comparison.lastYearLastYearProductSales == Decimal('90000')
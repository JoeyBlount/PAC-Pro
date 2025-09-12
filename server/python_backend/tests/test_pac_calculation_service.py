"""
Tests for PAC Calculation Service
"""
import pytest
from decimal import Decimal
from services.pac_calculation_service import PacCalculationService
from services.data_ingestion_service import DataIngestionService
from services.account_mapping_service import AccountMappingService
from models import PacInputData, InventoryData, PurchaseData


class MockDataIngestionService(DataIngestionService):
    """Mock data ingestion service for testing"""
    
    async def get_input_data(self, entity_id: str, year_month: str):
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
    
    def get_account_mapping(self):
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
    assert result.pac_percent > 0, "P.A.C. should be positive"
    assert result.total_controllable_dollars > 0, "Total controllable should be positive"


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
    # Cash +/- = -(CashAdjustments) = -(500) = -500
    expected_dollars = Decimal('-500')
    expected_percent = Decimal('-0.5')
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
    assert totals["pac_percent"] > 0
    assert totals["pac_dollars"] > 0
    
    # P.A.C. should be positive for this test data
    assert totals["pac_percent"] > 0, "P.A.C. should be positive"
    assert totals["pac_dollars"] > 0, "P.A.C. dollars should be positive"
    
    # Verify the relationship: P.A.C. % = 100 - Total Controllable %
    expected_pac_percent = 100 - totals["total_controllable_percent"]
    assert abs(totals["pac_percent"] - expected_pac_percent) < Decimal('0.01')

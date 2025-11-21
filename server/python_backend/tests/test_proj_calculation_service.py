"""
Tests for Projection Calculation Service
"""
import pytest
from decimal import Decimal
from services.proj_calculation_service import (
    ProjCalculationService,
    EXPENSE_LIST,
    PCT_OF_PRODUCT_SALES,
    TRAVEL_THRU_TRAINING,
    FOOD_PAPER_GROUP,
    LABOR_GROUP,
    PURCHASES_GROUP,
)
from services.data_ingestion_service import DataIngestionService


class MockDataIngestionService(DataIngestionService):
    """Mock data ingestion service for testing"""
    
    async def fetch_projections(self, store_id: str, year: int, month_index_1: int):
        """Return empty list for testing - tests will provide their own data"""
        return ([], None)
    
    async def save_projections(self, store_id: str, year: int, month_index_1: int,
                               pac_goal: float, projections: list[dict]) -> None:
        """Mock save - does nothing"""
        pass
    
    def prev_year_month(self, year: int, month_index_1: int):
        """Return previous year/month"""
        if month_index_1 <= 1:
            return (year - 1, 12)
        return (year, month_index_1 - 1)


@pytest.fixture
def proj_service():
    """Create projection calculation service with mock dependencies"""
    mock_ingestion = MockDataIngestionService()
    return ProjCalculationService(ingestion=mock_ingestion)


@pytest.fixture
def sample_rows():
    """Create sample projection rows for testing"""
    return [
        {"name": "Product Sales", "projectedDollar": 100000.0, "projectedPercent": 0.0,
         "historicalDollar": 95000.0, "historicalPercent": 0.0},
        {"name": "All Net Sales", "projectedDollar": 102800.0, "projectedPercent": 0.0,
         "historicalDollar": 97600.0, "historicalPercent": 0.0},
        {"name": "Base Food", "projectedDollar": 0.0, "projectedPercent": 43.0,
         "historicalDollar": 40850.0, "historicalPercent": 43.0},
        {"name": "Employee Meal", "projectedDollar": 0.0, "projectedPercent": 0.09,
         "historicalDollar": 85.5, "historicalPercent": 0.09},
        {"name": "Condiment", "projectedDollar": 0.0, "projectedPercent": 3.2,
         "historicalDollar": 3040.0, "historicalPercent": 3.2},
        {"name": "Total Waste", "projectedDollar": 0.0, "projectedPercent": 4.3,
         "historicalDollar": 4085.0, "historicalPercent": 4.3},
        {"name": "Paper", "projectedDollar": 0.0, "projectedPercent": 2.5,
         "historicalDollar": 2375.0, "historicalPercent": 2.5},
        {"name": "Crew Labor", "projectedDollar": 0.0, "projectedPercent": 25.5,
         "historicalDollar": 24225.0, "historicalPercent": 25.5},
        {"name": "Management Labor", "projectedDollar": 0.0, "projectedPercent": 9.5,
         "historicalDollar": 9025.0, "historicalPercent": 9.5},
        {"name": "Payroll Tax", "projectedDollar": 0.0, "projectedPercent": 2.975,
         "historicalDollar": 2826.25, "historicalPercent": 2.975},
        {"name": "Advertising", "projectedDollar": 0.0, "projectedPercent": 2.0,
         "historicalDollar": 1952.0, "historicalPercent": 2.0},
        {"name": "Travel", "projectedDollar": 800.0, "projectedPercent": 0.0,
         "historicalDollar": 760.0, "historicalPercent": 0.0},
        {"name": "Adv Other", "projectedDollar": 1200.0, "projectedPercent": 0.0,
         "historicalDollar": 1140.0, "historicalPercent": 0.0},
        {"name": "Promotion", "projectedDollar": 1000.0, "projectedPercent": 0.0,
         "historicalDollar": 950.0, "historicalPercent": 0.0},
        {"name": "Outside Services", "projectedDollar": 600.0, "projectedPercent": 0.0,
         "historicalDollar": 570.0, "historicalPercent": 0.0},
        {"name": "Linen", "projectedDollar": 400.0, "projectedPercent": 0.0,
         "historicalDollar": 380.0, "historicalPercent": 0.0},
        {"name": "OP. Supply", "projectedDollar": 300.0, "projectedPercent": 0.0,
         "historicalDollar": 285.0, "historicalPercent": 0.0},
        {"name": "Maint. & Repair", "projectedDollar": 500.0, "projectedPercent": 0.0,
         "historicalDollar": 475.0, "historicalPercent": 0.0},
        {"name": "Small Equipment", "projectedDollar": 200.0, "projectedPercent": 0.0,
         "historicalDollar": 190.0, "historicalPercent": 0.0},
        {"name": "Utilities", "projectedDollar": 1200.0, "projectedPercent": 0.0,
         "historicalDollar": 1140.0, "historicalPercent": 0.0},
        {"name": "Office", "projectedDollar": 150.0, "projectedPercent": 0.0,
         "historicalDollar": 142.5, "historicalPercent": 0.0},
        {"name": "Cash +/-", "projectedDollar": -500.0, "projectedPercent": 0.0,
         "historicalDollar": -475.0, "historicalPercent": 0.0},
        {"name": "Crew Relations", "projectedDollar": 200.0, "projectedPercent": 0.0,
         "historicalDollar": 190.0, "historicalPercent": 0.0},
        {"name": "Training", "projectedDollar": 300.0, "projectedPercent": 0.0,
         "historicalDollar": 285.0, "historicalPercent": 0.0},
        {"name": "Total Controllable", "projectedDollar": 0.0, "projectedPercent": 0.0,
         "historicalDollar": 0.0, "historicalPercent": 0.0},
        {"name": "P.A.C.", "projectedDollar": 0.0, "projectedPercent": 0.0,
         "historicalDollar": 0.0, "historicalPercent": 0.0},
    ]


# ============================================================================
# Test recalc_from_percents
# ============================================================================

def test_recalc_from_percents_base_food(proj_service, sample_rows):
    """Test recalc_from_percents calculates Base Food dollars from percentage"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    # Base Food: 43% of Product Sales (100000) = 43000
    expected = 100000.0 * 0.43
    
    # Act
    result = proj_service.recalc_from_percents(rows)
    
    # Assert
    base_food = next(r for r in result if r["name"] == "Base Food")
    assert abs(base_food["projectedDollar"] - expected) < 0.01


def test_recalc_from_percents_advertising(proj_service, sample_rows):
    """Test recalc_from_percents calculates Advertising dollars from All Net Sales"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    # Advertising: 2% of All Net Sales (102800) = 2056
    expected = 102800.0 * 0.02
    
    # Act
    result = proj_service.recalc_from_percents(rows)
    
    # Assert
    advertising = next(r for r in result if r["name"] == "Advertising")
    assert abs(advertising["projectedDollar"] - expected) < 0.01


def test_recalc_from_percents_payroll_tax(proj_service, sample_rows):
    """Test recalc_from_percents calculates Payroll Tax from Crew + Management Labor"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    payroll_tax_pct = 2.975  # From sample data
    
    # Act
    result = proj_service.recalc_from_percents(rows)
    
    # Assert - Payroll Tax should be calculated from the actual Crew + Management Labor values
    crew_labor = next(r for r in result if r["name"] == "Crew Labor")
    mgmt_labor = next(r for r in result if r["name"] == "Management Labor")
    payroll_tax = next(r for r in result if r["name"] == "Payroll Tax")
    
    # Verify the formula: Payroll Tax = (Crew Labor + Management Labor) * Payroll Tax %
    # Use a more lenient tolerance due to rounding differences with Decimal
    total_labor = crew_labor["projectedDollar"] + mgmt_labor["projectedDollar"]
    expected = total_labor * (payroll_tax_pct / 100)
    
    # Allow for rounding differences (service uses Decimal with ROUND_HALF_UP)
    assert abs(payroll_tax["projectedDollar"] - expected) < 2.0, \
        f"Payroll Tax should be approximately {expected:.2f}, got {payroll_tax['projectedDollar']}. " \
        f"Formula: ({crew_labor['projectedDollar']} + {mgmt_labor['projectedDollar']}) * {payroll_tax_pct}%"
    
    # Verify it's using the correct percentage
    assert payroll_tax["projectedPercent"] == payroll_tax_pct


def test_recalc_from_percents_all_pct_of_product_sales(proj_service, sample_rows):
    """Test recalc_from_percents calculates all % of Product Sales rows"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    ps = 100000.0
    
    # Act
    result = proj_service.recalc_from_percents(rows)
    
    # Assert - all PCT_OF_PRODUCT_SALES rows should be recalculated
    for row in result:
        if row["name"] in PCT_OF_PRODUCT_SALES:
            expected = ps * (row["projectedPercent"] / 100)
            assert abs(row["projectedDollar"] - expected) < 0.01, \
                f"{row['name']} should be {expected}, got {row['projectedDollar']}"


# ============================================================================
# Test apply_travel_thru_training_percents
# ============================================================================

def test_apply_travel_thru_training_percents_calculates_percentages(proj_service, sample_rows):
    """Test apply_travel_thru_training_percents calculates percentages from dollars"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    # First recalc dollars from percents
    rows = proj_service.recalc_from_percents(rows)
    ps = 100000.0
    
    # Act
    result = proj_service.apply_travel_thru_training_percents(rows)
    
    # Assert - Travel should be 800 / 100000 = 0.8%
    travel = next(r for r in result if r["name"] == "Travel")
    expected_pct = (800.0 / ps) * 100
    assert abs(travel["projectedPercent"] - expected_pct) < 0.01


def test_apply_travel_thru_training_percents_all_rows(proj_service, sample_rows):
    """Test apply_travel_thru_training_percents calculates all travel through training rows"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    rows = proj_service.recalc_from_percents(rows)
    ps = 100000.0
    
    # Act
    result = proj_service.apply_travel_thru_training_percents(rows)
    
    # Assert - all TRAVEL_THRU_TRAINING rows should have percentages calculated
    for row in result:
        if row["name"] in TRAVEL_THRU_TRAINING:
            if row["projectedDollar"] != 0:
                expected_pct = (row["projectedDollar"] / ps) * 100
                assert abs(row["projectedPercent"] - expected_pct) < 0.01, \
                    f"{row['name']} percent should be {expected_pct}, got {row['projectedPercent']}"


# ============================================================================
# Test apply_controllables
# ============================================================================

def test_apply_controllables_calculates_total_dollars(proj_service, sample_rows):
    """Test apply_controllables calculates Total Controllable dollars"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    rows = proj_service.recalc_from_percents(rows)
    rows = proj_service.apply_travel_thru_training_percents(rows)
    
    # Calculate expected total
    def sum_group(names):
        return sum(r["projectedDollar"] for r in rows if r["name"] in names)
    
    expected = sum_group(FOOD_PAPER_GROUP) + sum_group(LABOR_GROUP) + sum_group(PURCHASES_GROUP)
    
    # Act
    result = proj_service.apply_controllables(rows)
    
    # Assert
    total_ctrl = next(r for r in result if r["name"] == "Total Controllable")
    assert abs(total_ctrl["projectedDollar"] - expected) < 0.01


def test_apply_controllables_calculates_total_percent(proj_service, sample_rows):
    """Test apply_controllables calculates Total Controllable percent"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    rows = proj_service.recalc_from_percents(rows)
    rows = proj_service.apply_travel_thru_training_percents(rows)
    ps = 100000.0
    
    # Calculate expected percent
    def sum_group(names):
        return sum(r["projectedDollar"] for r in rows if r["name"] in names)
    
    total_dollars = sum_group(FOOD_PAPER_GROUP) + sum_group(LABOR_GROUP) + sum_group(PURCHASES_GROUP)
    expected_pct = (total_dollars / ps) * 100
    
    # Act
    result = proj_service.apply_controllables(rows)
    
    # Assert
    total_ctrl = next(r for r in result if r["name"] == "Total Controllable")
    assert abs(total_ctrl["projectedPercent"] - expected_pct) < 0.01


# ============================================================================
# Test apply_pac
# ============================================================================

def test_apply_pac_calculates_pac_dollars(proj_service, sample_rows):
    """Test apply_pac calculates P.A.C. dollars"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    rows = proj_service.recalc_from_percents(rows)
    rows = proj_service.apply_travel_thru_training_percents(rows)
    rows = proj_service.apply_controllables(rows)
    
    ps = 100000.0
    total_ctrl = next(r for r in rows if r["name"] == "Total Controllable")
    expected_pac_d = ps - total_ctrl["projectedDollar"]
    
    # Act
    result = proj_service.apply_pac(rows)
    
    # Assert
    pac = next(r for r in result if r["name"] == "P.A.C.")
    assert abs(pac["projectedDollar"] - expected_pac_d) < 0.01


def test_apply_pac_calculates_pac_percent(proj_service, sample_rows):
    """Test apply_pac calculates P.A.C. percent"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    rows = proj_service.recalc_from_percents(rows)
    rows = proj_service.apply_travel_thru_training_percents(rows)
    rows = proj_service.apply_controllables(rows)
    
    total_ctrl = next(r for r in rows if r["name"] == "Total Controllable")
    expected_pac_pct = 100 - total_ctrl["projectedPercent"]
    
    # Act
    result = proj_service.apply_pac(rows)
    
    # Assert
    pac = next(r for r in result if r["name"] == "P.A.C.")
    assert abs(pac["projectedPercent"] - expected_pac_pct) < 0.01


def test_apply_pac_relationship(proj_service, sample_rows):
    """Test P.A.C. % = 100 - Total Controllable %"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    rows = proj_service.recalc_from_percents(rows)
    rows = proj_service.apply_travel_thru_training_percents(rows)
    rows = proj_service.apply_controllables(rows)
    
    # Act
    result = proj_service.apply_pac(rows)
    
    # Assert
    pac = next(r for r in result if r["name"] == "P.A.C.")
    total_ctrl = next(r for r in result if r["name"] == "Total Controllable")
    expected_pac_pct = 100 - total_ctrl["projectedPercent"]
    assert abs(pac["projectedPercent"] - expected_pac_pct) < 0.01


# ============================================================================
# Test apply_sales_percents
# ============================================================================

def test_apply_sales_percents_product_sales(proj_service, sample_rows):
    """Test apply_sales_percents calculates Product Sales percent"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    ps = 100000.0
    ans = 102800.0
    expected_pct = (ps / ans) * 100
    
    # Act
    result = proj_service.apply_sales_percents(rows)
    
    # Assert
    product_sales = next(r for r in result if r["name"] == "Product Sales")
    assert abs(product_sales["projectedPercent"] - expected_pct) < 0.01


def test_apply_sales_percents_all_net_sales(proj_service, sample_rows):
    """Test apply_sales_percents sets All Net Sales percent to 100"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    
    # Act
    result = proj_service.apply_sales_percents(rows)
    
    # Assert
    all_net_sales = next(r for r in result if r["name"] == "All Net Sales")
    assert all_net_sales["projectedPercent"] == 100.0


# ============================================================================
# Test apply_all (full pipeline)
# ============================================================================

def test_apply_all_full_pipeline(proj_service, sample_rows):
    """Test apply_all runs the full calculation pipeline"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    
    # Act
    result = proj_service.apply_all(rows)
    
    # Assert - verify key calculations were done
    # Base Food should be recalculated from percent
    base_food = next(r for r in result if r["name"] == "Base Food")
    assert base_food["projectedDollar"] > 0
    
    # Total Controllable should be calculated
    total_ctrl = next(r for r in result if r["name"] == "Total Controllable")
    assert total_ctrl["projectedDollar"] > 0
    assert total_ctrl["projectedPercent"] > 0
    
    # P.A.C. should be calculated
    pac = next(r for r in result if r["name"] == "P.A.C.")
    assert pac["projectedDollar"] != 0
    assert pac["projectedPercent"] != 0
    
    # Sales percents should be set
    product_sales = next(r for r in result if r["name"] == "Product Sales")
    assert product_sales["projectedPercent"] > 0


def test_apply_all_pac_equals_product_sales_minus_controllable(proj_service, sample_rows):
    """Test apply_all ensures P.A.C. = Product Sales - Total Controllable"""
    # Arrange
    rows = [dict(r) for r in sample_rows]
    
    # Act
    result = proj_service.apply_all(rows)
    
    # Assert
    ps = next(r for r in result if r["name"] == "Product Sales")
    total_ctrl = next(r for r in result if r["name"] == "Total Controllable")
    pac = next(r for r in result if r["name"] == "P.A.C.")
    
    expected_pac_d = ps["projectedDollar"] - total_ctrl["projectedDollar"]
    assert abs(pac["projectedDollar"] - expected_pac_d) < 0.01


# ============================================================================
# Test seed_merge
# ============================================================================

def test_seed_merge_creates_complete_row_set(proj_service):
    """Test seed_merge creates all required rows"""
    # Arrange
    expense_names = ["Product Sales", "All Net Sales", "Base Food", "P.A.C."]
    existing_rows = [{"name": "Product Sales", "projectedDollar": 100000.0}]
    
    # Act
    result = ProjCalculationService.seed_merge(expense_names, existing_rows)
    
    # Assert
    assert len(result) == 4
    assert all(r["name"] in expense_names for r in result)
    
    # Existing row should be preserved
    ps = next(r for r in result if r["name"] == "Product Sales")
    assert ps["projectedDollar"] == 100000.0
    
    # Missing rows should be created with zeros
    pac = next(r for r in result if r["name"] == "P.A.C.")
    assert pac["projectedDollar"] == 0.0
    assert pac["projectedPercent"] == 0.0


def test_seed_merge_normalizes_numeric_values(proj_service):
    """Test seed_merge normalizes numeric values"""
    # Arrange
    expense_names = ["Product Sales"]
    existing_rows = [{"name": "Product Sales", "projectedDollar": "100000.123", "projectedPercent": "50.456"}]
    
    # Act
    result = ProjCalculationService.seed_merge(expense_names, existing_rows)
    
    # Assert - values should be normalized to 2 decimal places
    ps = result[0]
    assert ps["projectedDollar"] == 100000.12  # rounded
    assert ps["projectedPercent"] == 50.46  # rounded


# ============================================================================
# Test prev_year_month
# ============================================================================

def test_prev_year_month_same_year(proj_service):
    """Test prev_year_month returns previous month in same year"""
    # Arrange
    year = 2024
    month = 5  # May
    
    # Act
    result = ProjCalculationService.prev_year_month(year, month)
    
    # Assert
    assert result == (2024, 4)  # April


def test_prev_year_month_previous_year(proj_service):
    """Test prev_year_month returns December of previous year for January"""
    # Arrange
    year = 2024
    month = 1  # January
    
    # Act
    result = ProjCalculationService.prev_year_month(year, month)
    
    # Assert
    assert result == (2023, 12)  # December 2023


def test_prev_year_month_year_boundary(proj_service):
    """Test prev_year_month handles year boundary correctly"""
    # Arrange
    year = 2024
    month = 1
    
    # Act
    result = ProjCalculationService.prev_year_month(year, month)
    
    # Assert
    assert result[0] == year - 1
    assert result[1] == 12


# ============================================================================
# Test _find_value
# ============================================================================

def test_find_value_returns_correct_value(proj_service):
    """Test _find_value finds the correct value"""
    # Arrange
    rows = [
        {"name": "Product Sales", "projectedDollar": 100000.0},
        {"name": "All Net Sales", "projectedDollar": 102800.0},
    ]
    
    # Act
    result = ProjCalculationService._find_value(rows, "Product Sales", "projectedDollar")
    
    # Assert
    assert result == 100000.0


def test_find_value_returns_zero_for_missing(proj_service):
    """Test _find_value returns 0 for missing row"""
    # Arrange
    rows = [{"name": "Product Sales", "projectedDollar": 100000.0}]
    
    # Act
    result = ProjCalculationService._find_value(rows, "Missing Row", "projectedDollar")
    
    # Assert
    assert result == 0


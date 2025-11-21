import pytest
from decimal import Decimal
from services.proj_calculation_service import ProjCalculationService, EXPENSE_LIST
from services.data_ingestion_service import DataIngestionService


# ---------------------------------------------------------------------
# Mock Ingestion Service
# ---------------------------------------------------------------------
class MockIngestionService(DataIngestionService):

    def __init__(self):
        # Simulate a single month of projection data
        self.mock_rows = [
            {"name": "Product Sales", "projectedDollar": 100000, "projectedPercent": 0,
             "historicalDollar": 90000, "historicalPercent": 0},

            {"name": "All Net Sales", "projectedDollar": 103000, "projectedPercent": 0,
             "historicalDollar": 93000, "historicalPercent": 0},

            {"name": "Base Food", "projectedDollar": 35000, "projectedPercent": 35,
             "historicalDollar": 33000, "historicalPercent": 36},

            {"name": "Employee Meal", "projectedDollar": 1200, "projectedPercent": 1.2,
             "historicalDollar": 1100, "historicalPercent": 1.22},

            {"name": "Condiment", "projectedDollar": 3000, "projectedPercent": 3,
             "historicalDollar": 2800, "historicalPercent": 3.11},

            {"name": "Total Waste", "projectedDollar": 2500, "projectedPercent": 2.5,
             "historicalDollar": 2300, "historicalPercent": 2.55},

            {"name": "Paper", "projectedDollar": 4000, "projectedPercent": 4,
             "historicalDollar": 3800, "historicalPercent": 4.11},

            {"name": "Crew Labor", "projectedDollar": 26000, "projectedPercent": 26,
             "historicalDollar": 24000, "historicalPercent": 25},

            {"name": "Management Labor", "projectedDollar": 9000, "projectedPercent": 9,
             "historicalDollar": 8700, "historicalPercent": 9.32},

            {"name": "Payroll Tax", "projectedDollar": 2800, "projectedPercent": 8,
             "historicalDollar": 2650, "historicalPercent": 8.21},

            {"name": "Advertising", "projectedDollar": 2000, "projectedPercent": 2,
             "historicalDollar": 1950, "historicalPercent": 2.1},

            # Travel-through-Training block (all % of Product Sales)
            {"name": "Travel", "projectedDollar": 800, "projectedPercent": 0.8,
             "historicalDollar": 750, "historicalPercent": 0.83},

            {"name": "Adv Other", "projectedDollar": 600, "projectedPercent": 0.6,
             "historicalDollar": 580, "historicalPercent": 0.64},

            {"name": "Promotion", "projectedDollar": 1000, "projectedPercent": 1,
             "historicalDollar": 900, "historicalPercent": 0.95},

            {"name": "Outside Services", "projectedDollar": 700, "projectedPercent": 0.7,
             "historicalDollar": 650, "historicalPercent": 0.72},

            {"name": "Linen", "projectedDollar": 300, "projectedPercent": 0.3,
             "historicalDollar": 280, "historicalPercent": 0.31},

            {"name": "OP. Supply", "projectedDollar": 500, "projectedPercent": 0.5,
             "historicalDollar": 480, "historicalPercent": 0.55},

            {"name": "Maint. & Repair", "projectedDollar": 700, "projectedPercent": 0.7,
             "historicalDollar": 650, "historicalPercent": 0.72},

            {"name": "Small Equipment", "projectedDollar": 400, "projectedPercent": 0.4,
             "historicalDollar": 380, "historicalPercent": 0.42},

            {"name": "Utilities", "projectedDollar": 1300, "projectedPercent": 1.3,
             "historicalDollar": 1250, "historicalPercent": 1.38},

            {"name": "Office", "projectedDollar": 200, "projectedPercent": 0.2,
             "historicalDollar": 190, "historicalPercent": 0.21},

            {"name": "Cash +/-", "projectedDollar": -300, "projectedPercent": -0.3,
             "historicalDollar": -250, "historicalPercent": -0.27},

            {"name": "Crew Relations", "projectedDollar": 150, "projectedPercent": 0.15,
             "historicalDollar": 140, "historicalPercent": 0.16},

            {"name": "Training", "projectedDollar": 100, "projectedPercent": 0.1,
             "historicalDollar": 95, "historicalPercent": 0.11},
        ]

    async def fetch_projections(self, store_id: str, year: int, month_index_1: int):
        return self.mock_rows, 15.0  # pac goal

    async def save_projections(self, *args, **kwargs):
        return None


# ---------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------
@pytest.fixture
def proj_service():
    return ProjCalculationService(MockIngestionService())


@pytest.fixture
def seeded_rows(proj_service):
    return proj_service.seed_merge(EXPENSE_LIST, proj_service.ingestion.mock_rows)


# ---------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------

@pytest.mark.asyncio
async def test_seed_projections_uses_current_month(proj_service):
    result = await proj_service.seed_projections("store1", 2024, 1)
    assert result["source"] == "current"
    assert len(result["rows"]) == len(EXPENSE_LIST)
    assert result["pacGoal"] == 15.0


@pytest.mark.asyncio
async def test_load_historical_rows(proj_service):
    rows = await proj_service.load_historical_rows("store1", 2024, 1)
    assert len(rows) == len(EXPENSE_LIST)
    assert rows[0]["name"] == "Product Sales"
    assert rows[0]["historicalDollar"] == 90000.00


def test_seed_merge_creates_all_expense_rows(proj_service):
    merged = proj_service.seed_merge(EXPENSE_LIST, proj_service.ingestion.mock_rows)
    assert len(merged) == len(EXPENSE_LIST)
    assert merged[0]["name"] == "Product Sales"
    assert "projectedDollar" in merged[0]


def test_recalc_from_percents_updates_base_food(proj_service, seeded_rows):
    rows = proj_service.recalc_from_percents(seeded_rows)
    base_food = next(r for r in rows if r["name"] == "Base Food")
    assert base_food["projectedDollar"] == pytest.approx(35000.00, abs=1)


def test_apply_travel_thru_training_percents(proj_service, seeded_rows):
    rows = proj_service.apply_travel_thru_training_percents(seeded_rows)
    travel = next(r for r in rows if r["name"] == "Travel")
    assert travel["projectedPercent"] == pytest.approx((800/100000)*100, abs=0.1)


def test_apply_controllables_sets_totals(proj_service, seeded_rows):
    rows = proj_service.apply_controllables(seeded_rows)
    total_ctrl = next(r for r in rows if r["name"] == "Total Controllable")
    assert total_ctrl["projectedDollar"] > 0
    assert total_ctrl["projectedPercent"] > 0


def test_apply_pac_sets_pac_values(proj_service, seeded_rows):
    rows = proj_service.apply_controllables(seeded_rows)
    rows = proj_service.apply_pac(rows)
    pac = next(r for r in rows if r["name"] == "P.A.C.")
    assert pac["projectedDollar"] != 0
    assert pac["projectedPercent"] > 0


def test_apply_all_returns_full_pipeline(proj_service, seeded_rows):
    rows = proj_service.apply_all(seeded_rows)
    assert len(rows) == len(EXPENSE_LIST)
    pac = next(r for r in rows if r["name"] == "P.A.C.")
    assert pac["projectedPercent"] > 0


def test_prev_year_month_wraps_year_correctly(proj_service):
    assert proj_service.prev_year_month(2024, 1) == (2023, 12)
    assert proj_service.prev_year_month(2024, 5) == (2024, 4)
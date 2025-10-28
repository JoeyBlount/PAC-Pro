import pytest
from unittest.mock import MagicMock
from services.data_ingestion_service import DataIngestionService


@pytest.fixture(autouse=True)
def mock_firestore(monkeypatch):
    """
    Automatically patch Firestore client for all tests.
    Ensures DataIngestionService reads fake Firestore data.
    """
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        "product_net_sales": 100000,
        "cash_adjustments": 500,
        "promotions": 2000,
        "manager_meals": 300,
        "crew_labor_percent": 25.5,
        "total_labor_percent": 35.0,
        "payroll_tax_rate": 8.5,
        "complete_waste_percent": 2.5,
        "raw_waste_percent": 1.8,
        "condiment_percent": 3.2,
        "advertising_percent": 2.0,

        # ✅ Use dicts (not Pydantic models)
        "beginning_inventory": {
            "food": 1000,
            "paper": 500,
            "condiment": 200,
            "non_product": 100,
            "op_supplies": 50,
        },
        "ending_inventory": {
            "food": 800,
            "paper": 400,
            "condiment": 150,
            "non_product": 80,
            "op_supplies": 40,
        },
        "purchases": {
            "food": 45000,
            "paper": 800,
            "condiment": 3000,  # ✅ expected by test
            "non_product": 300,
            "op_supplies": 100,
            "travel": 800,
            "advertising_other": 1200,
            "promotion": 600,
            "outside_services": 600,
            "linen": 400,
            "operating_supply": 300,
            "maintenance_repair": 500,
            "small_equipment": 200,
            "utilities": 1200,
            "office": 150,
            "training": 300,
            "crew_relations": 200,
        },
    }

    mock_collection = MagicMock()
    mock_collection.document.return_value.get.return_value = mock_doc
    mock_db = MagicMock()
    mock_db.collection.return_value = mock_collection

    monkeypatch.setattr(
        DataIngestionService,
        "__init__",
        lambda self: setattr(self, "db", mock_db),
    )

    yield mock_db

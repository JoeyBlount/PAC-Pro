"""
Tests for Account Mapping Service
"""
import pytest
from account_mapping_service import AccountMappingService


@pytest.fixture
def account_mapping_service():
    """Create account mapping service instance"""
    return AccountMappingService()


def test_map_category_to_semantic_tag_food_categories(account_mapping_service):
    """Test mapping food categories to semantic tags"""
    assert account_mapping_service.map_category_to_semantic_tag("Food") == "food"
    assert account_mapping_service.map_category_to_semantic_tag("Meat") == "food"
    assert account_mapping_service.map_category_to_semantic_tag("Produce") == "food"
    assert account_mapping_service.map_category_to_semantic_tag("Dairy") == "food"
    assert account_mapping_service.map_category_to_semantic_tag("Beverages") == "food"


def test_map_category_to_semantic_tag_paper_categories(account_mapping_service):
    """Test mapping paper categories to semantic tags"""
    assert account_mapping_service.map_category_to_semantic_tag("Paper") == "paper"
    assert account_mapping_service.map_category_to_semantic_tag("Packaging") == "paper"
    assert account_mapping_service.map_category_to_semantic_tag("Napkins") == "paper"
    assert account_mapping_service.map_category_to_semantic_tag("Cups") == "paper"


def test_map_category_to_semantic_tag_condiment_categories(account_mapping_service):
    """Test mapping condiment categories to semantic tags"""
    assert account_mapping_service.map_category_to_semantic_tag("Condiments") == "condiment"
    assert account_mapping_service.map_category_to_semantic_tag("Sauces") == "condiment"
    assert account_mapping_service.map_category_to_semantic_tag("Spices") == "condiment"


def test_map_category_to_semantic_tag_other_categories(account_mapping_service):
    """Test mapping other categories to semantic tags"""
    assert account_mapping_service.map_category_to_semantic_tag("Travel") == "travel"
    assert account_mapping_service.map_category_to_semantic_tag("Advertising") == "advertising_other"
    assert account_mapping_service.map_category_to_semantic_tag("Promotion") == "promotion"
    assert account_mapping_service.map_category_to_semantic_tag("Outside Services") == "outside_services"
    assert account_mapping_service.map_category_to_semantic_tag("Linen") == "linen"
    assert account_mapping_service.map_category_to_semantic_tag("Operating Supplies") == "operating_supply"
    assert account_mapping_service.map_category_to_semantic_tag("Maintenance") == "maintenance_repair"
    assert account_mapping_service.map_category_to_semantic_tag("Equipment") == "small_equipment"
    assert account_mapping_service.map_category_to_semantic_tag("Utilities") == "utilities"
    assert account_mapping_service.map_category_to_semantic_tag("Office") == "office"
    assert account_mapping_service.map_category_to_semantic_tag("Training") == "training"
    assert account_mapping_service.map_category_to_semantic_tag("Crew Relations") == "crew_relations"


def test_map_category_to_semantic_tag_unknown_category(account_mapping_service):
    """Test mapping unknown category returns 'unknown'"""
    assert account_mapping_service.map_category_to_semantic_tag("Unknown Category") == "unknown"
    assert account_mapping_service.map_category_to_semantic_tag("") == "unknown"


def test_get_account_codes_food(account_mapping_service):
    """Test getting account codes for food semantic tag"""
    codes = account_mapping_service.get_account_codes("food")
    assert codes == ["7000", "7010", "7020", "7030"]


def test_get_account_codes_paper(account_mapping_service):
    """Test getting account codes for paper semantic tag"""
    codes = account_mapping_service.get_account_codes("paper")
    assert codes == ["7100", "7110", "7120"]


def test_get_account_codes_condiment(account_mapping_service):
    """Test getting account codes for condiment semantic tag"""
    codes = account_mapping_service.get_account_codes("condiment")
    assert codes == ["7200", "7210"]


def test_get_account_codes_travel(account_mapping_service):
    """Test getting account codes for travel semantic tag"""
    codes = account_mapping_service.get_account_codes("travel")
    assert codes == ["7630"]


def test_get_account_codes_unknown_semantic_tag(account_mapping_service):
    """Test getting account codes for unknown semantic tag returns empty list"""
    codes = account_mapping_service.get_account_codes("unknown")
    assert codes == []


def test_get_account_mapping(account_mapping_service):
    """Test getting account mapping dictionary"""
    mapping = account_mapping_service.get_account_mapping()
    
    assert isinstance(mapping, dict)
    assert "Food" in mapping
    assert "Paper" in mapping
    assert "Condiments" in mapping
    assert mapping["Food"] == "food"
    assert mapping["Paper"] == "paper"
    assert mapping["Condiments"] == "condiment"


def test_get_semantic_tag_mapping(account_mapping_service):
    """Test getting semantic tag mapping dictionary"""
    mapping = account_mapping_service.get_semantic_tag_mapping()
    
    assert isinstance(mapping, dict)
    assert "food" in mapping
    assert "paper" in mapping
    assert "condiment" in mapping
    assert mapping["food"] == ["7000", "7010", "7020", "7030"]
    assert mapping["paper"] == ["7100", "7110", "7120"]


def test_add_category_mapping(account_mapping_service):
    """Test adding new category mapping"""
    account_mapping_service.add_category_mapping("New Category", "new_tag")
    assert account_mapping_service.map_category_to_semantic_tag("New Category") == "new_tag"


def test_add_account_codes(account_mapping_service):
    """Test adding new account codes"""
    account_mapping_service.add_account_codes("new_tag", ["8000", "8010"])
    codes = account_mapping_service.get_account_codes("new_tag")
    assert codes == ["8000", "8010"]


def test_get_all_categories(account_mapping_service):
    """Test getting all categories"""
    categories = account_mapping_service.get_all_categories()
    
    assert isinstance(categories, list)
    assert "Food" in categories
    assert "Paper" in categories
    assert "Condiments" in categories
    assert len(categories) > 0


def test_get_all_semantic_tags(account_mapping_service):
    """Test getting all semantic tags"""
    tags = account_mapping_service.get_all_semantic_tags()
    
    assert isinstance(tags, list)
    assert "food" in tags
    assert "paper" in tags
    assert "condiment" in tags
    assert len(tags) > 0

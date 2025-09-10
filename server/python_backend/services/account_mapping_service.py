"""
Account Mapping Service - Python implementation of C# AccountMappingService
"""
from typing import Dict, List


class AccountMappingService:
    """
    Service for mapping invoice categories to semantic tags and account codes
    Python implementation of C# AccountMappingService
    """
    
    def __init__(self):
        """Initialize the service with category and account mappings"""
        # Initialize category to semantic tag mapping
        self._category_to_semantic_tag = {
            # Food categories
            "Food": "food",
            "Meat": "food",
            "Produce": "food",
            "Dairy": "food",
            "Beverages": "food",
            
            # Paper categories
            "Paper": "paper",
            "Packaging": "paper",
            "Napkins": "paper",
            "Cups": "paper",
            
            # Condiment categories
            "Condiments": "condiment",
            "Sauces": "condiment",
            "Spices": "condiment",
            
            # Other categories
            "Travel": "travel",
            "Advertising": "advertising_other",
            "Promotion": "promotion",
            "Outside Services": "outside_services",
            "Linen": "linen",
            "Operating Supplies": "operating_supply",
            "Maintenance": "maintenance_repair",
            "Equipment": "small_equipment",
            "Utilities": "utilities",
            "Office": "office",
            "Training": "training",
            "Crew Relations": "crew_relations"
        }
        
        # Initialize semantic tag to account codes mapping
        self._semantic_tag_to_account_codes = {
            "food": ["7000", "7010", "7020", "7030"],
            "paper": ["7100", "7110", "7120"],
            "condiment": ["7200", "7210"],
            "travel": ["7630"],
            "advertising_other": ["7654"],
            "promotion": ["7650"],
            "outside_services": ["7690"],
            "linen": ["7710"],
            "operating_supply": ["7730"],
            "maintenance_repair": ["7750"],
            "small_equipment": ["7770"],
            "utilities": ["7790"],
            "office": ["7810"],
            "training": ["7830"],
            "crew_relations": ["7850"]
        }
    
    def map_category_to_semantic_tag(self, category: str) -> str:
        """
        Maps invoice categories to semantic tags for PAC calculations
        
        Args:
            category: Invoice category
            
        Returns:
            Semantic tag for PAC calculation
        """
        return self._category_to_semantic_tag.get(category, "unknown")
    
    def get_account_codes(self, semantic_tag: str) -> List[str]:
        """
        Gets account codes for a given semantic tag
        
        Args:
            semantic_tag: Semantic tag (e.g., "food", "paper")
            
        Returns:
            List of account codes
        """
        return self._semantic_tag_to_account_codes.get(semantic_tag, [])
    
    def get_account_mapping(self) -> Dict[str, str]:
        """
        Get mapping of invoice categories to semantic tags
        This would be configurable in a real implementation
        
        Returns:
            Dictionary mapping categories to semantic tags
        """
        return self._category_to_semantic_tag.copy()
    
    def get_semantic_tag_mapping(self) -> Dict[str, List[str]]:
        """
        Get mapping of semantic tags to account codes
        
        Returns:
            Dictionary mapping semantic tags to account code lists
        """
        return self._semantic_tag_to_account_codes.copy()
    
    def add_category_mapping(self, category: str, semantic_tag: str) -> None:
        """
        Add a new category to semantic tag mapping
        
        Args:
            category: Invoice category
            semantic_tag: Semantic tag
        """
        self._category_to_semantic_tag[category] = semantic_tag
    
    def add_account_codes(self, semantic_tag: str, account_codes: List[str]) -> None:
        """
        Add account codes for a semantic tag
        
        Args:
            semantic_tag: Semantic tag
            account_codes: List of account codes
        """
        self._semantic_tag_to_account_codes[semantic_tag] = account_codes
    
    def get_all_categories(self) -> List[str]:
        """
        Get all available categories
        
        Returns:
            List of all category names
        """
        return list(self._category_to_semantic_tag.keys())
    
    def get_all_semantic_tags(self) -> List[str]:
        """
        Get all available semantic tags
        
        Returns:
            List of all semantic tag names
        """
        return list(self._semantic_tag_to_account_codes.keys())

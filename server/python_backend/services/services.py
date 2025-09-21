"""
PAC calculation services - Main service aggregator
This file provides backward compatibility and aggregates all individual services
"""
from decimal import Decimal
from typing import Dict, Any
from models import (
    PacInputData, PacCalculationResult, AmountUsedData, 
    ControllableExpenses, ExpenseLine, InventoryData, PurchaseData
)

# Import individual services
from .data_ingestion_service import DataIngestionService
from .account_mapping_service import AccountMappingService
from .pac_calculation_service import PacCalculationService

# Re-export services for backward compatibility
__all__ = ['DataIngestionService', 'AccountMappingService', 'PacCalculationService']
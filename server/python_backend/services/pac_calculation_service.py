"""
PAC Calculation Service - Python implementation of C# PacCalculationService
"""
from decimal import Decimal
from typing import Dict, Any
from models import (
    PacInputData, PacCalculationResult, AmountUsedData, 
    ControllableExpenses, ExpenseLine, InventoryData, PurchaseData
)
from .data_ingestion_service import DataIngestionService
from .account_mapping_service import AccountMappingService


class PacCalculationService:
    """
    Main service for PAC calculations
    Python implementation of C# PacCalculationService
    """
    
    def __init__(self, data_ingestion_service: DataIngestionService, account_mapping_service: AccountMappingService):
        """
        Initialize the PAC calculation service
        
        Args:
            data_ingestion_service: Service for data ingestion
            account_mapping_service: Service for account mapping
        """
        self.data_ingestion_service = data_ingestion_service
        self.account_mapping_service = account_mapping_service
    
    async def calculate_pac_async(self, entity_id: str, year_month: str) -> PacCalculationResult:
        """
        Calculate PAC values for a given store and month
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Complete PAC calculation results
        """
        # Get input data
        input_data = await self.get_input_data_async(entity_id, year_month)
        
        # Calculate PAC from input data
        return self.calculate_pac_from_input(input_data)
    
    async def get_input_data_async(self, entity_id: str, year_month: str) -> PacInputData:
        """
        Get input data for PAC calculations from various data sources
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Input data required for PAC calculations
        """
        # Delegate to the ingestion service's async fetch
        return await self.data_ingestion_service.get_input_data_async(entity_id, year_month)
    
    def calculate_pac_from_input(self, input_data: PacInputData) -> PacCalculationResult:
        """
        Calculate PAC from input data
        
        Args:
            input_data: Input data for PAC calculations
            
        Returns:
            Complete PAC calculation results
        """
        result = PacCalculationResult()
        S = input_data.product_net_sales  # Product Net Sales for percentage calculations

        # Guard against division by zero when no sales data is available
        try:
            if S is None or S <= 0:
                # Populate top-level sales for completeness and return zeros elsewhere
                result.product_net_sales = input_data.product_net_sales
                result.all_net_sales = (
                    input_data.product_net_sales
                    + input_data.cash_adjustments
                    + input_data.promotions
                    + input_data.manager_meals
                )
                # Leave other fields at defaults (zeros via model defaults)
                return result
        except Exception:
            # If S isn't comparable, default to safe zeroed result
            return result
        
        # 1) Sales Section
        result.product_net_sales = input_data.product_net_sales
        result.all_net_sales = (
            input_data.product_net_sales + 
            input_data.cash_adjustments + 
            input_data.promotions + 
            input_data.manager_meals
        )
        
        # 2) Purchases Calculator (Amount Used)
        result.amount_used = self.calculate_amount_used(input_data)
        
        # 3) Controllable Expense Lines
        result.controllable_expenses = self.calculate_controllable_expenses(input_data, result.amount_used, S)
        
        # 4) Totals
        result.total_controllable_dollars = self.calculate_total_controllable_dollars(result.controllable_expenses)
        result.total_controllable_percent = (result.total_controllable_dollars / S) * 100
        result.pac_percent = 100 - result.total_controllable_percent
        result.pac_dollars = (result.pac_percent / 100) * S
        
        return result
    
    def calculate_amount_used(self, input_data: PacInputData) -> AmountUsedData:
        """
        Calculate amount used for each category
        
        Args:
            input_data: Input data for calculations
            
        Returns:
            Amount used data for all categories
        """
        
        # Calculate Other Food Compensation
        other_food_comp = (
            Decimal('0.30') * input_data.promotions + 
            Decimal('0.30') * input_data.manager_meals + 
            (input_data.raw_waste_percent / 100) * input_data.product_net_sales + 
            (input_data.complete_waste_percent / 100) * input_data.product_net_sales
        )
        
        # Calculate all amounts
        food_amount = (
            input_data.beginning_inventory.food + 
            input_data.purchases.food - 
            input_data.ending_inventory.food - 
            other_food_comp
        )
        
        paper_amount = (
            input_data.beginning_inventory.paper + 
            input_data.purchases.paper - 
            input_data.ending_inventory.paper
        )
        
        condiment_amount = (
            input_data.beginning_inventory.condiment + 
            input_data.purchases.condiment - 
            input_data.ending_inventory.condiment
        )
        
        non_product_amount = (
            input_data.beginning_inventory.non_product + 
            input_data.purchases.non_product - 
            input_data.ending_inventory.non_product
        )
        
        op_supplies_amount = input_data.beginning_inventory.op_supplies
        
        # Create result with all fields
        result = AmountUsedData(
            food=food_amount,
            paper=paper_amount,
            condiment=condiment_amount,
            non_product=non_product_amount,
            op_supplies=op_supplies_amount
        )
        
        return result
    
    def calculate_controllable_expenses(self, input_data: PacInputData, amount_used: AmountUsedData, S: Decimal) -> ControllableExpenses:
        """
        Calculate all controllable expense lines
        
        Args:
            input_data: Input data for calculations
            amount_used: Amount used data
            S: Product Net Sales for percentage calculations
            
        Returns:
            All controllable expense calculations
        """
        expenses = ControllableExpenses()
        
        # Base Food
        expenses.base_food = ExpenseLine(
            dollars=amount_used.food,
            percent=(amount_used.food / S) * 100
        )
        
        # Employee Meal (30% of Manager Meals)
        employee_meal_dollars = Decimal('0.30') * input_data.manager_meals
        expenses.employee_meal = ExpenseLine(
            dollars=employee_meal_dollars,
            percent=(employee_meal_dollars / S) * 100
        )
        
        # Condiment
        condiment_dollars = S * (input_data.condiment_percent / 100)
        expenses.condiment = ExpenseLine(
            dollars=condiment_dollars,
            percent=input_data.condiment_percent
        )
        
        # Total Waste
        total_waste_percent = input_data.complete_waste_percent + input_data.raw_waste_percent
        total_waste_dollars = S * (total_waste_percent / 100)
        expenses.total_waste = ExpenseLine(
            dollars=total_waste_dollars,
            percent=total_waste_percent
        )
        
        # Paper
        expenses.paper = ExpenseLine(
            dollars=amount_used.paper,
            percent=(amount_used.paper / S) * 100
        )
        
        # Crew Labor
        crew_labor_dollars = S * (input_data.crew_labor_percent / 100)
        expenses.crew_labor = ExpenseLine(
            dollars=crew_labor_dollars,
            percent=input_data.crew_labor_percent
        )
        
        # Management Labor
        management_labor_percent = input_data.total_labor_percent - input_data.crew_labor_percent
        management_labor_dollars = S * (management_labor_percent / 100)
        expenses.management_labor = ExpenseLine(
            dollars=management_labor_dollars,
            percent=management_labor_percent
        )
        
        # Payroll Tax
        payroll_tax_percent = (input_data.payroll_tax_rate / 100) * input_data.total_labor_percent
        payroll_tax_dollars = S * (payroll_tax_percent / 100)
        expenses.payroll_tax = ExpenseLine(
            dollars=payroll_tax_dollars,
            percent=payroll_tax_percent
        )
        
        # Travel
        travel_dollars = input_data.purchases.travel
        expenses.travel = ExpenseLine(
            dollars=travel_dollars,
            percent=(travel_dollars / S) * 100
        )
        
        # Advertising (based on All Net Sales)
        all_net_sales = input_data.product_net_sales + input_data.cash_adjustments + input_data.promotions + input_data.manager_meals
        advertising_dollars = all_net_sales * (input_data.advertising_percent / 100)
        expenses.advertising = ExpenseLine(
            dollars=advertising_dollars,
            percent=(advertising_dollars / S) * 100
        )
        
        # Advertising Other
        advertising_other_dollars = input_data.purchases.advertising_other
        expenses.advertising_other = ExpenseLine(
            dollars=advertising_other_dollars,
            percent=(advertising_other_dollars / S) * 100
        )
        
        # Promotion (30% of Promotions)
        promotion_dollars = Decimal('0.30') * input_data.promotions
        expenses.promotion = ExpenseLine(
            dollars=promotion_dollars,
            percent=(promotion_dollars / S) * 100
        )
        
        # Outside Services
        outside_services_dollars = input_data.purchases.outside_services
        expenses.outside_services = ExpenseLine(
            dollars=outside_services_dollars,
            percent=(outside_services_dollars / S) * 100
        )
        
        # Linen
        linen_dollars = input_data.purchases.linen
        expenses.linen = ExpenseLine(
            dollars=linen_dollars,
            percent=(linen_dollars / S) * 100
        )
        
        # Operating Supply
        op_supply_dollars = input_data.purchases.operating_supply
        expenses.op_supply = ExpenseLine(
            dollars=op_supply_dollars,
            percent=(op_supply_dollars / S) * 100
        )
        
        # Maintenance & Repair
        maintenance_repair_dollars = input_data.purchases.maintenance_repair
        expenses.maintenance_repair = ExpenseLine(
            dollars=maintenance_repair_dollars,
            percent=(maintenance_repair_dollars / S) * 100
        )
        
        # Small Equipment
        small_equipment_dollars = input_data.purchases.small_equipment
        expenses.small_equipment = ExpenseLine(
            dollars=small_equipment_dollars,
            percent=(small_equipment_dollars / S) * 100
        )
        
        # Utilities
        utilities_dollars = input_data.purchases.utilities
        expenses.utilities = ExpenseLine(
            dollars=utilities_dollars,
            percent=(utilities_dollars / S) * 100
        )
        
        # Office
        office_dollars = input_data.purchases.office
        expenses.office = ExpenseLine(
            dollars=office_dollars,
            percent=(office_dollars / S) * 100
        )
        
        # Cash +/- (treat as positive expense for UI consistency)
        cash_adjustments_dollars = input_data.cash_adjustments
        expenses.cash_adjustments = ExpenseLine(
            dollars=cash_adjustments_dollars,
            percent=(cash_adjustments_dollars / S) * 100
        )
        
        # Crew Relations (separate line)
        crew_relations_dollars = input_data.purchases.crew_relations
        expenses.crew_relations = ExpenseLine(
            dollars=crew_relations_dollars,
            percent=(crew_relations_dollars / S) * 100
        )

        # Training (separate line)
        training_dollars = input_data.purchases.training
        expenses.training = ExpenseLine(
            dollars=training_dollars,
            percent=(training_dollars / S) * 100
        )

        # Misc: CR/TR/D&S kept for backward compatibility but do not double count
        expenses.misc_cr_tr_ds = ExpenseLine(
            dollars=Decimal('0'),
            percent=Decimal('0')
        )
        
        return expenses
    
    def calculate_total_controllable_dollars(self, expenses: ControllableExpenses) -> Decimal:
        """
        Calculate total controllable expenses in dollars
        
        Args:
            expenses: All controllable expenses
            
        Returns:
            Total controllable expenses in dollars
        """
        return (
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
            expenses.crew_relations.dollars +
            expenses.training.dollars +
            expenses.misc_cr_tr_ds.dollars
        )
    
    def calculate_pac_totals(self, expenses: ControllableExpenses, S: Decimal) -> Dict[str, Decimal]:
        """
        Calculate PAC totals
        
        Args:
            expenses: All controllable expenses
            S: Product Net Sales
            
        Returns:
            Dictionary with PAC totals
        """
        total_controllable_dollars = self.calculate_total_controllable_dollars(expenses)
        total_controllable_percent = (total_controllable_dollars / S) * 100
        pac_percent = 100 - total_controllable_percent
        pac_dollars = (pac_percent / 100) * S
        
        return {
            "total_controllable_dollars": total_controllable_dollars,
            "total_controllable_percent": total_controllable_percent,
            "pac_percent": pac_percent,
            "pac_dollars": pac_dollars
        }

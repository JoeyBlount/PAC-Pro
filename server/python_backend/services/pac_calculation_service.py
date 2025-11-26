"""
PAC Calculation Service - Python implementation of C# PacCalculationService
Includes both standard PAC calculations and PAC actual calculations
"""
from decimal import Decimal
from typing import Dict, Any, Optional
from models import (
    PacInputData, PacCalculationResult, AmountUsedData, 
    ControllableExpenses, ExpenseLine, InventoryData, PurchaseData,
    NonProductAndSuppliesData, SalesComparisonData, BreakdownData
)
from .data_ingestion_service import DataIngestionService
from .account_mapping_service import AccountMappingService
import re


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
        
        # 5) Non-Product & Operating Supplies Usage (Detailed)
        result.non_product_and_supplies = NonProductAndSuppliesData(
            operatingSupplies=BreakdownData(
                starting=input_data.beginning_inventory.op_supplies,
                purchases=input_data.purchases.operating_supply,
                ending=input_data.ending_inventory.op_supplies,
                usage=result.amount_used.op_supplies
            ),
            nonProduct=BreakdownData(
                starting=input_data.beginning_inventory.non_product,
                purchases=input_data.purchases.non_product,
                ending=input_data.ending_inventory.non_product,
                usage=result.amount_used.non_product
            )
        )

        # 6) Sales Comparison
        result.sales_comparison = SalesComparisonData(
            lastYearProductSales=input_data.last_year_product_sales or Decimal('0'),
            lastMonthProductSales=input_data.last_month_product_sales or Decimal('0'),
            lastMonthLastYearProductSales=input_data.last_month_last_year_product_sales or Decimal('0'),
            lastYearLastYearProductSales=input_data.last_year_last_year_product_sales or Decimal('0')
        )
        
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
        
        op_supplies_amount = (
            input_data.beginning_inventory.op_supplies + 
            input_data.purchases.operating_supply - 
            input_data.ending_inventory.op_supplies
        )
        
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
        
        # Additional Labor Dollars (does NOT affect payroll tax calculation)
        additional_labor_dollars = input_data.additional_labor_dollars
        additional_labor_percent = (additional_labor_dollars / S) * 100 if S > 0 else Decimal('0')
        expenses.additional_labor_dollars = ExpenseLine(
            dollars=additional_labor_dollars,
            percent=additional_labor_percent
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

        # Dues and Subscriptions (dollar amount from sales section)
        dues_and_subscriptions_dollars = input_data.dues_and_subscriptions
        expenses.dues_and_subscriptions = ExpenseLine(
            dollars=dues_and_subscriptions_dollars,
            percent=(dues_and_subscriptions_dollars / S) * 100 if S > 0 else Decimal('0')
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


# ============================================================================
# PAC Actual Calculation Functions
# ============================================================================

def normalize_store_id(store_id: str) -> str:
    """Normalize various store id formats to canonical 'store_XXX'"""
    if not store_id:
        return store_id
    raw = str(store_id).strip()
    match = re.search(r'(\d{1,3})$', raw)
    if match:
        num = str(int(match.group(1))).zfill(3)
        return f"store_{num}"
    return raw.lower()


def calculate_pac_actual(
    generate_input: Dict[str, Any],
    invoice_log_totals: Dict[str, Any],
    pac_projections: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Calculate PAC actual values based on generate input and invoice data.
    This matches the original JavaScript calculatePacActual function logic.
    
    Args:
        generate_input: Data from generate_input collection
        invoice_log_totals: Data from invoice_log_totals collection
        pac_projections: Optional data from pac-projections collection
        
    Returns:
        Dictionary with PAC actual calculations matching JS structure
    """
    sales = generate_input.get("sales", {})
    food = generate_input.get("food", {})
    labor = generate_input.get("labor", {})
    inventory_starting = generate_input.get("inventoryStarting", {})
    inventory_ending = generate_input.get("inventoryEnding", {})
    invoice_totals = invoice_log_totals.get("totals", {}) if invoice_log_totals else {}
    
    # Convert to numbers, defaulting to 0
    def to_num(val):
        try:
            return float(val) if val is not None else 0.0
        except (ValueError, TypeError):
            return 0.0
    
    product_sales = to_num(sales.get("productNetSales"))
    all_net_sales = to_num(sales.get("allNetSales"))
    
    # Calculate intermediate values (matching JS logic exactly)
    other_food_components = (
        to_num(sales.get("promo")) * 0.3 +  # Promotion * 30%
        to_num(sales.get("managerMeal")) * 0.3 +  # Manager Meal * 30%
        (to_num(food.get("rawWaste")) / 100) * product_sales +  # Raw Waste % * Product Sales
        (to_num(food.get("completeWaste")) / 100) * product_sales  # Complete Waste % * Product Sales
    )
    
    rti = (
        (to_num(food.get("condiment")) / 100) * product_sales +  # Condiment % * Product Sales
        to_num(inventory_ending.get("condiment")) -  # Ending Inventory Condiment
        to_num(inventory_starting.get("condiment")) -  # Beginning Inventory Condiment
        to_num(invoice_totals.get("CONDIMENT"))  # Invoice Log Totals Condiment
    )
    
    # Food & Paper calculations
    base_food = (
        to_num(inventory_starting.get("food")) +  # Beginning Inventory Food
        to_num(invoice_totals.get("FOOD")) -  # Invoice Log Totals Food
        to_num(inventory_ending.get("food")) -  # Ending Inventory Food
        rti -  # RTI
        other_food_components  # Other Food Components
    )
    
    employee_meal = to_num(sales.get("managerMeal")) * 0.3
    condiment = (to_num(food.get("condiment")) / 100) * product_sales
    total_waste = (
        (to_num(food.get("completeWaste")) / 100) * product_sales +
        (to_num(food.get("rawWaste")) / 100) * product_sales
    )
    paper = (
        to_num(inventory_starting.get("paper")) +  # Beginning Inventory Paper
        to_num(invoice_totals.get("PAPER")) -  # Invoice Log Totals Paper
        to_num(inventory_ending.get("paper"))  # Ending Inventory Paper
    )
    
    # Purchases calculations (from invoice log totals)
    promotion_from_generate_input = to_num(sales.get("promo")) * 0.3
    advertising_from_generate_input = (to_num(sales.get("advertising")) / 100) * all_net_sales
    
    # Include invoice log totals for advertising and promotion if they exist
    promotion_from_invoices = to_num(invoice_totals.get("PROMOTION"))
    advertising_from_invoices = to_num(invoice_totals.get("ADVERTISING"))
    
    # Combine both sources for total values
    promotion = promotion_from_generate_input + promotion_from_invoices
    advertising = advertising_from_generate_input + advertising_from_invoices
    
    cash_plus_minus = -(to_num(sales.get("cash")))  # Flip the sign
    
    # Labor calculations
    crew_labor_dollars = (to_num(labor.get("crewLabor")) / 100) * product_sales
    management_labor_dollars = (
        ((to_num(labor.get("totalLabor")) - to_num(labor.get("crewLabor"))) / 100) *
        product_sales
    )
    payroll_tax_dollars = (
        (crew_labor_dollars + management_labor_dollars) *
        (to_num(labor.get("payrollTax")) / 100)
    )
    # Additional Labor Dollars (does NOT affect payroll tax calculation)
    additional_labor_dollars = to_num(labor.get("additionalLaborDollars"))
    
    # Calculate totals
    food_and_paper_total = base_food + employee_meal + condiment + total_waste + paper
    labor_total = crew_labor_dollars + management_labor_dollars + payroll_tax_dollars + additional_labor_dollars
    # Dues and Subscriptions (dollar amount from generate input)
    dues_and_subscriptions = to_num(sales.get("duesAndSubscriptions"))
    
    purchases_total = (
        to_num(invoice_totals.get("TRAVEL")) +
        advertising +  # Advertising (generate input % + invoice log totals)
        to_num(invoice_totals.get("ADV-OTHER")) +
        promotion +  # Promotion (generate input % + invoice log totals)
        to_num(invoice_totals.get("OUTSIDE SVC")) +
        to_num(invoice_totals.get("LINEN")) +
        to_num(invoice_totals.get("OP. SUPPLY")) +
        to_num(invoice_totals.get("M+R")) +
        to_num(invoice_totals.get("SML EQUIP")) +
        to_num(invoice_totals.get("UTILITIES")) +
        dues_and_subscriptions +  # Dues and Subscriptions (dollar amount)
        to_num(invoice_totals.get("OFFICE")) +
        cash_plus_minus +
        to_num(invoice_totals.get("CREW RELATIONS")) +
        to_num(invoice_totals.get("TRAINING"))
    )
    
    total_controllable = food_and_paper_total + labor_total + purchases_total
    pac_total = product_sales - total_controllable
    
    # Calculate percentages
    def calculate_percentage(dollars):
        return (dollars / product_sales * 100) if product_sales > 0 else 0
    
    # New Modules Calculations
    
    # Gross Profit
    # Formula: 100 - FoodandPaper Total %
    food_and_paper_percent = calculate_percentage(food_and_paper_total)
    gross_profit_percent = 100 - food_and_paper_percent
    
    # Food Cost Module
    # Inputs from Generate page (Food section)
    # Assumes these are stored as percentages in the input
    base_food_input = to_num(food.get("baseFood"))
    discounts_input = to_num(food.get("discounts"))
    raw_waste_input = to_num(food.get("rawWaste"))
    complete_waste_input = to_num(food.get("completeWaste"))
    stat_variance_input = to_num(food.get("variance"))
    unexplained_input = to_num(food.get("unexplained"))
    condiment_input = to_num(food.get("condiment"))
    emp_mgr_meals_percent = to_num(food.get("empMgrMealsPercent"))
    
    # Food Over Base = Raw Waste + Complete Waste + Condiment + Stat Variance + Unexplained
    # (Unexplained subtracts if negative, handled by addition)
    food_over_base = (
        raw_waste_input + 
        complete_waste_input + 
        condiment_input + 
        stat_variance_input + 
        unexplained_input
    )
    
    # Non-Product & Operating Supplies Usage
    # Operating Supplies
    ops_supplies_start = to_num(inventory_starting.get("opsSupplies"))
    ops_supplies_purchases = to_num(invoice_totals.get("OP. SUPPLY"))
    ops_supplies_end = to_num(inventory_ending.get("opsSupplies"))
    ops_supplies_usage = ops_supplies_start + ops_supplies_purchases - ops_supplies_end

    # Non-Product
    non_product_start = to_num(inventory_starting.get("nonProduct"))
    non_product_purchases = to_num(invoice_totals.get("NONPRODUCT"))
    non_product_end = to_num(inventory_ending.get("nonProduct"))
    non_product_usage = non_product_start + non_product_purchases - non_product_end

    return {
        "sales": {
            "productSales": {
                "dollars": product_sales,
                "percent": 100.0,  # Product sales is always 100% of itself
            },
            "allNetSales": {
                "dollars": all_net_sales,
                "percent": calculate_percentage(all_net_sales),
            },
        },
        "foodAndPaper": {
            "baseFood": {
                "dollars": base_food,
                "percent": calculate_percentage(base_food),
            },
            "employeeMeal": {
                "dollars": employee_meal,
                "percent": calculate_percentage(employee_meal),
            },
            "condiment": {
                "dollars": condiment,
                "percent": calculate_percentage(condiment),
            },
            "totalWaste": {
                "dollars": total_waste,
                "percent": calculate_percentage(total_waste),
            },
            "paper": {
                "dollars": paper,
                "percent": calculate_percentage(paper),
            },
            "total": {
                "dollars": food_and_paper_total,
                "percent": calculate_percentage(food_and_paper_total),
            },
        },
        "labor": {
            "crewLabor": {
                "dollars": crew_labor_dollars,
                "percent": calculate_percentage(crew_labor_dollars),
            },
            "managementLabor": {
                "dollars": management_labor_dollars,
                "percent": calculate_percentage(management_labor_dollars),
            },
            "payrollTax": {
                "dollars": payroll_tax_dollars,
                "percent": calculate_percentage(payroll_tax_dollars),
            },
            "additionalLaborDollars": {
                "dollars": additional_labor_dollars,
                "percent": calculate_percentage(additional_labor_dollars),
            },
            "total": {
                "dollars": labor_total,
                "percent": calculate_percentage(labor_total),
            },
        },
        "purchases": {
            "travel": {
                "dollars": to_num(invoice_totals.get("TRAVEL")),
                "percent": calculate_percentage(to_num(invoice_totals.get("TRAVEL"))),
            },
            "advOther": {
                "dollars": to_num(invoice_totals.get("ADV-OTHER")),
                "percent": calculate_percentage(to_num(invoice_totals.get("ADV-OTHER"))),
            },
            "promotion": {
                "dollars": promotion,
                "percent": calculate_percentage(promotion),
            },
            "outsideServices": {
                "dollars": to_num(invoice_totals.get("OUTSIDE SVC")),
                "percent": calculate_percentage(to_num(invoice_totals.get("OUTSIDE SVC"))),
            },
            "linen": {
                "dollars": to_num(invoice_totals.get("LINEN")),
                "percent": calculate_percentage(to_num(invoice_totals.get("LINEN"))),
            },
            "opsSupplies": {
                "dollars": to_num(invoice_totals.get("OP. SUPPLY")),
                "percent": calculate_percentage(to_num(invoice_totals.get("OP. SUPPLY"))),
            },
            "maintenanceRepair": {
                "dollars": to_num(invoice_totals.get("M+R")),
                "percent": calculate_percentage(to_num(invoice_totals.get("M+R"))),
            },
            "smallEquipment": {
                "dollars": to_num(invoice_totals.get("SML EQUIP")),
                "percent": calculate_percentage(to_num(invoice_totals.get("SML EQUIP"))),
            },
            "utilities": {
                "dollars": to_num(invoice_totals.get("UTILITIES")),
                "percent": calculate_percentage(to_num(invoice_totals.get("UTILITIES"))),
            },
            "office": {
                "dollars": to_num(invoice_totals.get("OFFICE")),
                "percent": calculate_percentage(to_num(invoice_totals.get("OFFICE"))),
            },
            "cashPlusMinus": {
                "dollars": cash_plus_minus,
                "percent": calculate_percentage(cash_plus_minus),
            },
            "crewRelations": {
                "dollars": to_num(invoice_totals.get("CREW RELATIONS")),
                "percent": calculate_percentage(to_num(invoice_totals.get("CREW RELATIONS"))),
            },
            "training": {
                "dollars": to_num(invoice_totals.get("TRAINING")),
                "percent": calculate_percentage(to_num(invoice_totals.get("TRAINING"))),
            },
            "duesAndSubscriptions": {
                "dollars": dues_and_subscriptions,
                "percent": calculate_percentage(dues_and_subscriptions),
            },
            "advertising": {
                "dollars": advertising,
                "percent": calculate_percentage(advertising),
            },
            "total": {
                "dollars": purchases_total,
                "percent": calculate_percentage(purchases_total),
            },
        },
        "totals": {
            "otherFoodComponents": other_food_components,
            "rti": rti,
            "totalControllable": {
                "dollars": total_controllable,
                "percent": calculate_percentage(total_controllable),
            },
            "pac": {
                "dollars": pac_total,
                "percent": 100 - calculate_percentage(total_controllable),
            },
            "grossProfit": {
                "title": "Gross Profit",
                "percent": gross_profit_percent
            },
        },
        "foodCost": {
            "baseFood": base_food_input,
            "discount": discounts_input,
            "rawWaste": raw_waste_input,
            "completeWaste": complete_waste_input,
            "statVariance": stat_variance_input,
            "foodOverBase": food_over_base,
            "empMgrMealsPercent": emp_mgr_meals_percent
        },
        "nonProductAndSupplies": {
            "operatingSupplies": {
                "starting": ops_supplies_start,
                "purchases": ops_supplies_purchases,
                "ending": ops_supplies_end,
                "usage": ops_supplies_usage
            },
            "nonProduct": {
                "starting": non_product_start,
                "purchases": non_product_purchases,
                "ending": non_product_end,
                "usage": non_product_usage
            }
        }
    }

"""
Pydantic models for PAC (Profit and Controllable) calculations
"""
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class InventoryData(BaseModel):
    """Inventory data for beginning and ending inventory counts"""
    food: Decimal = Field(default=Decimal('0'), description="Food inventory value")
    condiment: Decimal = Field(default=Decimal('0'), description="Condiment inventory value")
    paper: Decimal = Field(default=Decimal('0'), description="Paper inventory value")
    non_product: Decimal = Field(default=Decimal('0'), description="Non-product inventory value")
    op_supplies: Decimal = Field(default=Decimal('0'), description="Operating supplies inventory value")


class PurchaseData(BaseModel):
    """Purchase data for month totals by category"""
    food: Decimal = Field(default=Decimal('0'), description="Food purchases")
    condiment: Decimal = Field(default=Decimal('0'), description="Condiment purchases")
    paper: Decimal = Field(default=Decimal('0'), description="Paper purchases")
    non_product: Decimal = Field(default=Decimal('0'), description="Non-product purchases")
    travel: Decimal = Field(default=Decimal('0'), description="Travel expenses")
    advertising_other: Decimal = Field(default=Decimal('0'), description="Other advertising expenses")
    promotion: Decimal = Field(default=Decimal('0'), description="Promotion expenses")
    outside_services: Decimal = Field(default=Decimal('0'), description="Outside services")
    linen: Decimal = Field(default=Decimal('0'), description="Linen expenses")
    operating_supply: Decimal = Field(default=Decimal('0'), description="Operating supplies")
    maintenance_repair: Decimal = Field(default=Decimal('0'), description="Maintenance and repair")
    small_equipment: Decimal = Field(default=Decimal('0'), description="Small equipment")
    utilities: Decimal = Field(default=Decimal('0'), description="Utilities")
    office: Decimal = Field(default=Decimal('0'), description="Office expenses")
    training: Decimal = Field(default=Decimal('0'), description="Training expenses")
    crew_relations: Decimal = Field(default=Decimal('0'), description="Crew relations expenses")


class PacInputData(BaseModel):
    """Input data required for PAC calculations"""
    # POS / Sales Data
    product_net_sales: Decimal = Field(description="Product net sales amount")
    cash_adjustments: Decimal = Field(default=Decimal('0'), description="Cash adjustments")
    promotions: Decimal = Field(default=Decimal('0'), description="Promotions amount")
    manager_meals: Decimal = Field(default=Decimal('0'), description="Manager meals amount")

    # Labor / Payroll Data
    crew_labor_percent: Decimal = Field(description="Crew labor percentage")
    total_labor_percent: Decimal = Field(description="Total labor percentage")
    payroll_tax_rate: Decimal = Field(description="Payroll tax rate percentage")

    # Waste / Operations Data
    complete_waste_percent: Decimal = Field(description="Complete waste percentage")
    raw_waste_percent: Decimal = Field(description="Raw waste percentage")
    condiment_percent: Decimal = Field(description="Condiment percentage")

    # Inventory Counts
    beginning_inventory: InventoryData = Field(default_factory=InventoryData)
    ending_inventory: InventoryData = Field(default_factory=InventoryData)

    # Purchases / Invoices
    purchases: PurchaseData = Field(default_factory=PurchaseData)

    # Settings / Budgets
    advertising_percent: Decimal = Field(description="Advertising percentage")


class ExpenseLine(BaseModel):
    """Individual expense line with dollars and percentage"""
    dollars: Decimal = Field(description="Expense amount in dollars")
    percent: Decimal = Field(description="Expense percentage of sales")


class AmountUsedData(BaseModel):
    """Amount used data from purchases calculator"""
    food: Decimal = Field(default=Decimal('0'), description="Food amount used")
    paper: Decimal = Field(default=Decimal('0'), description="Paper amount used")
    condiment: Decimal = Field(default=Decimal('0'), description="Condiment amount used")
    non_product: Decimal = Field(default=Decimal('0'), description="Non-product amount used")
    op_supplies: Decimal = Field(default=Decimal('0'), description="Operating supplies amount used")


class ControllableExpenses(BaseModel):
    """All controllable expense lines"""
    base_food: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    employee_meal: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    condiment: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    total_waste: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    paper: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    crew_labor: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    management_labor: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    payroll_tax: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    travel: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    advertising: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    advertising_other: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    promotion: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    outside_services: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    linen: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    op_supply: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    maintenance_repair: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    small_equipment: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    utilities: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    office: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    cash_adjustments: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))
    misc_cr_tr_ds: ExpenseLine = Field(default_factory=lambda: ExpenseLine(dollars=Decimal('0'), percent=Decimal('0')))


class PacCalculationResult(BaseModel):
    """Complete PAC calculation results"""
    # Sales Section (dollars only)
    product_net_sales: Decimal = Field(default=Decimal('0'), description="Product net sales amount")
    all_net_sales: Decimal = Field(default=Decimal('0'), description="All net sales amount")

    # Purchases Calculator Results
    amount_used: AmountUsedData = Field(default_factory=AmountUsedData)

    # Controllable Expense Lines
    controllable_expenses: ControllableExpenses = Field(default_factory=ControllableExpenses)

    # Totals
    total_controllable_dollars: Decimal = Field(default=Decimal('0'), description="Total controllable expenses in dollars")
    total_controllable_percent: Decimal = Field(default=Decimal('0'), description="Total controllable expenses percentage")
    pac_percent: Decimal = Field(default=Decimal('0'), description="PAC percentage")
    pac_dollars: Decimal = Field(default=Decimal('0'), description="PAC dollars")

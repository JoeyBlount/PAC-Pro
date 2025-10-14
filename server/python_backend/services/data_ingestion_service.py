"""
Data Ingestion Service - Python implementation of C# DataIngestionService
"""
from decimal import Decimal
from typing import Dict, Any
from models import PacInputData, InventoryData, PurchaseData
import firebase_admin
from firebase_admin import firestore
import os


class DataIngestionService:
    """
    Service for ingesting data from various sources
    Python implementation of C# DataIngestionService
    """
    
    def __init__(self):
        """Initialize Firebase connection"""
        try:
            self.db = firestore.client()
        except ValueError:
            # Initialize Firebase if not already initialized
            cred_path = "config/firebase-service-account.json"
            if os.path.exists(cred_path):
                import firebase_admin
                from firebase_admin import credentials
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                self.db = firestore.client()
            else:
                raise Exception("Firebase service account key not found")
            
    async def fetch_projections(self, store_id: str, year: int, month_index_1: int):
        """
        Return (rows, pacGoal) for a store+period, or ([], 0) if none.
        """
        doc_id = f"{store_id}_{year}{month_index_1:02d}"
        snap = self.db.collection("pac-projections").document(doc_id).get()
        if not snap.exists:
            return [], 0.0
        d = snap.to_dict() or {}
        return d.get("rows", []) , float(d.get("pacGoal") or 0.0)

    async def save_projections(
        self,
        store_id: str,
        year: int,
        month_index_1: int,
        pac_goal: float,
        projections: list[dict],
    ):
        doc_id = f"{store_id}_{year}{month_index_1:02d}"
        self.db.collection("pac-projections").document(doc_id).set({
            "store_id": store_id,
            "year": year,
            "month_index_1": month_index_1,
            "pacGoal": float(pac_goal),
            "rows": projections,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        })
    
    async def _get_pac_data_from_firebase(self, entity_id: str, year_month: str) -> Dict[str, Any]:
        """Get PAC data from Firebase for a specific store and month"""
        doc_id = f"{entity_id}_{year_month}"
        doc_ref = self.db.collection('pac_input_data').document(doc_id)
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        else:
            raise Exception(f"No PAC data found for {entity_id} in {year_month}")
    
    async def get_input_data_async(self, entity_id: str, year_month: str) -> PacInputData:
        """
        Get all input data for PAC calculation from Firebase
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            PacInputData object with all required data
        """
        data = await self._get_pac_data_from_firebase(entity_id, year_month)
        
        # Convert Firebase data to PacInputData
        return PacInputData(
            product_net_sales=Decimal(str(data.get('product_net_sales', 0))),
            cash_adjustments=Decimal(str(data.get('cash_adjustments', 0))),
            promotions=Decimal(str(data.get('promotions', 0))),
            manager_meals=Decimal(str(data.get('manager_meals', 0))),
            crew_labor_percent=Decimal(str(data.get('crew_labor_percent', 0))),
            total_labor_percent=Decimal(str(data.get('total_labor_percent', 0))),
            payroll_tax_rate=Decimal(str(data.get('payroll_tax_rate', 0))),
            complete_waste_percent=Decimal(str(data.get('complete_waste_percent', 0))),
            raw_waste_percent=Decimal(str(data.get('raw_waste_percent', 0))),
            condiment_percent=Decimal(str(data.get('condiment_percent', 0))),
            advertising_percent=Decimal(str(data.get('advertising_percent', 0))),
            beginning_inventory=InventoryData(
                food=Decimal(str(data.get('beginning_inventory', {}).get('food', 0))),
                paper=Decimal(str(data.get('beginning_inventory', {}).get('paper', 0))),
                condiment=Decimal(str(data.get('beginning_inventory', {}).get('condiment', 0))),
                non_product=Decimal(str(data.get('beginning_inventory', {}).get('non_product', 0))),
                op_supplies=Decimal(str(data.get('beginning_inventory', {}).get('op_supplies', 0)))
            ),
            ending_inventory=InventoryData(
                food=Decimal(str(data.get('ending_inventory', {}).get('food', 0))),
                paper=Decimal(str(data.get('ending_inventory', {}).get('paper', 0))),
                condiment=Decimal(str(data.get('ending_inventory', {}).get('condiment', 0))),
                non_product=Decimal(str(data.get('ending_inventory', {}).get('non_product', 0))),
                op_supplies=Decimal(str(data.get('ending_inventory', {}).get('op_supplies', 0)))
            ),
            purchases=PurchaseData(
                food=Decimal(str(data.get('purchases', {}).get('food', 0))),
                paper=Decimal(str(data.get('purchases', {}).get('paper', 0))),
                condiment=Decimal(str(data.get('purchases', {}).get('condiment', 0))),
                non_product=Decimal(str(data.get('purchases', {}).get('non_product', 0))),
                op_supplies=Decimal(str(data.get('purchases', {}).get('op_supplies', 0))),
                travel=Decimal(str(data.get('purchases', {}).get('travel', 0))),
                advertising_other=Decimal(str(data.get('purchases', {}).get('advertising_other', 0))),
                promotion=Decimal(str(data.get('purchases', {}).get('promotion', 0))),
                outside_services=Decimal(str(data.get('purchases', {}).get('outside_services', 0))),
                linen=Decimal(str(data.get('purchases', {}).get('linen', 0))),
                operating_supply=Decimal(str(data.get('purchases', {}).get('operating_supply', 0))),
                maintenance_repair=Decimal(str(data.get('purchases', {}).get('maintenance_repair', 0))),
                small_equipment=Decimal(str(data.get('purchases', {}).get('small_equipment', 0))),
                utilities=Decimal(str(data.get('purchases', {}).get('utilities', 0))),
                office=Decimal(str(data.get('purchases', {}).get('office', 0))),
                training=Decimal(str(data.get('purchases', {}).get('training', 0))),
                crew_relations=Decimal(str(data.get('purchases', {}).get('crew_relations', 0)))
            )
        )
    
    async def get_product_net_sales_async(self, entity_id: str, year_month: str) -> Decimal:
        """
        Get product net sales from POS system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Product net sales amount
        """
        data = await self._get_pac_data_from_firebase(entity_id, year_month)
        return Decimal(str(data.get('product_net_sales', 0)))
    
    async def get_cash_adjustments_async(self, entity_id: str, year_month: str) -> Decimal:
        """
        Get cash adjustments from cash management system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Cash adjustments amount
        """
        data = await self._get_pac_data_from_firebase(entity_id, year_month)
        return Decimal(str(data.get('cash_adjustments', 0)))
    
    async def get_promotions_async(self, entity_id: str, year_month: str) -> Decimal:
        """
        Get promotions data from POS system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Promotions amount
        """
        # TODO: Integrate with POS promotions data
        await self._simulate_async_operation()
        return Decimal('2000')  # Mock data
    
    async def get_manager_meals_async(self, entity_id: str, year_month: str) -> Decimal:
        """
        Get manager meals from POS system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Manager meals amount
        """
        # TODO: Integrate with POS manager comps
        await self._simulate_async_operation()
        return Decimal('300')  # Mock data
    
    async def get_crew_labor_percent_async(self, entity_id: str, year_month: str) -> Decimal:
        """
        Get crew labor percentage from payroll system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Crew labor percentage
        """
        # TODO: Integrate with payroll system
        await self._simulate_async_operation()
        return Decimal('25.5')  # Mock data
    
    async def get_total_labor_percent_async(self, entity_id: str, year_month: str) -> Decimal:
        """
        Get total labor percentage from payroll system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Total labor percentage
        """
        # TODO: Integrate with payroll system
        await self._simulate_async_operation()
        return Decimal('35.0')  # Mock data
    
    async def get_payroll_tax_rate_async(self, entity_id: str, year_month: str) -> Decimal:
        """
        Get payroll tax rate from payroll system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Payroll tax rate percentage
        """
        # TODO: Integrate with payroll system
        await self._simulate_async_operation()
        return Decimal('8.5')  # Mock data
    
    async def get_complete_waste_percent_async(self, entity_id: str, year_month: str) -> Decimal:
        """
        Get complete waste percentage from waste tracking system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Complete waste percentage
        """
        # TODO: Integrate with waste tracking system
        await self._simulate_async_operation()
        return Decimal('2.5')  # Mock data
    
    async def get_raw_waste_percent_async(self, entity_id: str, year_month: str) -> Decimal:
        """
        Get raw waste percentage from waste tracking system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Raw waste percentage
        """
        # TODO: Integrate with waste tracking system
        await self._simulate_async_operation()
        return Decimal('1.8')  # Mock data
    
    async def get_condiment_percent_async(self, entity_id: str, year_month: str) -> Decimal:
        """
        Get condiment percentage from inventory management system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Condiment percentage
        """
        # TODO: Integrate with inventory management system
        await self._simulate_async_operation()
        return Decimal('3.2')  # Mock data
    
    async def get_beginning_inventory_async(self, entity_id: str, year_month: str) -> InventoryData:
        """
        Get beginning inventory from inventory management system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Beginning inventory data
        """
        # TODO: Integrate with inventory management system
        await self._simulate_async_operation()
        return InventoryData(
            food=Decimal('15000'),
            condiment=Decimal('2000'),
            paper=Decimal('3000'),
            non_product=Decimal('1000'),
            op_supplies=Decimal('500')
        )
    
    async def get_ending_inventory_async(self, entity_id: str, year_month: str) -> InventoryData:
        """
        Get ending inventory from inventory management system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Ending inventory data
        """
        # TODO: Integrate with inventory management system
        await self._simulate_async_operation()
        return InventoryData(
            food=Decimal('12000'),
            condiment=Decimal('1800'),
            paper=Decimal('2500'),
            non_product=Decimal('800'),
            op_supplies=Decimal('500')
        )
    
    async def get_purchases_async(self, entity_id: str, year_month: str) -> PurchaseData:
        """
        Get purchases data from invoice/invoice system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Purchase data
        """
        # TODO: Integrate with invoice/invoice system
        await self._simulate_async_operation()
        return PurchaseData(
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
        )
    
    async def get_advertising_percent_async(self, entity_id: str, year_month: str) -> Decimal:
        """
        Get advertising percentage from settings/budget system
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Advertising percentage
        """
        # TODO: Integrate with settings/budget system
        await self._simulate_async_operation()
        return Decimal('2.0')  # Mock data
    
    async def get_input_data(self, entity_id: str, year_month: str) -> PacInputData:
        """
        Get complete input data for PAC calculations
        This method aggregates all individual data retrieval methods
        
        Args:
            entity_id: Store/entity identifier
            year_month: Year and month in YYYYMM format
            
        Returns:
            Complete input data for PAC calculations
        """
        # Get all data concurrently for better performance
        import asyncio
        (
            product_net_sales,
            cash_adjustments,
            promotions,
            manager_meals,
            crew_labor_percent,
            total_labor_percent,
            payroll_tax_rate,
            complete_waste_percent,
            raw_waste_percent,
            condiment_percent,
            beginning_inventory,
            ending_inventory,
            purchases,
            advertising_percent
        ) = await asyncio.gather(
            self.get_product_net_sales_async(entity_id, year_month),
            self.get_cash_adjustments_async(entity_id, year_month),
            self.get_promotions_async(entity_id, year_month),
            self.get_manager_meals_async(entity_id, year_month),
            self.get_crew_labor_percent_async(entity_id, year_month),
            self.get_total_labor_percent_async(entity_id, year_month),
            self.get_payroll_tax_rate_async(entity_id, year_month),
            self.get_complete_waste_percent_async(entity_id, year_month),
            self.get_raw_waste_percent_async(entity_id, year_month),
            self.get_condiment_percent_async(entity_id, year_month),
            self.get_beginning_inventory_async(entity_id, year_month),
            self.get_ending_inventory_async(entity_id, year_month),
            self.get_purchases_async(entity_id, year_month),
            self.get_advertising_percent_async(entity_id, year_month)
        )
        
        return PacInputData(
            product_net_sales=product_net_sales,
            cash_adjustments=cash_adjustments,
            promotions=promotions,
            manager_meals=manager_meals,
            crew_labor_percent=crew_labor_percent,
            total_labor_percent=total_labor_percent,
            payroll_tax_rate=payroll_tax_rate,
            complete_waste_percent=complete_waste_percent,
            raw_waste_percent=raw_waste_percent,
            condiment_percent=condiment_percent,
            beginning_inventory=beginning_inventory,
            ending_inventory=ending_inventory,
            purchases=purchases,
            advertising_percent=advertising_percent
        )
    
    async def _simulate_async_operation(self):
        """Simulate async operation delay"""
        import asyncio
        await asyncio.sleep(0.001)  # Simulate async operation

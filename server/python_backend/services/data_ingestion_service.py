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
        # Normalize incoming rows into a well-structured document so other
        # services (and the Actual tab) can read consistent fields.
        def by_name(name: str) -> dict:
            for r in projections or []:
                if str(r.get("name")).strip().lower() == name.strip().lower():
                    return r
            return {}

        def get_dollar(row_name: str) -> float:
            r = by_name(row_name)
            try:
                return float(r.get("projectedDollar") or 0.0)
            except Exception:
                return 0.0

        # Top-level fields commonly needed downstream
        product_net_sales = get_dollar("Product Sales") or get_dollar("Product Net Sales")
        cash_adjustments = get_dollar("Cash +/-")

        # Purchases mapping
        purchase_map = {
            "travel": ["Travel"],
            "advertising_other": ["Adv Other", "Advertising Other"],
            "promotion": ["Promotion"],
            "outside_services": ["Outside Services"],
            "linen": ["Linen"],
            "operating_supply": ["OP. Supply", "Operating Supply"],
            "maintenance_repair": ["Maint. & Repair", "Maintenance & Repair"],
            "small_equipment": ["Small Equipment"],
            "utilities": ["Utilities"],
            "office": ["Office"],
            "training": ["Training"],
            "crew_relations": ["Crew Relations"],
        }

        purchases: Dict[str, float] = {}
        for key, names in purchase_map.items():
            amt = 0.0
            for nm in names:
                v = get_dollar(nm)
                if v:  # first match wins (explicit ordering above)
                    amt = v
                    break
            purchases[key] = amt

        self.db.collection("pac-projections").document(doc_id).set(
            {
                "store_id": store_id,
                "year": year,
                "month_index_1": month_index_1,
                "pacGoal": float(pac_goal),
                "rows": projections,  # keep raw rows for UI seeding/reset
                # Structured fields for backend/Actual tab consumption
                "product_net_sales": product_net_sales,
                "cash_adjustments": cash_adjustments,
                "purchases": purchases,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            },
            merge=False,  # overwrite existing doc entirely for this month/store
        )
    
    async def _get_pac_data_from_firebase(self, entity_id: str, year_month: str) -> Dict[str, Any]:
        """Get PAC data from Firebase for a specific store and month using pac-projections"""
        doc_id = f"{entity_id}_{year_month}"
        doc_ref = self.db.collection('pac-projections').document(doc_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict() or {}
        else:
            return {}
    
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

        # --- Backward compatible derivation ---
        # Older documents may only contain `rows` without a structured `purchases` map.
        # If so, derive structured fields from rows so Training and Crew Relations show up.
        try:
            rows = data.get("rows") if isinstance(data, dict) else None
            purchases = data.get("purchases") if isinstance(data, dict) else None

            needs_derivation = isinstance(rows, list) and (
                not isinstance(purchases, dict)
                or any(
                    key not in purchases
                    for key in [
                        "travel",
                        "advertising_other",
                        "promotion",
                        "outside_services",
                        "linen",
                        "operating_supply",
                        "maintenance_repair",
                        "small_equipment",
                        "utilities",
                        "office",
                        "training",
                        "crew_relations",
                    ]
                )
            )

            if needs_derivation:
                def by_name(name: str) -> Dict[str, Any]:
                    for r in rows:
                        nm = str(r.get("name", "")).strip().lower()
                        if nm == name.strip().lower():
                            return r or {}
                    return {}

                def get_dollar(row_name: str) -> float:
                    r = by_name(row_name)
                    try:
                        return float(r.get("projectedDollar") or 0.0)
                    except Exception:
                        return 0.0

                # Sales fallbacks
                pns = get_dollar("Product Sales") or get_dollar("Product Net Sales")
                ca = get_dollar("Cash +/-")

                # Derive purchases from rows using same mapping as save_projections
                purchase_map = {
                    "travel": ["Travel"],
                    "advertising_other": ["Adv Other", "Advertising Other"],
                    "promotion": ["Promotion"],
                    "outside_services": ["Outside Services"],
                    "linen": ["Linen"],
                    "operating_supply": ["OP. Supply", "Operating Supply"],
                    "maintenance_repair": ["Maint. & Repair", "Maintenance & Repair"],
                    "small_equipment": ["Small Equipment"],
                    "utilities": ["Utilities"],
                    "office": ["Office"],
                    "training": ["Training"],
                    "crew_relations": ["Crew Relations"],
                }

                derived_purchases: Dict[str, float] = {}
                for key, names in purchase_map.items():
                    amt = 0.0
                    for nm in names:
                        v = get_dollar(nm)
                        if v:
                            amt = v
                            break
                    derived_purchases[key] = amt

                # Merge back, preserving any existing structured values
                data = {
                    **data,
                    "product_net_sales": float(data.get("product_net_sales") or pns or 0.0),
                    "cash_adjustments": float(data.get("cash_adjustments") or ca or 0.0),
                    "purchases": {**(purchases or {}), **derived_purchases},
                }
        except Exception:
            # Non-fatal; proceed with whatever we have
            pass
        
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
    
    # Removed legacy mock getters and aggregator to reduce confusion. Firebase-backed
    # methods above are the source of truth.

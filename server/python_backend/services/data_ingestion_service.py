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
        Get all input data for PAC calculation from Firebase.
        fetches from generate_input and invoice_log_totals for Actuals.
        """
        # --- Fetch Historical Sales Data ---
        try:
            year = int(year_month[:4])
            month_num = int(year_month[4:])
            
            # Helper to format YYYYMM
            def get_ym_str(y, m):
                return f"{y}{m:02d}"
            
            # Last Year Same Month
            last_year_ym = get_ym_str(year - 1, month_num)
            
            # Last Month
            if month_num == 1:
                last_month_ym = get_ym_str(year - 1, 12)
            else:
                last_month_ym = get_ym_str(year, month_num - 1)
                
            # Last Month Last Year
            last_month_year = int(last_month_ym[:4])
            last_month_mon = int(last_month_ym[4:])
            last_month_last_year_ym = get_ym_str(last_month_year - 1, last_month_mon)
            
            # Last Year Same Month Last Year
            last_year_last_year_ym = get_ym_str(year - 2, month_num)
            
            def get_sales_sync(ym):
                """Synchronous helper to fetch sales data for a given year-month"""
                try:
                    # 1. Try generate_input (Actuals) - SOURCE OF TRUTH
                    doc_id = f"{entity_id}_{ym}"
                    doc_ref = self.db.collection('generate_input').document(doc_id)
                    doc = doc_ref.get()
                    if doc.exists:
                        data = doc.to_dict() or {}
                        sales = data.get('sales', {})
                        val = sales.get('productNetSales')
                        if val is not None and val != 0 and val != '0':
                            try:
                                return Decimal(str(val).replace('$', '').replace(',', ''))
                            except:
                                pass
                    
                    # 2. Fallback to pac-projections
                    proj_doc = self.db.collection('pac-projections').document(doc_id).get()
                    if proj_doc.exists:
                        proj_data = proj_doc.to_dict() or {}
                        val = proj_data.get('product_net_sales')
                        if val is not None:
                            try:
                                return Decimal(str(val).replace('$', '').replace(',', ''))
                            except:
                                pass
                    
                    return Decimal('0')
                except Exception as e:
                    print(f"Warning: Error fetching sales for {ym}: {e}")
                    return Decimal('0')

            last_year_sales = get_sales_sync(last_year_ym)
            last_month_sales = get_sales_sync(last_month_ym)
            last_month_last_year_sales = get_sales_sync(last_month_last_year_ym)
            last_year_last_year_sales = get_sales_sync(last_year_last_year_ym)
            
        except Exception as e:
            print(f"Warning: Could not fetch historical sales data: {e}")
            last_year_sales = Decimal('0')
            last_month_sales = Decimal('0')
            last_month_last_year_sales = Decimal('0')
            last_year_last_year_sales = Decimal('0')

        # --- Fetch Actuals Data (Generate Input + Invoice Logs) ---
        doc_id = f"{entity_id}_{year_month}"
        gen_doc = self.db.collection('generate_input').document(doc_id).get()
        
        if gen_doc.exists:
            # Use Actuals Data
            gen_data = gen_doc.to_dict() or {}
            
            inv_doc = self.db.collection('invoice_log_totals').document(doc_id).get()
            inv_data = inv_doc.to_dict() if inv_doc.exists else {}
            inv_totals = inv_data.get('totals') or {}
            
            # Normalize keys for robust matching
            normalized_totals = {}
            for k, v in inv_totals.items():
                # e.g. "OP. SUPPLY" -> "OPSUPPLY"
                key_norm = str(k).strip().upper().replace('.', '').replace(' ', '').replace('_', '')
                normalized_totals[key_norm] = v

            def d(val):
                try:
                    if val is None: return Decimal('0')
                    # Handle string formatting like "$1,234.56"
                    s = str(val).replace('$', '').replace(',', '').strip()
                    if not s: return Decimal('0')
                    return Decimal(s)
                except:
                    return Decimal('0')

            def get_inv(keys):
                for k in keys:
                    # 1. Exact match
                    if k in inv_totals:
                        return d(inv_totals[k])
                    # 2. Normalized match
                    for variant in [k, k.upper()]:
                        k_clean = variant.strip().replace('.', '').replace(' ', '').replace('_', '')
                        if k_clean in normalized_totals:
                            return d(normalized_totals[k_clean])
                return Decimal('0')

            sales = gen_data.get('sales') or {}
            labor = gen_data.get('labor') or {}
            food = gen_data.get('food') or {}
            inv_start = gen_data.get('inventoryStarting') or {}
            inv_end = gen_data.get('inventoryEnding') or {}

            return PacInputData(
                last_year_product_sales=last_year_sales,
                last_month_product_sales=last_month_sales,
                last_month_last_year_product_sales=last_month_last_year_sales,
                last_year_last_year_product_sales=last_year_last_year_sales,

                product_net_sales=d(sales.get('productNetSales')),
                cash_adjustments=d(sales.get('cashAdjustments')),
                promotions=d(sales.get('promo')),
                manager_meals=d(sales.get('managerMeal')),
                
                crew_labor_percent=d(labor.get('crewLabor')),
                total_labor_percent=d(labor.get('totalLabor')),
                payroll_tax_rate=d(labor.get('payrollTax')),
                additional_labor_dollars=d(labor.get('additionalLaborDollars')),
                
                dues_and_subscriptions=d(sales.get('duesAndSubscriptions')),
                
                complete_waste_percent=d(food.get('completeWaste')),
                raw_waste_percent=d(food.get('rawWaste')),
                condiment_percent=d(food.get('condiment')),
                advertising_percent=d(sales.get('advertising')), # percent

                beginning_inventory=InventoryData(
                    food=d(inv_start.get('food')),
                    paper=d(inv_start.get('paper')),
                    condiment=d(inv_start.get('condiment')),
                    non_product=d(inv_start.get('nonProduct')),
                    op_supplies=d(inv_start.get('opsSupplies'))
                ),
                ending_inventory=InventoryData(
                    food=d(inv_end.get('food')),
                    paper=d(inv_end.get('paper')),
                    condiment=d(inv_end.get('condiment')),
                    non_product=d(inv_end.get('nonProduct')),
                    op_supplies=d(inv_end.get('opsSupplies'))
                ),
                
                purchases=PurchaseData(
                    food=get_inv(['FOOD']),
                    paper=get_inv(['PAPER']),
                    condiment=get_inv(['CONDIMENT']),
                    non_product=get_inv(['NONPRODUCT', 'NON PRODUCT']),
                    # PurchaseData has operating_supply, not op_supplies
                    operating_supply=get_inv(['OP. SUPPLY', 'OP SUPPLY']),
                    travel=get_inv(['TRAVEL']),
                    advertising_other=get_inv(['ADV-OTHER', 'ADV OTHER']),
                    promotion=get_inv(['PROMO']),
                    outside_services=get_inv(['OUTSIDE SVC', 'OUTSIDE SERVICES']),
                    linen=get_inv(['LINEN']),
                    maintenance_repair=get_inv(['M+R', 'MAINTENANCE & REPAIR']),
                    small_equipment=get_inv(['SML EQUIP', 'SMALL EQUIPMENT']),
                    utilities=get_inv(['UTILITIES']),
                    office=get_inv(['OFFICE']),
                    training=get_inv(['TRAINING']),
                    crew_relations=get_inv(['CREW RELATIONS'])
                )
            )

        # --- Fallback to Projections (Legacy/Budget logic) ---
        data = await self._get_pac_data_from_firebase(entity_id, year_month)
        
        # Also read from generate_input for additional labor dollars and dues and subscriptions (Legacy partial read)
        try:
            if gen_doc.exists:
                gen_data = gen_doc.to_dict() or {}
                labor_data = gen_data.get('labor', {})
                sales_data = gen_data.get('sales', {})
                data['additional_labor_dollars'] = float(labor_data.get('additionalLaborDollars', 0))
                data['dues_and_subscriptions'] = float(sales_data.get('duesAndSubscriptions', 0))
            else:
                data['additional_labor_dollars'] = 0.0
                data['dues_and_subscriptions'] = 0.0
        except Exception:
            pass

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
        
        # --- Fetch Historical Sales Data ---
        try:
            year = int(year_month[:4])
            month_num = int(year_month[4:])
            
            # Helper to format YYYYMM
            def get_ym_str(y, m):
                return f"{y}{m:02d}"
            
            # Last Year Same Month
            last_year_ym = get_ym_str(year - 1, month_num)
            
            # Last Month
            if month_num == 1:
                last_month_ym = get_ym_str(year - 1, 12)
            else:
                last_month_ym = get_ym_str(year, month_num - 1)
                
            # Last Month Last Year (Same month as "Last Month" but previous year)
            # e.g. if Current is Jan 2025, Last Month is Dec 2024, Last Month Last Year is Dec 2023
            # If Current is Feb 2025, Last Month is Jan 2025, Last Month Last Year is Jan 2024
            last_month_year = int(last_month_ym[:4])
            last_month_mon = int(last_month_ym[4:])
            last_month_last_year_ym = get_ym_str(last_month_year - 1, last_month_mon)
            
            # Last Year Same Month Last Year (2 years ago)
            last_year_last_year_ym = get_ym_str(year - 2, month_num)
            
            async def get_sales(ym):
                try:
                    d = await self._get_pac_data_from_firebase(entity_id, ym)
                    return Decimal(str(d.get('product_net_sales', 0)))
                except:
                    return Decimal('0')

            last_year_sales = await get_sales(last_year_ym)
            last_month_sales = await get_sales(last_month_ym)
            last_month_last_year_sales = await get_sales(last_month_last_year_ym)
            last_year_last_year_sales = await get_sales(last_year_last_year_ym)
            
        except Exception as e:
            print(f"Warning: Could not fetch historical sales data: {e}")
            last_year_sales = Decimal('0')
            last_month_sales = Decimal('0')
            last_month_last_year_sales = Decimal('0')
            last_year_last_year_sales = Decimal('0')

        # Convert Firebase data to PacInputData
        return PacInputData(
            last_year_product_sales=last_year_sales,
            last_month_product_sales=last_month_sales,
            last_month_last_year_product_sales=last_month_last_year_sales,
            last_year_last_year_product_sales=last_year_last_year_sales,
            product_net_sales=Decimal(str(data.get('product_net_sales', 0))),
            cash_adjustments=Decimal(str(data.get('cash_adjustments', 0))),
            promotions=Decimal(str(data.get('promotions', 0))),
            manager_meals=Decimal(str(data.get('manager_meals', 0))),
            crew_labor_percent=Decimal(str(data.get('crew_labor_percent', 0))),
            total_labor_percent=Decimal(str(data.get('total_labor_percent', 0))),
            payroll_tax_rate=Decimal(str(data.get('payroll_tax_rate', 0))),
            additional_labor_dollars=Decimal(str(data.get('additional_labor_dollars', 0))),
            dues_and_subscriptions=Decimal(str(data.get('dues_and_subscriptions', 0))),
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

"""
Firebase Data Generator for PAC (Profit and Controllable) System
Generates comprehensive test data for multiple stores and 12 months
"""
import firebase_admin
from firebase_admin import credentials, firestore
import random
from decimal import Decimal
from datetime import datetime, date
import json
import os
from typing import Dict, List, Any
import uuid

# Initialize Firebase (you'll need to add your service account key)
def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Try to get default app first
        app = firebase_admin.get_app()
        print("Using existing Firebase app")
    except ValueError:
        # Initialize new app
        # You'll need to download your service account key and place it in the project
        # For now, we'll use a placeholder path
        cred_path = "firebase-service-account.json"
        
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            app = firebase_admin.initialize_app(cred)
            print("Firebase initialized with service account key")
        else:
            print("Warning: Firebase service account key not found. Using default credentials.")
            print("Please add your firebase-service-account.json file to the project root.")
            # For development, you can use default credentials if running on GCP
            app = firebase_admin.initialize_app()
    
    return firestore.client()

class PACDataGenerator:
    """Generate comprehensive PAC test data for Firebase"""
    
    def __init__(self, db):
        self.db = db
        self.stores = [
            {
                "id": "store_001", 
                "name": "Downtown Location", 
                "city": "New York", 
                "state": "NY",
                "address": "123 Main Street",
                "entity": "Downtown Corp",
                "startMonth": "January",
                "storeID": "001",
                "subName": "Downtown"
            },
            {
                "id": "store_002", 
                "name": "Mall Branch", 
                "city": "Los Angeles", 
                "state": "CA",
                "address": "456 Mall Drive",
                "entity": "Mall Corp",
                "startMonth": "February",
                "storeID": "002",
                "subName": "Mall"
            },
            {
                "id": "store_003", 
                "name": "Airport Terminal", 
                "city": "Chicago", 
                "state": "IL",
                "address": "789 Airport Blvd",
                "entity": "Airport Corp",
                "startMonth": "March",
                "storeID": "003",
                "subName": "Airport"
            },
            {
                "id": "store_004", 
                "name": "University Campus", 
                "city": "Boston", 
                "state": "MA",
                "address": "321 Campus Way",
                "entity": "University Corp",
                "startMonth": "April",
                "storeID": "004",
                "subName": "Campus"
            },
            {
                "id": "store_005", 
                "name": "Suburban Plaza", 
                "city": "Houston", 
                "state": "TX",
                "address": "654 Plaza Street",
                "entity": "Suburban Corp",
                "startMonth": "May",
                "storeID": "005",
                "subName": "Suburban"
            },
            {
                "id": "store_006", 
                "name": "Beachfront Store", 
                "city": "Miami", 
                "state": "FL",
                "address": "987 Beach Road",
                "entity": "Beachfront Corp",
                "startMonth": "June",
                "storeID": "006",
                "subName": "Beachfront"
            },
            {
                "id": "store_007", 
                "name": "Tech District", 
                "city": "Seattle", 
                "state": "WA",
                "address": "147 Tech Avenue",
                "entity": "Tech Corp",
                "startMonth": "July",
                "storeID": "007",
                "subName": "Tech"
            },
            {
                "id": "store_008", 
                "name": "Historic District", 
                "city": "Philadelphia", 
                "state": "PA",
                "address": "258 Historic Lane",
                "entity": "Historic Corp",
                "startMonth": "August",
                "storeID": "008",
                "subName": "Historic"
            }
        ]
        
        self.months_2025 = [
            "202501", "202502", "202503", "202504", "202505", "202506",
            "202507", "202508", "202509", "202510", "202511", "202512"
        ]
    
    def generate_realistic_sales_data(self, store_id: str, month: str) -> Dict[str, Any]:
        """Generate realistic sales data with seasonal variations"""
        month_num = int(month[4:6])
        
        # Base sales vary by store size and season - Updated for $100k-$900k range
        base_sales = {
            "store_001": 150000,  # Downtown - high volume
            "store_002": 200000,  # Mall - medium-high
            "store_003": 180000,  # Airport - high volume
            "store_004": 120000,  # University - medium
            "store_005": 100000,  # Suburban - medium
            "store_006": 250000,  # Beachfront - seasonal
            "store_007": 300000,  # Tech District - medium-high
            "store_008": 400000   # Historic - higher volume
        }
        
        # Seasonal multipliers - Updated to ensure $100k-$900k range
        seasonal_multipliers = {
            1: 0.85,   # January - post-holiday slump
            2: 0.90,   # February - Valentine's boost
            3: 1.05,   # March - spring pickup
            4: 1.10,   # April - spring peak
            5: 1.15,   # May - graduation season
            6: 1.20,   # June - summer start
            7: 1.25,   # July - summer peak
            8: 1.20,   # August - summer
            9: 1.05,   # September - back to school
            10: 1.10,  # October - fall
            11: 1.15,  # November - pre-holiday
            12: 1.30   # December - holiday peak
        }
        
        base = base_sales.get(store_id, 80000)
        seasonal = seasonal_multipliers.get(month_num, 1.0)
        
        # Add some random variation (±5%)
        variation = random.uniform(0.95, 1.05)
        
        product_net_sales = int(base * seasonal * variation)
        
        return {
            "product_net_sales": product_net_sales,
            "cash_adjustments": random.randint(-200, 500),
            "promotions": int(product_net_sales * random.uniform(0.02, 0.05)),
            "manager_meals": random.randint(200, 600)
        }
    
    def generate_labor_data(self, store_id: str, month: str) -> Dict[str, Any]:
        """Generate realistic labor data"""
        # Labor percentages vary by store type and season
        base_crew_labor = random.uniform(22.0, 28.0)
        base_total_labor = base_crew_labor + random.uniform(8.0, 12.0)
        
        return {
            "crew_labor_percent": round(base_crew_labor, 1),
            "total_labor_percent": round(base_total_labor, 1),
            "payroll_tax_rate": round(random.uniform(7.5, 9.5), 1)
        }
    
    def generate_waste_data(self, store_id: str, month: str) -> Dict[str, Any]:
        """Generate realistic waste data"""
        return {
            "complete_waste_percent": round(random.uniform(2.0, 3.5), 1),
            "raw_waste_percent": round(random.uniform(1.5, 2.5), 1),
            "condiment_percent": round(random.uniform(2.8, 3.8), 1)
        }
    
    def generate_inventory_data(self, store_id: str, month: str) -> Dict[str, Any]:
        """Generate realistic inventory data"""
        # Inventory levels vary by store size
        store_multipliers = {
            "store_001": 1.3, "store_002": 1.1, "store_003": 1.2,
            "store_004": 1.0, "store_005": 0.9, "store_006": 1.0,
            "store_007": 1.1, "store_008": 0.8
        }
        
        multiplier = store_multipliers.get(store_id, 1.0)
        
        return {
            "beginning_inventory": {
                "food": int(12000 * multiplier),
                "condiment": int(1500 * multiplier),
                "paper": int(2000 * multiplier),
                "non_product": int(800 * multiplier),
                "op_supplies": int(400 * multiplier)
            },
            "ending_inventory": {
                "food": int(10000 * multiplier),
                "condiment": int(1300 * multiplier),
                "paper": int(1800 * multiplier),
                "non_product": int(600 * multiplier),
                "op_supplies": int(400 * multiplier)
            }
        }
    
    def generate_purchases_data(self, store_id: str, month: str, sales_data: Dict) -> Dict[str, Any]:
        """Generate realistic purchases data based on sales"""
        product_net_sales = sales_data["product_net_sales"]
        
        # Purchases scale with sales volume
        food_purchases = int(product_net_sales * random.uniform(0.35, 0.45))
        
        return {
            "food": food_purchases,
            "condiment": int(food_purchases * random.uniform(0.06, 0.08)),
            "paper": int(product_net_sales * random.uniform(0.02, 0.03)),
            "non_product": int(product_net_sales * random.uniform(0.015, 0.025)),
            "travel": random.randint(500, 1200),
            "advertising_other": random.randint(800, 1500),
            "promotion": random.randint(600, 1200),
            "outside_services": random.randint(400, 800),
            "linen": random.randint(300, 600),
            "operating_supply": random.randint(200, 500),
            "maintenance_repair": random.randint(300, 700),
            "small_equipment": random.randint(100, 400),
            "utilities": random.randint(800, 1500),
            "office": random.randint(100, 300),
            "training": random.randint(200, 500),
            "crew_relations": random.randint(150, 400)
        }
    
    def generate_advertising_data(self, store_id: str, month: str) -> Dict[str, Any]:
        """Generate advertising percentage data"""
        return {
            "advertising_percent": round(random.uniform(1.5, 2.5), 1)
        }
    
    def generate_complete_pac_input_data(self, store_id: str, month: str) -> Dict[str, Any]:
        """Generate complete PAC input data for a store and month"""
        sales_data = self.generate_realistic_sales_data(store_id, month)
        labor_data = self.generate_labor_data(store_id, month)
        waste_data = self.generate_waste_data(store_id, month)
        inventory_data = self.generate_inventory_data(store_id, month)
        purchases_data = self.generate_purchases_data(store_id, month, sales_data)
        advertising_data = self.generate_advertising_data(store_id, month)
        
        return {
            "store_id": store_id,
            "year_month": month,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            **sales_data,
            **labor_data,
            **waste_data,
            **inventory_data,
            "purchases": purchases_data,
            **advertising_data
        }
    
    def upload_store_data(self, store_id: str, month: str, data: Dict[str, Any]):
        """Upload PAC input data to Firebase"""
        doc_ref = self.db.collection('pac_input_data').document(f"{store_id}_{month}")
        doc_ref.set(data)
        print(f"Uploaded data for {store_id} - {month}")
    
    def upload_store_info(self, store_info: Dict[str, Any]):
        """Upload store information to Firebase"""
        doc_ref = self.db.collection('stores').document(store_info['id'])
        doc_ref.set(store_info)
        print(f"Uploaded store info for {store_info['name']}")
    
    def generate_and_upload_all_data(self):
        """Generate and upload all test data"""
        print("Starting data generation and upload...")
        
        # Upload store information
        for store in self.stores:
            self.upload_store_info(store)
        
        # Generate and upload PAC data for each store and month
        total_records = 0
        for store in self.stores:
            store_id = store['id']
            for month in self.months_2025:
                data = self.generate_complete_pac_input_data(store_id, month)
                self.upload_store_data(store_id, month, data)
                total_records += 1
        
        print(f"\nData generation complete!")
        print(f"Uploaded {len(self.stores)} stores")
        print(f"Uploaded {total_records} PAC data records")
        print(f"Total months covered: {len(self.months_2025)}")
    
    def create_firebase_structure_documentation(self):
        """Create documentation for the Firebase structure"""
        structure = {
            "collections": {
                "stores": {
                    "description": "Store information and metadata",
                    "fields": {
                        "id": "string - unique store identifier",
                        "name": "string - store display name",
                        "city": "string - store city",
                        "state": "string - store state"
                    }
                },
                "pac_input_data": {
                    "description": "PAC calculation input data by store and month",
                    "document_id_format": "{store_id}_{year_month}",
                    "fields": {
                        "store_id": "string - reference to store",
                        "year_month": "string - YYYYMM format",
                        "product_net_sales": "number - POS sales data",
                        "cash_adjustments": "number - cash over/short",
                        "promotions": "number - promotional discounts",
                        "manager_meals": "number - manager comps",
                        "crew_labor_percent": "number - crew labor percentage",
                        "total_labor_percent": "number - total labor percentage",
                        "payroll_tax_rate": "number - payroll tax rate",
                        "complete_waste_percent": "number - complete waste percentage",
                        "raw_waste_percent": "number - raw waste percentage",
                        "condiment_percent": "number - condiment percentage",
                        "beginning_inventory": "object - inventory at month start",
                        "ending_inventory": "object - inventory at month end",
                        "purchases": "object - purchase data by category",
                        "advertising_percent": "number - advertising percentage",
                        "created_at": "timestamp - record creation time",
                        "updated_at": "timestamp - last update time"
                    }
                },
                "pac_calculations": {
                    "description": "Calculated PAC results (optional - can be computed on-demand)",
                    "document_id_format": "{store_id}_{year_month}",
                    "fields": {
                        "store_id": "string - reference to store",
                        "year_month": "string - YYYYMM format",
                        "product_net_sales": "number - calculated result",
                        "all_net_sales": "number - calculated result",
                        "amount_used": "object - calculated amount used data",
                        "controllable_expenses": "object - calculated expense data",
                        "total_controllable_dollars": "number - calculated total",
                        "total_controllable_percent": "number - calculated percentage",
                        "pac_percent": "number - calculated PAC percentage",
                        "pac_dollars": "number - calculated PAC dollars",
                        "calculated_at": "timestamp - calculation time"
                    }
                }
            }
        }
        
        with open("firebase_structure.json", "w") as f:
            json.dump(structure, f, indent=2, default=str)
        
        print("Firebase structure documentation saved to firebase_structure.json")

def main():
    """Main function to run the data generator"""
    print("PAC Data Generator for Firebase")
    print("=" * 40)
    
    # Initialize Firebase
    try:
        db = initialize_firebase()
        print("Firebase connection established")
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        print("Please ensure you have:")
        print("1. Firebase project set up")
        print("2. Service account key downloaded as 'firebase-service-account.json'")
        print("3. Firebase Admin SDK installed: pip install firebase-admin")
        return
    
    # Create data generator
    generator = PACDataGenerator(db)
    
    # Create structure documentation
    generator.create_firebase_structure_documentation()
    
    # Generate and upload data
    generator.generate_and_upload_all_data()
    
    print("\n" + "=" * 40)
    print("Data generation and upload complete!")
    print("Check your Firebase console to verify the data.")

if __name__ == "__main__":
    main()

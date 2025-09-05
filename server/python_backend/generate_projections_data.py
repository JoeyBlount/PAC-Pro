"""
Generate Projections Data for Firebase
This script generates realistic projections data for all stores and months
"""
import firebase_admin
from firebase_admin import credentials, firestore
import os
import random
from decimal import Decimal
from typing import Dict, Any

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        app = firebase_admin.get_app()
        print("Using existing Firebase app")
    except ValueError:
        cred_path = "firebase-service-account.json"
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            app = firebase_admin.initialize_app(cred)
            print("Firebase initialized with service account key")
        else:
            print("Error: Firebase service account key not found")
            return None
    return firestore.client()

class ProjectionsDataGenerator:
    """Generate comprehensive projections data for Firebase"""
    
    def __init__(self, db):
        self.db = db
        self.stores = [
            "store_001", "store_002", "store_003", "store_004",
            "store_005", "store_006", "store_007", "store_008"
        ]
        
        self.months_2025 = [
            "202501", "202502", "202503", "202504", "202505", "202506",
            "202507", "202508", "202509", "202510", "202511", "202512"
        ]
    
    def generate_projections_data(self, store_id: str, year_month: str) -> Dict[str, Any]:
        """Generate realistic projections data for a store and month"""
        month_num = int(year_month[4:6])
        
        # Base projections vary by store size and season
        base_projections = {
            "store_001": 150000,  # Downtown - high volume
            "store_002": 200000,  # Mall - medium-high
            "store_003": 180000,  # Airport - high volume
            "store_004": 120000,  # University - medium
            "store_005": 100000,  # Suburban - medium
            "store_006": 250000,  # Beachfront - seasonal
            "store_007": 300000,  # Tech District - medium-high
            "store_008": 400000   # Historic - higher volume
        }
        
        # Seasonal multipliers
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
        
        base = base_projections.get(store_id, 100000)
        seasonal = seasonal_multipliers.get(month_num, 1.0)
        
        # Add some random variation (±3% for projections)
        variation = random.uniform(0.97, 1.03)
        product_net_sales = int(base * seasonal * variation)
        
        # Generate projections data with different values than actual data
        # Add significant variation to make projections different from actuals
        sales_variation = random.uniform(0.90, 1.10)  # ±10% variation
        projected_sales = int(product_net_sales * sales_variation)
        
        projections_data = {
            "store_id": store_id,
            "year_month": year_month,
            "product_net_sales": projected_sales,
            "cash_adjustments": random.randint(30, 150),  # Different range
            "promotions": int(projected_sales * random.uniform(0.03, 0.07)),  # Different range
            "manager_meals": int(projected_sales * random.uniform(0.001, 0.005)),  # Different range
            "crew_labor_percent": random.uniform(22.0, 30.0),  # Different range
            "total_labor_percent": random.uniform(32.0, 40.0),  # Different range
            "payroll_tax_rate": random.uniform(8.0, 11.0),  # Different range
            "complete_waste_percent": random.uniform(2.0, 5.0),  # Different range
            "raw_waste_percent": random.uniform(1.0, 4.0),  # Different range
            "condiment_percent": random.uniform(1.5, 4.5),  # Different range
            "advertising_percent": random.uniform(1.0, 3.5),  # Different range
            "beginning_inventory": {
                "food": int(projected_sales * random.uniform(0.10, 0.20)),  # Different range
                "paper": int(projected_sales * random.uniform(0.015, 0.035)),  # Different range
                "condiment": int(projected_sales * random.uniform(0.010, 0.030)),  # Different range
                "non_product": int(projected_sales * random.uniform(0.005, 0.015)),  # Different range
                "op_supplies": int(projected_sales * random.uniform(0.002, 0.006))  # Different range
            },
            "ending_inventory": {
                "food": int(projected_sales * random.uniform(0.08, 0.18)),  # Different range
                "paper": int(projected_sales * random.uniform(0.015, 0.032)),  # Different range
                "condiment": int(projected_sales * random.uniform(0.008, 0.025)),  # Different range
                "non_product": int(projected_sales * random.uniform(0.004, 0.012)),  # Different range
                "op_supplies": int(projected_sales * random.uniform(0.001, 0.005))  # Different range
            },
            "purchases": {
                "food": int(projected_sales * random.uniform(0.30, 0.50)),  # Different range
                "paper": int(projected_sales * random.uniform(0.015, 0.035)),  # Different range
                "condiment": int(projected_sales * random.uniform(0.020, 0.040)),  # Different range
                "non_product": int(projected_sales * random.uniform(0.010, 0.030)),  # Different range
                "op_supplies": int(projected_sales * random.uniform(0.002, 0.006)),  # Different range
                "travel": random.randint(500, 1000),  # Different range
                "advertising_other": random.randint(800, 1300),  # Different range
                "promotion": random.randint(400, 900),  # Different range
                "outside_services": random.randint(400, 800),  # Different range
                "linen": random.randint(250, 600),  # Different range
                "operating_supply": random.randint(200, 500),  # Different range
                "maintenance_repair": random.randint(300, 700),  # Different range
                "small_equipment": random.randint(100, 350),  # Different range
                "utilities": random.randint(800, 1600),  # Different range
                "office": random.randint(80, 250),  # Different range
                "training": random.randint(200, 450),  # Different range
                "crew_relations": random.randint(150, 350)  # Different range
            }
        }
        
        return projections_data
    
    def upload_projections_data(self):
        """Upload all projections data to Firebase"""
        print("Starting projections data generation and upload...")
        
        total_uploaded = 0
        
        for store_id in self.stores:
            for month in self.months_2025:
                try:
                    # Generate projections data
                    projections_data = self.generate_projections_data(store_id, month)
                    
                    # Upload to Firebase
                    doc_id = f"{store_id}_{month}"
                    doc_ref = self.db.collection('pac_projections').document(doc_id)
                    doc_ref.set(projections_data)
                    
                    total_uploaded += 1
                    print(f"Uploaded projections for {store_id} - {month}")
                    
                except Exception as e:
                    print(f"Error uploading projections for {store_id} - {month}: {e}")
        
        print(f"\nProjections data generation complete!")
        print(f"Uploaded {total_uploaded} projections records")
        print(f"Total months covered: 12")
        
        return total_uploaded

def main():
    """Main function to generate and upload projections data"""
    print("Projections Data Generator for Firebase")
    print("=" * 40)
    
    # Initialize Firebase
    db = initialize_firebase()
    if not db:
        return
    
    # Create generator and upload data
    generator = ProjectionsDataGenerator(db)
    generator.upload_projections_data()
    
    print("\n" + "=" * 40)
    print("Projections data generation and upload complete!")
    print("Check your Firebase console to verify the data.")

if __name__ == "__main__":
    main()

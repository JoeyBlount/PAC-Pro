"""
Sample Data Generator for PAC System
Generates sample data that can be used for testing without Firebase
"""
import json
import random
from decimal import Decimal
from datetime import datetime
from typing import Dict, List, Any

class SampleDataGenerator:
    """Generate sample PAC data for testing"""
    
    def __init__(self):
        self.stores = [
            {"id": "store_001", "name": "Downtown Location", "city": "New York", "state": "NY"},
            {"id": "store_002", "name": "Mall Branch", "city": "Los Angeles", "state": "CA"},
            {"id": "store_003", "name": "Airport Terminal", "city": "Chicago", "state": "IL"},
            {"id": "store_004", "name": "University Campus", "city": "Boston", "state": "MA"},
            {"id": "store_005", "name": "Suburban Plaza", "city": "Houston", "state": "TX"},
            {"id": "store_006", "name": "Beachfront Store", "city": "Miami", "state": "FL"},
            {"id": "store_007", "name": "Tech District", "city": "Seattle", "state": "WA"},
            {"id": "store_008", "name": "Historic District", "city": "Philadelphia", "state": "PA"}
        ]
        
        self.months_2025 = [
            "202501", "202502", "202503", "202504", "202505", "202506",
            "202507", "202508", "202509", "202510", "202511", "202512"
        ]
    
    def generate_realistic_sales_data(self, store_id: str, month: str) -> Dict[str, Any]:
        """Generate realistic sales data with seasonal variations"""
        month_num = int(month[4:6])
        
        # Base sales vary by store size and season
        base_sales = {
            "store_001": 120000,  # Downtown - high volume
            "store_002": 95000,   # Mall - medium-high
            "store_003": 110000,  # Airport - high volume
            "store_004": 80000,   # University - medium
            "store_005": 75000,   # Suburban - medium
            "store_006": 85000,   # Beachfront - seasonal
            "store_007": 90000,   # Tech District - medium-high
            "store_008": 70000    # Historic - lower volume
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
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            **sales_data,
            **labor_data,
            **waste_data,
            **inventory_data,
            "purchases": purchases_data,
            **advertising_data
        }
    
    def generate_all_sample_data(self) -> Dict[str, Any]:
        """Generate all sample data"""
        print("Generating sample data...")
        
        stores_data = {}
        pac_data = {}
        
        # Generate store data
        for store in self.stores:
            stores_data[store['id']] = store
        
        # Generate PAC data for each store and month
        for store in self.stores:
            store_id = store['id']
            pac_data[store_id] = {}
            
            for month in self.months_2025:
                data = self.generate_complete_pac_input_data(store_id, month)
                pac_data[store_id][month] = data
        
        return {
            "stores": stores_data,
            "pac_input_data": pac_data,
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "total_stores": len(self.stores),
                "total_months": len(self.months_2025),
                "total_records": len(self.stores) * len(self.months_2025)
            }
        }
    
    def save_sample_data(self, filename: str = "sample_pac_data.json"):
        """Save sample data to JSON file"""
        data = self.generate_all_sample_data()
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        
        print(f"Sample data saved to {filename}")
        print(f"Generated {data['metadata']['total_records']} PAC data records")
        print(f"Covering {data['metadata']['total_stores']} stores and {data['metadata']['total_months']} months")
        
        return data

def main():
    """Main function to generate sample data"""
    print("PAC Sample Data Generator")
    print("=" * 40)
    
    generator = SampleDataGenerator()
    data = generator.save_sample_data()
    
    # Show sample of generated data
    print("\nSample data preview:")
    print("-" * 20)
    
    # Show first store's January data
    first_store = list(data['stores'].keys())[0]
    january_data = data['pac_input_data'][first_store]['202501']
    
    print(f"Store: {data['stores'][first_store]['name']}")
    print(f"Month: January 2025")
    print(f"Product Net Sales: ${january_data['product_net_sales']:,}")
    print(f"Crew Labor %: {january_data['crew_labor_percent']}%")
    print(f"Total Labor %: {january_data['total_labor_percent']}%")
    print(f"Food Purchases: ${january_data['purchases']['food']:,}")
    
    print("\n" + "=" * 40)
    print("Sample data generation complete!")
    print("Use this data to test your PAC calculations or upload to Firebase.")

if __name__ == "__main__":
    main()

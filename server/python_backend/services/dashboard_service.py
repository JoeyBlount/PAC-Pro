"""
Info Service for PAC-Pro
Handles Firestore queries for sales, budgets, and PAC/projections
"""
import logging
from typing import Dict, Any, List
import firebase_admin
from firebase_admin import firestore

logger = logging.getLogger(__name__)


class DashboardInfoService:
    """Service for handling PAC-Pro info analytics (sales, budget, PAC projections)"""

    def __init__(self):
        self.db = None
        self._initialize_firebase()

    def _initialize_firebase(self):
        """Initialize Firebase Firestore"""
        try:
            if not firebase_admin._apps:
                print("Firebase not initialized - InfoService unavailable")
                self.db = None
                return
            self.db = firestore.client()
        except Exception as e:
            print(f"Failed to initialize Firebase: {e}")
            self.db = None

    def is_available(self) -> bool:
        """Check if Firestore is available"""
        return self.db is not None

    async def fetch_sales(self, entity_id: str, year_month: str) -> Dict[str, Any]:
        """Fetch total sales for an entity between start and end dates"""
        if not self.db:
            raise RuntimeError("Firebase not initialized")

        try:
            endDate = year_month
            startYear = int(year_month[:4]) - 1
            startMonth = int(year_month[4:]) + 1
            if startMonth < 0:
                r = -(startMonth)
                startMonth = 12 - r
                startYear -= 1
            startDate = f"{startYear}{startMonth:02d}"

            logger.info(f"Fetching sales for entity {entity_id} from {startDate} to {endDate}")
            docs = self.db.collection("pac_actual").stream()
            totalSales = []

            for doc in docs:
                doc_id = doc.id
                storeID = doc_id[:9]
                yyyymm = doc_id[-6:]
                if storeID == entity_id and startDate <= yyyymm <= endDate:
                    result = doc.to_dict()
                    amt = result.get("sales", {}).get("allNetSales", {}).get("dollars")
                    totalSales.append({"key": yyyymm, "netsales": amt})

            return {"totalsales": totalSales}
        except Exception as e:
            logger.error(f"Error fetching sales: {e}")
            raise RuntimeError(f"Failed to fetch sales: {str(e)}")

    async def fetch_budget_and_spending(self, entity_id: str, year_month: str) -> Dict[str, Any]:
        """Fetch budget vs. spending comparison for a given store and period"""
        if not self.db:
            raise RuntimeError("Firebase not initialized")

        try:
            doc_id = f"{entity_id}_{year_month}"
            logger.info(f"Fetching budget and spending for {doc_id}")

            budgetSpending = []

            # Spending calculation
            foodpaperspending = laborspending = purchasespending = 0
            doc = self.db.collection("pac_actual").document(doc_id).get()
            if doc.exists:
                result = doc.to_dict()
                foodpaperspending = result.get("foodAndPaper", {}).get("total", {}).get("dollars", 0)
                laborspending = result.get("labor", {}).get("total", {}).get("dollars", 0)
                purchasespending = result.get("purchases", {}).get("total", {}).get("dollars", 0)

            # Budget calculation
            foodpaperbudget = laborbudget = purchasebudget = 0
            foodpaper = ["Base Food", "Employee Meal", "Condiment", "Total Waste", "Paper"]
            labor = ["Crew Labor", "Management Labor", "Payroll Tax"]
            purchase = [
                "Advertising", "Travel", "Adv Other", "Promotion", "Outside Services",
                "Linen", "OP. Supply", "Maint. & Repair", "Small Equipment",
                "Utilities", "Office", "Cash +/-", "Crew Relations", "Training"
            ]

            doc = self.db.collection("pac-projections").document(doc_id).get()
            if doc.exists:
                result = doc.to_dict()
                rows = result.get("rows", [])
                foodpaperbudget = sum(row["projectedDollar"] for row in rows if row["name"] in foodpaper)
                laborbudget = sum(row["projectedDollar"] for row in rows if row["name"] in labor)
                purchasebudget = sum(row["projectedDollar"] for row in rows if row["name"] in purchase)

            budgetSpending.append({
                "key": year_month,
                "foodpaperbudget": foodpaperbudget,
                "foodpaperspending": foodpaperspending,
                "laborbudget": laborbudget,
                "laborspending": laborspending,
                "purchasebudget": purchasebudget,
                "purchasespending": purchasespending,
            })

            return {"budgetspending": budgetSpending}
        except Exception as e:
            logger.error(f"Error fetching budget and spending: {e}")
            raise RuntimeError(f"Failed to fetch budget and spending: {str(e)}")

    async def fetch_pac_and_projections(self, entity_id: str, year_month: str) -> Dict[str, Any]:
        """Fetch PAC actuals and projections over a range of months"""
        if not self.db:
            raise RuntimeError("Firebase not initialized")

        try:
            endDate = year_month
            startYear = int(year_month[:4])
            startMonth = int(year_month[4:]) - 2
            if startMonth < 0:
                r = -(startMonth)
                startMonth = 12 - r
                startYear -= 1
            startDate = f"{startYear}{startMonth:02d}"

            logger.info(f"Fetching PAC and projections for entity {entity_id} from {startDate} to {endDate}")

            pac = {}
            projections = {}

            # PAC actuals
            for doc in self.db.collection("pac_actual").stream():
                doc_id = doc.id
                storeID = doc_id[:9]
                yyyymm = doc_id[-6:]
                if storeID == entity_id and startDate <= yyyymm <= endDate:
                    result = doc.to_dict()
                    pac[yyyymm] = result.get("totals", {}).get("pac", {}).get("dollars", 0)

            # PAC projections
            for doc in self.db.collection("pac-projections").stream():
                doc_id = doc.id
                storeID = doc_id[:9]
                yyyymm = doc_id[-6:]
                if storeID == entity_id and startDate <= yyyymm <= endDate:
                    result = doc.to_dict()
                    rows = result.get("rows", [])
                    projections[yyyymm] = next((row["projectedDollar"] for row in rows if row["name"] == "P.A.C."), 0)

            # Combine
            pacAndProjections = []
            for key in set(pac) | set(projections):
                p_val = pac.get(key, 0)
                proj_val = projections.get(key, 0)
                pacAndProjections.append({"key": key, "pac": p_val, "projections": proj_val})

            return {"pacprojections": pacAndProjections}
        except Exception as e:
            logger.error(f"Error fetching PAC/projections: {e}")
            raise RuntimeError(f"Failed to fetch PAC/projections: {str(e)}")
"""
services/proj_calculation_service.py

Projection calculations WITH I/O.
- Math mirrors the React component logic.
- All database access is funneled through DataIngestionService.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Any, Iterable, Tuple, Optional
from fastapi import Depends
from services.data_ingestion_service import DataIngestionService


# -----------------------------------------------------------------------------
# Constants (match UI)
# -----------------------------------------------------------------------------

EXPENSE_LIST: List[str] = [
    "Product Sales", "All Net Sales",
    "Base Food", "Employee Meal", "Condiment", "Total Waste", "Paper",
    "Crew Labor", "Management Labor", "Payroll Tax", "Advertising",
    "Travel", "Adv Other", "Promotion", "Outside Services",
    "Linen", "OP. Supply", "Maint. & Repair", "Small Equipment",
    "Utilities", "Office", "Cash +/-", "Crew Relations", "Training",
    "Total Controllable", "P.A.C.",
]

# Rows whose $ are recalculated as % of Product Sales
PCT_OF_PRODUCT_SALES = {
    "Base Food", "Employee Meal", "Condiment", "Total Waste", "Paper",
    "Crew Labor", "Management Labor",
}

CONTROLLABLE_START = "Base Food"
CONTROLLABLE_END = "Training"

TRAVEL_THRU_TRAINING: List[str] = [
    "Travel", "Adv Other", "Promotion", "Outside Services",
    "Linen", "OP. Supply", "Maint. & Repair", "Small Equipment",
    "Utilities", "Office", "Cash +/-", "Crew Relations", "Training",
]

# Group definitions to mirror the UI group totals
FOOD_PAPER_GROUP: List[str] = [
    "Base Food", "Employee Meal", "Condiment", "Total Waste", "Paper",
]
LABOR_GROUP: List[str] = [
    "Crew Labor", "Management Labor", "Payroll Tax",
]
PURCHASES_GROUP: List[str] = ["Advertising", *TRAVEL_THRU_TRAINING]


# -----------------------------------------------------------------------------
# Numeric helpers
# -----------------------------------------------------------------------------

def _D(x: Any) -> Decimal:
    try:
        return Decimal(str(x)).quantize(Decimal("0.00"))
    except Exception:
        return Decimal("0.00")


def _q2(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.00"), rounding=ROUND_HALF_UP)


# -----------------------------------------------------------------------------
# Service
# -----------------------------------------------------------------------------

@dataclass
class ProjCalculationService:
    """
    Projection calculation service with I/O via DataIngestionService.

    Expected DataIngestionService minimal surface:
      - async fetch_projections(store_id: str, year: int, month_index_1: int)
            -> tuple[list[dict], float|None]
      - async save_projections(store_id: str, year: int, month_index_1: int,
                               pac_goal: float, projections: list[dict]) -> None
      - def   prev_year_month(year: int, month_index_1: int) -> tuple[int, int]
            (If not present, we fallback to our own utility here)
    """
    ingestion: DataIngestionService

    # ------------------------------ I/O methods ------------------------------

    # services/proj_calculation_service.py

    async def seed_projections(self, store_id: str, year: int, month_index_1: int) -> dict:
        rows, goal = await self.ingestion.fetch_projections(store_id, year, month_index_1)
        source = "current"
        if not rows:
            py, pm = self.prev_year_month(year, month_index_1)
            rows, goal = await self.ingestion.fetch_projections(store_id, py, pm)
            source = "previous"
        merged = self.seed_merge(EXPENSE_LIST, rows or [])
        return {"source": source, "pacGoal": float(goal or 0.0), "rows": self.apply_all(merged)}

    async def load_historical_rows(self, store_id: str, year: int, month_index_1: int) -> list[dict]:
        rows, _ = await self.ingestion.fetch_projections(store_id, year, month_index_1)
        rows = rows or []
        by_name = {str(r.get("name")): r for r in rows}
        out = []
        for nm in EXPENSE_LIST:
            base = by_name.get(nm, {})
            out.append({
                "name": nm,
                "historicalDollar": float(_q2(_D(base.get("projectedDollar")))),
                "historicalPercent": float(_q2(_D(base.get("projectedPercent")))),
            })
        return out

    async def save_projections(
        self,
        store_id: str,
        year: int,
        month_index_1: int,
        pac_goal: float,
        projections: list[dict],
    ) -> None:
        await self.ingestion.save_projections(
            store_id=store_id,
            year=year,
            month_index_1=month_index_1,
            pac_goal=float(pac_goal),
            projections=projections,
        )

    # ----------------------------- Math pipeline -----------------------------

    def apply_all(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Full pipeline (keep order):
          1) recalc_from_percents
          2) apply_travel_thru_training_percents
          3) apply_controllables
          4) apply_pac
          5) apply_sales_percents
        """
        r1 = self.recalc_from_percents(rows)
        r2 = self.apply_travel_thru_training_percents(r1)
        r3 = self.apply_controllables(r2)
        r4 = self.apply_pac(r3)
        r5 = self.apply_sales_percents(r4)
        return r5

    def recalc_from_percents(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        next_rows = [dict(r) for r in rows]
        ps = _D(self._find_value(next_rows, "Product Sales", "projectedDollar"))
        ans = _D(self._find_value(next_rows, "All Net Sales", "projectedDollar"))

        # % of Product Sales
        for r in next_rows:
            if r.get("name") in PCT_OF_PRODUCT_SALES:
                pct = _D(r.get("projectedPercent"))
                r["projectedDollar"] = float(_q2(ps * pct / Decimal(100)))

        # Advertising: % of All Net Sales
        for r in next_rows:
            if r.get("name") == "Advertising":
                pct = _D(r.get("projectedPercent"))
                r["projectedDollar"] = float(_q2(ans * pct / Decimal(100)))

        # Payroll Tax: % of (Crew + Management)
        crew_d = _D(self._find_value(next_rows, "Crew Labor", "projectedDollar"))
        mgmt_d = _D(self._find_value(next_rows, "Management Labor", "projectedDollar"))
        for r in next_rows:
            if r.get("name") == "Payroll Tax":
                pct = _D(r.get("projectedPercent"))
                r["projectedDollar"] = float(_q2((crew_d + mgmt_d) * pct / Decimal(100)))

        return next_rows

    def apply_sales_percents(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        next_rows = [dict(r) for r in rows]
        ps_proj = _D(self._find_value(next_rows, "Product Sales", "projectedDollar"))
        ps_hist = _D(self._find_value(next_rows, "Product Sales", "historicalDollar"))
        ans_proj = _D(self._find_value(next_rows, "All Net Sales", "projectedDollar"))
        ans_hist = _D(self._find_value(next_rows, "All Net Sales", "historicalDollar"))

        for r in next_rows:
            nm = r.get("name")
            if nm == "Product Sales":
                r["projectedPercent"] = float(_q2((ps_proj / ans_proj) * 100)) if ans_proj > 0 else 0.0
                r["historicalPercent"] = float(_q2((ps_hist / ans_hist) * 100)) if ans_hist > 0 else 0.0
            elif nm == "All Net Sales":
                r["projectedPercent"] = 100.0 if ans_proj > 0 else 0.0
                r["historicalPercent"] = 100.0 if ans_hist > 0 else 0.0
        return next_rows

    def apply_travel_thru_training_percents(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        next_rows = [dict(r) for r in rows]
        ps_proj = _D(self._find_value(next_rows, "Product Sales", "projectedDollar"))
        ps_hist = _D(self._find_value(next_rows, "Product Sales", "historicalDollar"))

        for r in next_rows:
            nm = r.get("name")
            if nm in TRAVEL_THRU_TRAINING:
                proj_d = _D(r.get("projectedDollar"))
                hist_d = _D(r.get("historicalDollar"))
                r["projectedPercent"] = float(_q2((proj_d / ps_proj) * 100)) if ps_proj > 0 else 0.0
                r["historicalPercent"] = float(_q2((hist_d / ps_hist) * 100)) if ps_hist > 0 else 0.0
        return next_rows

    def apply_controllables(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        next_rows = [dict(r) for r in rows]
        # Dollars: sum of group totals (Food & Paper + Labor + Purchases)
        def sum_group(names: List[str], key: str) -> Decimal:
            return _q2(sum((_D(self._find_value(next_rows, nm, key)) for nm in names), Decimal("0.00")))

        proj_total = _q2(
            sum_group(FOOD_PAPER_GROUP, "projectedDollar")
            + sum_group(LABOR_GROUP, "projectedDollar")
            + sum_group(PURCHASES_GROUP, "projectedDollar")
        )
        hist_total = _q2(
            sum_group(FOOD_PAPER_GROUP, "historicalDollar")
            + sum_group(LABOR_GROUP, "historicalDollar")
            + sum_group(PURCHASES_GROUP, "historicalDollar")
        )

        # Percent: SUM of each line's percent-of-Product-Sales
        ps_proj = _D(self._find_value(next_rows, "Product Sales", "projectedDollar"))
        ps_hist = _D(self._find_value(next_rows, "Product Sales", "historicalDollar"))
        # Percent from group dollar totals relative to Product Sales
        summ_proj_pct = _q2((proj_total / ps_proj) * 100) if ps_proj > 0 else Decimal("0.00")
        summ_hist_pct = _q2((hist_total / ps_hist) * 100) if ps_hist > 0 else Decimal("0.00")
        names = [r.get("name") for r in next_rows]
        try:
            s = names.index(CONTROLLABLE_START)
            e = names.index(CONTROLLABLE_END)
        except ValueError:
            s, e = 0, -1
        # (no need to iterate rows for percent; use group totals for precision)
        summ_proj_pct = _q2(summ_proj_pct)
        summ_hist_pct = _q2(summ_hist_pct)

        for r in next_rows:
            if r.get("name") == "Total Controllable":
                r["projectedDollar"] = float(_q2(proj_total))
                r["historicalDollar"] = float(_q2(hist_total))
                r["projectedPercent"] = float(summ_proj_pct)
                r["historicalPercent"] = float(summ_hist_pct)
                break
        return next_rows

    def apply_pac(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        next_rows = [dict(r) for r in rows]
        # PAC$ = Product Sales - Total Controllables (sum of group totals)
        ps_proj = _D(self._find_value(next_rows, "Product Sales", "projectedDollar"))
        ctrl_proj = _q2(
            _D(self._find_value(next_rows, "Total Controllable", "projectedDollar"))
        )
        pac_d = ps_proj - ctrl_proj

        # PAC% = 100 - Total Controllable%
        total_ctrl_percent = 0
        # Find the total controllable percent we set in apply_controllables
        for r in next_rows:
            if r.get("name") == "Total Controllable":
                total_ctrl_percent = _D(r.get("projectedPercent"))
                break

        pac_percent = _q2(Decimal("100") - total_ctrl_percent) if ps_proj > 0 else Decimal("0.00")

        for r in next_rows:
            if r.get("name") == "P.A.C.":
                r["projectedDollar"] = float(_q2(pac_d))
                r["projectedPercent"] = float(pac_percent)
                break
        return next_rows

    # ------------------------------ utilities -------------------------------

    @staticmethod
    def _normalize_value(val: Any) -> Any:
        """
        Normalize a numeric value, preserving empty strings to indicate "no data".
        Returns "" for empty/None values, otherwise returns the float value.
        """
        if val is None or val == "" or val == "":
            return ""
        try:
            return float(_q2(_D(val)))
        except Exception:
            return ""

    @staticmethod
    def seed_merge(expense_names: Iterable[str], rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Ensure a complete ordered set of rows using the provided names.
        Any missing row is created with empty strings to indicate "no data entered".
        Existing values are normalized while preserving empty strings.
        """
        by_name = {str(r.get("name")): r for r in rows or []}
        merged: List[Dict[str, Any]] = []
        for nm in expense_names:
            base = by_name.get(nm)
            if base is None:
                # No saved data - use empty strings to indicate "no data entered"
                base = {
                    "name": nm,
                    "projectedDollar": "",
                    "projectedPercent": "",
                    "historicalDollar": "",
                    "historicalPercent": "",
                }
            out = dict(base)
            out["projectedDollar"] = ProjCalculationService._normalize_value(out.get("projectedDollar"))
            out["projectedPercent"] = ProjCalculationService._normalize_value(out.get("projectedPercent"))
            out["historicalDollar"] = ProjCalculationService._normalize_value(out.get("historicalDollar"))
            out["historicalPercent"] = ProjCalculationService._normalize_value(out.get("historicalPercent"))
            merged.append(out)
        return merged

    @staticmethod
    def _find_value(rows: List[Dict[str, Any]], name: str, key: str) -> Any:
        for r in rows:
            if r.get("name") == name:
                return r.get(key)
        return 0

    @staticmethod
    def _sum_range(rows: List[Dict[str, Any]], start_name: str, end_name: str, key: str) -> Decimal:
        names = [r.get("name") for r in rows]
        try:
            s = names.index(start_name)
            e = names.index(end_name)
        except ValueError:
            return Decimal("0.00")
        total = Decimal("0.00")
        for i in range(s, e + 1):
            total += _D(rows[i].get(key))
        return _q2(total)

    @staticmethod
    def prev_year_month(year: int, month_index_1: int) -> Tuple[int, int]:
        """
        Return previous (year, month_index_1). month_index_1 is 1..12.
        """
        if month_index_1 <= 1:
            return (year - 1, 12)
        return (year, month_index_1 - 1)


def get_ingestion_service() -> DataIngestionService:
    return DataIngestionService()

def get_proj_calculation_service(
    ingestion: DataIngestionService = Depends(get_ingestion_service),
) -> ProjCalculationService:
    return ProjCalculationService(ingestion)
import React, { useState, useEffect, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { db, auth } from "../../config/firebase-config";
import { doc, getDoc } from "firebase/firestore";
import {
  Box,
  Container,
  Grid2 as Grid,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  TextField,
  Button,
  Select,
  MenuItem,
  InputAdornment,
  FormControl,
  FormLabel,
  Alert,
  Chip,
  useTheme,
} from "@mui/material";
import { StoreContext } from "../../context/storeContext";
import PacTab from "./PacTab";
import { useAuth } from "../../context/AuthContext";
import MonthLockService from "../../services/monthLockService";
import { saveGenerateInput } from "../../services/generateInputService";
// PAC Actual functions now handled by backend API
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { apiUrl } from "../../utils/api";
import { useYearRange } from "../../utils/yearUtils";

const expenseList = [
  "Product Sales",
  "All Net Sales",
  "Base Food",
  "Employee Meal",
  "Condiment",
  "Total Waste",
  "Paper",
  "Crew Labor",
  "Management Labor",
  "Payroll Tax",
  "Advertising",
  "Travel",
  "Adv Other",
  "Promotion",
  "Outside Services",
  "Linen",
  "OP. Supply",
  "Maint. & Repair",
  "Small Equipment",
  "Utilities",
  "Office",
  "Cash +/-",
  "Crew Relations",
  "Training",
  "Total Controllable",
  "P.A.C.",
];

// Add expense(s) to this array to disable projected $ text field. Case-senstive.
const hasUserInputAmountField = [
  "Product Sales",
  "All Net Sales",
  "Travel",
  "Adv Other",
  "Outside Services",
  "Linen",
  "OP. Supply",
  "Maint. & Repair",
  "Small Equipment",
  "Utilities",
  "Office",
  "Cash +/-",
  "Crew Relations",
  "Training",
  "Promotion",
];

// Backend (Generate tab)
const BASE_URL = (
  process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:5140"
).replace(/\/+$/, "");
async function api(path, { method = "GET", body } = {}) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Add expense(s) to this array to disable projected % text field. Case-senstive.
const hasUserInputedPercentageField = [
  "Base Food",
  "Employee Meal",
  "Condiment",
  "Total Waste",
  "Paper",
  "Crew Labor",
  "Management Labor",
  "Payroll Tax",
  "Advertising",
];

const getLabel = (key) => {
  const specialLabels = {
    "Payroll Tax": "% of Total Labor",
    Advertising: "% of All Net Sales",
  };

  return specialLabels[key] || "";
};

const fmtUsd = (v) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
const fmtPercent = (v) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v / 100);

const PAC = () => {
  const location = useLocation();
  const [tabIndex, setTabIndex] = useState(0);
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString("default", { month: "long" });
  const [month, setMonth] = useState(currentMonth);

  const pad2 = (n) => String(n).padStart(2, "0");
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Get selected store from context (needed for year range hook)
  const { selectedStore } = useContext(StoreContext);

  // Dynamic year range: 1 year forward + 10 years back (or earliest data year)
  const { years, currentYear } = useYearRange(selectedStore);
  const [year, setYear] = useState(() => new Date().getFullYear());

  // Separate state for actual data dropdowns in projections tab
  // Default to previous month when page loads (calculated from current month/year)
  // Note: getPrevMonthYear is defined later, so we calculate it inline here
  const now = new Date();
  const nowMonthIdx = now.getMonth();
  const nowYear = now.getFullYear();
  const prevMonthIdx = nowMonthIdx === 0 ? 11 : nowMonthIdx - 1;
  const prevYearForActual = nowMonthIdx === 0 ? nowYear - 1 : nowYear;

  const [actualMonth, setActualMonth] = useState(months[prevMonthIdx]);
  const [actualYear, setActualYear] = useState(prevYearForActual);

  // State to store last year's PAC actual data for year-over-year comparison
  const [lastYearPacActualData, setLastYearPacActualData] = useState(null);

  // Handle navigation from Reports page
  useEffect(() => {
    if (location.state?.openActualTab) {
      setTabIndex(2); // Switch to Actual tab (index 2)
      if (location.state.month) setMonth(location.state.month);
      if (location.state.year) setYear(location.state.year);
    }
  }, [location]);
  const [pacGoal, setPacGoal] = useState("");

  // debounced autosave timer
  const saveTimer = useRef(null);

  // --- helpers: period checks ---
  const isPastPeriod = (y, mName) => {
    const m = months.indexOf(mName); // 0..11
    const now = new Date();
    const sel = new Date(y, m, 1);
    // first day of current month for stable compare
    const cur = new Date(now.getFullYear(), now.getMonth(), 1);
    return sel < cur;
  };

  // Return a color for the P.A.C. row based on projected $ vs goal.
  const getPacRowColor = () => (pacEqual ? "green" : "red");

  // Map getPacRowColor() -> MUI cell styles
  const PAC_COLOR_STYLES = {
    green: {
      backgroundColor: "rgba(46,125,50,0.12)",
      color: "#2e7d32",
      fontWeight: 700,
    },
    red: {
      backgroundColor: "rgba(211,47,47,0.12)",
      color: "#d32f2f",
      fontWeight: 700,
    },
  };

  // PAC Actual API wrappers
  async function getPacActual(storeID, year, month) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthIndex = months.indexOf(month);
    if (monthIndex === -1) {
      throw new Error(`Invalid month name: ${month}`);
    }
    const monthNumber = monthIndex + 1;
    const yearMonth = `${year}${String(monthNumber).padStart(2, "0")}`;

    // Use fetch directly to handle 404 gracefully
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(
      `${BASE_URL}/api/pac/actual/${storeID}/${yearMonth}`,
      {
        method: "GET",
        headers,
      }
    );

    if (res.status === 404) {
      return null; // Data not found, return null
    }
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Failed to fetch PAC actual: ${errorText || res.statusText}`
      );
    }
    return res.json();
  }

  async function computeAndSavePacActual(storeID, year, month, submittedBy) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthIndex = months.indexOf(month);
    if (monthIndex === -1) {
      throw new Error(`Invalid month name: ${month}`);
    }
    const monthNumber = monthIndex + 1;
    const yearMonth = `${year}${String(monthNumber).padStart(2, "0")}`;
    return api("/api/pac/actual/compute", {
      method: "POST",
      body: {
        store_id: storeID,
        year_month: yearMonth,
        submitted_by: submittedBy || "System",
      },
    });
  }

  // projections API wrappers
  async function seedProjections(store_id, year, month) {
    const month_index_1 = months.indexOf(month) + 1;
    return api("/api/pac/projections/seed", {
      method: "POST",
      body: { store_id, year, month_index_1 },
    });
  }

  async function saveProjections(store_id, year, month, pacGoal, projections) {
    const month_index_1 = months.indexOf(month) + 1;
    return api("/api/pac/projections/save", {
      method: "POST",
      body: {
        store_id,
        year,
        month_index_1,
        pacGoal: Number(pacGoal) || 0,
        projections,
      },
    });
  }

  async function applyRows(rows) {
    return api("/api/pac/apply", { method: "POST", body: { rows } });
  }

  async function fetchHistoricalRows(store_id, year, month) {
    const month_index_1 = months.indexOf(month) + 1;
    return api("/api/pac/historical", {
      method: "POST",
      body: { store_id, year, month_index_1 },
    });
  }

  // UI state for admin edit mode
  const [editingGoal, setEditingGoal] = useState(false);

  const handleResetToLastSubmitted = async () => {
    if (!selectedStore) return;
    const prevDate = new Date(year, months.indexOf(month) - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonthName = months[prevDate.getMonth()];
    try {
      const data = await seedProjections(
        selectedStore,
        prevYear,
        prevMonthName
      );
      if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
        alert("No previous submission found.");
        return;
      }
      setProjections(data.rows);
      // persist previous month rows into current draft so inputs reflect immediately
      try {
        localStorage.setItem(draftKey, JSON.stringify(data.rows));
      } catch {}
      // Do NOT change PAC Goal when resetting to previous month
    } catch (e) {
      console.error("reset to previous month error", e);
      alert("Failed to load previous month.");
    }
  };

  // State variables for Generate tab; legacy pacGen removed
  // Initialize with empty strings so fields display as empty when no data exists
  const [productNetSales, setProductNetSales] = useState("");
  const [cash, setCash] = useState("");
  const [promo, setPromo] = useState("");
  const [allNetSales, setAllNetSales] = useState("");
  const [managerMeal, setManagerMeal] = useState("");
  const [advertising, setAdvertising] = useState("");
  const [duesAndSubscriptions, setDuesAndSubscriptions] = useState("");

  const [crewLabor, setCrewLabor] = useState("");
  const [totalLabor, setTotalLabor] = useState("");
  const [payrollTax, setPayrollTax] = useState("");
  const [additionalLaborDollars, setAdditionalLaborDollars] = useState("");

  const [completeWaste, setCompleteWaste] = useState("");
  const [rawWaste, setRawWaste] = useState("");
  const [condiment, setCondiment] = useState("");
  const [variance, setVariance] = useState("");
  const [unexplained, setUnexplained] = useState("");
  const [discounts, setDiscounts] = useState("");
  const [baseFood, setBaseFood] = useState("");
  const [empMgrMealsPercent, setEmpMgrMealsPercent] = useState("");

  const [startingFood, setStartingFood] = useState("");
  const [startingCondiment, setStartingCondiment] = useState("");
  const [startingPaper, setStartingPaper] = useState("");
  const [startingNonProduct, setStartingNonProduct] = useState("");
  const [startingOpsSupplies, setStartingOpsSupplies] = useState("");

  const [endingFood, setEndingFood] = useState("");
  const [endingCondiment, setEndingCondiment] = useState("");
  const [endingPaper, setEndingPaper] = useState("");
  const [endingNonProduct, setEndingNonProduct] = useState("");
  const [endingOpsSupplies, setEndingOpsSupplies] = useState("");

  const { userRole, loading: authLoading } = useAuth();

  // Allowed to Apply/Submit: Admin, Supervisor, General Manager
  const ALLOWED_ROLES = new Set(["admin", "supervisor", "general manager"]);
  const roleAllowed = ALLOWED_ROLES.has((userRole || "").toLowerCase());

  const isAdmin = (userRole || "").toLowerCase() === "admin";

  // Function to get user's full name
  const getUserFullName = async () => {
    try {
      if (auth.currentUser?.email) {
        const userRef = doc(db, "users", auth.currentUser.email);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return `${userData.firstName || ""} ${
            userData.lastName || ""
          }`.trim();
        }
      }
      return auth.currentUser?.displayName || "Unknown User";
    } catch (error) {
      console.error("Error getting user full name:", error);
      return "Unknown User";
    }
  };

  // Month locking state
  const [monthLockStatus, setMonthLockStatus] = useState(null);
  const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(null);
  const [lockedMonths, setLockedMonths] = useState([]);

  // Check if user can lock months (General Manager, Supervisor, or Admin)
  const canLockMonth = ["admin", "general manager", "supervisor"].includes(
    (userRole || "").toLowerCase()
  );

  // Only admins can unlock months
  const canUnlockMonth = isAdmin;
  const getPrevPeriod = (y, mName) => {
    const i = months.indexOf(mName); // 0..11
    const d = new Date(y, i - 1, 1); // prev month
    return { y: d.getFullYear(), m: d.getMonth() + 1 }; // 1..12
  };

  // returns { monthIndex, year }
  function getPrevMonthYear(d = new Date()) {
    const m = d.getMonth(); // 0..11
    const y = d.getFullYear();
    return m === 0
      ? { monthIndex: 11, year: y - 1 }
      : { monthIndex: m - 1, year: y };
  }
  // ---------- keys & ids ----------
  const monthIndex = months.indexOf(month); // 0..11
  const periodId = `${year}${pad2(monthIndex + 1)}`; // e.g. 202509
  const draftKey = `pacDraft:${selectedStore || "__no_store__"}:${periodId}`;

  const { monthIndex: prevIdx, year: prevYear } = getPrevMonthYear();
  const [histMonth, setHistMonth] = useState(months[prevIdx]);
  const [histYear, setHistYear] = useState(prevYear);
  const theme = useTheme();

  useEffect(() => {
    if (!month || !year) return;
    const idx = months.indexOf(month); // 0..11
    if (idx === -1) return; // Invalid month
    const d = new Date(year, idx - 1, 1); // previous month of the *selected* period
    const prevMonth = months[d.getMonth()];
    const prevYear = d.getFullYear();

    // Only update if values actually changed to avoid unnecessary re-renders
    setHistMonth((prev) => (prev !== prevMonth ? prevMonth : prev));
    setHistYear((prev) => (prev !== prevYear ? prevYear : prev));

    // Also update actualMonth/actualYear to previous month when main month/year changes
    // This ensures historical dropdowns stay in sync with the selected period
    setActualMonth((prev) => (prev !== prevMonth ? prevMonth : prev));
    setActualYear((prev) => (prev !== prevYear ? prevYear : prev));
  }, [month, year]);

  useEffect(() => {
    document.title = "PAC Pro - PAC";
  }, []);

  const fetchMonthLockStatus = async () => {
    try {
      if (!selectedStore) return;

      const lockStatus = await MonthLockService.getMonthLockStatus(
        selectedStore,
        month,
        year
      );
      setMonthLockStatus(lockStatus);

      // Last Updated timestamp now based on pac-projections doc
      try {
        const monthIndex = months.indexOf(month);
        const id = `${selectedStore}_${year}${String(monthIndex + 1).padStart(
          2,
          "0"
        )}`;
        const ref = doc(db, "pac-projections", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data();
          const ts = d.updatedAt?.toDate?.() || new Date();
          setLastUpdatedTimestamp(ts);
        } else {
          setLastUpdatedTimestamp(null);
        }
      } catch {}
    } catch (error) {
      console.error("Error fetching month lock status:", error);
    }
  };

  const fetchLockedMonths = async () => {
    try {
      if (!selectedStore) return;

      const locked = await MonthLockService.getAllLockedMonths(selectedStore);
      setLockedMonths(locked);
    } catch (error) {
      console.error("Error fetching locked months:", error);
    }
  };

  const handleLockMonth = async () => {
    if (!selectedStore) {
      alert("No store selected.");
      return;
    }

    const isCurrentlyLocked = monthLockStatus?.is_locked || false;

    try {
      let result;
      if (isCurrentlyLocked) {
        // Unlock month
        result = await MonthLockService.unlockMonth(
          selectedStore,
          month,
          year,
          auth.currentUser?.email || "unknown",
          userRole
        );
      } else {
        // Lock month
        result = await MonthLockService.lockMonth(
          selectedStore,
          month,
          year,
          auth.currentUser?.email || "unknown",
          userRole
        );
      }

      if (result.success) {
        alert(result.message);
        await fetchMonthLockStatus();
        await fetchLockedMonths();

        const firstName = (await getUserFullName()).split(" ")[0] || "Someone";

        await fetch(apiUrl("/api/pac/notifications/send"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: {
              event: monthLockStatus, // or result if your API expects the new status
              firstName,
              month,
              year,
              store: selectedStore,
            },
          }),
        });
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error updating month lock:", error);
      alert("Failed to update month lock status.");
    }
  };

  const isMonthLocked = () => {
    return monthLockStatus?.is_locked || false;
  };

  const isCurrentPeriodLocked = () => {
    return isMonthLocked();
  };

  // Disable Generate tab inputs when month is locked
  const inputsDisabled = isCurrentPeriodLocked();

  useEffect(() => {
    if (!selectedStore || tabIndex !== 0) return;

    let isCancelled = false;

    (async () => {
      try {
        const data = await seedProjections(selectedStore, year, month);

        // Check if cancelled (user changed month/year again)
        if (isCancelled) return;

        // { source, pacGoal, rows }
        setPacGoal(String(data.pacGoal ?? ""));
        const loadedRows = Array.isArray(data.rows)
          ? data.rows
          : makeEmptyProjectionRows();

        // Log for debugging
        const productSales = loadedRows.find((r) => r.name === "Product Sales");
        /*console.log("Loaded projections:", {
          source: data.source,
          productSales: productSales?.projectedDollar,
          allNetSales: loadedRows.find((r) => r.name === "All Net Sales")
            ?.projectedDollar,
          rowCount: loadedRows.length,
        });*/

        setProjections(loadedRows);
      } catch (e) {
        if (!isCancelled) {
          console.error("seedProjections error", e);
          // fallback: keep current projections
        }
      }
    })();

    // Cleanup function to cancel in-flight requests
    return () => {
      isCancelled = true;
    };
  }, [selectedStore, tabIndex, month, year]);

  useEffect(() => {
    if (!selectedStore || tabIndex !== 0) return;

    // Only load from localStorage if we have a draft for this specific period
    // This should run after the seedProjections effect, so we add a delay
    // to ensure API data loads first. Only apply draft if there's no saved data.
    let isCancelled = false;
    const timeoutId = setTimeout(async () => {
      if (isCancelled) return;

      try {
        // Check if there's saved data for this period first
        const data = await seedProjections(selectedStore, year, month);
        const hasSavedData =
          data &&
          data.source === "current" &&
          Array.isArray(data.rows) &&
          data.rows.length > 0;

        // Only load localStorage draft if there's no saved data for this period
        // If there's saved data, don't overwrite it with localStorage
        if (!hasSavedData) {
          const raw = localStorage.getItem(draftKey);
          if (!raw) return;
          const parsed = JSON.parse(raw);
          const toApply = Array.isArray(parsed) ? parsed : [];

          if (toApply.length > 0) {
            try {
              const res = await applyRows(toApply);
              if (!isCancelled) {
                setProjections(Array.isArray(res.rows) ? res.rows : toApply);
              }
            } catch {
              if (!isCancelled) {
                setProjections(toApply);
              }
            }
          }
        } else {
          // If there's saved data, clear any localStorage draft for this period to avoid confusion
          try {
            localStorage.removeItem(draftKey);
          } catch (e) {
            // Ignore localStorage errors
          }
        }
      } catch (e) {
        if (!isCancelled) {
          console.warn("Failed to read draft from localStorage", e);
        }
      }
    }, 200); // Delay to let seedProjections complete first

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [selectedStore, draftKey, tabIndex, year, month]);

  // Function to load existing generate input data for autofill
  const loadExistingGenerateData = async () => {
    if (!selectedStore || !month || !year || tabIndex !== 1) return;

    try {
      const { getGenerateInput } = await import(
        "../../services/generateInputService"
      );
      // Normalize store id to canonical form used in Firestore docs
      const norm = (val) => {
        if (!val) return val;
        const m = String(val).match(/(\d{1,3})$/);
        if (m) return `store_${String(parseInt(m[1], 10)).padStart(3, "0")}`;
        return String(val).toLowerCase();
      };

      // Helper to get value - preserves 0 if saved, returns empty string if not set
      const getVal = (val) => {
        if (val === undefined || val === null) return "";
        return val;
      };

      const isLocked = isMonthLocked();

      // If month is locked, load previously submitted data
      // If month is unlocked, set all fields to empty
      if (isLocked) {
        const existingData = await getGenerateInput(
          norm(selectedStore),
          year,
          month
        );

        if (existingData) {
          /*console.log(
            "Month is locked - loading previously submitted data:",
            existingData
          );*/

          // Sales section - use getVal to preserve 0 if saved
          setProductNetSales(getVal(existingData.sales?.productNetSales));
          setCash(getVal(existingData.sales?.cash));
          setPromo(getVal(existingData.sales?.promo));
          setAllNetSales(getVal(existingData.sales?.allNetSales));
          setManagerMeal(getVal(existingData.sales?.managerMeal));
          setAdvertising(getVal(existingData.sales?.advertising));
          setDuesAndSubscriptions(
            getVal(existingData.sales?.duesAndSubscriptions)
          );

          // Labor section
          setCrewLabor(getVal(existingData.labor?.crewLabor));
          setTotalLabor(getVal(existingData.labor?.totalLabor));
          setPayrollTax(getVal(existingData.labor?.payrollTax));
          setAdditionalLaborDollars(
            getVal(existingData.labor?.additionalLaborDollars)
          );

          // Food section
          setCompleteWaste(getVal(existingData.food?.completeWaste));
          setRawWaste(getVal(existingData.food?.rawWaste));
          setCondiment(getVal(existingData.food?.condiment));
          setVariance(getVal(existingData.food?.variance));
          setUnexplained(getVal(existingData.food?.unexplained));
          setDiscounts(getVal(existingData.food?.discounts));
          setBaseFood(getVal(existingData.food?.baseFood));
          setEmpMgrMealsPercent(getVal(existingData.food?.empMgrMealsPercent));

          // Inventory - Starting
          setStartingFood(getVal(existingData.inventoryStarting?.food));
          setStartingCondiment(
            getVal(existingData.inventoryStarting?.condiment)
          );
          setStartingPaper(getVal(existingData.inventoryStarting?.paper));
          setStartingNonProduct(
            getVal(existingData.inventoryStarting?.nonProduct)
          );
          setStartingOpsSupplies(
            getVal(existingData.inventoryStarting?.opsSupplies)
          );

          // Inventory - Ending
          setEndingFood(getVal(existingData.inventoryEnding?.food));
          setEndingCondiment(getVal(existingData.inventoryEnding?.condiment));
          setEndingPaper(getVal(existingData.inventoryEnding?.paper));
          setEndingNonProduct(getVal(existingData.inventoryEnding?.nonProduct));
          setEndingOpsSupplies(
            getVal(existingData.inventoryEnding?.opsSupplies)
          );

          //console.log("Generate tab autofilled with locked month data");
        } else {
          // Locked but no data - set to empty
          /*console.log(
            "Month is locked but no existing data found - setting to empty"
          );*/
          resetGenerateFields();
        }
      } else {
        // Month is unlocked - set all fields to empty
        //console.log("Month is unlocked - resetting all fields to empty");
        resetGenerateFields();
      }
    } catch (error) {
      //console.error("Error loading existing generate data:", error);
      // On error, reset to empty if unlocked
      if (!isMonthLocked()) {
        resetGenerateFields();
      }
    }
  };

  // Helper function to reset all generate fields to empty
  const resetGenerateFields = () => {
    // Sales section
    setProductNetSales("");
    setCash("");
    setPromo("");
    setAllNetSales("");
    setManagerMeal("");
    setAdvertising("");
    setDuesAndSubscriptions("");

    // Labor section
    setCrewLabor("");
    setTotalLabor("");
    setPayrollTax("");
    setAdditionalLaborDollars("");

    // Food section
    setCompleteWaste("");
    setRawWaste("");
    setCondiment("");
    setVariance("");
    setUnexplained("");
    setDiscounts("");
    setBaseFood("");
    setEmpMgrMealsPercent("");

    // Inventory - Starting
    setStartingFood("");
    setStartingCondiment("");
    setStartingPaper("");
    setStartingNonProduct("");
    setStartingOpsSupplies("");

    // Inventory - Ending
    setEndingFood("");
    setEndingCondiment("");
    setEndingPaper("");
    setEndingNonProduct("");
    setEndingOpsSupplies("");
  };

  // Fetch month lock status when month, year, or store changes
  useEffect(() => {
    fetchMonthLockStatus();
    fetchLockedMonths();
  }, [month, year, selectedStore]);

  // Load existing generate data when switching to Generate tab or lock status changes
  useEffect(() => {
    if (tabIndex === 1) {
      loadExistingGenerateData();
    }
  }, [tabIndex, selectedStore, month, year, monthLockStatus]);

  // Fetch PAC actual data when actualMonth/actualYear/store changes
  useEffect(() => {
    const fetchPacActualData = async () => {
      if (!selectedStore || !actualMonth || !actualYear) return;

      try {
        const formattedStoreId = selectedStore.startsWith("store_")
          ? selectedStore
          : `store_${selectedStore.padStart(3, "0")}`;

        const pacActualData = await getPacActual(
          formattedStoreId,
          actualYear,
          actualMonth
        );
        setPacActualData(pacActualData);
      } catch (error) {
        console.error("Error fetching PAC actual data:", error);
        setPacActualData(null);
      }
    };

    fetchPacActualData();
  }, [selectedStore, actualMonth, actualYear]);

  useEffect(() => {
    let isCancelled = false;

    const loadHistoricalData = async () => {
      // Use actualMonth/actualYear for historical columns (user-selected), fallback to histMonth/histYear
      const dataMonth = actualMonth || histMonth;
      const dataYear = actualYear || histYear;

      if (!selectedStore || !dataYear || !dataMonth || tabIndex !== 0) return;

      // Capture current values to avoid stale closures
      const currentHistYear = dataYear;
      const currentHistMonth = dataMonth;
      const currentStore = selectedStore;

      try {
        // Load PAC actual data for the selected month/year instead of historical data
        const formattedStoreId = currentStore.startsWith("store_")
          ? currentStore
          : `store_${currentStore.padStart(3, "0")}`;

        const pacActualData = await getPacActual(
          formattedStoreId,
          currentHistYear,
          currentHistMonth
        );

        // Check if this request was cancelled (user changed dropdowns)
        if (isCancelled) return;

        // Set pacActualData to state so getPacActualValue can access it
        setPacActualData(pacActualData);

        // Load last year's PAC actual data for year-over-year comparison
        const lastYear = currentHistYear - 1;
        let lastYearData = null;
        try {
          lastYearData = await getPacActual(
            formattedStoreId,
            lastYear,
            currentHistMonth
          );
          //console.log("Last year PAC actual data loaded:", lastYearData);
        } catch (e) {
          // Last year's data might not exist, that's okay
          //console.log("Last year's PAC actual data not found", e);
        }

        // Check again if cancelled
        if (isCancelled) return;

        setLastYearPacActualData(lastYearData);

        if (pacActualData) {
          setProjections((prev) =>
            prev.map((expense) => {
              // Pass data directly to avoid state timing issues
              const pacActualValue = getPacActualValue(
                expense.name,
                pacActualData,
                lastYearData
              );
              return {
                ...expense,
                historicalDollar: pacActualValue.dollars || 0,
                historicalPercent: pacActualValue.percent || 0,
              };
            })
          );
        } else {
          // Fallback to historical data if PAC actual data not found
          const res = await fetchHistoricalRows(
            currentStore,
            currentHistYear,
            currentHistMonth
          );

          // Check again if cancelled
          if (isCancelled) return;

          const histRows = Array.isArray(res.rows) ? res.rows : [];
          setProjections((prev) =>
            prev.map((expense) => {
              const h = histRows.find((r) => r.name === expense.name) || {};
              return {
                ...expense,
                historicalDollar: h.historicalDollar ?? "-",
                historicalPercent: h.historicalPercent ?? "-",
              };
            })
          );
        }
      } catch (e) {
        if (!isCancelled) {
          console.error("PAC actual data fetch error", e);
        }
      }
    };

    loadHistoricalData();

    // Cleanup function to cancel in-flight requests
    return () => {
      isCancelled = true;
    };
  }, [selectedStore, tabIndex, histMonth, histYear, actualMonth, actualYear]);

  const debouncedSave = (next) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(next));
      } catch (e) {
        console.warn("draft save failed", e);
      }
    }, 500);
  };

  const handleInputChange = async (index, field, value) => {
    // Start from current state snapshot
    const np = projections.map((r) => ({ ...r }));
    np[index][field] = value;

    // Recompute simple local estimates you still want to show immediately (optional)
    const crewLabor$ =
      parseFloat(np.find((e) => e.name === "Crew Labor")?.projectedDollar) || 0;
    const mgmtLabor$ =
      parseFloat(
        np.find((e) => e.name === "Management Labor")?.projectedDollar
      ) || 0;
    const payrollTaxPct =
      parseFloat(np.find((e) => e.name === "Payroll Tax")?.projectedPercent) ||
      0;
    const ans$ =
      parseFloat(np.find((e) => e.name === "All Net Sales")?.projectedDollar) ||
      0;
    const advPct =
      parseFloat(np.find((e) => e.name === "Advertising")?.projectedPercent) ||
      0;
    np.forEach((row, idx) => {
      const hist$ = parseFloat(row.historicalDollar) || 0;
      const histPct = parseFloat(row.historicalPercent) || 0;
      const proj$ = parseFloat(row.projectedDollar) || 0;
      const projPct = parseFloat(row.projectedPercent) || 0;
      if (row.name === "Payroll Tax")
        np[idx].projectedDollar = (
          (crewLabor$ + mgmtLabor$) *
          (payrollTaxPct / 100)
        ).toFixed(2);
      if (row.name === "Advertising")
        np[idx].projectedDollar = (ans$ * (advPct / 100)).toFixed(2);
      np[idx].estimatedDollar = ((proj$ + hist$) / 2).toFixed(2);
      np[idx].estimatedPercent = ((projPct + histPct) / 2).toFixed(2);
    });

    try {
      const res = await applyRows(np); // backend does the authoritative math
      const applied = Array.isArray(res.rows) ? res.rows : np;
      setProjections(applied);
      debouncedSave(applied);
    } catch (e) {
      console.error("applyRows error (fallback to local rows)", e);
      setProjections(np);
      debouncedSave(np);
    }
  };

  const handleApply = async () => {
    if (!selectedStore) {
      alert("No store selected");
      return;
    }

    if (!pacEqual) {
      alert(
        pacBelow
          ? "PAC Projections are below the goal. Please update to submit."
          : "PAC Projections entered do not match the goal. Please update to submit."
      );
      return;
    }

    // Build a document ID: store_001_202509
    const monthIndex = months.indexOf(month); // 0–11
    const docId = `${selectedStore}_${year}${String(monthIndex + 1).padStart(
      2,
      "0"
    )}`;

    try {
      await saveProjections(
        selectedStore,
        year,
        month,
        pacGoal,
        projections.map((p) => ({
          name: p.name,
          projectedDollar: Number(p.projectedDollar) || 0,
          projectedPercent: Number(p.projectedPercent) || 0,
        }))
      );

      // clear the refresh-proof draft now that the source of truth is saved
      localStorage.removeItem(draftKey);

      alert("Projections saved to Firestore!");
    } catch (err) {
      console.error("Error saving projections:", err);
      alert("Failed to save projections");
    }
  };

  const getEmptyHistoricalData = () => {
    return expenseList.map((expense) => ({
      name: expense,
      historicalDollar: "-",
      historicalPercent: "-",
    }));
  };

  const makeEmptyProjectionRows = () => {
    const historicalData = getEmptyHistoricalData();
    return expenseList.map((expense) => {
      const h = historicalData.find((e) => e.name === expense) || {};
      return {
        name: expense,
        projectedDollar: "",
        projectedPercent: "",
        estimatedDollar: h.historicalDollar || "",
        estimatedPercent: h.historicalPercent || "",
        historicalDollar: h.historicalDollar || "",
        historicalPercent: h.historicalPercent || "",
      };
    });
  };

  const [projections, setProjections] = useState(makeEmptyProjectionRows());

  const [storeNumber, setStoreNumber] = useState("Store 123"); // You might want to make this dynamic
  const [actualData, setActualData] = useState({}); // Will hold actual data from invoices
  const [pacActualData, setPacActualData] = useState(null); // Will hold PAC actual data
  const [hoverInfo, setHoverInfo] = useState(null);

  // Categories for visual grouping
  const categories = {
    Sales: ["Product Sales", "All Net Sales"],
    "Food & Paper": [
      "Base Food",
      "Employee Meal",
      "Condiment",
      "Total Waste",
      "Paper",
    ],
    Labor: ["Crew Labor", "Management Labor", "Payroll Tax"],
    Purchases: [
      "Advertising",
      "Travel",
      "Adv Other",
      "Promotion",
      "Outside Services",
      "Linen",
      "OP. Supply",
      "Maint. & Repair",
      "Small Equipment",
      "Utilities",
      "Office",
      "Cash +/-",
      "Crew Relations",
      "Training",
    ],
  };

  // Helper functions
  const getCategory = (expense) => {
    const input = expense.toLowerCase();
    for (const [key, values] of Object.entries(categories)) {
      if (values.some((v) => v.toLowerCase() === input)) {
        return key;
      }
    }
    return null;
  };

  const getCategoryColor = (category) => {
    const isDark = theme.palette.mode === "dark";

    if (!isDark) {
      // Light mode
      const colors = {
        Sales: "#e3f2fd",
        "Food & Paper": "#e8f5e9",
        Labor: "#fff3e0",
        Purchases: "#f3e5f5",
      };
      return colors[category] || "#ffffff";
    } else {
      // Dark mode - balanced contrasts
      const colors = {
        Sales: "#1a2b3d", // navy blue tint
        "Food & Paper": "#1c2a1c", // green tint
        Labor: "#332a1c", // warm brown tint
        Purchases: "#2a1f2f", // violet tint
      };
      return colors[category] || "#121212";
    }
  };

  // this function saves all the user input data from the generate page via backend
  const handleGenerate = async (e) => {
    // Check if current month is locked
    if (isCurrentPeriodLocked()) {
      alert("This month is locked and cannot be modified.");
      return;
    }

    // Allow partial submissions - at least one field should have a value entered
    // Check if field is not empty string (0 is a valid input)
    const hasAnyValue =
      productNetSales !== "" ||
      cash !== "" ||
      promo !== "" ||
      allNetSales !== "" ||
      managerMeal !== "" ||
      advertising !== "" ||
      duesAndSubscriptions !== "" ||
      crewLabor !== "" ||
      totalLabor !== "" ||
      payrollTax !== "" ||
      additionalLaborDollars !== "" ||
      completeWaste !== "" ||
      rawWaste !== "" ||
      condiment !== "" ||
      variance !== "" ||
      unexplained !== "" ||
      discounts !== "" ||
      baseFood !== "" ||
      empMgrMealsPercent !== "" ||
      startingFood !== "" ||
      startingCondiment !== "" ||
      startingPaper !== "" ||
      startingNonProduct !== "" ||
      startingOpsSupplies !== "" ||
      endingFood !== "" ||
      endingCondiment !== "" ||
      endingPaper !== "" ||
      endingNonProduct !== "" ||
      endingOpsSupplies !== "";

    if (!hasAnyValue) {
      alert("Please enter at least one field before submitting.");
      return;
    }

    try {
      if (!selectedStore) {
        alert("No store selected");
        return;
      }

      // Get user's full name
      const submittedBy = await getUserFullName();

      // Save generate input data - only include fields that have been explicitly provided
      // Empty fields are skipped to preserve existing Firebase values
      const inputData = {};

      // Helper to add values that have been explicitly provided (including 0)
      // Skips empty/undefined/null values to preserve existing data in Firebase
      const addIfProvided = (key, value) => {
        // Check if value is provided (not empty string, undefined, or null)
        if (value !== undefined && value !== null && value !== "") {
          const numValue = Number(value);
          // Only include if it's a valid number (including 0)
          if (!isNaN(numValue)) {
            inputData[key] = numValue;
          }
        }
      };

      addIfProvided("productNetSales", productNetSales);
      addIfProvided("cash", cash);
      addIfProvided("promo", promo);
      addIfProvided("allNetSales", allNetSales);
      addIfProvided("managerMeal", managerMeal);
      addIfProvided("advertising", advertising);
      addIfProvided("duesAndSubscriptions", duesAndSubscriptions);
      addIfProvided("crewLabor", crewLabor);
      addIfProvided("totalLabor", totalLabor);
      addIfProvided("payrollTax", payrollTax);
      addIfProvided("additionalLaborDollars", additionalLaborDollars);
      addIfProvided("completeWaste", completeWaste);
      addIfProvided("rawWaste", rawWaste);
      addIfProvided("condiment", condiment);
      addIfProvided("variance", variance);
      addIfProvided("unexplained", unexplained);
      addIfProvided("discounts", discounts);
      addIfProvided("baseFood", baseFood);
      addIfProvided("empMgrMealsPercent", empMgrMealsPercent);
      addIfProvided("startingFood", startingFood);
      addIfProvided("startingCondiment", startingCondiment);
      addIfProvided("startingPaper", startingPaper);
      addIfProvided("startingNonProduct", startingNonProduct);
      addIfProvided("startingOpsSupplies", startingOpsSupplies);
      addIfProvided("endingFood", endingFood);
      addIfProvided("endingCondiment", endingCondiment);
      addIfProvided("endingPaper", endingPaper);
      addIfProvided("endingNonProduct", endingNonProduct);
      addIfProvided("endingOpsSupplies", endingOpsSupplies);

      // Calculate Food Over Base
      // Formula: Raw Waste + Complete Waste + Condiment + Stat Variance + Unexplained
      // (Unexplained subtracts if negative, handled by addition)
      const foodOverBaseCalc =
        (Number(rawWaste) || 0) +
        (Number(completeWaste) || 0) +
        (Number(condiment) || 0) +
        (Number(variance) || 0) +
        (Number(unexplained) || 0);

      addIfProvided("foodOverBase", foodOverBaseCalc);

      await saveGenerateInput(
        selectedStore,
        year,
        month,
        inputData,
        submittedBy
      );

      // Persist current projections (authoritative structure for backend)
      const monthIndex = months.indexOf(month); // 0..11
      await saveProjections(
        selectedStore,
        year,
        month,
        pacGoal,
        (projections || []).map((p) => ({
          name: p.name,
          projectedDollar: Number(p.projectedDollar) || 0,
          projectedPercent: Number(p.projectedPercent) || 0,
        }))
      );

      // Compute and save PAC actuals
      try {
        /*console.log("Starting PAC actual computation...", {
          selectedStore,
          year,
          month,
          submittedBy,
        });*/
        const result = await computeAndSavePacActual(
          selectedStore,
          year,
          month,
          submittedBy
        );
        //console.log("PAC Actual computation successful:", result);
      } catch (e) {
        console.error("PAC Actual compute failed:", e);
        alert(`PAC Actual computation failed: ${e.message}`);
      }

      alert("Generate submission saved to Firestore");
      await fetchMonthLockStatus();
      await fetchLockedMonths();
    } catch (error) {
      console.error("Error saving generate submission:", error);
      alert("Failed to save generate submission.");
    }
  };

  // ----- PAC submit gating (percent-based) -----
  const goalNumeric = Number(pacGoal);
  const hasGoal = pacGoal !== "" && !Number.isNaN(goalNumeric);

  const projectedPacPercent =
    Number(projections.find((r) => r.name === "P.A.C.")?.projectedPercent) || 0;

  // Consider goal met if within 0.01 percentage points
  const pacEqual = Math.abs(goalNumeric - projectedPacPercent) <= 0.01;

  const pacBelow = hasGoal && projectedPacPercent < goalNumeric - 1e-9;
  const pacAbove = hasGoal && projectedPacPercent > goalNumeric + 1e-9;
  const pacMismatch = hasGoal && !pacEqual; // includes below OR above

  // ----- Projection helpers for rendering -----
  const getRow = (name) => projections.find((r) => r.name === name) || {};

  // Calculate dollar amount needed to meet goal
  const productSalesDollarForGoal =
    Number(getRow("Product Sales").projectedDollar) || 0;
  const currentPacDollar = Number(getRow("P.A.C.").projectedDollar) || 0;
  const goalPacDollar = hasGoal
    ? (productSalesDollarForGoal * goalNumeric) / 100
    : 0;
  const dollarAmountNeeded = Math.abs(goalPacDollar - currentPacDollar);

  // Helper function to calculate year-over-year percentage change
  const calculateYearOverYearChange = (currentValue, lastYearValue) => {
    if (
      lastYearValue === null ||
      lastYearValue === undefined ||
      lastYearValue === 0
    )
      return 0;
    return ((currentValue - lastYearValue) / lastYearValue) * 100;
  };

  // Helper function to get PAC actual values for a given expense name
  // Can accept optional data parameters to avoid state timing issues
  const getPacActualValue = (
    expenseName,
    dataOverride = null,
    lastYearDataOverride = null
  ) => {
    const data = dataOverride || pacActualData;
    const lastYearData =
      lastYearDataOverride !== null
        ? lastYearDataOverride
        : lastYearPacActualData;

    if (!data) return { dollars: 0, percent: 0 };

    // Map expense names to PAC actual data structure
    switch (expenseName) {
      case "Product Sales": {
        const current = data.sales?.productSales || {
          dollars: 0,
          percent: 0,
        };
        const lastYear = lastYearData?.sales?.productSales;
        const lastYearDollars = lastYear?.dollars;
        // For Product Sales, always return year-over-year change (0 if no last year data)
        const yoyChange = calculateYearOverYearChange(
          current.dollars || 0,
          lastYearDollars
        );
        /*console.log("Product Sales YOY:", {
          currentDollars: current.dollars,
          lastYearDollars: lastYearDollars,
          lastYearData: lastYearData,
          yoyChange,
        });*/
        return {
          dollars: current.dollars,
          percent: yoyChange,
        };
      }
      case "All Net Sales": {
        const current = data.sales?.allNetSales || {
          dollars: 0,
          percent: 0,
        };
        const lastYear = lastYearData?.sales?.allNetSales;
        const lastYearDollars = lastYear?.dollars;
        // For All Net Sales, always return year-over-year change (0 if no last year data)
        const yoyChange = calculateYearOverYearChange(
          current.dollars || 0,
          lastYearDollars
        );
        /*console.log("All Net Sales YOY:", {
          currentDollars: current.dollars,
          lastYearDollars: lastYearDollars,
          lastYearData: lastYearData,
          yoyChange,
        });*/
        return {
          dollars: current.dollars,
          percent: yoyChange,
        };
      }
      case "Base Food":
        return data.foodAndPaper?.baseFood || { dollars: 0, percent: 0 };
      case "Employee Meal":
        return data.foodAndPaper?.employeeMeal || { dollars: 0, percent: 0 };
      case "Condiment":
        return data.foodAndPaper?.condiment || { dollars: 0, percent: 0 };
      case "Total Waste":
        return data.foodAndPaper?.totalWaste || { dollars: 0, percent: 0 };
      case "Paper":
        return data.foodAndPaper?.paper || { dollars: 0, percent: 0 };
      case "Crew Labor":
        return data.labor?.crewLabor || { dollars: 0, percent: 0 };
      case "Management Labor":
        return data.labor?.managementLabor || { dollars: 0, percent: 0 };
      case "Payroll Tax":
        return data.labor?.payrollTax || { dollars: 0, percent: 0 };
      case "Travel":
        return data.purchases?.travel || { dollars: 0, percent: 0 };
      case "Advertising Other":
      case "Adv Other":
        return data.purchases?.advOther || { dollars: 0, percent: 0 };
      case "Promotion":
        return data.purchases?.promotion || { dollars: 0, percent: 0 };
      case "Outside Services":
        return data.purchases?.outsideServices || { dollars: 0, percent: 0 };
      case "Linen":
        return data.purchases?.linen || { dollars: 0, percent: 0 };
      case "Operating Supply":
      case "OP. Supply":
        return data.purchases?.opsSupplies || { dollars: 0, percent: 0 };
      case "Maintenance & Repair":
      case "Maint. & Repair":
        return (
          data.purchases?.maintenanceRepair || {
            dollars: 0,
            percent: 0,
          }
        );
      case "Small Equipment":
        return data.purchases?.smallEquipment || { dollars: 0, percent: 0 };
      case "Utilities":
        return data.purchases?.utilities || { dollars: 0, percent: 0 };
      case "Office":
        return data.purchases?.office || { dollars: 0, percent: 0 };
      case "Cash +/-":
        return data.purchases?.cashPlusMinus || { dollars: 0, percent: 0 };
      case "Crew Relations":
        return data.purchases?.crewRelations || { dollars: 0, percent: 0 };
      case "Training":
        return data.purchases?.training || { dollars: 0, percent: 0 };
      case "Advertising":
        return data.purchases?.advertising || { dollars: 0, percent: 0 };
      case "Total Controllable":
        return data.totals?.totalControllable || { dollars: 0, percent: 0 };
      case "P.A.C.":
        return data.totals?.pac || { dollars: 0, percent: 0 };
      default:
        return { dollars: 0, percent: 0 };
    }
  };
  const productSalesDollar =
    Number(getRow("Product Sales").projectedDollar) || 0;
  const payrollTaxDollar = Number(getRow("Payroll Tax").projectedDollar) || 0;
  const advertisingDollar = Number(getRow("Advertising").projectedDollar) || 0;
  const payrollTaxPctOfPS =
    productSalesDollar > 0 ? (payrollTaxDollar / productSalesDollar) * 100 : 0;
  const advertisingPctOfPS =
    productSalesDollar > 0 ? (advertisingDollar / productSalesDollar) * 100 : 0;

  const productSalesActualDollar =
    Number(getRow("Product Sales").historicalDollar) || 0;
  const payrollTaxActualDollar =
    Number(getRow("Payroll Tax").historicalDollar) || 0;
  const advertisingActualDollar =
    Number(getRow("Advertising").historicalDollar) || 0;
  const payrollTaxActualPctOfPS =
    productSalesActualDollar > 0
      ? (payrollTaxActualDollar / productSalesActualDollar) * 100
      : 0;
  const advertisingActualPctOfPS =
    productSalesActualDollar > 0
      ? (advertisingActualDollar / productSalesActualDollar) * 100
      : 0;

  const groupFoodPaper = [
    "Base Food",
    "Employee Meal",
    "Condiment",
    "Total Waste",
    "Paper",
  ];
  const groupLabor = ["Crew Labor", "Management Labor", "Payroll Tax"];
  const groupPurchases = [
    "Advertising",
    "Travel",
    "Adv Other",
    "Promotion",
    "Outside Services",
    "Linen",
    "OP. Supply",
    "Maint. & Repair",
    "Small Equipment",
    "Utilities",
    "Office",
    "Cash +/-",
    "Crew Relations",
    "Training",
  ];

  const sumProjected = (names) =>
    names.reduce(
      (acc, nm) => acc + (Number(getRow(nm).projectedDollar) || 0),
      0
    );
  const sumProjectedPct = (names) =>
    names.reduce((acc, nm) => {
      if (nm === "Payroll Tax") return acc + payrollTaxPctOfPS;
      if (nm === "Advertising") return acc + advertisingPctOfPS;
      return acc + (Number(getRow(nm).projectedPercent) || 0);
    }, 0);
  const sumActual = (names) =>
    names.reduce(
      (acc, nm) => acc + (Number(getRow(nm).historicalDollar) || 0),
      0
    );
  const sumActualPct = (names) =>
    names.reduce((acc, nm) => {
      if (nm === "Payroll Tax") return acc + payrollTaxActualPctOfPS;
      if (nm === "Advertising") return acc + advertisingActualPctOfPS;
      return acc + (Number(getRow(nm).historicalPercent) || 0);
    }, 0);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container>
        <Paper sx={{ padding: "10px" }}>
          <Grid
            container
            wrap="wrap"
            justifyContent="space-between"
            alignItems="center"
          >
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ padding: "10px", marginLeft: "5px" }}>
                <h1 className="Header">PAC</h1>
              </Box>
            </Grid>
            <Grid
              container
              xs={12}
              sm={6}
              md={4}
              wrap="wrap"
              justifyContent="flex-end"
              alignItems="center"
            >
              <Grid item xs={12} sm={6} md={4}>
                <Box
                  display="flex"
                  flexDirection="row"
                  flexWrap="nowrap"
                  justifyContent="center"
                  gap={1}
                  sx={{ padding: "10px", margin: "0 auto" }}
                >
                  {/* Month Dropdown */}
                  <Select
                    value={month}
                    onChange={(e) => {
                      setMonth(e.target.value);
                    }}
                    sx={{ width: 200, marginRight: 2 }}
                  >
                    {months.map((m) => {
                      const isLocked = MonthLockService.isMonthLocked(
                        m,
                        year,
                        lockedMonths
                      );
                      return (
                        <MenuItem key={m} value={m}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {isLocked && (
                              <LockIcon
                                sx={{ fontSize: 16, color: "warning.main" }}
                              />
                            )}
                            {m}
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>

                  {/* Year Dropdown */}
                  <Select
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                    }}
                    sx={{ width: 120, marginRight: 2 }}
                  >
                    {years.map((y) => (
                      <MenuItem key={y} value={y}>
                        {y}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Tabs
                  value={tabIndex}
                  onChange={(event, newIndex) => setTabIndex(newIndex)}
                  sx={{ padding: "10px", margin: "0 auto" }}
                  textColor="primary"
                >
                  <Tab label="Projections" />
                  <Tab label="Generate" />
                  <Tab label="Actual" />
                </Tabs>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      </Container>
      {tabIndex === 0 && (
        <Container sx={{ marginTop: "20px" }}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                {/* PAC Goal + Historical selectors row */}
                <TableRow
                  sx={{
                    "& th": {
                      backgroundColor: "transparent !important",
                      borderBottom: "none",
                      verticalAlign: "top",
                    },
                  }}
                >
                  {/* Left: PAC Goal (spans Expense/Projected columns) */}
                  <TableCell colSpan={3}>
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 2,
                        px: 2,
                        py: 1,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "primary.light",
                        backgroundColor: "primary.50",
                        boxShadow: 1,
                      }}
                    >
                      <Box sx={{ fontWeight: 700, fontSize: 14, opacity: 0.8 }}>
                        PAC Goal
                      </Box>

                      {/* Non-admins: always see value only */}
                      {!isAdmin && (
                        <Box
                          sx={{
                            fontWeight: 800,
                            fontSize: 16,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1.5,
                            backgroundColor: "background.paper",
                          }}
                        >
                          {fmtPercent(pacGoal)}
                        </Box>
                      )}

                      {/* Admin: not editing */}
                      {isAdmin && !editingGoal && (
                        <>
                          <Box
                            sx={{
                              fontWeight: 800,
                              fontSize: 16,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1.5,
                              backgroundColor: "background.paper",
                            }}
                          >
                            {fmtPercent(pacGoal)}
                          </Box>

                          {/* Change button for admin - allowed for all periods (past, current, future) */}
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setEditingGoal(true)}
                          >
                            Change
                          </Button>
                        </>
                      )}

                      {/* Admin: edit mode */}
                      {isAdmin && editingGoal && (
                        <>
                          <TextField
                            size="small"
                            type="number"
                            value={pacGoal}
                            onChange={(e) => setPacGoal(e.target.value)}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  %
                                </InputAdornment>
                              ),
                            }}
                            sx={{
                              "& .MuiInputBase-input": { fontWeight: 700 },
                              width: 160,
                              backgroundColor: "#fff",
                            }}
                          />
                          <Button
                            variant="contained"
                            size="small"
                            onClick={async () => {
                              if (!selectedStore) return;
                              const numericGoal = Number(pacGoal) || 0;

                              const monthIdx = months.indexOf(month);
                              const periodId = `${selectedStore}_${year}${String(
                                monthIdx + 1
                              ).padStart(2, "0")}`;

                              await saveProjections(
                                selectedStore,
                                year,
                                month,
                                numericGoal,
                                projections.map((p) => ({
                                  name: p.name,
                                  projectedDollar:
                                    Number(p.projectedDollar) || 0,
                                  projectedPercent:
                                    Number(p.projectedPercent) || 0,
                                }))
                              );

                              setEditingGoal(false);
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => setEditingGoal(false)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </Box>
                  </TableCell>

                  {/* Divider column */}
                  <TableCell
                    sx={{ borderRight: "20px solid #f5f5f5ff", width: "12px" }}
                  />

                  {/* Right: Actual selectors (spans Actual $/%) */}
                  <TableCell colSpan={2}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      {/* Month */}
                      <Select
                        value={actualMonth}
                        onChange={(e) => {
                          setActualMonth(e.target.value);
                        }}
                        size="small"
                        sx={{ width: 150, backgroundColor: "background.paper" }}
                      >
                        {months.map((m) => (
                          <MenuItem key={m} value={m}>
                            {m}
                          </MenuItem>
                        ))}
                      </Select>

                      {/* Year */}
                      <Select
                        value={actualYear}
                        onChange={(e) => setActualYear(e.target.value)}
                        size="small"
                        sx={{ width: 100, backgroundColor: "background.paper" }}
                      >
                        {years.map((y) => (
                          <MenuItem key={y} value={y}>
                            {y}
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>

                    <Box sx={{ mt: 1, textAlign: "left", fontWeight: 700 }}>
                      {`Displaying Actual Data for ${actualMonth} ${actualYear}`}
                    </Box>
                  </TableCell>
                </TableRow>

                {/* Regular header row */}
                <TableRow sx={{ whiteSpace: "nowrap" }}>
                  <TableCell>
                    <strong>Expense Name</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Projected $</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Projected %</strong>
                  </TableCell>
                  <TableCell
                    sx={{ borderRight: "20px solid #f5f5f5ff", width: "12px" }}
                  />
                  <TableCell align="center">
                    <strong>Actual $</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Actual %</strong>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {projections.map((expense, index) => {
                  const isPac = expense.name === "P.A.C.";
                  const pacColor = isPac
                    ? getPacRowColor(projections, pacGoal)
                    : undefined;

                  return (
                    <React.Fragment key={expense.name}>
                      <TableRow
                        sx={{
                          // normal rows keep category background
                          backgroundColor: !isPac
                            ? getCategoryColor(getCategory(expense.name))
                            : "transparent",
                          // for P.A.C., apply style to all its cells (td/th)
                          ...(isPac
                            ? { "& td, & th": PAC_COLOR_STYLES[pacColor] ?? {} }
                            : {}),
                        }}
                      >
                        <TableCell>{expense.name}</TableCell>

                        <TableCell align="center">
                          {hasUserInputAmountField.includes(expense.name) &&
                          !isPac ? (
                            <TextField
                              type="number"
                              size="small"
                              variant="outlined"
                              sx={{
                                width: "150px",
                                backgroundColor: "#ffffff",
                                mx: "auto",
                              }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    $
                                  </InputAdornment>
                                ),
                              }}
                              value={expense.projectedDollar ?? ""}
                              placeholder="0.00"
                              disabled={isMonthLocked()}
                              onChange={(e) =>
                                handleInputChange(
                                  index,
                                  "projectedDollar",
                                  Number(e.target.value)
                                )
                              }
                            />
                          ) : (
                            <span
                              style={{
                                display: "inline-block",
                                minWidth: 80,
                                textAlign: "center",
                              }}
                            >
                              {fmtUsd(expense.projectedDollar || 0)}
                            </span>
                          )}
                        </TableCell>

                        <TableCell align="center">
                          <FormControl>
                            {(() => {
                              // Blank % display for Product Sales and All Net Sales
                              if (
                                expense.name === "Product Sales" ||
                                expense.name === "All Net Sales"
                              ) {
                                return (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      minWidth: 80,
                                    }}
                                  ></span>
                                );
                              }
                              // Special display for Payroll Tax / Advertising: show computed % of Product Sales to the left
                              if (expense.name === "Payroll Tax") {
                                return (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 2,
                                    }}
                                  >
                                    <Box
                                      sx={{ minWidth: 80, textAlign: "center" }}
                                    >
                                      {(payrollTaxPctOfPS || 0).toFixed(2)}%
                                    </Box>
                                    <Box
                                      sx={{
                                        ml: "auto",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        minWidth: 140,
                                      }}
                                    >
                                      <TextField
                                        type="number"
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                          width: "125px",
                                          backgroundColor: "#ffffff",
                                          mx: "auto",
                                        }}
                                        InputProps={{
                                          endAdornment: (
                                            <InputAdornment position="end">
                                              %
                                            </InputAdornment>
                                          ),
                                        }}
                                        value={expense.projectedPercent ?? ""}
                                        placeholder="0.00"
                                        disabled={isMonthLocked()}
                                        onChange={(e) =>
                                          handleInputChange(
                                            index,
                                            "projectedPercent",
                                            Number(e.target.value)
                                          )
                                        }
                                      />
                                      <FormLabel
                                        sx={{
                                          fontSize: "0.75rem",
                                          mt: 0.5,
                                          textAlign: "center",
                                        }}
                                      >
                                        {getLabel(expense.name)}
                                      </FormLabel>
                                    </Box>
                                  </Box>
                                );
                              }
                              if (expense.name === "Advertising") {
                                return (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 2,
                                    }}
                                  >
                                    <Box
                                      sx={{ minWidth: 80, textAlign: "center" }}
                                    >
                                      {(advertisingPctOfPS || 0).toFixed(2)}%
                                    </Box>
                                    <Box
                                      sx={{
                                        ml: "auto",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        minWidth: 140,
                                      }}
                                    >
                                      <TextField
                                        type="number"
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                          width: "125px",
                                          backgroundColor: "#ffffff",
                                          mx: "auto",
                                        }}
                                        InputProps={{
                                          endAdornment: (
                                            <InputAdornment position="end">
                                              %
                                            </InputAdornment>
                                          ),
                                        }}
                                        value={expense.projectedPercent ?? ""}
                                        placeholder="0.00"
                                        disabled={isMonthLocked()}
                                        onChange={(e) =>
                                          handleInputChange(
                                            index,
                                            "projectedPercent",
                                            Number(e.target.value)
                                          )
                                        }
                                      />
                                      <FormLabel
                                        sx={{
                                          fontSize: "0.75rem",
                                          mt: 0.5,
                                          textAlign: "center",
                                        }}
                                      >
                                        {getLabel(expense.name)}
                                      </FormLabel>
                                    </Box>
                                  </Box>
                                );
                              }
                              // Normal editable % inputs (shift slightly right for alignment)
                              if (
                                hasUserInputedPercentageField.includes(
                                  expense.name
                                ) &&
                                !isPac
                              ) {
                                return (
                                  <TextField
                                    type="number"
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      width: "125px",
                                      backgroundColor: "#ffffff",
                                      mx: "auto",
                                    }}
                                    InputProps={{
                                      endAdornment: (
                                        <InputAdornment position="end">
                                          %
                                        </InputAdornment>
                                      ),
                                    }}
                                    value={expense.projectedPercent ?? ""}
                                    placeholder="0.00"
                                    disabled={isMonthLocked()}
                                    onChange={(e) =>
                                      handleInputChange(
                                        index,
                                        "projectedPercent",
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                );
                              }
                              return (
                                <span
                                  style={{
                                    display: "inline-block",
                                    minWidth: 80,
                                    textAlign: "center",
                                  }}
                                >
                                  {expense.projectedPercent || 0}%
                                </span>
                              );
                            })()}
                            {expense.name !== "Payroll Tax" &&
                              expense.name !== "Advertising" && (
                                <FormLabel
                                  sx={{
                                    fontSize: "0.75rem",
                                    textAlign: "center",
                                  }}
                                >
                                  {getLabel(expense.name)}
                                </FormLabel>
                              )}
                          </FormControl>
                        </TableCell>

                        <TableCell
                          sx={{
                            borderRight: "20px solid #f5f5f5ff",
                            width: "12px",
                          }}
                        />

                        <TableCell align="center">
                          {fmtUsd(expense.historicalDollar || 0)}
                        </TableCell>
                        <TableCell align="center">
                          {(() => {
                            // Use historicalPercent from projections state (already calculated correctly in loadHistoricalData)
                            const percent = expense.historicalPercent;

                            // For Product Sales and All Net Sales, show year-over-year change
                            if (
                              expense.name === "Product Sales" ||
                              expense.name === "All Net Sales"
                            ) {
                              // historicalPercent already contains the year-over-year change
                              if (typeof percent === "number") {
                                const sign = percent >= 0 ? "+" : "";
                                return `${sign}${percent.toFixed(2)}%`;
                              }
                              return "-";
                            }
                            // For all other expenses, show the regular percent
                            return typeof percent === "number"
                              ? percent.toFixed(2) + "%"
                              : percent || "-";
                          })()}
                        </TableCell>
                      </TableRow>

                      {/* Group totals rows */}
                      {expense.name === "Paper" && (
                        <TableRow
                          sx={{
                            fontWeight: 700,
                            backgroundColor: "#dbeedc",
                            "& td": { fontWeight: 700 },
                          }}
                        >
                          <TableCell>Food & Paper Totals</TableCell>
                          <TableCell align="center">
                            {fmtUsd(sumProjected(groupFoodPaper))}
                          </TableCell>
                          <TableCell align="center">
                            {sumProjectedPct(groupFoodPaper).toFixed(2) + "%"}
                          </TableCell>
                          <TableCell
                            sx={{
                              borderRight: "20px solid #f5f5f5ff",
                              width: "12px",
                            }}
                          />
                          <TableCell align="center">
                            {fmtUsd(
                              pacActualData?.foodAndPaper?.total?.dollars || 0
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {(
                              pacActualData?.foodAndPaper?.total?.percent || 0
                            ).toFixed(2) + "%"}
                          </TableCell>
                        </TableRow>
                      )}

                      {expense.name === "Payroll Tax" && (
                        <TableRow
                          sx={{
                            fontWeight: 700,
                            backgroundColor: "#ffe7c2",
                            "& td": { fontWeight: 700 },
                          }}
                        >
                          <TableCell>Labor Totals</TableCell>
                          <TableCell align="center">
                            {fmtUsd(sumProjected(groupLabor))}
                          </TableCell>
                          <TableCell align="center">
                            {sumProjectedPct(groupLabor).toFixed(2) + "%"}
                          </TableCell>
                          <TableCell
                            sx={{
                              borderRight: "20px solid #f5f5f5ff",
                              width: "12px",
                            }}
                          />
                          <TableCell align="center">
                            {fmtUsd(pacActualData?.labor?.total?.dollars || 0)}
                          </TableCell>
                          <TableCell align="center">
                            {(
                              pacActualData?.labor?.total?.percent || 0
                            ).toFixed(2) + "%"}
                          </TableCell>
                        </TableRow>
                      )}

                      {expense.name === "Training" && (
                        <TableRow
                          sx={{
                            fontWeight: 700,
                            backgroundColor: "#e8d1f0",
                            "& td": { fontWeight: 700 },
                          }}
                        >
                          <TableCell>Purchases Totals</TableCell>
                          <TableCell align="center">
                            {fmtUsd(sumProjected(groupPurchases))}
                          </TableCell>
                          <TableCell align="center">
                            {sumProjectedPct(groupPurchases).toFixed(2) + "%"}
                          </TableCell>
                          <TableCell
                            sx={{
                              borderRight: "20px solid #f5f5f5ff",
                              width: "12px",
                            }}
                          />
                          <TableCell align="center">
                            {fmtUsd(
                              pacActualData?.purchases?.total?.dollars || 0
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {(
                              pacActualData?.purchases?.total?.percent || 0
                            ).toFixed(2) + "%"}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/*The Apply button*/}
          <Box
            textAlign="center"
            sx={{
              pt: 1,
              pb: 1,
              display: "flex",
              gap: 2,
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="outlined"
                size="large"
                onClick={handleResetToLastSubmitted}
                disabled={isMonthLocked()}
              >
                Reset to previous month
              </Button>

              <Button
                variant="contained"
                size="large"
                onClick={handleApply}
                disabled={pacMismatch || authLoading || !roleAllowed}
                title={
                  pacMismatch
                    ? "PAC Projections do not match the goal"
                    : !authLoading && !roleAllowed
                    ? "Your role cannot Apply. Please contact an Admin, Supervisor, or General Manager for assistance."
                    : undefined
                }
              >
                Apply
              </Button>
            </Box>

            {pacMismatch && (
              <Box
                sx={{
                  mt: 0.5,
                  fontWeight: 600,
                  color: pacBelow ? "error.main" : "warning.main",
                }}
              >
                {pacBelow
                  ? `PAC Projections are below goal. Remove ${fmtUsd(
                      dollarAmountNeeded
                    )} dollars to meet goal.`
                  : `PAC Projections are above goal. ${fmtUsd(
                      dollarAmountNeeded
                    )} over goal.`}
                <Box component="span" sx={{ ml: 1, opacity: 0.8 }}>
                  Current: {fmtPercent(projectedPacPercent)} • Goal:{" "}
                  {fmtPercent(goalNumeric)}
                </Box>
              </Box>
            )}
            {!authLoading && !roleAllowed && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Your role cannot Apply. Please contact an Admin, Supervisor, or
                General Manager for assistance.
              </Alert>
            )}
          </Box>
        </Container>
      )}{" "}
      {/* end of Projections page */}
      {tabIndex === 1 && (
        <Container>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              marginTop: "20px",
            }}
          >
            {/* Sales */}
            <div className="pac-section sales-section">
              <h4>Sales</h4>
              <div className="input-row">
                <label className="input-label">Product Net Sales ($)</label>
                <input
                  type="number"
                  value={productNetSales}
                  onChange={(e) => setProductNetSales(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">All Net Sales ($)</label>
                <input
                  type="number"
                  value={allNetSales}
                  onChange={(e) => setAllNetSales(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Promotion ($)</label>
                <input
                  type="number"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Manager Meal ($)</label>
                <input
                  type="number"
                  value={managerMeal}
                  onChange={(e) => setManagerMeal(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Cash +/- ($)</label>
                <input
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Advertising (%)</label>
                <input
                  type="number"
                  value={advertising}
                  onChange={(e) => setAdvertising(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">
                  Dues and Subscriptions ($)
                </label>
                <input
                  type="number"
                  value={duesAndSubscriptions}
                  onChange={(e) => setDuesAndSubscriptions(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
            </div>

            {/* Labor */}
            <div className="pac-section labor-section">
              <h4>Labor</h4>
              <div className="input-row">
                <label className="input-label">Crew Labor %</label>
                <input
                  type="number"
                  value={crewLabor}
                  onChange={(e) => setCrewLabor(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Total Labor %</label>
                <input
                  type="number"
                  value={totalLabor}
                  onChange={(e) => setTotalLabor(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Payroll Tax (%)</label>
                <input
                  type="number"
                  value={payrollTax}
                  onChange={(e) => setPayrollTax(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">
                  Additional Labor Dollars ($)
                </label>
                <input
                  type="number"
                  value={additionalLaborDollars}
                  onChange={(e) => setAdditionalLaborDollars(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
            </div>

            {/* Food */}
            <div className="pac-section food-section">
              <h4>Food</h4>
              <div className="input-row">
                <label className="input-label">Complete Waste %</label>
                <input
                  type="number"
                  value={completeWaste}
                  onChange={(e) => setCompleteWaste(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Raw Waste %</label>
                <input
                  type="number"
                  value={rawWaste}
                  onChange={(e) => setRawWaste(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Condiment %</label>
                <input
                  type="number"
                  value={condiment}
                  onChange={(e) => setCondiment(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Variance Stat %</label>
                <input
                  type="number"
                  value={variance}
                  onChange={(e) => setVariance(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Unexplained %</label>
                <input
                  type="number"
                  value={unexplained}
                  onChange={(e) => setUnexplained(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Discounts %</label>
                <input
                  type="number"
                  value={discounts}
                  onChange={(e) => setDiscounts(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Base Food %</label>
                <input
                  type="number"
                  value={baseFood}
                  onChange={(e) => setBaseFood(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Emp/Mgr Meals %</label>
                <input
                  type="number"
                  value={empMgrMealsPercent}
                  onChange={(e) => setEmpMgrMealsPercent(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
            </div>

            {/* Starting Inventory */}
            <div className="pac-section starting-inventory-section">
              <h4>Starting Inventory</h4>
              <div className="input-row">
                <label className="input-label">Food ($)</label>
                <input
                  type="number"
                  value={startingFood}
                  onChange={(e) => setStartingFood(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Condiment ($)</label>
                <input
                  type="number"
                  value={startingCondiment}
                  onChange={(e) => setStartingCondiment(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Paper ($)</label>
                <input
                  type="number"
                  value={startingPaper}
                  onChange={(e) => setStartingPaper(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Non Product ($)</label>
                <input
                  type="number"
                  value={startingNonProduct}
                  onChange={(e) => setStartingNonProduct(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label"> Office Supplies ($)</label>
                <input
                  type="number"
                  value={startingOpsSupplies}
                  onChange={(e) => setStartingOpsSupplies(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
            </div>

            {/* Ending Inventory */}
            <div className="pac-section ending-inventory-section">
              <h4>Ending Inventory</h4>
              <div className="input-row">
                <label className="input-label">Food ($)</label>
                <input
                  type="number"
                  value={endingFood}
                  onChange={(e) => setEndingFood(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Condiment ($)</label>
                <input
                  type="number"
                  value={endingCondiment}
                  onChange={(e) => setEndingCondiment(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Paper ($)</label>
                <input
                  type="number"
                  value={endingPaper}
                  onChange={(e) => setEndingPaper(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Non Product ($)</label>
                <input
                  type="number"
                  value={endingNonProduct}
                  onChange={(e) => setEndingNonProduct(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="input-row">
                <label className="input-label"> Office Supplies ($)</label>
                <input
                  type="number"
                  value={endingOpsSupplies}
                  onChange={(e) => setEndingOpsSupplies(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
            </div>

            {/* Month Lock Status Alert */}
            {isMonthLocked() && (
              <Alert
                severity="warning"
                icon={<LockIcon />}
                sx={{ mt: 2, mb: 2 }}
              >
                This month is locked and cannot be modified. Only administrators
                can unlock it.
              </Alert>
            )}

            {/* Submit and Lock buttons */}
            <Box
              display="flex"
              gap={2}
              justifyContent="center"
              sx={{ mt: 2, mb: 8 }}
            >
              <Button
                variant="contained"
                color="primary"
                size="large"
                sx={{
                  width: "250px",
                  backgroundColor: "#1976d2",
                  "&:hover": {
                    backgroundColor: "#42a5f5",
                  },
                }}
                onClick={handleGenerate}
                disabled={
                  isCurrentPeriodLocked() || authLoading || !roleAllowed
                }
                title={
                  isCurrentPeriodLocked()
                    ? "This month is locked and cannot be modified."
                    : !authLoading && !roleAllowed
                    ? "Your role cannot Submit. Please contact an Admin, Supervisor, or General Manager for assistance."
                    : undefined
                }
              >
                Submit
              </Button>

              <Button
                variant={isMonthLocked() ? "contained" : "outlined"}
                color={isMonthLocked() ? "error" : "primary"}
                size="large"
                startIcon={isMonthLocked() ? <LockOpenIcon /> : <LockIcon />}
                sx={{
                  width: "250px",
                }}
                onClick={handleLockMonth}
                disabled={
                  (!isMonthLocked() && !canLockMonth) ||
                  (isMonthLocked() && !canUnlockMonth)
                }
              >
                {isMonthLocked() ? "Unlock Month" : "Lock Month"}
              </Button>
            </Box>
            {!authLoading && !roleAllowed && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Your role cannot Submit. Please contact an Admin, Supervisor, or
                General Manager for assistance.
              </Alert>
            )}
          </div>
        </Container>
      )}{" "}
      {/* end of Generate page */}
      {tabIndex === 2 && (
        <Container>
          {/* Month status and timestamp display */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Box display="flex" gap={2} alignItems="center">
              {isMonthLocked() && (
                <Chip
                  icon={<LockIcon />}
                  label={`Month Locked by ${
                    monthLockStatus?.locked_by || "Unknown"
                  }`}
                  color="warning"
                  variant="outlined"
                />
              )}
              {lastUpdatedTimestamp && (
                <Chip
                  label={`Last Updated: ${lastUpdatedTimestamp.toLocaleString()}`}
                  color="info"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>

          <PacTab
            storeId={selectedStore || "store_001"}
            year={year}
            month={month}
            projections={projections}
            isMonthLocked={isMonthLocked()}
            monthLockStatus={monthLockStatus}
            lastUpdatedTimestamp={lastUpdatedTimestamp}
          />
        </Container>
      )}{" "}
      {/* end of Actual page */}
    </Box>
  );
};

export default PAC;

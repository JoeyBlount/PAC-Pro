import React, { useState, useEffect, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { db, auth } from "../../config/firebase-config";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
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
} from "@mui/material";
import { StoreContext } from "../../context/storeContext";
import PacTab from "./PacTab";
import { useAuth } from "../../context/AuthContext";
import MonthLockService from "../../services/monthLockService";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";

const expenseList = [
  "Product Sales", "All Net Sales",
  "Base Food", "Employee Meal", "Condiment", "Total Waste", "Paper",
  "Crew Labor", "Management Labor", "Payroll Tax", "Advertising",
  "Travel", "Adv Other", "Promotion", "Outside Services",
  "Linen", "OP. Supply", "Maint. & Repair", "Small Equipment", "Utilities", "Office", "Cash +/-", "Crew Relations", "Training",
  "Total Controllable", "P.A.C."
];

// Add expense(s) to this array to disable projected $ text field. Case-senstive.
const hasUserInputAmountField = [
  "Product Sales", "All Net Sales",
  "Travel", "Adv Other", "Outside Services",
  "Linen", "OP. Supply", "Maint. & Repair", "Small Equipment", "Utilities", "Office", "Cash +/-", "Crew Relations", "Training",
  "Promotion"
];


// Backend (Generate tab)
const BASE_URL = "http://127.0.0.1:5140";
async function api(path, { method = "GET", body } = {}) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : { "X-Dev-Email": "dev@example.com" }),
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
  "Base Food", "Employee Meal", "Condiment", "Total Waste", "Paper",
  "Crew Labor", "Management Labor", "Payroll Tax",
  "Advertising"
];

const getLabel = (key) => {
  const specialLabels = {
    "Payroll Tax": "% of Total Labor",
    "Advertising": "% of All Net Sales"
  };

  return specialLabels[key] || "";
};

const fmtUsd = (v) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(v || 0));


const PAC = () => {
  const location = useLocation();
  const [tabIndex, setTabIndex] = useState(0);
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString("default", { month: "long" });
  const [month, setMonth] = useState(currentMonth);

  const pad2 = (n) => String(n).padStart(2, "0");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - i);
  const [year, setYear] = useState(currentYear);

  // Handle navigation from Reports page
  useEffect(() => {
    if (location.state?.openActualTab) {
      setTabIndex(2); // Switch to Actual tab (index 2)
      if (location.state.month) setMonth(location.state.month);
      if (location.state.year) setYear(location.state.year);
    }
  }, [location]);

  // Get selected store from context
  const { selectedStore } = useContext(StoreContext);
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
    green: { backgroundColor: "rgba(46,125,50,0.12)", color: "#2e7d32", fontWeight: 700 },
    red: { backgroundColor: "rgba(211,47,47,0.12)", color: "#d32f2f", fontWeight: 700 },
  };

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
      const data = await seedProjections(selectedStore, prevYear, prevMonthName);
      if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
        alert("No previous submission found.");
        return;
      }
      setProjections(data.rows);
      if (typeof data.pacGoal !== "undefined") setPacGoal(String(data.pacGoal));
    } catch (e) {
      console.error("reset to previous month error", e);
      alert("Failed to load previous month.");
    }
  };

  // State variables for Generate tab; may need to change these
  const pacGenRef = collection(db, "pacGen");
  const [productNetSales, setProductNetSales] = useState(0);
  const [cash, setCash] = useState(0);
  const [promo, setPromo] = useState(0);
  const [allNetSales, setAllNetSales] = useState(0);
  const [advertising, setAdvertising] = useState(0);

  const [crewLabor, setCrewLabor] = useState(0);
  const [totalLabor, setTotalLabor] = useState(0);
  const [payrollTax, setPayrollTax] = useState(0);

  const [completeWaste, setCompleteWaste] = useState(0);
  const [rawWaste, setRawWaste] = useState(0);
  const [condiment, setCondiment] = useState(0);
  const [variance, setVariance] = useState(0);
  const [unexplained, setUnexplained] = useState(0);
  const [discounts, setDiscounts] = useState(0);
  const [baseFood, setBaseFood] = useState(0);

  const [startingFood, setStartingFood] = useState(0);
  const [startingCondiment, setStartingCondiment] = useState(0);
  const [startingPaper, setStartingPaper] = useState(0);
  const [startingNonProduct, setStartingNonProduct] = useState(0);
  const [startingOpsSupplies, setStartingOpsSupplies] = useState(0);

  const [endingFood, setEndingFood] = useState(0);
  const [endingCondiment, setEndingCondiment] = useState(0);
  const [endingPaper, setEndingPaper] = useState(0);
  const [endingNonProduct, setEndingNonProduct] = useState(0);
  const [endingOpsSupplies, setEndingOpsSupplies] = useState(0);

  const { userRole } = useAuth();

  const isAdmin = (userRole || "").toLowerCase() === "admin";

  // Month locking state
  const [monthLockStatus, setMonthLockStatus] = useState(null);
  const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(null);
  const [lockedMonths, setLockedMonths] = useState([]);

  // Check if user can lock months (General Manager, Supervisor, or Admin)
  const canLockMonth = ["admin", "general manager", "supervisor"].includes(
    (userRole || "").toLowerCase()
  );

  // Only admins can unlock months
  const canUnlockMonth = isAdmin; const getPrevPeriod = (y, mName) => {
    const i = months.indexOf(mName);              // 0..11
    const d = new Date(y, i - 1, 1);              // prev month
    return { y: d.getFullYear(), m: d.getMonth() + 1 }; // 1..12
  };


  // returns { monthIndex, year }
  function getPrevMonthYear(d = new Date()) {
    const m = d.getMonth(); // 0..11
    const y = d.getFullYear();
    return m === 0 ? { monthIndex: 11, year: y - 1 } : { monthIndex: m - 1, year: y };
  }
  // ---------- keys & ids ----------
  const monthIndex = months.indexOf(month); // 0..11
  const periodId = `${year}${pad2(monthIndex + 1)}`; // e.g. 202509
  const draftKey = `pacDraft:${selectedStore || "__no_store__"}:${periodId}`;

  const { monthIndex: prevIdx, year: prevYear } = getPrevMonthYear();
  const [histMonth, setHistMonth] = useState(months[prevIdx]);
  const [histYear, setHistYear] = useState(prevYear);

  useEffect(() => {
    if (!month || !year) return;
    const idx = months.indexOf(month); // 0..11
    const d = new Date(year, idx - 1, 1); // previous month of the *selected* period
    setHistMonth(months[d.getMonth()]);
    setHistYear(d.getFullYear());
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

      // Fetch last updated timestamp from pacGen collection
      const monthIndex = months.indexOf(month);
      const period = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

      const pacQuery = query(
        pacGenRef,
        where("Period", "==", period),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const pacSnapshot = await getDocs(pacQuery);
      if (!pacSnapshot.empty) {
        const doc = pacSnapshot.docs[0];
        const data = doc.data();
        setLastUpdatedTimestamp(data.createdAt?.toDate?.() || new Date());
      }
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

  useEffect(() => {
    if (!selectedStore || tabIndex !== 0) return;

    (async () => {
      try {
        const data = await seedProjections(selectedStore, year, month);
        // { source, pacGoal, rows }
        setPacGoal(String(data.pacGoal ?? ""));
        setProjections(Array.isArray(data.rows) ? data.rows : makeEmptyProjectionRows());
      } catch (e) {
        console.error("seedProjections error", e);
        // fallback: keep current projections
      }
    })();
  }, [selectedStore, tabIndex, month, year]);


  useEffect(() => {
    if (!selectedStore) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const toApply = Array.isArray(parsed) ? parsed : projections;
      (async () => {
        try {
          const res = await applyRows(toApply);
          setProjections(Array.isArray(res.rows) ? res.rows : toApply);
        } catch {
          setProjections(toApply);
        }
      })();
    } catch (e) {
      console.warn("Failed to read draft from localStorage", e);
    }
  }, [selectedStore, draftKey]);


  // Fetch month lock status when month, year, or store changes
  useEffect(() => {
    fetchMonthLockStatus();
    fetchLockedMonths();
  }, [month, year, selectedStore]);

  useEffect(() => {
    const loadHistoricalData = async () => {
      if (!selectedStore || !histYear || !histMonth || tabIndex !== 0) return;
      try {
        const res = await fetchHistoricalRows(selectedStore, histYear, histMonth);
        const histRows = Array.isArray(res.rows) ? res.rows : [];
        setProjections(prev =>
          prev.map(expense => {
            const h = histRows.find(r => r.name === expense.name) || {};
            return {
              ...expense,
              historicalDollar: h.historicalDollar ?? "-",
              historicalPercent: h.historicalPercent ?? "-",
            };
          })
        );
      } catch (e) {
        console.error("historical fetch error", e);
      }
    };
    loadHistoricalData();
  }, [selectedStore, tabIndex, histMonth, histYear]);


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
    const np = projections.map(r => ({ ...r }));
    np[index][field] = value;

    // Recompute simple local estimates you still want to show immediately (optional)
    const crewLabor$ = parseFloat(np.find(e => e.name === "Crew Labor")?.projectedDollar) || 0;
    const mgmtLabor$ = parseFloat(np.find(e => e.name === "Management Labor")?.projectedDollar) || 0;
    const payrollTaxPct = parseFloat(np.find(e => e.name === "Payroll Tax")?.projectedPercent) || 0;
    const ans$ = parseFloat(np.find(e => e.name === "All Net Sales")?.projectedDollar) || 0;
    const advPct = parseFloat(np.find(e => e.name === "Advertising")?.projectedPercent) || 0;
    np.forEach((row, idx) => {
      const hist$ = parseFloat(row.historicalDollar) || 0;
      const histPct = parseFloat(row.historicalPercent) || 0;
      const proj$ = parseFloat(row.projectedDollar) || 0;
      const projPct = parseFloat(row.projectedPercent) || 0;
      if (row.name === "Payroll Tax") np[idx].projectedDollar = ((crewLabor$ + mgmtLabor$) * (payrollTaxPct / 100)).toFixed(2);
      if (row.name === "Advertising") np[idx].projectedDollar = (ans$ * (advPct / 100)).toFixed(2);
      np[idx].estimatedDollar = ((proj$ + hist$) / 2).toFixed(2);
      np[idx].estimatedPercent = ((projPct + histPct) / 2).toFixed(2);
    });

    try {
      const res = await applyRows(np);            // backend does the authoritative math
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
        projections.map(p => ({
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
    return expenseList.map(expense => {
      const h = historicalData.find(e => e.name === expense) || {};
      return {
        name: expense,
        projectedDollar: "",
        projectedPercent: "",
        estimatedDollar: h.historicalDollar || "",
        estimatedPercent: h.historicalPercent || "",
        historicalDollar: h.historicalDollar || "",
        historicalPercent: h.historicalPercent || ""
      };
    });
  };


  const [projections, setProjections] = useState(makeEmptyProjectionRows());

  const [storeNumber, setStoreNumber] = useState("Store 123"); // You might want to make this dynamic
  const [actualData, setActualData] = useState({}); // Will hold actual data from invoices
  const [hoverInfo, setHoverInfo] = useState(null);

  // Categories for visual grouping
  const categories = {
    'Sales': ['Product Sales', 'All Net Sales'],
    'Food & Paper': ['Base Food', 'Employee Meal', 'Condiment', 'Total Waste', 'Paper'],
    'Labor': ['Crew Labor', 'Management Labor', 'Payroll Tax'],
    'Purchases': ['Advertising', 'Travel', 'Adv Other', 'Promotion', 'Outside Services',
      'Linen', 'OP. Supply', 'Maint. & Repair', 'Small Equipment',
      'Utilities', 'Office', 'Cash +/-', 'Crew Relations', 'Training']
  };

  // Helper functions
  const getCategory = (expense) => {
    const input = expense.toLowerCase();
    for (const [key, values] of Object.entries(categories)) {
      if (values.some(v => v.toLowerCase() === input)) {
        return key;
      }
    }
    return null;
  };

  const getCategoryColor = (category) => {
    const colors = {
      Sales: "#e3f2fd",
      "Food & Paper": "#e8f5e9",
      Labor: "#fff3e0",
      Purchases: "#f3e5f5",
    };
    return colors[category] || "#ffffff";
  };

  // this function saves all the user input data from the generate page via backend
  const handleGenerate = async (e) => {
    // Check if current month is locked 
    if (isCurrentPeriodLocked()) {
      alert("This month is locked and cannot be modified.");
      return;
    }

    if (
      !productNetSales ||
      !cash ||
      !promo ||
      !allNetSales ||
      !advertising ||
      !crewLabor ||
      !totalLabor ||
      !payrollTax ||
      !completeWaste ||
      !rawWaste ||
      !condiment ||
      !variance ||
      !unexplained ||
      !discounts ||
      !baseFood ||
      !startingFood ||
      !startingCondiment ||
      !startingPaper ||
      !startingNonProduct ||
      !startingOpsSupplies ||
      !endingFood ||
      !endingCondiment ||
      !endingPaper ||
      !endingNonProduct ||
      !endingOpsSupplies
    ) {
      alert("You must fill out all fields before submitting.");
      return;
    }

    try {
      const monthIndex = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ].indexOf(month);
      const period = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const payload = {
        storeId: selectedStore,
        month,
        year,
        period,

        // Sales
        productNetSales: parseFloat(productNetSales),
        cash: parseFloat(cash),
        promo: parseFloat(promo),
        allNetSales: parseFloat(allNetSales),
        advertising: parseFloat(advertising),

        // Labor
        crewLabor: parseFloat(crewLabor),
        totalLabor: parseFloat(totalLabor),
        payrollTax: parseFloat(payrollTax),

        // Food
        completeWaste: parseFloat(completeWaste),
        rawWaste: parseFloat(rawWaste),
        condiment: parseFloat(condiment),
        variance: parseFloat(variance),
        unexplained: parseFloat(unexplained),
        discounts: parseFloat(discounts),
        baseFood: parseFloat(baseFood),

        // Starting inventory
        startingFood: parseFloat(startingFood),
        startingCondiment: parseFloat(startingCondiment),
        startingPaper: parseFloat(startingPaper),
        startingNonProduct: parseFloat(startingNonProduct),
        startingOpsSupplies: parseFloat(startingOpsSupplies),

        // Ending inventory
        endingFood: parseFloat(endingFood),
        endingCondiment: parseFloat(endingCondiment),
        endingPaper: parseFloat(endingPaper),
        endingNonProduct: parseFloat(endingNonProduct),
        endingOpsSupplies: parseFloat(endingOpsSupplies),
      };

      await api("/api/pac/generate", { method: "POST", body: payload });

      await addDoc(pacGenRef, {
        Month: month,
        Year: year,
        Period: period,
        createdAt: serverTimestamp(),

        ProductNetSales: parseFloat(productNetSales),
        Cash: parseFloat(cash),
        Promo: parseFloat(promo),
        AllNetSales: parseFloat(allNetSales),
        Advertising: parseFloat(advertising),

        CrewLabor: parseFloat(crewLabor),
        TotalLabor: parseFloat(totalLabor),
        PayrollTax: parseFloat(payrollTax),

        CompleteWaste: parseFloat(completeWaste),
        RawWaste: parseFloat(rawWaste),
        Condiment: parseFloat(condiment),
        Variance: parseFloat(variance),
        Unexplained: parseFloat(unexplained),
        Discounts: parseFloat(discounts),
        BaseFood: parseFloat(baseFood),

        StartingFood: parseFloat(startingFood),
        StartingCondiment: parseFloat(startingCondiment),
        StartingPaper: parseFloat(startingPaper),
        StartingNonProduct: parseFloat(startingNonProduct),
        StartingOpsSupplies: parseFloat(startingOpsSupplies),

        EndingFood: parseFloat(endingFood),
        EndingCondiment: parseFloat(endingCondiment),
        EndingPaper: parseFloat(endingPaper),
        EndingNonProduct: parseFloat(endingNonProduct),
        EndingOpsSupplies: parseFloat(endingOpsSupplies),
      });

      alert("Report generated successfully.");
      await fetchMonthLockStatus();
      await fetchLockedMonths();
    } catch (error) {
      console.error("Error saving report:", error);
      alert("Failed to generate.");
    }
  };

  // ----- PAC submit gating -----
  const goalNumeric = Number(pacGoal);
  const hasGoal = pacGoal !== "" && !Number.isNaN(goalNumeric);

  const projectedPacDollar = Number(
    projections.find(r => r.name === "P.A.C.")?.projectedDollar
  ) || 0;

  const pacEqual = Math.abs(pacGoal - projectedPacDollar) <= 1;

  const pacBelow = hasGoal && projectedPacDollar < goalNumeric - 1e-9;
  const pacMismatch = hasGoal && !pacEqual;  // includes below OR above

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container>
        <Paper sx={{ padding: '10px' }}>
          <Grid container wrap="wrap" justifyContent="space-between" alignItems="center">
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
        <Container sx={{ marginTop: '20px' }}>
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
                      <Box sx={{ fontWeight: 700, fontSize: 14, opacity: 0.8 }}>PAC Goal</Box>

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
                          {fmtUsd(pacGoal)}
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
                            {fmtUsd(pacGoal)}
                          </Box>

                          {/* Change button only if current/future period */}
                          {!isPastPeriod(year, month) && (
                            <Button variant="outlined" size="small" onClick={() => setEditingGoal(true)}>
                              Change
                            </Button>
                          )}
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
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
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
                              const periodId = `${selectedStore}_${year}${String(monthIdx + 1).padStart(2, "0")}`;

                              await saveProjections(selectedStore, year, month, numericGoal, projections.map(p => ({
                                name: p.name,
                                projectedDollar: Number(p.projectedDollar) || 0,
                                projectedPercent: Number(p.projectedPercent) || 0,
                              })));

                              setEditingGoal(false);
                            }}
                          >
                            Save
                          </Button>
                          <Button variant="text" size="small" onClick={() => setEditingGoal(false)}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </Box>

                  </TableCell>

                  {/* Divider column */}
                  <TableCell sx={{ borderRight: "20px solid #f5f5f5ff", width: "12px" }} />

                  {/* Right: Historical selectors (spans Historical $/%) */}
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
                        value={histMonth}
                        onChange={(e) => { setHistMonth(e.target.value); }}
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
                        value={histYear}
                        onChange={(e) => setHistYear(e.target.value)}
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
                      {`Displaying Historical Data for ${histMonth} ${histYear}`}
                    </Box>
                  </TableCell>
                </TableRow>

                {/* Regular header row */}
                <TableRow sx={{ whiteSpace: "nowrap" }}>
                  <TableCell><strong>Expense Name</strong></TableCell>
                  <TableCell><strong>Projected $</strong></TableCell>
                  <TableCell><strong>Projected %</strong></TableCell>
                  <TableCell sx={{ borderRight: "20px solid #f5f5f5ff", width: "12px" }} />
                  <TableCell><strong>Historical $</strong></TableCell>
                  <TableCell><strong>Historical %</strong></TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {projections.map((expense, index) => {
                  const isPac = expense.name === "P.A.C.";
                  const pacColor = isPac ? getPacRowColor(projections, pacGoal) : undefined;

                  return (
                    <TableRow
                      key={expense.name}
                      sx={{
                        // normal rows keep category background
                        backgroundColor: !isPac ? getCategoryColor(getCategory(expense.name)) : "transparent",
                        // for P.A.C., apply style to all its cells (td/th)
                        ...(isPac ? { "& td, & th": PAC_COLOR_STYLES[pacColor] ?? {} } : {}),
                      }}
                    >
                      <TableCell>{expense.name}</TableCell>

                      <TableCell>
                        {hasUserInputAmountField.includes(expense.name) && !isPac ? (
                          <TextField
                            type="number"
                            size="small"
                            variant="outlined"
                            sx={{ width: "150px", backgroundColor: "#ffffff" }}
                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                            value={expense.projectedDollar ?? ""}
                            placeholder="0.00"
                            onChange={(e) => handleInputChange(index, "projectedDollar", Number(e.target.value))}
                          />
                        ) : (
                          <span>${expense.projectedDollar || 0}</span>
                        )}
                      </TableCell>


                      <TableCell>
                        <FormControl>
                          {hasUserInputedPercentageField.includes(expense.name) && !isPac ? (
                            <TextField
                              type="number"
                              size="small"
                              variant="outlined"
                              sx={{ width: "125px", backgroundColor: "#ffffff" }}
                              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                              value={expense.projectedPercent ?? ""}
                              placeholder="0.00"
                              onChange={(e) => handleInputChange(index, "projectedPercent", Number(e.target.value))}
                            />
                          ) : (
                            <span>{expense.projectedPercent || 0}%</span>
                          )}
                          <FormLabel sx={{ fontSize: "0.75rem" }}>{getLabel(expense.name)}</FormLabel>
                        </FormControl>
                      </TableCell>

                      <TableCell sx={{ borderRight: "20px solid #f5f5f5ff", width: "12px" }} />

                      <TableCell>{"$" + expense.historicalDollar}</TableCell>
                      <TableCell>{expense.historicalPercent + "%"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>

            </Table>
          </TableContainer>

          {/*The Apply button*/}
          <Box
            textAlign="center"
            sx={{ pt: 1, pb: 1, display: "flex", gap: 2, flexDirection: "column", alignItems: "center" }}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button variant="outlined" size="large" onClick={handleResetToLastSubmitted}>
                Reset to  previous month
              </Button>

              <Button
                variant="contained"
                size="large"
                onClick={handleApply}
                disabled={pacMismatch}
                title={pacMismatch ? "PAC Projections do not match the goal" : undefined}
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
                  ? "PAC Projections are below the goal, please update to submit."
                  : "PAC Projections entered do not match goal, please update to submit."}
                <Box component="span" sx={{ ml: 1, opacity: 0.8 }}>
                  Current: {fmtUsd(projectedPacDollar)} • Goal: {fmtUsd(goalNumeric)}
                </Box>
              </Box>
            )}
          </Box>

        </Container>
      )
      } {/* end of Projections page */}

      {
        tabIndex === 1 && (
          <Container>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "20px" }}>
              {/* Sales */}
              <div className="pac-section sales-section">
                <h4>Sales</h4>
                <div className="input-row"><label className="input-label">Product Net Sales ($)</label>
                  <input
                    type="number"
                    value={productNetSales}
                    onChange={(e) => setProductNetSales(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Cash +/- ($)</label>
                  <input
                    type="number"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Promo ($)</label>
                  <input
                    type="number"
                    value={promo}
                    onChange={(e) => setPromo(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">All Net Sales ($)</label>
                  <input
                    type="number"
                    value={allNetSales}
                    onChange={(e) => setAllNetSales(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Advertising ($)</label>
                  <input
                    type="number"
                    value={advertising}
                    onChange={(e) => setAdvertising(e.target.value)}
                  />
                </div>
              </div>

              {/* Labor */}
              <div className="pac-section labor-section">
                <h4>Labor</h4>
                <div className="input-row"><label className="input-label">Crew Labor %</label>
                  <input
                    type="number"
                    value={crewLabor}
                    onChange={(e) => setCrewLabor(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Total Labor %</label>
                  <input
                    type="number"
                    value={totalLabor}
                    onChange={(e) => setTotalLabor(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Payroll Tax ($)</label>
                  <input
                    type="number"
                    value={payrollTax}
                    onChange={(e) => setPayrollTax(e.target.value)}
                  />
                </div>
              </div>

              {/* Food */}
              <div className="pac-section food-section">
                <h4>Food</h4>
                <div className="input-row"><label className="input-label">Complete Waste %</label>
                  <input
                    type="number"
                    value={completeWaste}
                    onChange={(e) => setCompleteWaste(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Raw Waste %</label>
                  <input
                    type="number"
                    value={rawWaste}
                    onChange={(e) => setRawWaste(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Condiment %</label>
                  <input
                    type="number"
                    value={condiment}
                    onChange={(e) => setCondiment(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Variance Stat %</label>
                  <input
                    type="number"
                    value={variance}
                    onChange={(e) => setVariance(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Unexplained %</label>
                  <input
                    type="number"
                    value={unexplained}
                    onChange={(e) => setUnexplained(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Discounts %</label>
                  <input
                    type="number"
                    value={discounts}
                    onChange={(e) => setDiscounts(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Base Food %</label>
                  <input
                    type="number"
                    value={baseFood}
                    onChange={(e) => setBaseFood(e.target.value)}
                  />
                </div>
              </div>

              {/* Starting Inventory */}
              <div className="pac-section starting-inventory-section">
                <h4>Starting Inventory</h4>
                <div className="input-row"><label className="input-label">Food ($)</label>
                  <input
                    type="number"
                    value={startingFood}
                    onChange={(e) => setStartingFood(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Condiment ($)</label>
                  <input
                    type="number"
                    value={startingCondiment}
                    onChange={(e) => setStartingCondiment(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Paper ($)</label>
                  <input
                    type="number"
                    value={startingPaper}
                    onChange={(e) => setStartingPaper(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Non Product ($)</label>
                  <input
                    type="number"
                    value={startingNonProduct}
                    onChange={(e) => setStartingNonProduct(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label"> Office Supplies ($)</label>
                  <input
                    type="number"
                    value={startingOpsSupplies}
                    onChange={(e) => setStartingOpsSupplies(e.target.value)}
                  />
                </div>
              </div>

              {/* Ending Inventory */}
              <div className="pac-section ending-inventory-section">
                <h4>Ending Inventory</h4>
                <div className="input-row"><label className="input-label">Food ($)</label>
                  <input
                    type="number"
                    value={endingFood}
                    onChange={(e) => setEndingFood(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Condiment ($)</label>
                  <input
                    type="number"
                    value={endingCondiment}
                    onChange={(e) => setEndingCondiment(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Paper ($)</label>
                  <input
                    type="number"
                    value={endingPaper}
                    onChange={(e) => setEndingPaper(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label">Non Product ($)</label>
                  <input
                    type="number"
                    value={endingNonProduct}
                    onChange={(e) => setEndingNonProduct(e.target.value)}
                  />
                </div>
                <div className="input-row"><label className="input-label"> Office Supplies ($)</label>
                  <input
                    type="number"
                    value={endingOpsSupplies}
                    onChange={(e) => setEndingOpsSupplies(e.target.value)}
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
                  disabled={isCurrentPeriodLocked()}
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
                  label={`Month Locked by ${monthLockStatus?.locked_by || "Unknown"
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

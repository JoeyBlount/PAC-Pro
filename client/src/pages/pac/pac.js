// PAC-Pro/client/src/pages/pac.js
import React, { useState, useEffect, useContext } from "react";
import { db, auth } from "../../config/firebase-config";
import {
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
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
} from "@mui/material";
import { StoreContext } from "../../context/storeContext";
import PacTab from "./PacTab";
import styles from "./pac.css";
import { useAuth } from "../../context/AuthContext";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";

// ---------- Backend API helper (no .env needed) ----------
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

// ---------- Table config ----------
const expenseList = [
  "Sales",
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
  "Misc: CR/TR/D&S",
  "Total Controllable",
  "P.A.C.",
  "Δ P.A.C. $",
];

// Disable Projected $ input for these rows
const hasUserInputAmountField = [
  "Sales",
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
  "Misc: CR/TR/D&S",
  "Total Controllable",
  "P.A.C.",
  "Δ P.A.C. $",
];

// Disable Projected % input for these rows
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
  "Promotion",
];

const getLabel = (key) => {
  const specialLabels = {
    "Payroll Tax": "% of Total Labor",
    Advertising: "% of All Net Sales",
    Promotion: "% of Product Sales",
  };
  return specialLabels[key] || "";
};

const PAC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString("default", { month: "long" });
  const [month, setMonth] = useState(currentMonth);
  const [savedData, setSavedData] = useState({});

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
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - i);
  const [year, setYear] = useState(currentYear);

  // Get selected store from context
  const { selectedStore } = useContext(StoreContext);
  const [pacGoal, setPacGoal] = useState("");

  // Generate tab state
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

  const [userData, setUserData] = useState(null);

  const user = auth.currentUser;

  const [histMonth, setHistMonth] = useState(month);
  const [histYear, setHistYear] = useState(year);

  const [openHistModal, setOpenHistModal] = useState(false);
  const [shouldLoadHist, setShouldLoadHist] = useState(false);

  const { userRole } = useAuth();
  const isAdmin = (userRole || "").toLowerCase() === "admin";

  useEffect(() => {
    document.title = "PAC Pro - PAC";
  }, []);

  // Reset historical display when switching period
  useEffect(() => {
    setProjections((prev) =>
      prev.map((expense) => ({
        ...expense,
        historicalDollar: "-",
        historicalPercent: "-",
      }))
    );
    setHistMonth(null);
    setHistYear(null);
    setShouldLoadHist(false);
  }, [month, year]);

  // Fetch user data (from Firestore) – unchanged
  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userQuery = query(collection(db, "users"), where("uid", "==", user.uid));
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            setUserData(userSnapshot.docs[0].data());
          }
        }
      } catch (error) {
        console.error("Error loading data from Firestore:", error);
      }
    };
    fetchData();
  }, []);

  // Month/Year lock for non-admin
  const isMonthDisabled = (monthNumber, selectedYear) => {
    if (isAdmin) return false;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();
    const targetIdx = months.indexOf(monthNumber);
    if (targetIdx === -1) return false;
    if (selectedYear < currentYear) return true;
    if (selectedYear > currentYear) return false;
    return targetIdx < currentMonthIdx;
  };
  const isYearDisabled = (yearNumber) => {
    if (isAdmin) return false;
    const currentYear = new Date().getFullYear();
    return yearNumber < currentYear;
  };

  // Historical loader
  useEffect(() => {
    const loadHistoricalData = async () => {
      if (!selectedStore) return;
      const histMonthIdx = months.indexOf(histMonth);
      const docId = `${selectedStore}_${histYear}${String(histMonthIdx + 1).padStart(2, "0")}`;
      const ref = doc(db, "pac_projections", docId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const latest = snap.data();

      const hist = expenseList.map((name) => {
        const entry = latest.projections?.find((p) => p.name === name) || {};
        return {
          name,
          historicalDollar: entry.projectedDollar || "-",
          historicalPercent: entry.projectedPercent || "-",
        };
      });

      setProjections((prev) =>
        prev.map((expense) => {
          const h = hist.find((e) => e.name === expense.name) || {};
          return {
            ...expense,
            historicalDollar: h.historicalDollar || "-",
            historicalPercent: h.historicalPercent || "-",
          };
        })
      );
    };

    if (tabIndex === 0 && shouldLoadHist) {
      loadHistoricalData();
    }
  }, [selectedStore, histMonth, histYear, tabIndex, shouldLoadHist]);

  // Load latest projections for current period (Firestore)
  useEffect(() => {
    const loadLatestForPeriod = async () => {
      if (!selectedStore) return;
      try {
        const monthIndex = months.indexOf(month);
        const docId = `${selectedStore}_${year}${String(monthIndex + 1).padStart(2, "0")}`;
        const ref = doc(db, "pac_projections", docId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;

        const latest = snap.data();
        setProjections((prev) =>
          prev.map((expense) => {
            const entry = latest.projections?.find((p) => p.name === expense.name) || {};
            return {
              ...expense,
              projectedDollar: entry.projectedDollar || "",
              projectedPercent: entry.projectedPercent || "",
              estimatedDollar: entry.estimatedDollar || "-",
              estimatedPercent: entry.estimatedPercent || "-",
              historicalDollar: entry.historicalDollar || "-",
              historicalPercent: entry.historicalPercent || "-",
            };
          })
        );
      } catch (err) {
        console.error("Failed to load pac_projections for period:", err);
      }
    };

    if (tabIndex === 0) {
      loadLatestForPeriod();
    }
  }, [month, year, tabIndex, selectedStore]);

  // Projections table state & helpers
  const getEmptyHistoricalData = () =>
    expenseList.map((expense) => ({
      name: expense,
      historicalDollar: "-",
      historicalPercent: "-",
    }));

  const makeEmptyProjectionRows = () => {
    const historicalData = getEmptyHistoricalData();
    return expenseList.map((expense) => {
      const h = historicalData.find((e) => e.name === expense) || {};
      return {
        name: expense,
        projectedDollar: "",
        projectedPercent: "",
        estimatedDollar: h.historicalDollar || "-",
        estimatedPercent: h.historicalPercent || "-",
        historicalDollar: h.historicalDollar || "-",
        historicalPercent: h.historicalPercent || "-",
      };
    });
  };

  const [projections, setProjections] = useState(makeEmptyProjectionRows());

  const handleInputChange = (index, field, value) => {
    setProjections((prevProjections) => {
      const newProjections = [...prevProjections];
      newProjections[index][field] = value;

      let crewLabor = parseFloat(newProjections.find((e) => e.name === "Crew Labor")?.projectedDollar) || 0;
      let managementLabor =
        parseFloat(newProjections.find((e) => e.name === "Management Labor")?.projectedDollar) || 0;
      let payrollTaxPercent =
        parseFloat(newProjections.find((e) => e.name === "Payroll Tax")?.projectedPercent) || 0;
      let allNetSales =
        parseFloat(newProjections.find((e) => e.name === "All Net Sales")?.projectedDollar) || 0;
      let advertisingPercent =
        parseFloat(newProjections.find((e) => e.name === "Advertising")?.projectedPercent) || 0;

      newProjections.forEach((expense, idx) => {
        const historicalDollar = parseFloat(expense.historicalDollar) || 0;
        const historicalPercent = parseFloat(expense.historicalPercent) || 0;
        const projectedDollar = parseFloat(expense.projectedDollar) || 0;
        const projectedPercent = parseFloat(expense.projectedPercent) || 0;

        if (expense.name === "Payroll Tax") {
          newProjections[idx].projectedDollar = ((crewLabor + managementLabor) * (payrollTaxPercent / 100)).toFixed(2);
        }

        if (expense.name === "Advertising") {
          newProjections[idx].projectedDollar = (allNetSales * (advertisingPercent / 100)).toFixed(2);
        }

        newProjections[idx].estimatedDollar = ((projectedDollar + historicalDollar) / 2).toFixed(2);
        newProjections[idx].estimatedPercent = ((projectedPercent + historicalPercent) / 2).toFixed(2);
      });

      return newProjections;
    });
  };

  // Save projections (Firestore) – unchanged
  const handleApply = async () => {
    if (!selectedStore) {
      alert("No store selected");
      return;
    }

    const monthIndex = months.indexOf(month);
    const docId = `${selectedStore}_${year}${String(monthIndex + 1).padStart(2, "0")}`;

    try {
      await setDoc(doc(db, "pac_projections", docId), {
        store_id: selectedStore,
        year_month: `${year}${String(monthIndex + 1).padStart(2, "0")}`,
        projections: projections.map((p) => ({
          name: p.name,
          projectedDollar: p.projectedDollar,
          projectedPercent: p.projectedPercent,
        })),
        updatedAt: serverTimestamp(),
      });
      alert("Projections saved to Firestore!");
    } catch (err) {
      console.error("Error saving projections:", err);
      alert("Failed to save projections");
    }
  };

  // Category helpers (visual grouping)
  const categories = {
    Sales: ["Sales", "All Net Sales"],
    "Food & Paper": ["Base Food", "Employee Meal", "Condiment", "Total Waste", "Paper"],
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
      "Misc: CR/TR/D&S",
    ],
  };

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
    const colors = {
      Sales: "#e3f2fd",
      "Food & Paper": "#e8f5e9",
      Labor: "#fff3e0",
      Purchases: "#f3e5f5",
    };
    return colors[category] || "#ffffff";
  };

  const getProductSales = () => {
    const productSales = projections.find((e) => e.name === "Sales");
    return parseFloat(productSales?.historicalDollar) || 0;
  };

  const calculateCategorySums = (data, type) => {
    const sums = {};
    for (const [category, items] of Object.entries(categories)) {
      sums[category] = items.reduce(
        (acc, item) => {
          const expense = data.find((e) => e.name === item);
          if (expense) {
            const dollar = parseFloat(expense[`${type}Dollar`]) || 0;
            const percent = parseFloat(expense[`${type}Percent`]) || 0;
            return {
              dollar: acc.dollar + dollar,
              percent: acc.percent + percent,
            };
          }
          return acc;
        },
        { dollar: 0, percent: 0 }
      );
    }
    return sums;
  };

  const calculateTotalControllable = (type) => {
    let total = 0;
    ["Food & Paper", "Labor", "Purchases"].forEach((category) => {
      categories[category].forEach((item) => {
        const expense = projections.find((e) => e.name === item);
        if (expense) {
          total += parseFloat(expense[`${type}Dollar`]) || 0;
        }
      });
    });
    return total;
  };

  const calculatePac = (type) => {
    const productSales = getProductSales();
    const totalControllable = calculateTotalControllable(type);
    return productSales - totalControllable;
  };

  const calculatePercentage = (value, total) => {
    return total > 0 ? ((value / total) * 100).toFixed(2) + "%" : "0.00%";
  };

  const isPacPositive = () => {
    const actualPac = calculatePac("historical");
    const projectedPac = calculatePac("projected");
    return actualPac >= projectedPac;
  };

  // ---------- Generate tab: save via backend ----------
  const handleGenerate = async () => {
    if (!selectedStore) {
      alert("No store selected");
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
      const monthIndex = months.indexOf(month);
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
      alert("Report generated successfully (saved via backend).");
    } catch (error) {
      console.error("Error saving report:", error);
      alert("Failed to generate.");
    }
  };

  // ---------- Render ----------
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container>
        <Paper sx={{ padding: "10px" }}>
          <Grid container wrap="wrap" justifyContent="space-between" alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ padding: "10px", marginLeft: "5px" }}>
                <h1 className="Header">PAC</h1>
              </Box>
            </Grid>
            <Grid container xs={12} sm={6} md={4} wrap="wrap" justifyContent="flex-end" alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <Box
                  display="flex"
                  flexDirection="row"
                  flexWrap="nowrap"
                  justifyContent="center"
                  gap={1}
                  sx={{ padding: "10px", margin: "0 auto" }}
                >
                  {/* Month */}
                  <Select
                    value={month}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (isMonthDisabled(next, year)) return;
                      setMonth(next);
                    }}
                    sx={{ width: 200, marginRight: 2 }}
                  >
                    {months.map((m) => (
                      <MenuItem
                        key={m}
                        value={m}
                        disabled={isMonthDisabled(m, year)}
                        title={!isAdmin && isMonthDisabled(month) ? "Locked for your role" : undefined}
                      >
                        {m}
                      </MenuItem>
                    ))}
                  </Select>

                  {/* Year */}
                  <Select
                    value={year}
                    onChange={(e) => {
                      const nextYear = e.target.value;
                      if (isYearDisabled(nextYear)) return;
                      setYear(nextYear);
                      if (isMonthDisabled(month, nextYear)) {
                        const safeMonth = months[new Date().getMonth()];
                        setMonth(safeMonth);
                      }
                    }}
                    sx={{ width: 120, marginRight: 2 }}
                  >
                    {years.map((y) => (
                      <MenuItem
                        key={y}
                        value={y}
                        disabled={isYearDisabled(y)}
                        title={!isAdmin && isYearDisabled(year) ? "Locked for your role" : undefined}
                        className={!isAdmin && isYearDisabled(year) ? styles.disabledOption : undefined}
                      >
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

        <div className="pac-goal-container">
          <TextField
            label="PAC Goal ($)"
            size="small"
            variant="outlined"
            className="pac-goal-input"
            value={pacGoal}
            onChange={(e) => setPacGoal(e.target.value)}
          />
        </div>
      </Container>

      <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={() => setOpenHistModal(true)}>
          View Historical Data
        </Button>
      </Box>

      <Dialog open={openHistModal} onClose={() => setOpenHistModal(false)}>
        <DialogTitle>Select Historical Period</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={2} mt={1}>
            {/* Month */}
            <Select value={histMonth} onChange={(e) => setHistMonth(e.target.value)} sx={{ width: 200 }}>
              {months.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </Select>

            {/* Year */}
            <Select value={histYear} onChange={(e) => setHistYear(e.target.value)} sx={{ width: 120 }}>
              {years.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenHistModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setOpenHistModal(false);
              setShouldLoadHist(true);
            }}
          >
            Load Data
          </Button>
        </DialogActions>
      </Dialog>

      {tabIndex === 0 && (
        <Container sx={{ marginTop: "20px" }}>
          {shouldLoadHist ? (
            <Box sx={{ mb: 2 }}>
              <strong>
                Displaying Historical Data for {histMonth} {histYear}
              </strong>
            </Box>
          ) : (
            <Box sx={{ mb: 2 }}>
              <strong>Select a month to view historical data</strong>
            </Box>
          )}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ whiteSpace: "nowrap" }}>
                  <TableCell>
                    <strong>Expense Name</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Projected $</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Projected %</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Estimated $</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Estimated %</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Historical $</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Historical %</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projections.map((expense, index) => (
                  <TableRow key={expense.name} sx={{ backgroundColor: getCategoryColor(getCategory(expense.name)) }}>
                    <TableCell>{expense.name}</TableCell>

                    {/* Projected $ */}
                    <TableCell>
                      {hasUserInputAmountField.includes(expense.name) ? (
                        <TextField
                          size="small"
                          variant="outlined"
                          sx={{ width: "150px", backgroundColor: "#ffffff" }}
                          slotProps={{
                            input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                          }}
                          value={expense.projectedDollar || "0.00"}
                          onChange={(e) => handleInputChange(index, "projectedDollar", e.target.value)}
                        />
                      ) : (
                        <span>${expense.projectedDollar || "0.00"}</span>
                      )}
                    </TableCell>

                    {/* Projected % */}
                    <TableCell>
                      <FormControl>
                        {hasUserInputedPercentageField.includes(expense.name) ? (
                          <TextField
                            size="small"
                            variant="outlined"
                            sx={{ width: "125px", backgroundColor: "#ffffff" }}
                            slotProps={{
                              input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                            }}
                            value={expense.projectedPercent || "0"}
                            onChange={(e) => handleInputChange(index, "projectedPercent", e.target.value)}
                          />
                        ) : (
                          <span>{expense.projectedPercent || "0"}%</span>
                        )}
                        <FormLabel sx={{ fontSize: "0.75rem" }}>{getLabel(expense.name)}</FormLabel>
                      </FormControl>
                    </TableCell>

                    {/* Estimated / Historical */}
                    <TableCell>${expense.estimatedDollar}</TableCell>
                    <TableCell>{expense.estimatedPercent}%</TableCell>
                    <TableCell>${expense.historicalDollar}</TableCell>
                    <TableCell>{expense.historicalPercent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Apply projections */}
          <Box textAlign="center" sx={{ paddingTop: "10px", paddingBottom: "10px" }}>
            <Button variant="contained" size="large" onClick={handleApply}>
              Apply
            </Button>
          </Box>
        </Container>
      )}

      {tabIndex === 1 && (
        <Container>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "20px" }}>
            {/* Sales */}
            <div className="pac-section sales-section">
              <h4>Sales</h4>
              <div className="input-row">
                <label className="input-label">Product Net Sales ($)</label>
                <input type="number" value={productNetSales} onChange={(e) => setProductNetSales(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Cash +/- ($)</label>
                <input type="number" value={cash} onChange={(e) => setCash(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Promo ($)</label>
                <input type="number" value={promo} onChange={(e) => setPromo(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">All Net Sales ($)</label>
                <input type="number" value={allNetSales} onChange={(e) => setAllNetSales(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Advertising ($)</label>
                <input type="number" value={advertising} onChange={(e) => setAdvertising(e.target.value)} />
              </div>
            </div>

            {/* Labor */}
            <div className="pac-section labor-section">
              <h4>Labor</h4>
              <div className="input-row">
                <label className="input-label">Crew Labor %</label>
                <input type="number" value={crewLabor} onChange={(e) => setCrewLabor(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Total Labor %</label>
                <input type="number" value={totalLabor} onChange={(e) => setTotalLabor(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Payroll Tax ($)</label>
                <input type="number" value={payrollTax} onChange={(e) => setPayrollTax(e.target.value)} />
              </div>
            </div>

            {/* Food */}
            <div className="pac-section food-section">
              <h4>Food</h4>
              <div className="input-row">
                <label className="input-label">Complete Waste %</label>
                <input type="number" value={completeWaste} onChange={(e) => setCompleteWaste(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Raw Waste %</label>
                <input type="number" value={rawWaste} onChange={(e) => setRawWaste(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Condiment %</label>
                <input type="number" value={condiment} onChange={(e) => setCondiment(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Variance Stat %</label>
                <input type="number" value={variance} onChange={(e) => setVariance(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Unexplained %</label>
                <input type="number" value={unexplained} onChange={(e) => setUnexplained(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Discounts %</label>
                <input type="number" value={discounts} onChange={(e) => setDiscounts(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Base Food %</label>
                <input type="number" value={baseFood} onChange={(e) => setBaseFood(e.target.value)} />
              </div>
            </div>

            {/* Starting Inventory */}
            <div className="pac-section starting-inventory-section">
              <h4>Starting Inventory</h4>
              <div className="input-row">
                <label className="input-label">Food ($)</label>
                <input type="number" value={startingFood} onChange={(e) => setStartingFood(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Condiment ($)</label>
                <input
                  type="number"
                  value={startingCondiment}
                  onChange={(e) => setStartingCondiment(e.target.value)}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Paper ($)</label>
                <input type="number" value={startingPaper} onChange={(e) => setStartingPaper(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Non Product ($)</label>
                <input
                  type="number"
                  value={startingNonProduct}
                  onChange={(e) => setStartingNonProduct(e.target.value)}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Office Supplies ($)</label>
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
              <div className="input-row">
                <label className="input-label">Food ($)</label>
                <input type="number" value={endingFood} onChange={(e) => setEndingFood(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Condiment ($)</label>
                <input type="number" value={endingCondiment} onChange={(e) => setEndingCondiment(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Paper ($)</label>
                <input type="number" value={endingPaper} onChange={(e) => setEndingPaper(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Non Product ($)</label>
                <input type="number" value={endingNonProduct} onChange={(e) => setEndingNonProduct(e.target.value)} />
              </div>
              <div className="input-row">
                <label className="input-label">Office Supplies ($)</label>
                <input
                  type="number"
                  value={endingOpsSupplies}
                  onChange={(e) => setEndingOpsSupplies(e.target.value)}
                />
              </div>
            </div>

            {/* Generate */}
            <Button
              variant="contained"
              color="primary"
              size="large"
              sx={{
                marginTop: 2,
                marginBottom: 8,
                width: "250px",
                alignSelf: "center",
                backgroundColor: "#1976d2",
                "&:hover": { backgroundColor: "#42a5f5" },
              }}
              onClick={handleGenerate}
            >
              Generate Report
            </Button>
          </div>
        </Container>
      )}

      {tabIndex === 2 && (
        <Container>
          <PacTab storeId={selectedStore || "store_001"} year={year} month={month} projections={projections} />
        </Container>
      )}
    </Box>
  );
};

export default PAC;

import React, { useState, useEffect, useContext } from "react";
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
  Alert,
  Chip,
} from "@mui/material";
import { StoreContext } from "../../context/storeContext";
import PacTab from "./PacTab";
import { useAuth } from "../../context/AuthContext";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import MonthLockService from "../../services/monthLockService";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";

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

// Add expense(s) to this array to disable projected $ text field. Case-senstive.
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

  const [histMonth, setHistMonth] = useState(month);
  const [histYear, setHistYear] = useState(year);

  const [openHistModal, setOpenHistModal] = useState(false);
  const [shouldLoadHist, setShouldLoadHist] = useState(false);

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
  const canUnlockMonth = isAdmin;

  useEffect(() => {
    document.title = "PAC Pro - PAC";
  }, []);

  // Month locking functions
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
    setProjections((prev) =>
      prev.map((expense) => ({
        ...expense,
        historicalDollar: "-",
        historicalPercent: "-",
      }))
    );

    // also reset histMonth/year selection if you want
    setHistMonth(null);
    setHistYear(null);
    setShouldLoadHist(false);
  }, [month, year]);

  // Fetch month lock status when month, year, or store changes
  useEffect(() => {
    fetchMonthLockStatus();
    fetchLockedMonths();
  }, [month, year, selectedStore]);

  useEffect(() => {
    const loadHistoricalData = async () => {
      if (!selectedStore) return;

      const histMonthIdx = months.indexOf(histMonth);
      const docId = `${selectedStore}_${histYear}${String(
        histMonthIdx + 1
      ).padStart(2, "0")}`;

      console.log("Fetching historical doc:", docId);

      const ref = doc(db, "pac_projections", docId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        console.log("No data for", docId);
        return;
      }
      const latest = snap.data();
      console.log("latest data: ", latest);

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
      // setShouldLoadHist(false)
    }
  }, [selectedStore, histMonth, histYear, tabIndex, shouldLoadHist]);

  useEffect(() => {
    const loadLatestForPeriod = async () => {
      if (!selectedStore) return;

      try {
        const monthIndex = months.indexOf(month); // 0 = January
        const docId = `${selectedStore}_${year}${String(
          monthIndex + 1
        ).padStart(2, "0")}`;

        console.log("Fetching projections doc:", docId);

        const ref = doc(db, "pac_projections", docId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          console.log("No projections found for", docId);
          return;
        }

        const latest = snap.data();
        console.log("Projections for", docId, latest);

        // Map Firestore fields → your table rows
        setProjections((prev) =>
          prev.map((expense) => {
            const entry =
              latest.projections?.find((p) => p.name === expense.name) || {};
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

    const loadLatestPACData = async () => {
      if (!selectedStore) return;

      try {
        const monthIndex = months.indexOf(month);
        const period = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

        console.log("Fetching PAC data for period:", period);

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
          console.log("Latest PAC data:", data);

          // Load the data into the form fields - this month has submitted data
          setProductNetSales(data.ProductNetSales || 0);
          setCash(data.Cash || 0);
          setPromo(data.Promo || 0);
          setAllNetSales(data.AllNetSales || 0);
          setAdvertising(data.Advertising || 0);
          setCrewLabor(data.CrewLabor || 0);
          setTotalLabor(data.TotalLabor || 0);
          setPayrollTax(data.PayrollTax || 0);
          setCompleteWaste(data.CompleteWaste || 0);
          setRawWaste(data.RawWaste || 0);
          setCondiment(data.Condiment || 0);
          setVariance(data.Variance || 0);
          setUnexplained(data.Unexplained || 0);
          setDiscounts(data.Discounts || 0);
          setBaseFood(data.BaseFood || 0);
          setStartingFood(data.StartingFood || 0);
          setStartingCondiment(data.StartingCondiment || 0);
          setStartingPaper(data.StartingPaper || 0);
          setStartingNonProduct(data.StartingNonProduct || 0);
          setStartingOpsSupplies(data.StartingOpsSupplies || 0);
          setEndingFood(data.EndingFood || 0);
          setEndingCondiment(data.EndingCondiment || 0);
          setEndingPaper(data.EndingPaper || 0);
          setEndingNonProduct(data.EndingNonProduct || 0);
          setEndingOpsSupplies(data.EndingOpsSupplies || 0);
        } else {
          // No data found for this period, clear all fields
          setProductNetSales(0);
          setCash(0);
          setPromo(0);
          setAllNetSales(0);
          setAdvertising(0);
          setCrewLabor(0);
          setTotalLabor(0);
          setPayrollTax(0);
          setCompleteWaste(0);
          setRawWaste(0);
          setCondiment(0);
          setVariance(0);
          setUnexplained(0);
          setDiscounts(0);
          setBaseFood(0);
          setStartingFood(0);
          setStartingCondiment(0);
          setStartingPaper(0);
          setStartingNonProduct(0);
          setStartingOpsSupplies(0);
          setEndingFood(0);
          setEndingCondiment(0);
          setEndingPaper(0);
          setEndingNonProduct(0);
          setEndingOpsSupplies(0);
        }
      } catch (err) {
        console.error("Failed to load PAC data for period:", err);
      }
    };

    if (tabIndex === 0) {
      loadLatestForPeriod();
    } else if (tabIndex === 1) {
      loadLatestPACData();
    }
  }, [month, year, tabIndex, selectedStore]);

  const handleInputChange = (index, field, value) => {
    setProjections((prevProjections) => {
      const newProjections = [...prevProjections];
      newProjections[index][field] = value;

      // const historicalData = getHistoricalData();
      let crewLabor =
        parseFloat(
          newProjections.find((e) => e.name === "Crew Labor")?.projectedDollar
        ) || 0;
      let managementLabor =
        parseFloat(
          newProjections.find((e) => e.name === "Management Labor")
            ?.projectedDollar
        ) || 0;
      let payrollTaxPercent =
        parseFloat(
          newProjections.find((e) => e.name === "Payroll Tax")?.projectedPercent
        ) || 0;
      let allNetSales =
        parseFloat(
          newProjections.find((e) => e.name === "All Net Sales")
            ?.projectedDollar
        ) || 0;
      let advertisingPercent =
        parseFloat(
          newProjections.find((e) => e.name === "Advertising")?.projectedPercent
        ) || 0;

      newProjections.forEach((expense, idx) => {
        const historicalDollar = parseFloat(expense.historicalDollar) || 0;
        const historicalPercent = parseFloat(expense.historicalPercent) || 0;
        const projectedDollar = parseFloat(expense.projectedDollar) || 0;
        const projectedPercent = parseFloat(expense.projectedPercent) || 0;

        if (expense.name === "Payroll Tax") {
          newProjections[idx].projectedDollar = (
            (crewLabor + managementLabor) *
            (payrollTaxPercent / 100)
          ).toFixed(2);
        }

        if (expense.name === "Advertising") {
          newProjections[idx].projectedDollar = (
            allNetSales *
            (advertisingPercent / 100)
          ).toFixed(2);
        }

        newProjections[idx].estimatedDollar = (
          (projectedDollar + historicalDollar) /
          2
        ).toFixed(2);
        newProjections[idx].estimatedPercent = (
          (projectedPercent + historicalPercent) /
          2
        ).toFixed(2);
      });

      return newProjections;
    });
  };

  const handleApply = async () => {
    if (!selectedStore) {
      alert("No store selected");
      return;
    }

    // Build a document ID: store_001_202509
    const monthIndex = months.indexOf(month); // 0–11
    const docId = `${selectedStore}_${year}${String(monthIndex + 1).padStart(
      2,
      "0"
    )}`;

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
        estimatedDollar: h.historicalDollar || "-",
        estimatedPercent: h.historicalPercent || "-",
        historicalDollar: h.historicalDollar || "-",
        historicalPercent: h.historicalPercent || "-",
      };
    });
  };

  const [projections, setProjections] = useState(makeEmptyProjectionRows());

  // Categories for visual grouping
  const categories = {
    Sales: ["Sales", "All Net Sales"],
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
      "Misc: CR/TR/D&S",
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

  // this function saves all the user input data from the generate page into the database
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
    } else {
      try {
        // using a "period" key for generate
        const monthIndex = [
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
        ].indexOf(month);
        const period = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

        await addDoc(pacGenRef, {
          // month year and time for when it was generated
          Month: month,
          Year: year,
          Period: period, // period key
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
      } catch (error) {
        console.error("Error saving report:", error);
        alert("Failed to generate.");
      }
    }
  };

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
      <Dialog open={openHistModal} onClose={() => setOpenHistModal(false)}>
        <DialogTitle>Select Historical Period</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={2} mt={1}>
            {/* Month Dropdown */}
            <Select
              value={histMonth}
              onChange={(e) => setHistMonth(e.target.value)}
              sx={{ width: 200 }}
            >
              {months.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </Select>

            {/* Year Dropdown */}
            <Select
              value={histYear}
              onChange={(e) => setHistYear(e.target.value)}
              sx={{ width: 120 }}
            >
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
          {/* PAC Goal and Historical Data - only on Projections tab */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <TextField
              label="PAC Goal ($)"
              size="small"
              variant="outlined"
              sx={{ width: 200 }}
              value={pacGoal}
              onChange={(e) => setPacGoal(e.target.value)}
            />
            <Button variant="outlined" onClick={() => setOpenHistModal(true)}>
              View Historical Data
            </Button>
          </Box>

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
                  <TableRow
                    key={expense.name}
                    sx={{
                      backgroundColor: getCategoryColor(
                        getCategory(expense.name)
                      ),
                    }}
                  >
                    <TableCell>{expense.name}</TableCell>
                    <TableCell>
                      {" "}
                      {/*Textfield for Projected $*/}
                      {hasUserInputAmountField.includes(expense.name) ? (
                        <TextField
                          size="small"
                          variant="outlined"
                          sx={{
                            width: "150px",
                            backgroundColor: isMonthLocked()
                              ? "#f5f5f5"
                              : "#ffffff",
                          }}
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  $
                                </InputAdornment>
                              ),
                            },
                          }}
                          value={expense.projectedDollar || "0.00"}
                          onChange={(e) =>
                            handleInputChange(
                              index,
                              "projectedDollar",
                              e.target.value
                            )
                          }
                          disabled={isMonthLocked()}
                        />
                      ) : (
                        <item>${expense.projectedDollar || "0.00"}</item>
                      )}
                    </TableCell>
                    <TableCell>
                      {" "}
                      {/*Textfield for Projected %*/}
                      <FormControl>
                        {hasUserInputedPercentageField.includes(
                          expense.name
                        ) ? (
                          <TextField
                            size="small"
                            variant="outlined"
                            sx={{
                              width: "125px",
                              backgroundColor: isMonthLocked()
                                ? "#f5f5f5"
                                : "#ffffff",
                            }}
                            slotProps={{
                              input: {
                                endAdornment: (
                                  <InputAdornment position="end">
                                    %
                                  </InputAdornment>
                                ),
                              },
                            }}
                            value={expense.projectedPercent || "0"}
                            onChange={(e) =>
                              handleInputChange(
                                index,
                                "projectedPercent",
                                e.target.value
                              )
                            }
                            disabled={isMonthLocked()}
                          />
                        ) : (
                          <item>{expense.projectedPercent || "0"}%</item>
                        )}
                        <FormLabel sx={{ fontSize: "0.75rem" }}>
                          {getLabel(expense.name)}
                        </FormLabel>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      {" "}
                      {/*Output for Estimated $*/}
                      {"$" + expense.estimatedDollar}
                    </TableCell>
                    <TableCell>
                      {" "}
                      {/*Output for Estimated %*/}
                      {expense.estimatedPercent + "%"}
                    </TableCell>
                    <TableCell>
                      {" "}
                      {/*Output for Historical $*/}
                      {"$" + expense.historicalDollar}
                    </TableCell>
                    <TableCell>
                      {" "}
                      {/*Output for Historical %*/}
                      {expense.historicalPercent + "%"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/*The Apply button*/}
          <Box
            textAlign="center"
            sx={{ paddingTop: "10px", paddingBottom: "10px" }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={handleApply}
              disabled={isMonthLocked()}
              sx={{
                backgroundColor: isMonthLocked() ? "#f5f5f5" : "#1976d2",
                color: isMonthLocked() ? "#999999" : "white",
                "&:hover": {
                  backgroundColor: isMonthLocked() ? "#f5f5f5" : "#42a5f5",
                },
              }}
            >
              Apply
            </Button>
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
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Cash +/- ($)</label>
                <input
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Promo ($)</label>
                <input
                  type="number"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">All Net Sales ($)</label>
                <input
                  type="number"
                  value={allNetSales}
                  onChange={(e) => setAllNetSales(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Advertising ($)</label>
                <input
                  type="number"
                  value={advertising}
                  onChange={(e) => setAdvertising(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
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
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Total Labor %</label>
                <input
                  type="number"
                  value={totalLabor}
                  onChange={(e) => setTotalLabor(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Payroll Tax ($)</label>
                <input
                  type="number"
                  value={payrollTax}
                  onChange={(e) => setPayrollTax(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
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
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Raw Waste %</label>
                <input
                  type="number"
                  value={rawWaste}
                  onChange={(e) => setRawWaste(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Condiment %</label>
                <input
                  type="number"
                  value={condiment}
                  onChange={(e) => setCondiment(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Variance Stat %</label>
                <input
                  type="number"
                  value={variance}
                  onChange={(e) => setVariance(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Unexplained %</label>
                <input
                  type="number"
                  value={unexplained}
                  onChange={(e) => setUnexplained(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Discounts %</label>
                <input
                  type="number"
                  value={discounts}
                  onChange={(e) => setDiscounts(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Base Food %</label>
                <input
                  type="number"
                  value={baseFood}
                  onChange={(e) => setBaseFood(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
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
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Condiment ($)</label>
                <input
                  type="number"
                  value={startingCondiment}
                  onChange={(e) => setStartingCondiment(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Paper ($)</label>
                <input
                  type="number"
                  value={startingPaper}
                  onChange={(e) => setStartingPaper(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Non Product ($)</label>
                <input
                  type="number"
                  value={startingNonProduct}
                  onChange={(e) => setStartingNonProduct(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label"> Office Supplies ($)</label>
                <input
                  type="number"
                  value={startingOpsSupplies}
                  onChange={(e) => setStartingOpsSupplies(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
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
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Condiment ($)</label>
                <input
                  type="number"
                  value={endingCondiment}
                  onChange={(e) => setEndingCondiment(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Paper ($)</label>
                <input
                  type="number"
                  value={endingPaper}
                  onChange={(e) => setEndingPaper(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label">Non Product ($)</label>
                <input
                  type="number"
                  value={endingNonProduct}
                  onChange={(e) => setEndingNonProduct(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
                />
              </div>
              <div className="input-row">
                <label className="input-label"> Office Supplies ($)</label>
                <input
                  type="number"
                  value={endingOpsSupplies}
                  onChange={(e) => setEndingOpsSupplies(e.target.value)}
                  disabled={isCurrentPeriodLocked()}
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

import React, { useState, useEffect, useContext } from "react";
import { db, auth } from "../../config/firebase-config";
//import { collection, addDoc } from "firebase/firestore";
// Added two more firestore helpers below
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { Box, Container, Grid2 as Grid, InputLabel, Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, TextField, Button, Select, MenuItem, InputAdornment, FormControl, FormLabel } from "@mui/material";
import { StoreContext } from "../../context/storeContext";
import PacTab from './PacTab';
import styles from './pac.css';
import { useAuth } from "../../context/AuthContext";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";

const expenseList = [
  "Product Sales", "All Net Sales", "Payroll Tax", "Advertising",
  "Base Food", "Employee Meal", "Condiment", "Total Waste", "Paper",
  "Crew Labor", "Management Labor", "Payroll Tax", "Advertising",
  "Travel", "Adv Other", "Promotion", "Outside Services",
  "Linen", "OP. Supply", "Maint. & Repair", "Small Equipment", "Utilities", "Office", "Cash +/-", "Misc: CR/TR/D&S",
  "Total Controllable", "P.A.C.", "Δ P.A.C. $"
];

// Add expense(s) to this array to disable projected $ text field. Case-senstive.
const hasUserInputAmountField = [
  "Sales", "All Net Sales", 
  "Travel", "Adv Other", "Outside Services",
  "Linen", "OP. Supply", "Maint. & Repair", "Small Equipment", "Utilities", "Office", "Cash +/-", "Misc: CR/TR/D&S",
  "Total Controllable", "P.A.C.", "Δ P.A.C. $"
];

// Add expense(s) to this array to disable projected % text field. Case-senstive.
const hasUserInputedPercentageField = [
  "Base Food", "Employee Meal", "Condiment", "Total Waste", "Paper",
  "Crew Labor", "Management Labor", "Payroll Tax", 
  "Advertising", "Promotion"
];

const getLabel = (key) => {
  const specialLabels = {
    "Payroll Tax" : "% of Total Labor",
    "Advertising" : "% of All Net Sales",
    "Promotion" : "% of Product Sales"};

  return specialLabels[key] || "";  
};

const PAC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [month, setMonth] = useState("January");
  const [savedData, setSavedData] = useState({});

  const months = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - i);
  const [year, setYear] = useState(currentYear);

  // State variables for Generate tab
  const pacGenRef = collection(db, "pacGen");
  const pacProjectionsRef = collection(db, "pac_projections"); // for Projections tab
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

  const [openHistModal, setOpenHistModal] = useState(false)
  const [shouldLoadHist, setShouldLoadHist] = useState(false);

  const { userRole } = useAuth();

  const isAdmin = (userRole || "").toLowerCase() === "admin";


//   useEffect(() => {
//   const loadPreviousMonth = async () => {
//     if (!selectedStore) return;

//     // Figure out previous month/year
//     const monthsArr = [
//       "January","February","March","April","May","June",
//       "July","August","September","October","November","December"
//     ];
//     const currIdx = monthsArr.indexOf(month);
//     const prevDate = new Date(year, currIdx - 1, 1); // rolls back year if Jan
//     const prevMonthLabel = monthsArr[prevDate.getMonth()];
//     const prevYear = prevDate.getFullYear();
//     const prevMonth = String(prevDate.getMonth() + 1).padStart(2, "0");

//     const prevPeriod = `${prevYear}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

//     // Build docId = storeId_period
//     const docId = `${selectedStore}_${prevYear}${prevMonth}`;

//     console.log("Looking for doc:", docId);

//     const ref = doc(db, "pac_projections", docId);
//     const snap = await getDoc(ref);
//     if (!snap.exists()) {
//       console.log("No data for", docId);
//       return;
//     }
//     const latest = snap.data();
//     console.log(latest)

//     if (!latest) return;

//     // Build historical data map from Firestore fields
//     const productSales = Number(latest.ProductNetSales || 0);

//     const mapping = {
//   // Dollars
//   "Sales": { dollar: latest.projectedDollar },
//   "Promotion": { dollar: latest.promotions },
//   "Cash +/-": { dollar: latest.cash_adjustments },
//   "Paper": { dollar: latest.purchases?.paper || 0 },
//   "Office": { dollar: latest.purchases?.office || 0 },

//   // Percents
//   "Condiment": { percent: latest.condiment_percent },
//   "Crew Labor": { percent: latest.crew_labor_percent },
//   "Management Labor": { percent: (latest.total_labor_percent || 0) - (latest.crew_labor_percent || 0) },
//   "Payroll Tax": { percent: latest.payroll_tax_rate },
//   "Advertising": { percent: latest.advertising_percent },
//   "Total Waste": { percent: (latest.complete_waste_percent || 0) + (latest.raw_waste_percent || 0) },
// };

// const hist = expenseList.map(name => {
//   const entry = latest.projections?.find(p => p.name === name) || {};
//   return {
//     name,
//     historicalDollar: entry.projectedDollar || "-",
//     historicalPercent: entry.projectedPercent || "-"
//   };
// });

//     // const hist = expenseList.map(name => {
//     //   const val = Number(mapping[name] || 0);
//     //   return {
//     //     name,
//     //     historicalDollar: val.toFixed(2),
//     //     historicalPercent: (name === "Sales" || productSales === 0)
//     //       ? "-"
//     //       : ((val / productSales) * 100).toFixed(2)
//     //   };
//     // });

//    setProjections(expenseList.map(name => {
//   const h = hist.find(e => e.name === name) || {};
//   return {
//     name,
//     projectedDollar: "",
//     projectedPercent: "",
//     estimatedDollar: "-",
//     estimatedPercent: "-",
//     historicalDollar: h.historicalDollar || "-",
//     historicalPercent: h.historicalPercent || "-"
//   };
// }));
//   };

//   if (tabIndex === 0) loadPreviousMonth();
// }, [selectedStore, year, month, tabIndex]);


  useEffect(() => {
    document.title = "PAC Pro - PAC";
  }, []);

  useEffect(() => {
  const loadHistoricalData = async () => {
    if (!selectedStore) return;

    const histMonthIdx = months.indexOf(histMonth);
    const docId = `${selectedStore}_${histYear}${String(histMonthIdx + 1).padStart(2, "0")}`;

    console.log("Fetching historical doc:", docId);

    const ref = doc(db, "pac_projections", docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.log("No data for", docId);
      return;
    }
    const latest = snap.data();
    console.log("latest data: ", latest);
    

    const hist = expenseList.map(name => {
      const entry = latest.projections?.find(p => p.name === name) || {};
      return {
        name,
        historicalDollar: entry.projectedDollar || "-",
        historicalPercent: entry.projectedPercent || "-"
      };
    });

    setProjections(prev =>
      prev.map(expense => {
        const h = hist.find(e => e.name === expense.name) || {};
        return {
          ...expense,
          historicalDollar: h.historicalDollar || "-",
          historicalPercent: h.historicalPercent || "-"
        };
      })
    );
  };

  if (tabIndex === 0 && shouldLoadHist){
    loadHistoricalData();
    // setShouldLoadHist(false)

  } 
}, [selectedStore, histMonth, histYear, tabIndex, shouldLoadHist]);

  // Fetch user data from Firestore
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       // Get the current user from Firebase Auth
  //       const user = auth.currentUser;
  //       if (user) {
  //         // Query the "users" collection for the current user's data
  //         const userQuery = query(
  //           collection(db, "users"),
  //           where("uid", "==", user.uid)
  //         );
  //         const userSnapshot = await getDocs(userQuery);
  //         if (!userSnapshot.empty) {
  //           setUserData(userSnapshot.docs[0].data());
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error loading data from Firestore:", error);
  //     }
  //   };

  //   fetchData();
  // }, []);

  // lock previous months/years for non-admins
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
    return yearNumber < currentYear; // lock/grey any previous year
  };


  // useEffect(() => {
  //   const historicalData = getHistoricalData();
  //   setProjections(savedData[month] || expenseList.map(expense => {
  //     const historicalEntry = historicalData.find(e => e.name === expense) || {};
  //     return {
  //       name: expense,
  //       projectedDollar: "",
  //       projectedPercent: "",
  //       estimatedDollar: historicalEntry.historicalDollar || "-",
  //       estimatedPercent: historicalEntry.historicalPercent || "-",
  //       historicalDollar: historicalEntry.historicalDollar || "-",
  //       historicalPercent: historicalEntry.historicalPercent || "-"
  //     };
  //   }));
  // }, [month, savedData]);

  // fetch latest generate doc for selected month and year
useEffect(() => {
  const loadLatestForPeriod = async () => {
    try {
      const monthIndex = months.indexOf(month);
      const period = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

      const q = query(pacGenRef, where("Period", "==", period));
      const snap = await getDocs(q);

      if (snap.empty) return; // ⬅ don’t reset to empty rows

      let latestDoc = null;
      let latestTs = -Infinity;
      snap.forEach(d => {
        const data = d.data();
        const ts = data.createdAt?.toMillis?.() ?? 0;
        if (ts > latestTs) {
          latestTs = ts;
          latestDoc = data;
        }
      });
      if (!latestDoc) return;

      // Instead of resetting, start with current projections
      setProjections(prev => {
        const updated = [...prev]; // clone

        const setProjDollar = (name, value) => {
          const r = updated.find(x => x.name === name);
          if (r) {
            const num = Number(value);
            r.projectedDollar = Number.isFinite(num) ? num.toFixed(2) : "";
          }
        };
        const setProjPct = (name, value) => {
          const r = updated.find(x => x.name === name);
          if (r) {
            const num = Number(value);
            r.projectedPercent = Number.isFinite(num) ? String(num) : "";
          }
        };

        // === fill in Generate values, but leave historical untouched ===
        setProjDollar("Sales", latestDoc.ProductNetSales);
        setProjDollar("All Net Sales", latestDoc.AllNetSales);
        setProjDollar("Advertising", latestDoc.Advertising);

        setProjPct("Crew Labor", latestDoc.CrewLabor);
        const mgmtPct = Math.max((Number(latestDoc.TotalLabor) || 0) - (Number(latestDoc.CrewLabor) || 0), 0);
        setProjPct("Management Labor", mgmtPct);
        setProjDollar("Payroll Tax", latestDoc.PayrollTax);

        setProjPct("Base Food", latestDoc.BaseFood);
        setProjPct("Condiment", latestDoc.Condiment);
        const totalWastePct = (Number(latestDoc.CompleteWaste) || 0) + (Number(latestDoc.RawWaste) || 0);
        setProjPct("Total Waste", totalWastePct);

        return updated;
      });
    } catch (err) {
      console.error("Failed to load pacGen for period:", err);
    }
  };

  if (tabIndex === 0) loadLatestForPeriod();
}, [month, year, tabIndex]);


  const handleInputChange = (index, field, value) => {
    setProjections(prevProjections => {
      const newProjections = [...prevProjections];
      newProjections[index][field] = value;

      // const historicalData = getHistoricalData();
      let crewLabor = parseFloat(newProjections.find(e => e.name === "Crew Labor")?.projectedDollar) || 0;
      let managementLabor = parseFloat(newProjections.find(e => e.name === "Management Labor")?.projectedDollar) || 0;
      let payrollTaxPercent = parseFloat(newProjections.find(e => e.name === "Payroll Tax")?.projectedPercent) || 0;
      let allNetSales = parseFloat(newProjections.find(e => e.name === "All Net Sales")?.projectedDollar) || 0;
      let advertisingPercent = parseFloat(newProjections.find(e => e.name === "Advertising")?.projectedPercent) || 0;

      newProjections.forEach((expense, idx) => {
        // const historicalEntry = historicalData.find(e => e.name === expense.name) || {};
        // const historicalDollar = parseFloat(historicalEntry.historicalDollar) || 0;
        // const historicalPercent = parseFloat(historicalEntry.historicalPercent) || 0;
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
        newProjections[idx].estimatedPercent = ((projectedPercent + historicalPercent) / 2).toFixed(2) + "%";
      });

      return newProjections;
    });
  };

  const handleApply = async () => {
  if (!selectedStore) {
    alert("No store selected");
    return;
  }

  // Build a document ID: store_001_202509 (for Sept 2025, example)
  const monthIndex = months.indexOf(month); // 0–11
  const docId = `${selectedStore}_${year}${String(monthIndex + 1).padStart(2, "0")}`;

  try {
    await setDoc(doc(db, "pac_projections", docId), {
      store_id: selectedStore,
      year_month: `${year}${String(monthIndex + 1).padStart(2, "0")}`,
      projections: projections,   // <-- save the array you built
      updatedAt: serverTimestamp(),
    });

    alert("Projections saved to Firestore!");
  } catch (err) {
    console.error("Error saving projections:", err);
    alert("Failed to save projections");
  }
};

  const getEmptyHistoricalData = () => {
    return expenseList.map(expense => ({
      name: expense,
      historicalDollar: "-",
      historicalPercent: "-"
    }));
  };
  useEffect(() => {
  console.log("shouldLoadHist changed:", shouldLoadHist);
}, [shouldLoadHist]);

const makeEmptyProjectionRows = () => {
  const historicalData = getEmptyHistoricalData();
  return expenseList.map(expense => {
    const h = historicalData.find(e => e.name === expense) || {};
    return {
      name: expense,
      projectedDollar: "",
      projectedPercent: "",
      estimatedDollar: h.historicalDollar || "-",
      estimatedPercent: h.historicalPercent || "-",
      historicalDollar: h.historicalDollar || "-",
      historicalPercent: h.historicalPercent || "-"
    };
  });
};


  const [projections, setProjections] = useState(makeEmptyProjectionRows());



  const [storeNumber, setStoreNumber] = useState("Store 123"); // You might want to make this dynamic
const [actualData, setActualData] = useState({}); // Will hold actual data from invoices
const [hoverInfo, setHoverInfo] = useState(null);

// Categories for visual grouping
const categories = {
  'Product Sales': ['Product Sales'],
  'Food & Paper': ['Base Food', 'Employee Meal', 'Condiment', 'Total Waste', 'Paper'],
  'Labor': ['Crew Labor', 'Management Labor', 'Payroll Tax'],
  'Purchases': ['Advertising', 'Travel', 'Adv Other', 'Promotion', 'Outside Services',
                'Linen', 'OP. Supply', 'Maint. & Repair', 'Small Equipment', 
                'Utilities', 'Office', 'Cash +/-', 'Misc: CR/TR/D&S']
};

// Calculate category sums
const calculateCategorySums = (data, type) => {
  const sums = {};
  for (const [category, items] of Object.entries(categories)) {
    sums[category] = items.reduce((acc, item) => {
      const expense = data.find(e => e.name === item);
      if (expense) {
        const dollar = parseFloat(expense[`${type}Dollar`]) || 0;
        const percent = parseFloat(expense[`${type}Percent`]) || 0;
        return {
          dollar: acc.dollar + dollar,
          percent: acc.percent + percent
        };
      }
      return acc;
    }, { dollar: 0, percent: 0 });
  }
  return sums;
};

// Helper functions
const getCategoryColor = (category) => {
  const colors = {
    'Product Sales': '#e3f2fd',
    'Food & Paper': '#e8f5e9',
    'Labor': '#fff3e0',
    'Purchases': '#f3e5f5'
  };
  return colors[category] || '#ffffff';
};

  const getProductSales = () => {
    const productSales = projections.find(e => e.name === 'Sales');
    return parseFloat(productSales?.historicalDollar) || 0;
  };

const calculateTotalControllable = (type) => {
  let total = 0;
  ['Food & Paper', 'Labor', 'Purchases'].forEach(category => {
    categories[category].forEach(item => {
      const expense = projections.find(e => e.name === item);
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
  return total > 0 ? ((value / total) * 100).toFixed(2) + '%' : '0.00%';
};

const isPacPositive = () => {
  const actualPac = calculatePac('historical');
  const projectedPac = calculatePac('projected');
  return actualPac >= projectedPac;
};

  // this function saves all the user input data from the generate page into the database
  const handleGenerate = async (e) => {
    if (!productNetSales ||
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
    }

    else {
      try {
        await addDoc(pacGenRef, {
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
          EndingOpsSupplies: parseFloat(endingOpsSupplies)
        });
        alert("Report generated successfully.");
      } catch (error) {
        console.error("Error saving report:", error);
        alert("Failed to generate.");
      }
    }

  };


  return (
    <Container sx={{ textAlign: "center", marginTop: 5, overflowX: "auto", paddingX: "20px" }}>
      <div className="topBar">
        <h1 className="Header">PAC</h1>
        <div className="topBarControls">
          <div className="filterDropdowns" style={{ display: "flex", alignItems: "center" }}>
            {/* Month Dropdown */}
            <Select value={month} onChange={(e) => setMonth(e.target.value)} sx={{ width: 200, marginRight: 2 }}>
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
            {/* Year Dropdown */}
            <Select value={year} onChange={(e) => setYear(e.target.value)} sx={{ width: 120, marginRight: 2 }}>
              {years.map(y => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
            <Tabs
              value={tabIndex}
              onChange={(event, newIndex) => setTabIndex(newIndex)}
              sx={{ flexGrow: 1, marginLeft: 2 }}
              textColor="primary"
            >
              <Tab label="Projections" />
              <Tab label="Generate" />
              <Tab label="P.A.C." />
            </Tabs>
            <Button variant="contained" onClick={() => setSavedData(prevData => ({ ...prevData, [month]: [...projections] }))}>Apply</Button>
          </div>
        </div>
      </Container>
      <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
  <Button variant="outlined" onClick={() => setOpenHistModal(true)}>
    View Historical Data
  </Button>
</Box>

      {tabIndex === 0 && (
  <Container sx={{ marginTop: '20px' }}>
      {shouldLoadHist ? (
        <Box sx={{ mb: 2 }}>
          <strong>
            Displaying Historical Data for {histMonth} {histYear}
          </strong>
        </Box>
      ) : (
        <Box sx={{ mb: 2 }}>
          <strong>
            Select a month to view historical data
          </strong>
        </Box>
      )}
    

    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ whiteSpace: 'nowrap' }}>
            <TableCell><strong>Expense Name</strong></TableCell>
            <TableCell><strong>Projected $</strong></TableCell>
            <TableCell><strong>Projected %</strong></TableCell>
            <TableCell><strong>Estimated $</strong></TableCell>
            <TableCell><strong>Estimated %</strong></TableCell>
            <TableCell><strong>Historical $</strong></TableCell>
            <TableCell><strong>Historical %</strong></TableCell>
          </TableRow>
        </TableHead>
            <TableBody>
              {projections.map((expense, index) => (
                <TableRow key={expense.name} sx={{backgroundColor:
      expense.name === "P.A.C."
        ? (isPacPositive() ? "#e8f5e9" : "#ffebee") // green or red
        : getCategoryColor(getCategory(expense.name))}}>
                  <TableCell
                    sx={{
                      fontWeight: expense.name === "P.A.C." ? "bold" : "normal",
                      color: expense.name === "P.A.C."
                        ? (isPacPositive() ? "green" : "red")
                        : "inherit"
                    }}
                  >
                    {expense.name}
                  </TableCell>
                  <TableCell> {/*Textfield for Projected $*/}
                    {hasUserInputAmountField.includes(expense.name) 
                      ? <TextField size="small" variant="outlined" sx={{width: '150px', backgroundColor: '#ffffff'}}
                          slotProps={{input: { startAdornment: <InputAdornment position="start">$</InputAdornment>}}}
                          value={expense.projectedDollar || "0.00"} 
                          onChange={(e) => handleInputChange(index, "projectedDollar", e.target.value)} />
                      : <item>${expense.projectedDollar || "0.00"}</item>}
                  </TableCell>
                  <TableCell>
                    <TextField size="small" variant="outlined" value={expense.projectedPercent} onChange={(e) => handleInputChange(index, "projectedPercent", e.target.value)} />
                  </TableCell>
                  <TableCell>{expense.estimatedDollar}</TableCell>
                  <TableCell>{expense.estimatedPercent}</TableCell>
                  <TableCell>{expense.historicalDollar}</TableCell>
                  <TableCell>{expense.historicalPercent}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/*The Apply button*/}
        <Box textAlign='center' sx={{ paddingTop: '10px', paddingBottom: '10px' }}>
          {/* <Button variant="contained" size="large" onClick={() => setSavedData(prevData => ({ ...prevData, [month]: [...projections] }))}>Apply</Button> */}
          <Button variant="contained" size="large" onClick={handleApply}>
            Apply
          </Button>
        </Box>

        </Container>
      )} {/* end of Projections page */}

      {tabIndex === 1 && (
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

          {/* This button calls the handleGenerate function */}
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
              "&:hover": {
                backgroundColor: "#42a5f5",
              }
            }}
            onClick={handleGenerate}
          >
            Generate Report
          </Button>


        </div>
      )}  {/* end of Generate page */}

      {tabIndex === 2 && (
        <Container>
        <PacTab 
          storeId={selectedStore || "store_001"} 
          year={year} 
          month={month}
          projections={projections}
        />
        </Container>
      )} {/* end of Actual page */}

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
          <MenuItem key={m} value={m}>{m}</MenuItem>
        ))}
      </Select>

      {/* Year Dropdown */}
      <Select
        value={histYear}
        onChange={(e) => setHistYear(e.target.value)}
        sx={{ width: 120 }}
      >
        {years.map((y) => (
          <MenuItem key={y} value={y}>{y}</MenuItem>
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
        // histMonth / histYear change triggers your useEffect
      }}
    >
      Load Data
    </Button>
  </DialogActions>
</Dialog>

    </Box>
  );
};

export default PAC;

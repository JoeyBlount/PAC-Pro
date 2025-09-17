import React, { useState, useEffect, useContext } from "react";
import { db, auth } from "../../config/firebase-config";
//import { collection, addDoc } from "firebase/firestore";
// Added two more firestore helpers below
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { Box, Container, Grid2 as Grid, InputLabel, Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, TextField, Button, Select, MenuItem, InputAdornment, FormControl, FormLabel } from "@mui/material";
import { StoreContext } from "../../context/storeContext";
import PacTab from './PacTab';
import styles from './pac.css';


const expenseList = [
  "Sales", "All Net Sales", 
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
  "Linen", "OP. Supply", "Maint. & Repair", "Small Equipment", "Utilities", "Office", "Cash +/-", "Misc: CR/TR/D&S"
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
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const [month, setMonth] = useState(currentMonth);
  const [savedData, setSavedData] = useState({});
  const [projections, setProjections] = useState([]);
  const months = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
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

  const [userData, setUserData] = useState(null);
  const [userRole, setUserRole] = useState("User");
  const isAdmin =
    String((userData?.role ?? userRole) || "").toLowerCase() === "admin";

  const user = auth.currentUser;


  useEffect(() => {
    document.title = "PAC Pro - PAC";
  }, []);

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get the current user from Firebase Auth
        const user = auth.currentUser;
        if (user) {
          // Query the "users" collection for the current user's data
          const userQuery = query(
            collection(db, "users"),
            where("uid", "==", user.uid)
          );
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


  useEffect(() => {
    const historicalData = getHistoricalData();
    setProjections(savedData[month] || expenseList.map(expense => {
      const historicalEntry = historicalData.find(e => e.name === expense) || {};
      return {
        name: expense,
        projectedDollar: "",
        projectedPercent: "",
        estimatedDollar: historicalEntry.historicalDollar || "-",
        estimatedPercent: historicalEntry.historicalPercent || "-",
        historicalDollar: historicalEntry.historicalDollar || "-",
        historicalPercent: historicalEntry.historicalPercent || "-"
      };
    }));
  }, [month, savedData]);

  // fetch latest generate doc for selected month and year
  useEffect(() => {
    const loadLatestForPeriod = async () => {
      try {
        // Build "YYYY-MM" period string
        const monthIndex = [
          "January","February","March","April","May","June",
          "July","August","September","October","November","December"
        ].indexOf(month);
        const period = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

        // 👇 No orderBy, no limit — avoids composite index
        const q = query(
          pacGenRef,
          where("Period", "==", period)
        );

        const snap = await getDocs(q);
        if (snap.empty) {
          setProjections(makeEmptyProjectionRows());
          return;
        }

        // Pick the doc with the latest createdAt (or fallback)
        let latestDoc = null;
        let latestTs = -Infinity;

        snap.forEach(d => {
          const data = d.data();
          // createdAt is a Firestore Timestamp; guard null when just written
          const ts = data.createdAt?.toMillis
            ? data.createdAt.toMillis()
            : (typeof data.createdAt === "number" ? data.createdAt : 0);
          if (ts > latestTs) {
            latestTs = ts;
            latestDoc = data;
          }
        });

        if (!latestDoc) {
          setProjections(makeEmptyProjectionRows());
          return;
        }

        const data = latestDoc;
        

        const rows = makeEmptyProjectionRows();

        // Helpers with safe names
        const setProjDollar = (name, value) => {
          const r = rows.find(x => x.name === name);
          if (!r) return;
          const num = Number(value);
          r.projectedDollar = Number.isFinite(num) ? num.toFixed(2) : "";
        };

        const setProjPct = (name, value) => {
          const r = rows.find(x => x.name === name);
          if (!r) return;
          const num = Number(value);
          r.projectedPercent = Number.isFinite(num) ? String(num) : "";
        };

        // === Sales ===
        setProjDollar("Product Sales", data.ProductNetSales);
        setProjDollar("All Net Sales", data.AllNetSales);
        setProjDollar("Advertising", data.Advertising);

        // === Labor ===
        setProjPct("Crew Labor", data.CrewLabor);
        const mgmtPct = Math.max((Number(data.TotalLabor) || 0) - (Number(data.CrewLabor) || 0), 0);
        setProjPct("Management Labor", mgmtPct);
        setProjDollar("Payroll Tax", data.PayrollTax);

        // === Food & Paper ===
        setProjPct("Base Food", data.BaseFood);
        setProjPct("Condiment", data.Condiment);
        const totalWastePct = (Number(data.CompleteWaste) || 0) + (Number(data.RawWaste) || 0);
        setProjPct("Total Waste", totalWastePct);

        // Recompute Estimated columns
        const hist = getHistoricalData();
        rows.forEach((row, i) => {
          const h = hist.find(e => e.name === row.name) || {};
          const hDollar = parseFloat(h.historicalDollar) || 0;
          const hPct = parseFloat(String(h.historicalPercent || "").replace("%","")) || 0;
          const pDollar = parseFloat(row.projectedDollar) || 0;
          const pPct = parseFloat(String(row.projectedPercent || "").replace("%","")) || 0;

          rows[i].estimatedDollar = ((pDollar + hDollar) / 2).toFixed(2);
          rows[i].estimatedPercent = ((pPct + hPct) / 2).toFixed(2);
        });

        setProjections(rows);
      } catch (err) {
        console.error("Failed to load pacGen for period:", err);
        setProjections(makeEmptyProjectionRows());
      }
    };

    // Only refresh when viewing the Projections tab
    if (tabIndex === 0) loadLatestForPeriod();
  }, [month, year, tabIndex]); 


  const handleInputChange = (index, field, value) => {
    setProjections(prevProjections => {
      const newProjections = [...prevProjections];
      newProjections[index][field] = value;

      const historicalData = getHistoricalData();
      let crewLabor = parseFloat(newProjections.find(e => e.name === "Crew Labor")?.projectedDollar) || 0;
      let managementLabor = parseFloat(newProjections.find(e => e.name === "Management Labor")?.projectedDollar) || 0;
      let payrollTaxPercent = parseFloat(newProjections.find(e => e.name === "Payroll Tax")?.projectedPercent) || 0;
      let allNetSales = parseFloat(newProjections.find(e => e.name === "All Net Sales")?.projectedDollar) || 0;
      let advertisingPercent = parseFloat(newProjections.find(e => e.name === "Advertising")?.projectedPercent) || 0;

      newProjections.forEach((expense, idx) => {
        const historicalEntry = historicalData.find(e => e.name === expense.name) || {};
        const historicalDollar = parseFloat(historicalEntry.historicalDollar) || 0;
        const historicalPercent = parseFloat(historicalEntry.historicalPercent) || 0;
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

  const getHistoricalData = () => {
    return expenseList.map(expense => ({
      name: expense,
      historicalDollar: "1000",
      historicalPercent: "5"
    }));
  };

  const makeEmptyProjectionRows = () => {
    const historicalData = getHistoricalData();
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


  const [storeNumber, setStoreNumber] = useState("Store 123"); // You might want to make this dynamic
  const [actualData, setActualData] = useState({}); // Will hold actual data from invoices
  const [hoverInfo, setHoverInfo] = useState(null);

  // Categories for visual grouping
  const categories = {
    'Sales': ['Sales', 'All Net Sales'],
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
  const getCategory = (expense) => {
    const input = expense.toLowerCase();
    for (const [key, values] of Object.entries(categories)) {
      if(values.some(v => v.toLowerCase() === input)) {
        return key; 
      }
    }
    return null;
  }

  const getCategoryColor = (category) => {
    const colors = {
      'Sales': '#e3f2fd',
      'Food & Paper': '#e8f5e9',
      'Labor': '#fff3e0',
      'Purchases': '#f3e5f5'
    };
    return colors[category] || '#ffffff';
  };

  const getProductSales = () => {
    const productSales = projections.find(e => e.name === 'Product Sales');
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

        // using a "period" key for generate
        const monthIndex = [
          "January","February","March","April","May","June",
          "July","August","September","October","November","December"
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
    <Box sx = {{flexGrow: 1}}>
      <Container>
        <Paper sx={{padding: '10px'}}>
          <Grid container wrap="wrap" justifyContent="space-between" alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ padding: '10px', marginLeft: '5px' }}>
                <h1 className="Header">PAC</h1>
              </Box>
            </Grid>
            <Grid container xs={12} sm={6} md={4} wrap="wrap" justifyContent="flex-end" alignItems="center"> 
              <Grid item xs={12} sm={6} md={4}>
                <Box display="flex" flexDirection="row" flexWrap="nowrap" justifyContent="center" gap={1} sx={{ padding: '10px', margin: '0 auto' }}>
                  {/* Month Dropdown */}
                  <Select
                    value={month}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (isMonthDisabled(next, year)) return; // guard
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

                  {/* Year Dropdown */}
                  <Select
                    value={year}
                    onChange={(e) => {
                      const nextYear = e.target.value;
                      if (isYearDisabled(nextYear)) return; // guard
                      setYear(nextYear);

                      // If the current month becomes invalid after switching years, snap to current month
                      if (isMonthDisabled(month, nextYear)) {
                        const safeMonth = months[new Date().getMonth()];
                        setMonth(safeMonth);
                      }
                    }}
                    sx={{ width: 120, marginRight: 2 }}
                  >
                    {years.map((y) => (
                      <MenuItem key={y} value={y} disabled={isYearDisabled(y)}
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
                  sx={{ padding: '10px', margin: '0 auto' }}
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
            onChange={(e)=>setPacGoal(e.target.value)}
          />
        </div>
      </Container>

      {tabIndex === 0 && (
        <Container sx={{marginTop: '20px'}}>
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
                <TableRow key={expense.name} sx={{backgroundColor: getCategoryColor(getCategory(expense.name))}}>
                  <TableCell>{expense.name}</TableCell>
                  <TableCell> {/*Textfield for Projected $*/}
                    {hasUserInputAmountField.includes(expense.name) 
                      ? <TextField size="small" variant="outlined" sx={{width: '150px', backgroundColor: '#ffffff'}}
                          slotProps={{input: { startAdornment: <InputAdornment position="start">$</InputAdornment>}}}
                          value={expense.projectedDollar || "0.00"} 
                          onChange={(e) => handleInputChange(index, "projectedDollar", e.target.value)} />
                      : <item>${expense.projectedDollar || "0.00"}</item>}
                  </TableCell>
                  <TableCell> {/*Textfield for Projected %*/}
                    <FormControl>
                      {hasUserInputedPercentageField.includes(expense.name)
                      ?  <TextField size="small" variant="outlined" sx={{width: '125px', backgroundColor: '#ffffff'}}
                          slotProps={{input: { endAdornment: <InputAdornment position="end">%</InputAdornment>}}}
                          value={expense.projectedPercent || "0"} 
                          onChange={(e) => handleInputChange(index, "projectedPercent", e.target.value)} />
                      : <item>{expense.projectedPercent || "0"}%</item>}  
                      <FormLabel sx={{ fontSize: '0.75rem' }}>{getLabel(expense.name)}</FormLabel>
                    </FormControl>  
                  </TableCell>
                  <TableCell> {/*Output for Estimated $*/}
                    {"$" + expense.estimatedDollar}
                  </TableCell>
                  <TableCell> {/*Output for Estimated %*/}
                    {expense.estimatedPercent + "%"}
                  </TableCell>
                  <TableCell> {/*Output for Historical $*/}
                    {"$" + expense.historicalDollar}
                  </TableCell>
                  <TableCell> {/*Output for Historical %*/}
                    {expense.historicalPercent + "%"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/*The Apply button*/}
        <Box textAlign='center' sx={{ paddingTop: '10px', paddingBottom: '10px' }}>
          <Button variant="contained" size="large" onClick={() => setSavedData(prevData => ({ ...prevData, [month]: [...projections] }))}>Apply</Button>
        </Box>

        </Container>
      )} {/* end of Projections page */}

      {tabIndex === 1 && (
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
        </Container>
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

    </Box>
  );
};

export default PAC;

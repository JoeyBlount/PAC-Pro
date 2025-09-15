import React, { useState, useEffect } from "react";
import { db, auth } from "../../config/firebase-config";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { Container, Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, TextField, Button, Select, MenuItem } from "@mui/material";
import styles from './pac.css';


const expenseList = [
  "Product Sales", "All Net Sales", "Payroll Tax", "Advertising",
  "Base Food", "Employee Meal", "Condiment", "Total Waste", "Paper",
  "Crew Labor", "Management Labor", "Travel", "Adv Other", "Promotion", "Outside Services",
  "Linen", "OP. Supply", "Maint. & Repair", "Small Equipment", "Utilities", "Office", "Cash +/-", "Misc: CR/TR/D&S",
  "Total Controllable", "P.A.C.", "Δ P.A.C. $"
];

const PAC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [savedData, setSavedData] = useState({});
  const [projections, setProjections] = useState([]);
  const months = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - i);

  // default to current month/year
  const [month, setMonth] = useState(months[new Date().getMonth()]);
  const [year, setYear] = useState(currentYear);


  // State variables for Generate tab
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
        newProjections[idx].estimatedPercent = ((projectedPercent + historicalPercent) / 2).toFixed(2) + "%";
      });

      return newProjections;
    });
  };

  const getHistoricalData = () => {
    return expenseList.map(expense => ({
      name: expense,
      historicalDollar: "1000",
      historicalPercent: "5%"
    }));
  };

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
      </div>

      {tabIndex === 0 && (
        <TableContainer component={Paper} sx={{ width: "100%" }}>
          <Table size="small" sx={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
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
                <TableRow key={expense.name}>
                  <TableCell>{expense.name}</TableCell>
                  <TableCell>
                    <TextField size="small" variant="outlined" value={expense.projectedDollar} onChange={(e) => handleInputChange(index, "projectedDollar", e.target.value)} />
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
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3>{storeNumber} - {month} {new Date().getFullYear()}</h3>
            <Button
              variant="contained"
              onClick={() => window.print()}
              sx={{ backgroundColor: '#1976d2', color: 'white' }}
            >
              Print Report
            </Button>
          </div>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="25%"><strong>Account</strong></TableCell>
                  <TableCell align="right" width="15%"><strong>Actual $</strong></TableCell>
                  <TableCell align="right" width="15%"><strong>Actual %</strong></TableCell>
                  <TableCell align="right" width="15%"><strong>Projected $</strong></TableCell>
                  <TableCell align="right" width="15%"><strong>Projected %</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(categories).map(([category, items]) => (
                  <React.Fragment key={category}>
                    <TableRow
                      hover
                      onMouseEnter={() => {
                        const actualSums = calculateCategorySums(projections, 'historical');
                        const projectedSums = calculateCategorySums(projections, 'projected');
                        setHoverInfo({
                          category,
                          actual: actualSums[category],
                          projected: projectedSums[category]
                        });
                      }}
                      onMouseLeave={() => setHoverInfo(null)}
                      sx={{ backgroundColor: getCategoryColor(category) }}
                    >
                      <TableCell colSpan={5}><strong>{category}</strong></TableCell>
                    </TableRow>

                    {items.map(item => {
                      const expense = projections.find(e => e.name === item);
                      return expense ? (
                        <TableRow key={item}>
                          <TableCell>{item}</TableCell>
                          <TableCell align="right">{expense.historicalDollar || '-'}</TableCell>
                          <TableCell align="right">
                            {item === 'Product Sales' ? '-' : (expense.historicalPercent || '-')}
                          </TableCell>
                          <TableCell align="right">{expense.projectedDollar || '-'}</TableCell>
                          <TableCell align="right">{expense.projectedPercent || '-'}</TableCell>
                        </TableRow>
                      ) : null;
                    })}
                  </React.Fragment>
                ))}

                {/* Total Controllable Row */}
                <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                  <TableCell><strong>Total Controllable</strong></TableCell>
                  <TableCell align="right">
                    {calculateTotalControllable('historical').toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    {calculatePercentage(calculateTotalControllable('historical'), getProductSales())}
                  </TableCell>
                  <TableCell align="right">
                    {calculateTotalControllable('projected').toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    {calculatePercentage(calculateTotalControllable('projected'), getProductSales())}
                  </TableCell>
                </TableRow>

                {/* P.A.C. Row */}
                <TableRow sx={{
                  backgroundColor: isPacPositive() ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                  fontWeight: 'bold'
                }}>
                  <TableCell><strong>P.A.C.</strong></TableCell>
                  <TableCell align="right">
                    {calculatePac('historical').toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    {calculatePercentage(calculatePac('historical'), getProductSales())}
                  </TableCell>
                  <TableCell align="right">
                    {calculatePac('projected').toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    {calculatePercentage(calculatePac('projected'), getProductSales())}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Hover Popup */}
          {hoverInfo && (
            <Paper
              elevation={3}
              sx={{
                position: 'absolute',
                padding: '10px',
                backgroundColor: 'white',
                zIndex: 1000,
                pointerEvents: 'none'
              }}
            >
              <div><strong>{hoverInfo.category} Summary</strong></div>
              <div>Actual: ${hoverInfo.actual.dollar.toFixed(2)} ({hoverInfo.actual.percent.toFixed(2)}%)</div>
              <div>Projected: ${hoverInfo.projected.dollar.toFixed(2)} ({hoverInfo.projected.percent.toFixed(2)}%)</div>
            </Paper>
          )}
        </div>
      )}


    </Container>
  );
};

export default PAC;

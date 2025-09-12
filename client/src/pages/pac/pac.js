import React, { useState, useEffect, useContext } from "react";
import { auth, db, } from "../../config/firebase-config";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { collection, addDoc } from "firebase/firestore";
import { Container, Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, TextField, Button, Select, MenuItem } from "@mui/material";
import './pac.css';
import { StoreContext } from "../../context/storeContext";
import { useAuth } from "../../context/AuthContext";

const expenseList = [
  "Product Sales", "All Net Sales", "Payroll Tax", "Advertising",
  "Base Food", "Employee Meal", "Condiment", "Total Waste", "Paper",
  "Crew Labor", "Management Labor", "Travel", "Adv Other", "Promotion", "Outside Services",
  "Linen", "OP. Supply", "Maint. & Repair", "Small Equipment", "Utilities", "Office", "Cash +/-", "Misc: CR/TR/D&S",
  "Total Controllable", "P.A.C.", "Δ P.A.C. $"
];


const monthToNumber = (m) =>
  ["January","February","March","April","May","June","July","August","September","October","November","December"]
  .indexOf(m) + 1;

const PAC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [month, setMonth] = useState("January");
  const [savedData, setSavedData] = useState({});
  const [projections, setProjections] = useState([]);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - i);
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

  const [actualReport, setActualReport] = useState(null);   // pacGen doc
  const [projectionReport, setProjectionReport] = useState(null); // pacProjections doc


  const { selectedStore } = useContext(StoreContext);
  const [lockInfo, setLockInfo] = useState({ locked: false, lockedAt: null, lockedBy: null });
  const { userRole } = useAuth();

const yyyymm = (y, monthLabel) => y * 100 + monthToNumber(monthLabel);
const nowYYYYMM = (() => {
  const d = new Date();
  return d.getFullYear() * 100 + (d.getMonth() + 1);
})();
const isPastMonth = yyyymm(year, month) < nowYYYYMM;

useEffect(() => {
  if (!selectedStore) { setLockInfo({ locked: false }); return; }
  const id = buildKey(selectedStore, year, month);

  (async () => {
    const snap = await getDoc(doc(db, "pacLocks", id));
    if (snap.exists()) {
      setLockInfo(snap.data());
    } else {
      setLockInfo({ locked: false });
    }
  })();
}, [selectedStore, year, month]);

const lockMonth = async () => {
  if (!selectedStore) return;
  const id = buildKey(selectedStore, year, month);
  await setDoc(
    doc(db, "pacLocks", id),
    {
      locked: true,
      lockedAt: serverTimestamp(),
      lockedBy: auth?.currentUser?.email || "system",
      storeNumber: selectedStore,
      year,
      month,
      monthNumber: monthToNumber(month),
    },
    { merge: true }
  );
  setLockInfo((p) => ({ ...p, locked: true }));
  alert(`${month} ${year} locked.`);
};

const unlockMonth = async () => {
  if (!selectedStore) return;
  const id = buildKey(selectedStore, year, month);
  await setDoc(
    doc(db, "pacLocks", id),
    { locked: false, unlockedAt: serverTimestamp(), unlockedBy: auth?.currentUser?.email || "system" },
    { merge: true }
  );
  setLockInfo((p) => ({ ...p, locked: false }));
  alert(`${month} ${year} unlocked.`);
};
const isLocked = !!lockInfo.locked;



  useEffect(() => {
    document.title = "PAC Pro - PAC";
    console.log(userRole)
  }, []);

  useEffect(() => {
  if (!selectedStore) return;

  const id = buildKey(selectedStore, year, month);

  // Load actual (pacGen)
  getDoc(doc(db, "pacGen", id)).then((snap) => {
    if (snap.exists()) setActualReport(snap.data());
    else setActualReport(null);
  });

  // Load projections (pacProjections)
  getDoc(doc(db, "pacProjections", id)).then((snap) => {
    if (snap.exists()) setProjectionReport(snap.data());
    else setProjectionReport(null);
  });
}, [selectedStore, year, month]);


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

  const calcActualPAC = () => {
  if (!actualReport) return 0;
  const sales = actualReport.ProductNetSales || 0;
  const controllable =
    (actualReport.BaseFood || 0) +
    (actualReport.EmployeeMeal || 0) +
    (actualReport.Condiment || 0) +
    (actualReport.TotalWaste || 0) +
    (actualReport.Paper || 0) +
    (actualReport.CrewLabor || 0) +
    (actualReport.ManagementLabor || 0) +
    (actualReport.PayrollTax || 0) +
    (actualReport.Advertising || 0) +
    (actualReport.Travel || 0) +
    (actualReport.AdvOther || 0) +
    (actualReport.Promotion || 0) +
    (actualReport.OutsideServices || 0) +
    (actualReport.Linen || 0) +
    (actualReport.OPSupply || 0) +
    (actualReport.MaintRepair || 0) +
    (actualReport.SmallEquipment || 0) +
    (actualReport.Utilities || 0) +
    (actualReport.Office || 0) +
    (actualReport.Cash || 0) +
    (actualReport.MiscCRTRDS || 0);

  return sales - controllable;
};

const calcProjectedPAC = () => {
  if (!projectionReport) return 0;
  const pacLine = projectionReport.lines?.find(l => l.name === "P.A.C.");
  return pacLine ? Number(pacLine.projectedDollar || 0) : 0;
};

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




const storeNumber = selectedStore || "";
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
const handleGenerate = async () => {
  try {
    // Require a selected store
    if (!selectedStore) {
      alert("Please select a store before generating the report.");
      return;
    }
    if (lockInfo.locked) {
      alert("This month is locked. Ask an admin to unlock it to make changes.");
      return;
    }

    // Build deterministic doc ID: <store>_<year>_<MM>
    const mNum = monthToNumber(month); // 1..12 (you already have this helper)
    const safeStore = String(selectedStore).replace(/\s+/g, "_");
    const docId = `${safeStore}_${year}_${String(mNum).padStart(2, "0")}`;

    const reportRef = doc(db, "pacGen", docId);

    // Prepare payload (ensure numbers are stored as numbers)
    const payload = {
      storeNumber: selectedStore,
      month,                  // e.g. "January"
      monthNumber: mNum,      // 1..12 for sorting/filtering
      year,                   // e.g. 2025
      createdAt: serverTimestamp(),

      ProductNetSales: parseFloat(productNetSales) || 0,
      Cash: parseFloat(cash) || 0,
      Promo: parseFloat(promo) || 0,
      AllNetSales: parseFloat(allNetSales) || 0,
      Advertising: parseFloat(advertising) || 0,

      CrewLabor: parseFloat(crewLabor) || 0,
      TotalLabor: parseFloat(totalLabor) || 0,
      PayrollTax: parseFloat(payrollTax) || 0,

      CompleteWaste: parseFloat(completeWaste) || 0,
      RawWaste: parseFloat(rawWaste) || 0,
      Condiment: parseFloat(condiment) || 0,
      Variance: parseFloat(variance) || 0,
      Unexplained: parseFloat(unexplained) || 0,
      Discounts: parseFloat(discounts) || 0,
      BaseFood: parseFloat(baseFood) || 0,

      StartingFood: parseFloat(startingFood) || 0,
      StartingCondiment: parseFloat(startingCondiment) || 0,
      StartingPaper: parseFloat(startingPaper) || 0,
      StartingNonProduct: parseFloat(startingNonProduct) || 0,
      StartingOpsSupplies: parseFloat(startingOpsSupplies) || 0,

      EndingFood: parseFloat(endingFood) || 0,
      EndingCondiment: parseFloat(endingCondiment) || 0,
      EndingPaper: parseFloat(endingPaper) || 0,
      EndingNonProduct: parseFloat(endingNonProduct) || 0,
      EndingOpsSupplies: parseFloat(endingOpsSupplies) || 0,
    };

    await setDoc(reportRef, payload);
    alert("Report generated successfully.");
  } catch (err) {
    console.error("Error saving report:", err);
    alert("Failed to generate.");
  }
};
const buildKey = (store, year, monthLabel) => {
  const mNum = monthToNumber(monthLabel); // 1..12
  const safeStore = String(store).replace(/\s+/g, "_");
  return `${safeStore}_${year}_${String(mNum).padStart(2, "0")}`;
};

const handleApplyProjections = async () => {
  if (!selectedStore) { alert("Select a store first."); return; }
  if (lockInfo.locked) {
  alert("This month is locked. Ask an admin to unlock it to make changes.");
  return;
}

  const id = buildKey(selectedStore, year, month);
  const ref = doc(db, "pacProjections", id);

  // Save only what you need; here we save the whole projections array
  await setDoc(ref, {
    storeNumber: selectedStore,
    month,
    monthNumber: monthToNumber(month),
    year,
    updatedAt: serverTimestamp(),
    lines: projections, // [{ name, projectedDollar, projectedPercent, ... }]
  });

  alert("Projections saved.");


};
useEffect(() => {
    if (!actualReport) {
      // reset if nothing in DB
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
      return;
  }
 setProductNetSales(actualReport.ProductNetSales ?? 0);
  setCash(actualReport.Cash ?? 0);
  setPromo(actualReport.Promo ?? 0);
  setAllNetSales(actualReport.AllNetSales ?? 0);
  setAdvertising(actualReport.Advertising ?? 0);

  setCrewLabor(actualReport.CrewLabor ?? 0);
  setTotalLabor(actualReport.TotalLabor ?? 0);
  setPayrollTax(actualReport.PayrollTax ?? 0);

  setCompleteWaste(actualReport.CompleteWaste ?? 0);
  setRawWaste(actualReport.RawWaste ?? 0);
  setCondiment(actualReport.Condiment ?? 0);
  setVariance(actualReport.Variance ?? 0);
  setUnexplained(actualReport.Unexplained ?? 0);
  setDiscounts(actualReport.Discounts ?? 0);
  setBaseFood(actualReport.BaseFood ?? 0);

  setStartingFood(actualReport.StartingFood ?? 0);
  setStartingCondiment(actualReport.StartingCondiment ?? 0);
  setStartingPaper(actualReport.StartingPaper ?? 0);
  setStartingNonProduct(actualReport.StartingNonProduct ?? 0);
  setStartingOpsSupplies(actualReport.StartingOpsSupplies ?? 0);

  setEndingFood(actualReport.EndingFood ?? 0);
  setEndingCondiment(actualReport.EndingCondiment ?? 0);
  setEndingPaper(actualReport.EndingPaper ?? 0);
  setEndingNonProduct(actualReport.EndingNonProduct ?? 0);
  setEndingOpsSupplies(actualReport.EndingOpsSupplies ?? 0);
}, [actualReport]);

useEffect(() => {
  if (projectionReport?.lines?.length) {
    setProjections(projectionReport.lines);
  } else {
    // fall back to your default builder
    const hist = getHistoricalData();
    setProjections(expenseList.map(name => {
      const h = hist.find(e => e.name === name) || {};
      return {
        name,
        projectedDollar: "",
        projectedPercent: "",
        estimatedDollar: h.historicalDollar || "-",
        estimatedPercent: h.historicalPercent || "-",
        historicalDollar: h.historicalDollar || "-",
        historicalPercent: h.historicalPercent || "-"
      };
    }));
  }
}, [projectionReport]);
const inputsDisabled = !!lockInfo.locked;






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
            <Button variant="contained" onClick={handleApplyProjections} disabled={inputsDisabled}>Apply</Button>
          </div>
        </div>
      </div>
      {isPastMonth && (userRole || "").toLowerCase() === "admin" && (
      <div style={{ marginLeft: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, opacity: 0.8 }}>
          Status: {isLocked ? "Locked" : "Editable"}
        </span>

        {isLocked ? (
          <Button variant="outlined" color="warning" onClick={unlockMonth}>
            Unlock Month
          </Button>
        ) : (
          <Button variant="outlined" color="error" onClick={lockMonth}>
            Lock Month
          </Button>
        )}
      </div>
    )}

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
                    <TextField size="small" variant="outlined" value={expense.projectedDollar} onChange={(e) => handleInputChange(index, "projectedDollar", e.target.value)} disabled={inputsDisabled} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" variant="outlined" value={expense.projectedPercent} onChange={(e) => handleInputChange(index, "projectedPercent", e.target.value)} disabled={inputsDisabled} />
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
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Cash +/- ($)</label>
              <input
                type="number"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Promo ($)</label>
              <input
                type="number"
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">All Net Sales ($)</label>
              <input
                type="number"
                value={allNetSales}
                onChange={(e) => setAllNetSales(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Advertising ($)</label>
              <input
                type="number"
                value={advertising}
                onChange={(e) => setAdvertising(e.target.value)}
                disabled={inputsDisabled}
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
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Total Labor %</label>
              <input
                type="number"
                value={totalLabor}
                onChange={(e) => setTotalLabor(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Payroll Tax ($)</label>
              <input
                type="number"
                value={payrollTax}
                onChange={(e) => setPayrollTax(e.target.value)}
                disabled={inputsDisabled}
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
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Raw Waste %</label>
              <input
                type="number"
                value={rawWaste}
                onChange={(e) => setRawWaste(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Condiment %</label>
              <input
                type="number"
                value={condiment}
                onChange={(e) => setCondiment(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Variance Stat %</label>
              <input
                type="number"
                value={variance}
                onChange={(e) => setVariance(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Unexplained %</label>
              <input
                type="number"
                value={unexplained}
                onChange={(e) => setUnexplained(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Discounts %</label>
              <input
                type="number"
                value={discounts}
                onChange={(e) => setDiscounts(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Base Food %</label>
              <input
                type="number"
                value={baseFood}
                onChange={(e) => setBaseFood(e.target.value)}
                disabled={inputsDisabled}
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
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Condiment ($)</label>
              <input
                type="number"
                value={startingCondiment}
                onChange={(e) => setStartingCondiment(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Paper ($)</label>
              <input
                type="number"
                value={startingPaper}
                onChange={(e) => setStartingPaper(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Non Product ($)</label>
              <input
                type="number"
                value={startingNonProduct}
                onChange={(e) => setStartingNonProduct(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label"> Office Supplies ($)</label>
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
            <div className="input-row"><label className="input-label">Food ($)</label>
              <input
                type="number"
                value={endingFood}
                onChange={(e) => setEndingFood(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Condiment ($)</label>
              <input
                type="number"
                value={endingCondiment}
                onChange={(e) => setEndingCondiment(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Paper ($)</label>
              <input
                type="number"
                value={endingPaper}
                onChange={(e) => setEndingPaper(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label">Non Product ($)</label>
              <input
                type="number"
                value={endingNonProduct}
                onChange={(e) => setEndingNonProduct(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
            <div className="input-row"><label className="input-label"> Office Supplies ($)</label>
              <input
                type="number"
                value={endingOpsSupplies}
                onChange={(e) => setEndingOpsSupplies(e.target.value)}
                disabled={inputsDisabled}
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
            disabled={inputsDisabled}
          >
            Generate Report
          </Button>


        </div>
      )}  {/* end of Generate page */}

{tabIndex === 2 && (
  <div style={{ marginTop: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
      <h3>{storeNumber || "Select a store"} - {month} {new Date().getFullYear()}</h3>
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
            <TableRow
              sx={{
                backgroundColor:
                  calcActualPAC() >= calcProjectedPAC()
                    ? "rgba(0, 255, 0, 0.1)"
                    : "rgba(255, 0, 0, 0.1)",
                fontWeight: "bold",
              }}
            >
              <TableCell><strong>P.A.C.</strong></TableCell>

              {/* Actual $ */}
              <TableCell align="right">
                {calcActualPAC().toFixed(2)}
              </TableCell>

              {/* Actual % */}
              <TableCell align="right">
                {actualReport
                  ? ((calcActualPAC() / (actualReport.ProductNetSales || 1)) * 100).toFixed(2) + "%"
                  : "-"}
              </TableCell>

              {/* Projected $ */}
              <TableCell align="right">
                {calcProjectedPAC().toFixed(2)}
              </TableCell>

              {/* Projected % */}
              <TableCell align="right">
                {projectionReport
                  ? ((calcProjectedPAC() / (projectionReport.lines?.find(l => l.name === "Product Sales")?.projectedDollar || 1)) * 100).toFixed(2) + "%"
                  : "-"}
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

import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase-config";
import { collection, addDoc } from "firebase/firestore";
import { Container, Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, TextField, Button, Select, MenuItem } from "@mui/material";
import './pac.css';

const expenseList = [
  "Product Sales", "All Net Sales", "Payroll Tax", "Advertising",
  "Base Food", "Employee Meal", "Condiment", "Total Waste", "Paper",
  "Crew Labor", "Management Labor", "Travel", "Adv Other", "Promotion", "Outside Services",
  "Linen", "OP. Supply", "Maint. & Repair", "Small Equipment", "Utilities", "Office", "Cash +/-", "Misc: CR/TR/D&S",
  "Total Controllable", "P.A.C.", "Δ P.A.C. $"
];

const PAC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [month, setMonth] = useState("January");
  const [savedData, setSavedData] = useState({});
  const [projections, setProjections] = useState([]);

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

  const [endingFood, setEndingFood] = useState(0);
  const [endingCondiment, setEndingCondiment] = useState(0);
  const [endingPaper, setEndingPaper] = useState(0);
  const [endingNonProduct, setEndingNonProduct] = useState(0);



  useEffect(() => {
    document.title = "PAC Pro - PAC";
  }, []);

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

      !endingFood ||
      !endingCondiment ||
      !endingPaper ||
      !endingNonProduct
    ) {
      alert("You must fill out all fields before submitting.");
    }

    else {
      try {
        await addDoc(pacGenRef, {
          ProductNetSales: productNetSales,
          Cash: cash,
          Promo: promo,
          AllNetSales: allNetSales,
          Advertising: advertising,

          CrewLabor: crewLabor,
          TotalLabor: totalLabor,
          PayrollTax: payrollTax,

          CompleteWaste: completeWaste,
          RawWaste: rawWaste,
          Condiment: condiment,
          Variance: variance,
          Unexplained: unexplained,
          Discounts: discounts,
          BaseFood: baseFood,

          StartingFood: startingFood,
          StartingCondiment: startingCondiment,
          StartingPaper: startingPaper,
          StartingNonProduct: startingNonProduct,

          EndingFood: endingFood,
          EndingCondiment: endingCondiment,
          EndingPaper: endingPaper,
          EndingNonProduct: endingNonProduct
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
            <Select value={month} onChange={(e) => setMonth(e.target.value)} sx={{ width: 200, marginRight: 2 }}>
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
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
          </div>

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



    </Container>
  );
};

export default PAC;

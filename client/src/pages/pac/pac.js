import React, { useState, useEffect } from "react";
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
      )}
    </Container>
  );
};

export default PAC;

import React, { useEffect, useState } from "react";
import { Container } from "@mui/material";
import "./invoiceLogs.css";

const InvoiceLogs = () => {
  const [data, setData] = useState(null);
  const [activeSearchColumn, setActiveSearchColumn] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    column: null,
    direction: "asc",
  });
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const monetaryColumns = [
    "FOOD",
    "CONDIMENT",
    "PAPER",
    "NON PROD",
    "TRAVEL",
    "ADV-OTHER",
    "PROMO",
    "OUTSIDE SVC",
    "LINEN",
    "OP. SUPPLY",
    "M+R",
    "SML EQUIP",
    "UTILITIES",
    "OFFICE",
    "TRAINING",
    "CR",
  ];

  useEffect(() => {
    fetch("/InvoiceLogTest.json")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((error) => console.error("Error loading data:", error));
  }, []);

  const handleSort = (column) => {
    let direction = "asc";
    if (sortConfig.column === column && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ column, direction });
  };

  const handleHeaderClick = (column) => {
    if (column === "Company Name" || column === "Invoice Number") {
      setActiveSearchColumn(
        column === "Company Name" ? "companyName" : "invoiceNumber"
      );
      setSearchQuery("");
    }
    handleSort(column);
  };

  const filterInvoices = (invoices) => {
    return invoices.filter((row) => {
      let include = true;
      if (activeSearchColumn && searchQuery.trim() !== "") {
        include =
          row[activeSearchColumn] &&
          row[activeSearchColumn]
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
      }
      if (include && (selectedMonth || selectedYear)) {
        const dt = new Date(row.dateSubmitted);
        const month = dt.getMonth() + 1;
        const year = dt.getFullYear();
        if (selectedMonth) {
          include = include && month === parseInt(selectedMonth);
        }
        if (selectedYear) {
          include = include && year === parseInt(selectedYear);
        }
      }
      return include;
    });
  };

  const renderHeader = () => {
    if (!data) return null;
    const fixedHeaders = [
      "Location",
      "Date Submitted",
      "Invoice Date",
      "Company Name",
      "Invoice Number",
    ];
    const headers = [...fixedHeaders, ...monetaryColumns];
    return (
      <tr>
        {headers.map((name, j) => (
          <th
            key={j}
            className="tableHeader"
            onClick={() => handleHeaderClick(name)}
            style={{ cursor: "pointer" }}
          >
            {name}
            {sortConfig.column === name &&
              (sortConfig.direction === "asc" ? " ▲" : " ▼")}
          </th>
        ))}
      </tr>
    );
  };

  const sortInvoices = (invoices) => {
    if (!sortConfig.column) return invoices;
    return [...invoices].sort((a, b) => {
      let aVal, bVal;
      const col = sortConfig.column;
      if (col === "Location") {
        aVal = data.location || "12345";
        bVal = data.location || "12345";
      } else if (col === "Date Submitted") {
        aVal = new Date(a.dateSubmitted);
        bVal = new Date(b.dateSubmitted);
      } else if (col === "Invoice Date") {
        aVal = new Date(a.invoiceDate);
        bVal = new Date(b.invoiceDate);
      } else if (col === "Company Name") {
        aVal = (a.companyName || "").toLowerCase();
        bVal = (b.companyName || "").toLowerCase();
      } else if (col === "Invoice Number") {
        aVal = parseInt(a.invoiceNumber);
        bVal = parseInt(b.invoiceNumber);
      } else if (monetaryColumns.includes(col)) {
        aVal = (a[col] || []).reduce((acc, cur) => acc + cur, 0);
        bVal = (b[col] || []).reduce((acc, cur) => acc + cur, 0);
      } else {
        aVal = a[col];
        bVal = b[col];
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const renderInvoiceRows = () => {
    if (!data) return null;
    const filteredInvoices = filterInvoices(data.invoices);
    const sortedInvoices = sortInvoices(filteredInvoices);
    const loc = data.location || "12345";
    return sortedInvoices.map((row, i) => {
      const fixedCells = (
        <>
          <td className="tableCell">{loc}</td>
          <td className="tableCell">{row.dateSubmitted}</td>
          <td className="tableCell">{row.invoiceDate}</td>
          <td className="tableCell">{row.companyName}</td>
          <td className="tableCell">{row.invoiceNumber}</td>
        </>
      );
      const monetaryCells = monetaryColumns.map((col, j) => {
        const values = row[col] || [];
        const sum = values.reduce((acc, value) => acc + value, 0);
        return (
          <td key={j} className="tableCell">
            {sum === 0
              ? ""
              : sum.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
          </td>
        );
      });
      return (
        <tr key={i}>
          {fixedCells}
          {monetaryCells}
        </tr>
      );
    });
  };

  const renderSummaryRows = () => {
    if (!data) return null;
    const totalRow = data.total;
    const budgetRow = data.budget;

    const totalCells = (
      <>
        <td
          className="tableCell"
          colSpan="5"
          style={{ textAlign: "center", fontWeight: "bold" }}
        >
          TOTAL
        </td>
        {monetaryColumns.map((col, i) => {
          const value = totalRow[col] || 0;
          return (
            <td
              key={i}
              className="tableCell summaryCell"
              style={{ fontWeight: "bold", color: "black" }}
            >
              {value.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </td>
          );
        })}
      </>
    );

    const budgetCells = (
      <>
        <td
          className="tableCell"
          colSpan="5"
          style={{ textAlign: "center", fontWeight: "bold" }}
        >
          BUDGET
        </td>
        {monetaryColumns.map((col, i) => (
          <td
            key={i}
            className="tableCell summaryCell"
            style={{ fontWeight: "bold" }}
          >
            {budgetRow[col].toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </td>
        ))}
      </>
    );

    const differenceCells = (
      <>
        <td
          className="tableCell"
          colSpan="5"
          style={{ textAlign: "center", fontWeight: "bold" }}
        >
          Difference
        </td>
        {monetaryColumns.map((col, i) => {
          const totalValue = totalRow[col] || 0;
          const budgetValue = budgetRow[col] || 0;
          const diff = budgetValue - totalValue;
          return (
            <td
              key={i}
              className="tableCell summaryCell"
              style={{ fontWeight: "bold", color: diff >= 0 ? "green" : "red" }}
            >
              {diff.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </td>
          );
        })}
      </>
    );
    return (
      <>
        <tr className="summaryRow">{totalCells}</tr>
        <tr className="summaryRow">{budgetCells}</tr>
        <tr className="summaryRow">{differenceCells}</tr>
      </>
    );
  };

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];
  const years = [
    { value: "2023", label: "2023" },
    { value: "2024", label: "2024" },
    { value: "2025", label: "2025" },
  ];

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{ marginTop: "20px", paddingX: "20px" }}
    >
      <div className="topBar">
        <h1 className="Header">Invoice Log</h1>
        <div className="topBarControls">
          <div className="filterDropdowns">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All Months</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">All Years</option>
              {years.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
          </div>
          <button className="printButton" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>
      {activeSearchColumn && (
        <div className="searchBox">
          <label>
            Search{" "}
            {activeSearchColumn === "companyName"
              ? "Company Name"
              : "Invoice Number"}
            :
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            onClick={() => {
              setActiveSearchColumn(null);
              setSearchQuery("");
            }}
          >
            Clear
          </button>
        </div>
      )}
      <div className="contentWrapper">
        <table className="customTable">
          <thead>{renderHeader()}</thead>
          <tbody>
            {renderInvoiceRows()}
            {renderSummaryRows()}
          </tbody>
        </table>
        <div className="otherBlock">
          <h2 className="subHeader">Other Food Components</h2>
          <table className="otherTable">
            <thead>
              <tr>
                <th className="tableHeader">Component</th>
                <th className="tableHeader">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="tableCell">Component A</td>
                <td className="tableCell">$1,000.00</td>
              </tr>
              <tr>
                <td className="tableCell">Component B</td>
                <td className="tableCell">$2,000.00</td>
              </tr>
              <tr>
                <td className="tableCell">Component C</td>
                <td className="tableCell">$3,000.00</td>
              </tr>
              <tr>
                <td className="tableCell">Component D</td>
                <td className="tableCell">$4,000.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Container>
  );
};

export default InvoiceLogs;

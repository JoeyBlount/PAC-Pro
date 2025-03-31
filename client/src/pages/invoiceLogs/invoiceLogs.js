import React, { useEffect, useState, useContext } from "react";
import { Container } from "@mui/material";
import "./invoiceLogs.css";
// Import Firebase Firestore functions and your db instance
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase-config";
// Import global store context
import { StoreContext } from "../../context/storeContext";

// List of monetary columns as before
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

const InvoiceLogs = () => {
  // Set page title
  useEffect(() => {
    document.title = "PAC Pro - Invoice Logs";
  }, []);

  // Local state for invoice data and UI interactions
  const [data, setData] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeSearchColumn, setActiveSearchColumn] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    column: null,
    direction: "asc",
  });
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  // Get the selected store from the global StoreContext
  const { selectedStore } = useContext(StoreContext);

  // Instead of fetching from a JSON file, fetch invoices from Firestore whenever the selected store changes.
  useEffect(() => {
    if (!selectedStore) {
      setData(null);
      return;
    }

    const fetchInvoices = async () => {
      try {
        // Query invoices collection where the "storeId" matches the selected store.
        const q = query(
          collection(db, "invoices"),
          where("storeId", "==", selectedStore)
        );
        const querySnapshot = await getDocs(q);
        const invoices = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // For demonstration, compute dummy totals and budgets.
        // In your real app, you may have these stored separately or computed dynamically.
        const computedTotal = {};
        monetaryColumns.forEach((col) => {
          computedTotal[col] = invoices.reduce((acc, curr) => {
            // Assume each invoice has the monetary column stored as an array (or adjust as needed)
            const values = curr[col] || [];
            return acc + values.reduce((sum, num) => sum + num, 0);
          }, 0);
        });
        const computedBudget = {};
        monetaryColumns.forEach((col) => {
          computedBudget[col] = 1000; // Dummy value; replace with your logic or stored budget data.
        });

        // You might also have a location stored on the store document; here we set a dummy value.
        setData({
          invoices,
          total: computedTotal,
          budget: computedBudget,
          location: "Store Location", // Replace with actual store location if available
        });
      } catch (error) {
        console.error("Error loading invoices: ", error);
      }
    };

    fetchInvoices();
  }, [selectedStore]);

  // Handler for selecting an invoice row.
  const handleInvoiceSelect = (invoice) => {
    if (selectedInvoice?.invoiceNumber === invoice.invoiceNumber) {
      setSelectedInvoice(null);
    } else {
      setSelectedInvoice(invoice);
    }
  };

  // Print function remains unchanged.
  const handlePrint = () => {
    if (!selectedInvoice) {
      alert("Please select an invoice to print.");
      return;
    }
    const printWindow = window.open("", "_blank");
    printWindow.document.write(
      `<html><head><title>Invoice ${selectedInvoice.invoiceNumber}</title></head><body>`
    );
    printWindow.document.write(
      `<h2>Invoice Number: ${selectedInvoice.invoiceNumber}</h2>`
    );
    printWindow.document.write(`<p>Location: ${data?.location || ""}</p>`);
    printWindow.document.write(
      `<p>Company Name: ${selectedInvoice.companyName}</p>`
    );
    printWindow.document.write(
      `<p>Date Submitted: ${selectedInvoice.dateSubmitted}</p>`
    );
    printWindow.document.write(
      `<p>Invoice Date: ${selectedInvoice.invoiceDate}</p>`
    );
    printWindow.document.write(`<p>Amount: ${selectedInvoice.totalAmount}</p>`);
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  // Sorting & search logic remains similar to your original code.
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
      "Select",
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
        aVal = data.location || "";
        bVal = data.location || "";
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
        // Assume each monetary column is stored as an array of numbers
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
    if (!data)
      return (
        <tr>
          <td colSpan={monetaryColumns.length + 6}>
            {selectedStore ? "No invoices found." : "Please select a store."}
          </td>
        </tr>
      );
    const filteredInvoices = filterInvoices(data.invoices);
    const sortedInvoices = sortInvoices(filteredInvoices);
    const loc = data.location || "";
    return sortedInvoices.map((row, i) => {
      const fixedCells = (
        <>
          <td>
            <input
              type="checkbox"
              checked={selectedInvoice?.invoiceNumber === row.invoiceNumber}
              onChange={() => handleInvoiceSelect(row)}
            />
          </td>
          <td className="tableCell">{loc}</td>
          <td className="tableCell">{row.dateSubmitted}</td>
          <td className="tableCell">{row.invoiceDate}</td>
          <td className="tableCell">{row.companyName}</td>
          <td className="tableCell">{row.invoiceNumber}</td>
        </>
      );
      const monetaryCells = monetaryColumns.map((col, j) => {
        // Assume that each invoice's monetary column is stored as an array of numbers.
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
            <button onClick={handlePrint}>Print Selected Invoice</button>
          </div>
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
      </div>
    </Container>
  );
};

export default InvoiceLogs;

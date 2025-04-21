import React, { useEffect, useState, useContext } from "react";
import {
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from "@mui/material";
import { ZoomIn, ZoomOut, GetApp, Close } from "@mui/icons-material";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./invoiceLogs.css";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase-config";
import { StoreContext } from "../../context/storeContext";

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
  useEffect(() => {
    document.title = "PAC Pro - Invoice Logs";
  }, []);

  // Local state
  const [data, setData] = useState(null);
  const [activeSearchColumn, setActiveSearchColumn] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    column: null,
    direction: "asc",
  });
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // New state for invoice details dialog
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceImage, setInvoiceImage] = useState(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  // Global store
  const { selectedStore } = useContext(StoreContext);

  // Fetch invoices from Firestore
  useEffect(() => {
    if (!selectedStore) {
      setData(null);
      return;
    }
    const fetchInvoices = async () => {
      try {
        const q = query(
          collection(db, "invoices"),
          where("storeId", "==", selectedStore)
        );
        const querySnapshot = await getDocs(q);
        const invoices = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Compute totals directly from top-level monetary fields
        const computedTotal = {};
        monetaryColumns.forEach((col) => {
          computedTotal[col] = invoices.reduce((acc, curr) => {
            const catValue = curr[col] != null ? curr[col] : 0;
            const values = Array.isArray(catValue) ? catValue : [catValue];
            return acc + values.reduce((sum, num) => sum + Number(num), 0);
          }, 0);
        });
        const computedBudget = {};
        monetaryColumns.forEach((col) => {
          computedBudget[col] = 1000;
        });
        setData({
          invoices,
          total: computedTotal,
          budget: computedBudget,
        });
      } catch (error) {
        console.error("Error loading invoices: ", error);
      }
    };
    fetchInvoices();
  }, [selectedStore]);

  // Export functions for full table export
  const handleExportPDF = async () => {
    try {
      const tableElem = document.querySelector(".contentWrapper .customTable");
      if (!tableElem) return;
      const canvas = await html2canvas(tableElem);
      const imgData = canvas.toDataURL("image/png");
      // Create jsPDF with landscape orientation
      const pdf = new jsPDF({ orientation: "landscape" });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("invoices.pdf");
    } catch (error) {
      console.error("Error exporting PDF:", error);
    }
    setExportDialogOpen(false);
  };

  const handleExportExcel = () => {
    const tableElem = document.querySelector(".contentWrapper .customTable");
    if (!tableElem) return;
    const escapeCSV = (value) => {
      return `"${String(value).replace(/"/g, '""')}"`;
    };
    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = [];
    tableElem.querySelectorAll("thead th").forEach((th) => {
      headers.push(escapeCSV(th.textContent.trim()));
    });
    csvContent += headers.join(",") + "\n";
    tableElem.querySelectorAll("tbody tr").forEach((tr) => {
      const rowData = [];
      tr.querySelectorAll("td").forEach((td) => {
        rowData.push(escapeCSV(td.textContent.trim()));
      });
      csvContent += rowData.join(",") + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "invoices.csv");
    document.body.appendChild(link);
    link.click();
    setExportDialogOpen(false);
  };

  // Handler for clicking an invoice row:
  // Now use imageUrl field from the invoice DB entry.
  const handleRowClick = (invoice) => {
    setSelectedInvoice(invoice);
    // Use the field "imageUrl" from the invoice object.
    setInvoiceImage(invoice.imageUrl || null);
    setInvoiceDialogOpen(true);
  };

  // Export the invoice image as PDF from the dialog
  const handleExportInvoicePDF = async () => {
    if (!invoiceImage) return;
    try {
      const img = new Image();
      img.crossOrigin = "anonymous"; // <-- Added this line
      img.src = invoiceImage;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape" });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${selectedInvoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error("Error exporting invoice PDF:", error);
    }
  };

  // Table rendering functions
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
        aVal = a.storeId;
        bVal = b.storeId;
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
        aVal = Array.isArray(a[col])
          ? a[col].reduce((acc, cur) => acc + cur, 0)
          : a[col] || 0;
        bVal = Array.isArray(b[col])
          ? b[col].reduce((acc, cur) => acc + cur, 0)
          : b[col] || 0;
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
          <td colSpan={monetaryColumns.length + 5}>
            {selectedStore ? "No invoices found." : "Please select a store."}
          </td>
        </tr>
      );
    const filteredInvoices = filterInvoices(data.invoices);
    const sortedInvoices = sortInvoices(filteredInvoices);
    return sortedInvoices.map((row, i) => {
      const fixedCells = (
        <>
          <td className="tableCell">{row.storeId}</td>
          <td className="tableCell" style={{ whiteSpace: "nowrap" }}>
            {new Date(row.dateSubmitted).toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
            })}
          </td>
          <td className="tableCell" style={{ whiteSpace: "nowrap" }}>
            {new Date(row.invoiceDate).toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
            })}
          </td>
          <td className="tableCell">{row.companyName}</td>
          <td className="tableCell">{row.invoiceNumber}</td>
        </>
      );

      const monetaryCells = monetaryColumns.map((col, j) => {
        const catValue = row[col] != null ? row[col] : 0;
        const values = Array.isArray(catValue) ? catValue : [catValue];
        const sum = values.reduce((acc, value) => acc + Number(value), 0);
        const rounded = Math.round(sum);
        return (
          <td key={j} className="tableCell">
            {rounded.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </td>
        );
      });
      return (
        <tr
          key={i}
          className="invoice-row"
          style={{ cursor: "pointer" }}
          onClick={() => handleRowClick(row)}
        >
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
          const rounded = Math.round(value);
          return (
            <td
              key={i}
              className="tableCell summaryCell"
              style={{ fontWeight: "bold", color: "black" }}
            >
              {rounded.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
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
        {monetaryColumns.map((col, i) => {
          const rounded = Math.round(budgetRow[col]);
          return (
            <td
              key={i}
              className="tableCell summaryCell"
              style={{ fontWeight: "bold" }}
            >
              {rounded.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </td>
          );
        })}
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
          const rounded = Math.round(diff);
          return (
            <td
              key={i}
              className="tableCell summaryCell"
              style={{
                fontWeight: "bold",
                color: rounded >= 0 ? "green" : "red",
              }}
            >
              {rounded.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
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

  // Invoice details dialog (for photo display)
  const InvoiceDialog = () => (
    <Dialog
      open={invoiceDialogOpen}
      onClose={() => setInvoiceDialogOpen(false)}
      maxWidth="lg"
    >
      <DialogTitle>
        Invoice {selectedInvoice?.invoiceNumber}
        <IconButton
          style={{ position: "absolute", right: 10, top: 10 }}
          onClick={() => setInvoiceDialogOpen(false)}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {invoiceImage ? (
          <img
            src={invoiceImage}
            alt={`Invoice ${selectedInvoice.invoiceNumber}`}
            style={{ width: "100%", whiteSpace: "nowrap" }}
          />
        ) : (
          <p>Loading image...</p>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleExportInvoicePDF} color="primary">
          Export as PDF
        </Button>
        <Button onClick={() => setInvoiceDialogOpen(false)} color="secondary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

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

  const ExportDialog = () => (
    <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
      <DialogTitle>Export Invoices</DialogTitle>
      <DialogContent>
        <p>Select an export option:</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleExportExcel} color="secondary">
          Export as Excel
        </Button>
        <Button onClick={handleExportPDF} color="primary">
          Export as PDF
        </Button>
      </DialogActions>
    </Dialog>
  );

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
            <Button
              variant="contained"
              color="primary"
              onClick={() => setExportDialogOpen(true)}
              startIcon={<GetApp />}
            >
              Export
            </Button>
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
      <ExportDialog />
      <InvoiceDialog />
    </Container>
  );
};

export default InvoiceLogs;

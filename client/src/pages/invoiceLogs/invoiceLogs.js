import React, { useEffect, useState, useContext, useRef } from "react";
import {
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from "@mui/material";
import { GetApp, Close } from "@mui/icons-material";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./invoiceLogs.css";
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase-config";
import { StoreContext } from "../../context/storeContext";
import { getAuth } from "firebase/auth";
import { useAuth } from "../../context/AuthContext";

const InvoiceLogs = () => {
  // const { currentUser, userRole } = useAuth();
  // console.log("Logged in user:", currentUser?.email);
  // console.log("User role:", userRole);


  useEffect(() => {
    document.title = "PAC Pro - Invoice Logs";
  }, []);

  // Local state
  const [data, setData] = useState(null);
  // Invoice categories (monetary columns) are pulled from Firestore collection "invoiceCategories"
  const [monetaryColumns, setMonetaryColumns] = useState([]);
  const [activeSearchColumn, setActiveSearchColumn] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    column: null,
    direction: "asc",
  });
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Invoice dialog state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceImage, setInvoiceImage] = useState(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  // Global store
  const { selectedStore } = useContext(StoreContext);

  //editing invoice data
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  //useState(null);
  const [editInvoiceData, setEditInvoiceData] = useState(null);

  // Helper function to get a category amount from an invoice.
  // It now reads from the top-level of the invoice document using field.
  const getCategoryValue = (inv, categoryId) => {
    // Check if invoice has categories map
    if (!inv?.categories) return 0;

    // Get the array for this category using the categoryId
    const categoryArray = inv.categories[categoryId];

    // If the array exists, sum all the numbers in it
    if (Array.isArray(categoryArray)) {
      return categoryArray.reduce((sum, num) => sum + (Number(num) || 0), 0);
    }

    return 0;
  };

//this function makes sure we can only edit/delete the current month in the invoice. 
  const isCurrentMonth = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  };
  const handleDelete = async (invoiceId) => {
    const confirm = window.confirm("Are you sure you want to delete this invoice?");
    if (!confirm) return;
    try {
      await deleteDoc(doc(db, "invoices", invoiceId));
      alert("Invoice deleted.");
      // Refresh invoices
      setData(prev => ({
        ...prev,
        invoices: prev.invoices.filter(inv => inv.id !== invoiceId),
      }));
    } catch (err) {
      console.error("Failed to delete invoice:", err);
      alert("Error deleting invoice.");
    }
  };
  
  const handleEdit = (invoice) => {
    setEditInvoiceData({ ...invoice }); // clone it so we can modify safely
    setEditDialogOpen(true);
  };


  const submitEdit = async (updatedInvoice) => {
    try {
      const invoiceRef = doc(db, "invoices", updatedInvoice.id);
      const { id, ...invoiceDataToUpdate } = updatedInvoice;
      await updateDoc(invoiceRef, invoiceDataToUpdate);
      alert("Invoice updated successfully!");
      setEditDialogOpen(false);
      fetchInvoices(); // refresh from Firestore
    } catch (error) {
      console.error("Error updating invoice:", error);
      alert("Failed to update invoice.");
    }
  };
  
  

  // Fetch invoice categories from "invoiceCategories" collection
  useEffect(() => {
    async function fetchMonetaryColumns() {
      try {
        const q = query(collection(db, "invoiceCategories"));
        const snapshot = await getDocs(q);
        const columns = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(), // Expect each doc to have fields: name, bankAccountNum, etc.
        }));
        setMonetaryColumns(columns);
      } catch (error) {
        console.error("Error fetching category columns:", error);
      }
    }
    fetchMonetaryColumns();
  }, []);

  // Fetch invoices from Firestore
  useEffect(() => {
    if (selectedStore && monetaryColumns.length > 0) {
      fetchInvoices();
    }
  }, [selectedStore, monetaryColumns]);

  async function fetchInvoices() {
    try {
      const q = query(
        collection(db, "invoices"),
        where("storeID", "==", selectedStore)
      );
      const snapshot = await getDocs(q);
      const invoices = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Compute totals using the category amounts stored in the categories map.
      const totals = {};
      monetaryColumns.forEach((col) => {
        const categoryId = col.id; // This matches the document ID from invoiceCategories
        totals[categoryId] = invoices.reduce((sum, inv) => {
          return sum + getCategoryValue(inv, categoryId);
        }, 0);
      });

      // Use each invoiceCategories doc's budget field for the budget row.
      const budgets = {};
      monetaryColumns.forEach((col) => {
        budgets[col.id] = Number(col.budget) || 0;
      });

      setData({ invoices, total: totals, budget: budgets });
    } catch (err) {
      console.error("Error loading invoices:", err);
    }
  }

  // Export functions remain unchanged
  const handleExportPDF = async () => {
    const table = document.querySelector(".contentWrapper .customTable");
    if (!table) return;
    const canvas = await html2canvas(table);
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape" });
    const props = pdf.getImageProperties(img);
    const w = pdf.internal.pageSize.getWidth();
    const h = (props.height * w) / props.width;
    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save("invoices.pdf");
    setExportDialogOpen(false);
  };

  const handleExportExcel = () => {
    const table = document.querySelector(".contentWrapper .customTable");
    if (!table) return;
    const escapeCSV = (v) => `"${String(v).replace(/"/g, '""')}"`;
    let csv = "data:text/csv;charset=utf-8,";
    const headers = Array.from(
      table.querySelectorAll("thead tr:last-child th")
    ).map((th) => escapeCSV(th.textContent.trim()));
    csv += headers.join(",") + "\n";
    table.querySelectorAll("tbody tr").forEach((tr) => {
      const row = Array.from(tr.querySelectorAll("td")).map((td) =>
        escapeCSV(td.textContent.trim())
      );
      csv += row.join(",") + "\n";
    });
    const uri = encodeURI(csv);
    const link = document.createElement("a");
    link.href = uri;
    link.download = "invoices.csv";
    document.body.appendChild(link);
    link.click();
    setExportDialogOpen(false);
  };

  const handleRowClick = (invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceImage(invoice.imageURL);
    setInvoiceDialogOpen(true);
  };

  const handleExportInvoicePDF = async () => {
    if (!invoiceImage) return;
    try {
      // Create a new PDF with a portrait orientation since invoices are typically vertical
      const pdf = new jsPDF({ orientation: "portrait" });

      // Add the image directly without canvas conversion
      const imgProps = pdf.getImageProperties(invoiceImage);

      // Calculate dimensions to fit the page while maintaining aspect ratio
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20; // 10px margin on each side
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      // Add image to PDF
      pdf.addImage(
        invoiceImage,
        "PNG",
        10, // x position (left margin)
        10, // y position (top margin)
        imgWidth,
        imgHeight
      );

      // Save the PDF
      pdf.save(`invoice-${selectedInvoice?.invoiceNumber || "export"}.pdf`);
    } catch (err) {
      console.error("Error exporting invoice PDF:", err);
      alert("Failed to export PDF. The image may not be accessible.");
    }
  };

  // Sorting & filtering functions
  const handleSort = (col) => {
    let dir = "asc";
    if (sortConfig.column === col && sortConfig.direction === "asc")
      dir = "desc";
    setSortConfig({ column: col, direction: dir });
  };

  const handleHeaderClick = (col) => {
    if (col === "Company Name" || col === "Invoice Number") {
      setActiveSearchColumn(
        col === "Company Name" ? "companyName" : "invoiceNumber"
      );
      setSearchQuery("");
    } else {
      // For monetary columns, the col parameter here is the category name.
      setActiveSearchColumn(col);
      setSearchQuery("");
    }
    handleSort(col);
  };

  const filterInvoices = (invoices) => {
    return invoices.filter((inv) => {
      let ok = true;
      if (activeSearchColumn && searchQuery.trim()) {
        ok =
          inv[activeSearchColumn] &&
          inv[activeSearchColumn]
            .toString()
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
      }
      if (ok && (selectedMonth || selectedYear)) {
        const dt = new Date(inv.dateSubmitted);
        if (selectedMonth) ok = ok && dt.getMonth() + 1 === +selectedMonth;
        if (selectedYear) ok = ok && dt.getFullYear() === +selectedYear;
      }
      return ok;
    });
  };

  const sortInvoices = (invoices) => {
    if (!sortConfig.column) return invoices;
    return [...invoices].sort((a, b) => {
      let aVal, bVal;
      const col = sortConfig.column;
      if (col === "Location") {
        aVal = a.storeID;
        bVal = b.storeID;
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
        aVal = parseInt(a.invoiceNumber, 10);
        bVal = parseInt(b.invoiceNumber, 10);
      } else if (monetaryColumns.some((m) => m.name === col)) {
        const sumA = Array.isArray(a[col])
          ? a[col].reduce((s, v) => s + Number(v), 0)
          : a[col] || 0;
        const sumB = Array.isArray(b[col])
          ? b[col].reduce((s, v) => s + Number(v), 0)
          : b[col] || 0;
        aVal = sumA;
        bVal = sumB;
      } else {
        aVal = a[col];
        bVal = b[col];
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  // Render table header with two rows:
  // Top row: leaving fixed columns blank then account numbers (bankAccountNum) for each category.
  // Bottom row: fixed column headers then monetary category names.
  const renderHeader = () => {
    if (!data || monetaryColumns.length === 0) return null;
    const fixed = [
      "Location",
      "Date Submitted",
      "Invoice Date",
      "Company Name",
      "Invoice Number",
    ];
    return (
      <thead>
        {/* First row - Account Numbers */}
        <tr>
          <th colSpan="4"></th>
          <th
            className="tableHeader"
            style={{
              textAlign: "center", // Changed from right to center
              borderRight: "none",
            }}
          >
            Account Number
          </th>
          {monetaryColumns.map((col) => (
            <th key={col.id} className="tableHeader accountHeader">
              #{col.bankAccountNum}
            </th>
          ))}
        </tr>
        {/* Second row - Column Headers */}
        <tr>
          {fixed.map((name) => (
            <th
              key={name}
              className="tableHeader"
              onClick={() => handleHeaderClick(name)}
            >
              {name}
              {sortConfig.column === name &&
                (sortConfig.direction === "asc" ? " ▲" : " ▼")}
            </th>
          ))}
          {monetaryColumns.map((col) => (
            <th
              key={col.id}
              className="tableHeader categoryHeader"
              onClick={() => handleHeaderClick(col.name)}
            >
              {col.name}
              {sortConfig.column === col.name &&
                (sortConfig.direction === "asc" ? " ▲" : " ▼")}
            </th>
          ))}
        </tr>
      </thead>
    );
  };

  // Render invoice rows using the dynamically pulled monetary columns.
  const renderInvoiceRows = () => {
    if (!data) {
      return (
        <tr>
          <td colSpan={monetaryColumns.length + 5}>
            {selectedStore ? "No invoices found." : "Please select a store."}
          </td>
        </tr>
      );
    }

    const filtered = filterInvoices(data.invoices);
    const sorted = sortInvoices(filtered);


    return sorted.map((inv, i) => {
      const canEdit = isCurrentMonth(inv.invoiceDate);
    
      return (
        <tr key={i} className="invoice-row" onClick={() => handleRowClick(inv)}>
          <td className="tableCell">{inv.storeID}</td>
          <td className="tableCell dateCell">
            {new Date(inv.dateSubmitted).toLocaleDateString("en-US")}
          </td>
          <td className="tableCell dateCell">
            {new Date(inv.invoiceDate).toLocaleDateString("en-US")}
          </td>
          <td className="tableCell">{inv.companyName}</td>
          <td className="tableCell invoiceNumberCell">{inv.invoiceNumber}</td>
    
          {monetaryColumns.map((col, j) => {
            const categoryId = col.id;
            const amount = getCategoryValue(inv, categoryId);
    
            return (
              <td key={j} className="tableCell categoryCell">
                {amount !== 0 && !isNaN(amount)
                  ? amount.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                  : ""}
              </td>
            );
          })}
    
          <td className="tableCell">
          {canEdit && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation(); 
                  handleEdit(inv);
                  // console.log(inv)
                }}
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation(); 
                  handleDelete(inv.id);
                  
                }}
              >
                Delete
              </button>
            </>
          )}
        </td>
        </tr>
      );
    });
  }

  //   return sorted.map((inv, i) => (      
  //     <tr key={i} className="invoice-row" onClick={() => handleRowClick(inv)}>
  //       <td className="tableCell">{inv.storeID}</td>
  //       <td className="tableCell dateCell">
  //         {new Date(inv.dateSubmitted).toLocaleDateString("en-US")}
  //       </td>
  //       <td className="tableCell dateCell">
  //         {new Date(inv.invoiceDate).toLocaleDateString("en-US")}
  //       </td>
  //       <td className="tableCell">{inv.companyName}</td>
  //       <td className="tableCell invoiceNumberCell">{inv.invoiceNumber}</td>
  //       {monetaryColumns.map((col, j) => {
  //         // Use the document ID instead of name to find matching category
  //         const categoryId = col.id;
  //         const amount = getCategoryValue(inv, categoryId);

  //         return (
  //           <td key={j} className="tableCell categoryCell">
  //             {amount !== 0 && !isNaN(amount)
  //               ? amount.toLocaleString("en-US", {
  //                   style: "currency",
  //                   currency: "USD",
  //                   minimumFractionDigits: 0,
  //                   maximumFractionDigits: 0,
  //                 })
  //               : ""}
  //           </td>
  //         );
  //       })}
  //     </tr>
  //   ));
  // };

  // Render summary rows
  const renderSummaryRows = () => {
    if (!data) return null;
    const { total, budget } = data;
    const makeRow = (label, values, styleFn) => (
      <tr className="summaryRow">
        <td
          colSpan={5}
          className="tableCell"
          style={{ textAlign: "center", fontWeight: "bold" }}
        >
          {label}
        </td>
        {monetaryColumns.map((col, i) => {
          const val = Math.round(values[col.id] || 0);
          return (
            <td key={i} className="tableCell summaryCell" style={styleFn(val)}>
              {val.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </td>
          );
        })}
      </tr>
    );

    return (
      <>
        {makeRow("TOTAL", total, () => ({ fontWeight: "bold", color: "#000" }))}
        {makeRow("BUDGET", budget, () => ({ fontWeight: "bold" }))}
        {makeRow(
          "Difference",
          monetaryColumns.reduce((acc, col) => {
            // Note: using col.id consistently
            acc[col.id] = (budget[col.id] || 0) - (total[col.id] || 0);
            return acc;
          }, {}),
          (val) => ({ fontWeight: "bold", color: val >= 0 ? "green" : "red" })
        )}
      </>
    );
  };

  // Invoice detail dialog
  const InvoiceDialog = () => (
    <Dialog
      open={invoiceDialogOpen}
      onClose={() => setInvoiceDialogOpen(false)}
      maxWidth="lg"
    >
      <DialogTitle>
        Invoice {selectedInvoice?.invoiceNumber}
        <IconButton
          onClick={() => setInvoiceDialogOpen(false)}
          style={{ position: "absolute", right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {invoiceImage ? (
          <img src={invoiceImage} alt="Invoice" style={{ width: "100%" }} />
        ) : (
          <p>No image available</p>
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
  const formRef = useRef(null); // place this at the top of your component

  const EditDialog = React.memo(() => (
    <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Invoice</DialogTitle>
      <DialogContent dividers>
        {editInvoiceData && (
          <form ref={formRef} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input
              name="companyName"
              type="text"
              placeholder="Company Name"
              defaultValue={editInvoiceData.companyName}
            />
            <input
              name="invoiceNumber"
              type="text"
              placeholder="Invoice Number"
              defaultValue={editInvoiceData.invoiceNumber}
            />
            {Object.entries(editInvoiceData.categories).map(([key, value]) => (
              <div key={key}>
                <label>{key}</label>
                <input
                  name={key}
                  type="number"
                  defaultValue={value[0]}
                />
              </div>
            ))}
          </form>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditDialogOpen(false)} color="secondary">Cancel</Button>
        <Button
          onClick={() => {
            if (formRef.current) {
              const formData = new FormData(formRef.current);
              const updated = {
                ...editInvoiceData,
                companyName: formData.get("companyName"),
                invoiceNumber: formData.get("invoiceNumber"),
                categories: Object.fromEntries(
                  Object.entries(editInvoiceData.categories).map(([key]) => [
                    key,
                    [Number(formData.get(key)) || 0]
                  ])
                )
              };
              setEditInvoiceData(updated);
              submitEdit(updated);
            }
          }}
          color="primary"
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  ));
  

  // Export choice dialog
  const ExportDialog = () => (
    <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
      <DialogTitle>Export Invoices</DialogTitle>
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

  // Month and year filters
  const months = [
    { value: "", label: "All Months" },
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
    { value: "", label: "All Years" },
    { value: "2023", label: "2023" },
    { value: "2024", label: "2024" },
    { value: "2025", label: "2025" },
  ];

  return (
    <Container maxWidth={false} disableGutters sx={{ mt: 2, px: 2 }}>
      <div className="topBar">
        <h1 className="Header">Invoice Log</h1>
        <div className="topBarControls">
          <div className="filterDropdowns">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {years.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
            <Button
              variant="contained"
              color="primary"
              startIcon={<GetApp />}
              onClick={() => setExportDialogOpen(true)}
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
          <colgroup>
            <col style={{ width: "80px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "110px" }} />
            <col />
            <col />
            {monetaryColumns.map((_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          {renderHeader()}
          <tbody>
            {renderInvoiceRows()}
            {renderSummaryRows()}
          </tbody>
        </table>
      </div>

      <ExportDialog />
      <InvoiceDialog />
      <EditDialog />
    </Container>
  );

  
};

export default InvoiceLogs;

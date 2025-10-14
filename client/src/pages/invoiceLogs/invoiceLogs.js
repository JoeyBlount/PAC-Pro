import React, { useEffect, useState, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Alert,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
import {
  GetApp,
  Close,
  AccessibilityNewSharp,
  Lock,
  Lock as LockIcon,
} from "@mui/icons-material";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./invoiceLogs.css";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase-config";
import { StoreContext } from "../../context/storeContext";
import { getAuth } from "firebase/auth";
import { useAuth } from "../../context/AuthContext";
import { invoiceCatList } from "../settings/InvoiceSettings";
import MonthLockService from "../../services/monthLockService";

// Map Invoice Log category IDs -> PAC "projections[].name"
const PROJECTION_LOOKUP = {
  FOOD: "Base Food",
  CONDIMENT: "Condiment",
  PAPER: "Paper",
  NONPRODUCT: null, // not present in PAC; default 0
  TRAVEL: "Travel",
  "ADV-OTHER": "Adv Other",
  PROMO: "Promotion",
  "OUTSIDE SVC": "Outside Services",
  LINEN: "Linen",
  "OP. SUPPLY": "OP. Supply",
  "M+R": "Maint. & Repair",
  "SML EQUIP": "Small Equipment",
  UTILITIES: "Utilities",
  OFFICE: "Office",
  TRAINING: "Training",
  CR: "Crew Relations",
};

const InvoiceLogs = () => {
  const location = useLocation();
  // const { currentUser, userRole } = useAuth();
  // console.log("Logged in user:", currentUser?.email);
  // console.log("User role:", userRole);
  const { userRole } = useAuth();
  console.log("User role from invoicelogs is: ", userRole);

  // Month locking state
  const [monthLockStatus, setMonthLockStatus] = useState(null);
  const [lockedMonths, setLockedMonths] = useState([]);

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
  const currentDate = new Date();
  const currentMonth = String(currentDate.getMonth() + 1); // getMonth() returns 0-11, so add 1
  const currentYear = String(currentDate.getFullYear());

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Handle navigation from Reports page
  useEffect(() => {
    if (location.state?.openPrintDialog) {
      if (location.state.month) setSelectedMonth(location.state.month);
      if (location.state.year) setSelectedYear(location.state.year);
      setExportDialogOpen(true);
    }
  }, [location]);
  const [imageError, setImageError] = useState(false);
  const [showRecentlyDeleted, setShowRecentlyDeleted] = useState(false);
  const [recentlyDeleted, setRecentlyDeleted] = useState([]);
  const [budgetData, setBudgetData] = useState({});
  const [pacTotals, setPacTotals] = useState({});

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
  const getCategoryValue = (inv, categoryName) => {
    // Check if invoice has categories map
    if (!inv?.categories) {
      return 0;
    }

    // Get the array for this category using the categoryName
    const categoryArray = inv.categories[categoryName];

    // If the array exists, sum all the numbers in it
    if (Array.isArray(categoryArray)) {
      const sum = categoryArray.reduce(
        (sum, num) => sum + (Number(num) || 0),
        0
      );
      return sum;
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
  const handleDelete = async (invoice) => {
    // Check if the invoice's month is locked
    if (isInvoiceMonthLocked(invoice.invoiceMonth, invoice.invoiceYear)) {
      alert(
        "Cannot delete invoice: The month for this invoice is locked and cannot be modified."
      );
      return;
    }

    const confirm = window.confirm(
      "Are you sure you want to delete this invoice?"
    );
    if (!confirm) return;

    try {
      // 1. Move the invoice to 'recentlyDeleted' collection
      const deletedRef = doc(db, "recentlyDeleted", invoice.id);
      await setDoc(deletedRef, invoice);

      // 2. Now delete it from the 'invoices' collection
      await deleteDoc(doc(db, "invoices", invoice.id));

      alert("Invoice moved to Recently Deleted.");

      // 3. Refresh invoices on the page
      setData((prev) => ({
        ...prev,
        invoices: prev.invoices.filter((inv) => inv.id !== invoice.id),
      }));
    } catch (err) {
      console.error("Failed to move invoice to Recently Deleted:", err);
      alert("Error deleting invoice.");
    }
  };

  const handleRestore = async (invoice) => {
    const confirm = window.confirm(
      "Are you sure you want to restore this invoice?"
    );
    if (!confirm) return;
    try {
      // 1. Copy back to "invoices"
      const restoredRef = doc(db, "invoices", invoice.id);
      await setDoc(restoredRef, invoice);

      // 2. Then delete from "recentlyDeleted"
      await deleteDoc(doc(db, "recentlyDeleted", invoice.id));

      alert("Invoice restored successfully!");

      // Optionally refresh your page or re-fetch data here
      fetchInvoices();
      fetchRecentlyDeleted();
    } catch (err) {
      console.error("Failed to restore invoice:", err);
      alert("Error restoring invoice.");
    }
  };

  const handlePermanentDelete = async (invoice) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this invoice from recently deleted"
    );
    if (!confirm) return;
    try {
      await deleteDoc(doc(db, "recentlyDeleted", invoice.id));
      alert("Invoice Deleted!");
      fetchInvoices();
      fetchRecentlyDeleted();
    } catch (err) {
      console.log("failed to delete the invoice from recentlydeleted, ", err);
      alert("failed to delete the invoice");
    }
  };

  const handleEdit = (invoice) => {
    // Check if the invoice's month is locked
    if (isInvoiceMonthLocked(invoice.invoiceMonth, invoice.invoiceYear)) {
      alert(
        "Cannot edit invoice: The month for this invoice is locked and cannot be modified."
      );
      return;
    }

    setEditInvoiceData({ ...invoice }); // clone it so we can modify safely
    setEditDialogOpen(true);
  };

  const lockInvoice = async (invoiceID) => {
    try {
      const invoiceRef = doc(db, "invoices", invoiceID);
      await updateDoc(invoiceRef, {
        locked: true,
      });
      alert("Invoice locked.");

      fetchInvoices(); // refresh from Firestore
    } catch (error) {
      console.error("Error locking invoice:", error);
      alert("Failed to lock invoice.");
    }
  };

  const unlockInvoice = async (invoiceID) => {
    try {
      const invoiceRef = doc(db, "invoices", invoiceID);
      await updateDoc(invoiceRef, {
        locked: false,
            });
    alert("Invoice unlocked.");
    fetchInvoices(); // refresh from Firestore
  } catch (error) {

      console.error("Error unlocking invoice:", error);
      alert("Failed to unlock invoice.");
    }
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
        const allColumns = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(), // Expect each doc to have fields: name, bankAccountNum, etc.
        }));
        
        // Sort columns according to the order defined in InvoiceSettings
        const orderedColumns = invoiceCatList.map(categoryId => 
          allColumns.find(col => col.id === categoryId)
        ).filter(Boolean); // Remove any undefined entries
        
        setMonetaryColumns(orderedColumns);
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
  }, [selectedStore, monetaryColumns, budgetData, pacTotals]);

  // Fetch budget data when store or month/year changes
  useEffect(() => {
    if (selectedStore) {
      const currentDate = new Date();
      const month = selectedMonth || currentDate.getMonth() + 1;
      const year = selectedYear || currentDate.getFullYear();
      const yearMonth = `${year}${String(month).padStart(2, "0")}`;

      fetchBudgetData(selectedStore, yearMonth);
      fetchPacTotals(selectedStore, yearMonth);
    }
  }, [selectedStore, selectedMonth, selectedYear, monetaryColumns]);

  // Check if the selected month is locked
  const checkMonthLock = async () => {
    try {
      if (!selectedStore || !selectedMonth || !selectedYear) return;

      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      const monthName = monthNames[selectedMonth - 1];
      const lockStatus = await MonthLockService.getMonthLockStatus(
        selectedStore,
        monthName,
        selectedYear
      );
      setMonthLockStatus(lockStatus);
    } catch (error) {
      console.error("Error checking month lock:", error);
      setMonthLockStatus({ is_locked: false });
    }
  };

  const fetchLockedMonths = async () => {
    try {
      if (!selectedStore) return;

      const locked = await MonthLockService.getAllLockedMonths(selectedStore);
      setLockedMonths(locked);
    } catch (error) {
      console.error("Error fetching locked months:", error);
    }
  };

  useEffect(() => {
    checkMonthLock();
    fetchLockedMonths();
  }, [selectedStore, selectedMonth, selectedYear]);

  const isMonthLocked = () => {
    return monthLockStatus?.is_locked || false;
  };

  const isInvoiceMonthLocked = (invoiceMonth, invoiceYear) => {
    if (!invoiceMonth || !invoiceYear) return false;

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const monthName = monthNames[invoiceMonth - 1];
    return MonthLockService.isMonthLocked(monthName, invoiceYear, lockedMonths);
  };

  async function fetchInvoices() {
    try {
      // First try with selectedStore as is
      let q = query(
        collection(db, "invoices"),
        where("storeID", "==", selectedStore)
      );

      let snapshot = await getDocs(q);

      // If no results, try with "001" format (assuming selectedStore might be "store_001")
      if (snapshot.docs.length === 0 && selectedStore) {
        q = query(collection(db, "invoices"), where("storeID", "==", "001"));
        snapshot = await getDocs(q);
      }

      const invoices = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Debug logging
      console.log("Debug - Fetched invoices:", {
        totalInvoices: invoices.length,
        selectedStore,
        invoices: invoices.map((inv) => ({
          id: inv.id,
          targetMonth: inv.targetMonth,
          targetYear: inv.targetYear,
          dateSubmitted: inv.dateSubmitted,
          companyName: inv.companyName,
          storeID: inv.storeID,
        })),
      });

      // Compute totals using the category amounts stored in the categories map.
      // Apply the same month/year filtering as individual rows
      const filteredInvoices = invoices.filter((inv) => {
        if (selectedMonth || selectedYear) {
          let invMonth, invYear;

          if (inv.targetMonth && inv.targetYear) {
            invMonth = inv.targetMonth;
            invYear = inv.targetYear;
          } else {
            const dt = new Date(inv.dateSubmitted);
            invMonth = dt.getMonth() + 1;
            invYear = dt.getFullYear();
          }

          if (selectedMonth && invMonth !== +selectedMonth) return false;
          if (selectedYear && invYear !== +selectedYear) return false;
        }
        return true;
      });

      const totals = {};
      monetaryColumns.forEach((col) => {
        const categoryId = col.id; // This matches the document ID from invoiceCategories
        const categoryName = col.id; // Use col.id as the category name since that's what's stored in invoices
        totals[categoryId] = filteredInvoices.reduce((sum, inv) => {
          const categoryValue = getCategoryValue(inv, categoryName);
          return sum + categoryValue;
        }, 0);
      });

      // Use budget data from pac_projections instead of invoiceCategories
      const budgets = {};
      monetaryColumns.forEach((col) => {
        // Use budgetData if available, otherwise fall back to invoiceCategories budget
        budgets[col.id] = budgetData[col.id] || Number(col.budget) || 0;
      });

      const usePacTotals = pacTotals && Object.keys(pacTotals).length > 0;
      console.log("Setting totals in fetchInvoices:", { usePacTotals, pacTotals, computedTotals: totals, budgets });
      setData({ invoices, total: usePacTotals ? pacTotals : totals, budget: budgets });
    } catch (err) {
      console.error("Error loading invoices:", err);
    }
  }

  const fetchRecentlyDeleted = async () => {
    try {
      const snapshot = await getDocs(collection(db, "recentlyDeleted"));
      const deleted = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecentlyDeleted(deleted);
    } catch (error) {
      console.error("Error loading recently deleted invoices:", error);
    }
  };

  const fetchBudgetData = async (storeId, yearMonth) => {
    try {
      if (!storeId || !/^\d{6}$/.test(String(yearMonth))) {
        setBudgetData({});
        return;
      }

      const ensureStoreFmt = (s) =>
        s?.startsWith("store_") ? s : `store_${String(s).padStart(3, "0")}`;

      // Try doc IDs in this order to avoid editing PAC.js:
      const tryIds = [
        `${storeId}_${yearMonth}`, // e.g. store_001_202509  (matches PAC if storeId already has prefix)
        `${ensureStoreFmt(storeId)}_${yearMonth}`, // e.g. store_001_202509 (fallback if storeId is "001")
      ];

      let snap = null;
      for (const id of tryIds) {
        const ref = doc(db, "pac-projections", id); // <-- hyphen collection name
        const test = await getDoc(ref);
        if (test.exists()) {
          snap = test;
          break;
        }
      }

      if (!snap?.exists()) {
        console.log("No PAC projections found for", tryIds);
        setBudgetData({});
        return;
      }

      const pac = snap.data() || {};
      const rows = Array.isArray(pac.projections) ? pac.projections : [];

      // Build budget map aligned to your table's categories
      const nextBudget = {};
      monetaryColumns.forEach((col) => {
        const catId = col.id; // e.g., 'FOOD', 'ADV-OTHER'
        const projName = PROJECTION_LOOKUP[catId];
        if (!projName) {
          nextBudget[catId] = 0;
          return;
        }
        const match = rows.find((r) => r?.name === projName);
        const val = Number(match?.projectedDollar) || 0;
        nextBudget[catId] = val;
      });

      setBudgetData(nextBudget);
    } catch (err) {
      console.error("Error loading budget data:", err);
      setBudgetData({});
    }
  };

  // Fetch PAC input totals from pac_input_data collection
  const fetchPacTotals = async (storeId, yearMonth) => {
    try {
      const formattedStoreId = storeId.startsWith('store_') ? storeId : `store_${storeId.padStart(3, '0')}`;
      const docId = `${formattedStoreId}_${yearMonth}`;

      const docRef = doc(db, "pac_input_data", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const pacData = docSnap.data();

        const totalsMapping = {
          'FOOD': pacData.purchases?.food || 0,
          'CONDIMENT': pacData.purchases?.condiment || 0,
          'PAPER': pacData.purchases?.paper || 0,
          'NONPRODUCT': pacData.purchases?.non_product || 0,
          'TRAVEL': pacData.purchases?.travel || 0,
          'ADV-OTHER': pacData.purchases?.advertising_other || 0,
          'PROMO': pacData.purchases?.promotion || 0,
          'OUTSIDE SVC': pacData.purchases?.outside_services || 0,
          'LINEN': pacData.purchases?.linen || 0,
          'OP. SUPPLY': pacData.purchases?.operating_supply || 0,
          'M+R': pacData.purchases?.maintenance_repair || 0,
          'SML EQUIP': pacData.purchases?.small_equipment || 0,
          'UTILITIES': pacData.purchases?.utilities || 0,
          'OFFICE': pacData.purchases?.office || 0,
          'TRAINING': pacData.purchases?.training || 0,
          'CR': pacData.purchases?.crew_relations || 0
        };

        setPacTotals(totalsMapping);
      } else {
        setPacTotals({});
      }
    } catch (error) {
      console.error("Error loading PAC input totals:", error);
      setPacTotals({});
    }
  };

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
        // Always prioritize targetMonth/targetYear for grouping, fall back to dateSubmitted only if not set
        let invMonth, invYear;

        if (inv.targetMonth && inv.targetYear) {
          // Use the assigned target month/year (from Invoice Assignment dropdown)
          invMonth = inv.targetMonth;
          invYear = inv.targetYear;
        } else {
          // Fall back to dateSubmitted for older invoices that don't have targetMonth/targetYear
          const dt = new Date(inv.dateSubmitted);
          invMonth = dt.getMonth() + 1;
          invYear = dt.getFullYear();
        }

        if (selectedMonth) ok = ok && invMonth === +selectedMonth;
        if (selectedYear) ok = ok && invYear === +selectedYear;
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
      } else if (monetaryColumns.some((m) => m.id === col)) {
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
      "Month/Year",
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
          {isMonthLocked() ? (
            <th
              colSpan="5"
              style={{
                backgroundColor: "#fff3cd",
                border: "1px solid #ffeaa7",
                padding: "4px",
                textAlign: "center",
                fontWeight: "bold",
                color: "#856404",
                fontSize: "12px",
              }}
            >
              🔒 Month Locked - No Edits
            </th>
          ) : (
            <th colSpan="5"></th>
          )}
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
              onClick={() => handleHeaderClick(col.id)}
            >
              {col.id}
              {sortConfig.column === col.id &&
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
          <td colSpan={monetaryColumns.length + 6}>
            {selectedStore ? "No invoices found." : "Please select a store."}
          </td>
        </tr>
      );
    }

    const filtered = filterInvoices(data.invoices);
    const sorted = sortInvoices(filtered);

    // Debug logging
    console.log("Debug - Invoice filtering:", {
      totalInvoices: data.invoices.length,
      filteredInvoices: filtered.length,
      selectedMonth,
      selectedYear,
      invoices: data.invoices.map((inv) => ({
        id: inv.id,
        targetMonth: inv.targetMonth,
        targetYear: inv.targetYear,
        dateSubmitted: inv.dateSubmitted,
        companyName: inv.companyName,
      })),
    });

    return sorted.map((inv, i) => {
      const canEdit = isCurrentMonth(inv.invoiceDate) && !inv.locked;
      const isLocked = inv.locked === true; // Explicitly check for true

      return (
        <tr
          key={i}
          className={`invoice-row ${isLocked ? 'locked-row' : 'unlocked-row'}`}
          onClick={() => handleRowClick(inv)}
        >
          <td className="tableCell">
            {inv.targetMonth && inv.targetYear
              ? `${inv.targetMonth}/${inv.targetYear}`
              : `${new Date(inv.dateSubmitted).getMonth() + 1}/${new Date(inv.dateSubmitted).getFullYear()} (legacy)`}
          </td>
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
            const categoryName = col.id; // Use col.id instead of col.name
            const amount = getCategoryValue(inv, categoryName);

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
          {(canEdit || userRole === "Supervisor" || userRole === "Admin") &&
            !isInvoiceMonthLocked(
              inv.targetMonth || new Date(inv.dateSubmitted).getMonth() + 1,
              inv.targetYear || new Date(inv.dateSubmitted).getFullYear()
            ) && (
              <>
                <button
                  className="edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(inv);
                  }}
                >
                  ✏️ Edit
                </button>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(inv);
                  }}
                >
                  🗑️ Delete
                </button>
                <button
                  className={`lock-toggle-button ${isLocked ? 'locked' : 'unlocked'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Invoice lock status:', inv.locked, 'isLocked:', isLocked);
                    if (isLocked) {
                      console.log('Unlocking invoice:', inv.id);
                      unlockInvoice(inv.id);
                    } else {
                      console.log('Locking invoice:', inv.id);
                      lockInvoice(inv.id);
                    }
                  }}
                >
                  {isLocked ? '🔓 Unlock' : '🔒 Lock'}
                </button>
              </>
            )}
        </td>

        </tr>
      );
    });
  };

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
          colSpan={6}
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
    <Dialog
      open={editDialogOpen}
      onClose={() => setEditDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Edit Invoice</DialogTitle>
      <DialogContent dividers>
        {editInvoiceData && (
          <form
            ref={formRef}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
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
            <div>
              <label>Target Month/Year (for grouping):</label>
              <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                <select
                  name="targetMonth"
                  defaultValue={
                    editInvoiceData.targetMonth ||
                    new Date(editInvoiceData.dateSubmitted).getMonth() + 1
                  }
                >
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
                <select
                  name="targetYear"
                  defaultValue={
                    editInvoiceData.targetYear ||
                    new Date(editInvoiceData.dateSubmitted).getFullYear()
                  }
                >
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>
            </div>
            {Object.entries(editInvoiceData.categories).map(([key, value]) => (
              <div key={key}>
                <label>{key}</label>
                <input name={key} type="number" defaultValue={value[0]} />
              </div>
            ))}
          </form>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditDialogOpen(false)} color="secondary">
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (formRef.current) {
              const formData = new FormData(formRef.current);
              const updated = {
                ...editInvoiceData,
                companyName: formData.get("companyName"),
                invoiceNumber: formData.get("invoiceNumber"),
                targetMonth: Number(formData.get("targetMonth")),
                targetYear: Number(formData.get("targetYear")),
                categories: Object.fromEntries(
                  Object.entries(editInvoiceData.categories).map(([key]) => [
                    key,
                    [Number(formData.get(key)) || 0],
                  ])
                ),
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
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              sx={{ minWidth: 150, marginRight: 2 }}
            >
              {months.map((m) => {
                if (m.value === "") {
                  return (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  );
                }
                const monthNames = [
                  "",
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ];
                const monthName = monthNames[parseInt(m.value)];
                const isLocked = MonthLockService.isMonthLocked(
                  monthName,
                  selectedYear,
                  lockedMonths
                );
                return (
                  <MenuItem key={m.value} value={m.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {isLocked && (
                        <LockIcon
                          sx={{ fontSize: 16, color: "warning.main" }}
                        />
                      )}
                      {m.label}
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              {years.map((y) => (
                <MenuItem key={y.value} value={y.value}>
                  {y.label}
                </MenuItem>
              ))}
            </Select>
            <Button
              variant="contained"
              color="primary"
              startIcon={<GetApp />}
              onClick={() => setExportDialogOpen(true)}
            >
              Export
            </Button>
            <Button
              variant="contained"
              style={{
                backgroundColor: "#ff5252",
                color: "white",
                fontWeight: "bold",
                fontSize: "12px",
                padding: "2%",
                borderRadius: "8px",
                width: "auto",
                minWidth: "150px",
                textTransform: "none",
                boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
              }}
              onClick={() => {
                setShowRecentlyDeleted(true);
                fetchRecentlyDeleted();
                // Handle open modal or navigate to Recently Deleted
                console.log("Open Recently Deleted Modal");
              }}
            >
              Recently Deleted
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
      {showRecentlyDeleted && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "10px",
              minWidth: "300px",
              textAlign: "center",
              position: "relative",
            }}
          >
            <h2>Recently Deleted</h2>
            {recentlyDeleted.length === 0 ? (
              <p>No recently deleted invoices.</p>
            ) : (
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {recentlyDeleted.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid #ddd",
                      textAlign: "left",
                    }}
                  >
                    <strong>{inv.companyName || "Unnamed Invoice"}</strong>
                    <div style={{ fontSize: "0.8rem", color: "gray" }}>
                      {inv.invoiceNumber ? `Invoice #${inv.invoiceNumber}` : ""}
                    </div>
                    <div style={{ marginTop: "5px" }}>
                      <Button
                        variant="outlined"
                        style={{ marginRight: "10px", fontSize: "10px" }}
                        onClick={() => handleRestore(inv)}
                      >
                        Restore
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        style={{ fontSize: "10px" }}
                        onClick={() => handlePermanentDelete(inv)}
                      >
                        Delete Permanently
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p>Invoices here will be deleted after 14 days (Not yet working)</p>
            {/* Later you can map the deleted invoices here */}
            <Button
              variant="contained"
              style={{
                marginTop: "20px",
                backgroundColor: "#6A39FE",
                color: "white",
              }}
              onClick={() => setShowRecentlyDeleted(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
};

export default InvoiceLogs;

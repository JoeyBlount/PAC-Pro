import React, { useState, useEffect, useContext } from "react";
import { auth, db } from "../../config/firebase-config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { StoreContext } from "../../context/storeContext";
import { useAuth } from "../../context/AuthContext";
import MonthLockService from "../../services/monthLockService";
import styles from "./submitInvoice.module.css";
import { invoiceCatList } from "../settings/InvoiceSettings";
import {
  Alert,
  TextField,
  Select,
  MenuItem,
  Box,
  InputLabel,
  FormControl,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";

const generateUUID = () => {
  return Math.random().toString(36).slice(2);
};

const SubmitInvoice = () => {
  const { selectedStore } = useContext(StoreContext);
  const { userRole } = useAuth();
  const [imageUpload, setImageUpload] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [extras, setExtras] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [confirmedItems, setConfirmedItems] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Month locking state
  const [monthLockStatus, setMonthLockStatus] = useState(null);
  const [lockedMonths, setLockedMonths] = useState([]);

  // Separate month/year selectors for controlling which month the invoice gets added to
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11, so add 1
  const currentYear = currentDate.getFullYear();

  const [targetMonth, setTargetMonth] = useState(currentMonth);
  const [targetYear, setTargetYear] = useState(currentYear);

  const user = auth.currentUser;

  useEffect(() => {
    document.title = "PAC Pro - Submit Invoice";
  }, []);

  // Check if the selected month is locked
  const checkMonthLock = async () => {
    try {
      if (!selectedStore || !targetMonth || !targetYear) return;

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

      const monthName = monthNames[targetMonth - 1];
      const lockStatus = await MonthLockService.getMonthLockStatus(
        selectedStore,
        monthName,
        targetYear
      );
      setMonthLockStatus(lockStatus);
    } catch (error) {
      console.error("Error checking month lock:", error);
      setMonthLockStatus({ is_locked: false });
    }
  };

  // Fetch locked months for dropdown display
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
  }, [selectedStore, targetMonth, targetYear]);

  const isMonthLocked = () => {
    return monthLockStatus?.is_locked || false;
  };

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
            const userData = userSnapshot.docs[0].data();
            setUserData(userData);
            setIsAdmin(userData.role === "admin" || userData.role === "Admin");
          }
        }
      } catch (error) {
        console.error("Error loading data from Firestore:", error);
      }
    };

    fetchData();
  }, []);

  const normalizeCategory = (rawCategory) => {
    const category = rawCategory?.toUpperCase().trim();
    const mapping = {
      SUPPLIES: "NONPRODUCT",
      MISC: "NONPRODUCT",
      OFFICE: "PAPER",
      SNACK: "FOOD",
      BEVERAGE: "FOOD",
      GAS: "TRAVEL",
    };
    if (invoiceCatList.includes(category)) return category;
    if (mapping[category]) return mapping[category];
    return "";
  };

  const handleReadFromUpload = async () => {
    if (!imageUpload) {
      alert("Please upload an image first.");
      return;
    }
    const formData = new FormData();
    formData.append("image", imageUpload);
    setLoadingUpload(true);

    try {
      const res = await fetch("http://localhost:5140/api/invoiceread/read", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert("Failed to read invoice: " + JSON.stringify(data));
        return;
      }

      setInvoiceNumber(data.invoiceNumber || "");
      setCompanyName(data.companyName || "");

      if (data.invoiceDate) {
        const [mm, dd, yyyy] = data.invoiceDate.split("/");
        const newDate = new Date(
          parseInt(yyyy),
          parseInt(mm) - 1,
          parseInt(dd)
        );
        setInvoiceDate(newDate);
      }

      if (data.items && Array.isArray(data.items)) {
        const newExtras = data.items.map((item) => ({
          id: generateUUID(),
          category: normalizeCategory(item.category),
          amount: item.amount?.toFixed(2) || "",
          confirmed: false,
        }));
        setExtras(newExtras);
        setConfirmedItems([]);
      }

      alert("Invoice fields auto-filled successfully!");
    } catch (err) {
      console.error(err);
      alert("Error reading invoice.");
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleAdd = () => {
    setExtras((prev) => [
      ...prev,
      { id: generateUUID(), category: "", amount: "", confirmed: false },
    ]);
  };

  const handleRemove = (idx) => {
    const itemToRemove = extras[idx];
    const isConfirmed = confirmedItems.some(
      (item) => item.id === itemToRemove.id
    );

    console.log("handleRemove - OLD extras:", extras);
    console.log("handleRemove - OLD confirmedItems:", confirmedItems);

    if (isConfirmed) {
      const proceed = window.confirm(
        "This item is confirmed. Are you sure you want to remove it?"
      );
      if (!proceed) return;
    }

    setExtras((prev) => {
      const newExtras = prev.filter((_, i) => i !== idx);
      console.log("handleRemove - NEW extras:", newExtras);
      return newExtras;
    });
    setConfirmedItems((prev) => {
      const newConfirmed = prev.filter((item) => item.id !== itemToRemove.id);
      console.log("handleRemove - NEW confirmedItems:", newConfirmed);
      return newConfirmed;
    });
  };

  const handleConfirm = (idx) => {
    try {
      console.log("handleConfirm - OLD extras:", extras);
      console.log("handleConfirm - OLD confirmedItems:", confirmedItems);

      const rowCategory = extras[idx].category;
      if (rowCategory === "")
        throw new Error("Cannot Confirm: Must choose category");

      const raw = String(extras[idx].amount).trim();
      const amountRe = /^-?\d+(\.\d{1,2})?$/;
      if (!amountRe.test(raw)) throw new Error("Invalid amount format");

      const rowAmount = parseFloat(raw);
      const existing = confirmedItems.find(
        (item) => item.category === rowCategory
      );
      if (existing) {
        const proceed = window.confirm(
          `${rowCategory} has already been confirmed. Add another?`
        );
        if (!proceed) return;
      }

      setConfirmedItems((prev) => {
        const newConfirmed = [
          ...prev,
          { id: extras[idx].id, category: rowCategory, amount: rowAmount },
        ];
        console.log("handleConfirm - NEW confirmedItems:", newConfirmed);
        return newConfirmed;
      });
      setExtras((prev) => {
        const newExtras = prev.map((r, i) =>
          i === idx ? { ...r, confirmed: true } : r
        );
        console.log("handleConfirm - NEW extras:", newExtras);
        return newExtras;
      });
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if month is locked
    if (isMonthLocked()) {
      alert(
        "Cannot submit invoice: The selected month is locked and cannot be modified."
      );
      return;
    }

    // Check if all extras are confirmed
    const unconfirmedExtras = extras.filter((extra) => !extra.confirmed);
    if (unconfirmedExtras.length > 0) {
      const unconfirmedList = unconfirmedExtras
        .map(
          (extra) =>
            `${extra.category || "No category"}: $${
              extra.amount || "No amount"
            }`
        )
        .join("\n");

      alert(
        `Please confirm or remove the following unconfirmed items before submitting:\n\n${unconfirmedList}`
      );
      return;
    }

    if (
      !window.confirm(
        "Please double-check all entries before submitting invoice..."
      )
    )
      return;
    try {
      await verifyInput();

      // Prepare invoice data for backend
      const invoiceFields = confirmedItems.reduce(
        (acc, { category, amount }) => {
          if (!acc[category]) acc[category] = [];
          acc[category].push(amount);
          return acc;
        },
        {}
      );

      // Create FormData for the backend request
      const formData = new FormData();
      formData.append("image", imageUpload);
      formData.append("invoice_number", invoiceNumber);
      formData.append("company_name", companyName);
      formData.append("invoice_day", invoiceDate.getDate().toString());
      formData.append("invoice_month", (invoiceDate.getMonth() + 1).toString());
      formData.append("invoice_year", invoiceDate.getFullYear().toString());
      formData.append("target_month", targetMonth.toString());
      formData.append("target_year", targetYear.toString());
      formData.append("store_id", selectedStore);
      formData.append("user_email", user.email);
      formData.append("categories", JSON.stringify(invoiceFields));

      // Submit to backend
      const response = await fetch(
        "http://localhost:5140/api/pac/invoices/submit",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Failed to submit invoice");
      }

      alert("Invoice submitted successfully!");

      // Reset form
      setInvoiceNumber("");
      setInvoiceDate(new Date());
      setTargetMonth(currentMonth);
      setTargetYear(currentYear);
      setExtras([]);
      setConfirmedItems([]);
      setCompanyName("");
      setImageUpload(null);
    } catch (error) {
      alert("Error submitting invoice: " + error.message);
    }
  };

  const verifyInput = async () => {
    if (invoiceNumber === "") throw new Error("Invoice Number Required");
    if (!invoiceDate) throw new Error("Invoice Date Required");
    if (!imageUpload) throw new Error("Image Upload Required");
    if (!selectedStore) throw new Error("Store Selection Required");
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.topBar}>Submit Invoice</div>

      {/* Month Lock Warning */}
      {isMonthLocked() && (
        <Alert severity="warning" icon={<LockIcon />} sx={{ m: 2 }}>
          The selected month ({targetMonth}/{targetYear}) is locked and cannot
          be modified. Please select a different month or contact an
          administrator to unlock this month.
        </Alert>
      )}

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          {/* Store Number Display */}
          <div className={styles.formGroup}>
            <label>Store Number</label>
            <div
              style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "#f5f5f5",
              }}
            >
              {selectedStore || "No store selected"}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Invoice #</label>
            <input
              type="text"
              placeholder="Enter Invoice Number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              disabled={isMonthLocked()}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Company Name</label>
            <input
              type="text"
              placeholder="Enter Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isMonthLocked()}
            />
          </div>

          {/* Invoice Date Picker */}
          <div className={styles.formGroup}>
            <label>Invoice Date</label>
            <TextField
              type="date"
              value={invoiceDate ? invoiceDate.toISOString().split("T")[0] : ""}
              onChange={(e) => setInvoiceDate(new Date(e.target.value))}
              size="small"
              sx={{ width: "100%" }}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </div>

          {/* Month/Year Selectors for Invoice Assignment */}
          <div className={styles.formGroup}>
            <label>Invoice Assignment Month/Year</label>
            <Box display="flex" gap={2} alignItems="center">
              {/* Month Dropdown */}
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Month</InputLabel>
                <Select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  label="Month"
                  disabled={isMonthLocked()}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
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
                    const monthName = monthNames[month - 1];
                    const isLocked = MonthLockService.isMonthLocked(
                      monthName,
                      targetYear,
                      lockedMonths
                    );
                    return (
                      <MenuItem key={month} value={month}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {isLocked && (
                            <LockIcon
                              sx={{ fontSize: 16, color: "warning.main" }}
                            />
                          )}
                          {monthName}
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              {/* Year Dropdown */}
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Year</InputLabel>
                <Select
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  label="Year"
                  disabled={isMonthLocked()}
                >
                  {Array.from(
                    { length: 11 },
                    (_, i) => new Date().getFullYear() - i
                  ).map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <p
              style={{ fontSize: "0.875rem", color: "#666", marginTop: "4px" }}
            >
              This controls which month the invoice gets added to in the system.
            </p>
          </div>

          {extras.map((row, idx) => (
            <div key={idx} className={styles.extraRow}>
              <select
                value={row.category}
                disabled={row.confirmed}
                onChange={(e) => {
                  const val = e.target.value;
                  setExtras((prev) =>
                    prev.map((r, i) =>
                      i === idx ? { ...r, category: val, confirmed: false } : r
                    )
                  );
                }}
              >
                <option value="" disabled>
                  Choose Category
                </option>
                {invoiceCatList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <div className={styles.amountInputWrapper}>
                <span className={styles.dollarSign}>$</span>
                <input
                  type="text"
                  placeholder="Amount"
                  value={row.amount}
                  disabled={row.confirmed}
                  onChange={(e) => {
                    const val = e.target.value;
                    setExtras((prev) =>
                      prev.map((r, i) =>
                        i === idx ? { ...r, amount: val, confirmed: false } : r
                      )
                    );
                  }}
                />
                {row.confirmed && <span className={styles.checkmark}>✓</span>}
              </div>
              {!row.confirmed && (
                <button
                  type="button"
                  className={styles.confirmBtn}
                  onClick={() => handleConfirm(idx)}
                >
                  Confirm
                </button>
              )}
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => handleRemove(idx)}
              >
                Remove
              </button>
            </div>
          ))}

          <div className={styles.formGroup}>
            <button type="button" className={styles.addBtn} onClick={handleAdd}>
              + Add New Amount
            </button>
          </div>

          <div className={styles.buttonRow}>
            <input
              type="file"
              onChange={(e) => setImageUpload(e.target.files[0])}
            />
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isMonthLocked()}
            >
              {isMonthLocked()
                ? "Month Locked - Cannot Submit"
                : "Submit Invoice"}
            </button>
            <button
              type="button"
              className={styles.readUploadBtn}
              onClick={handleReadFromUpload}
              disabled={loadingUpload}
            >
              {loadingUpload ? "Reading..." : "Read from Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitInvoice;

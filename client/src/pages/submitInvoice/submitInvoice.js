import React, { useState, useEffect, useContext } from "react";
import { auth } from "../../config/firebase-config";
import { StoreContext } from "../../context/storeContext";
import { useAuth } from "../../context/AuthContext";
import MonthLockService from "../../services/monthLockService";
import { recomputeMonthlyTotals } from "../../services/invoiceTotalsService";
import styles from "./submitInvoice.module.css";
import { invoiceCatList } from "../settings/InvoiceSettings";
// Frontend no longer uploads to Storage or writes to Firestore; backend handles it
import { useTheme } from "@mui/material/styles";
import { apiUrl } from "../../utils/api";
import {
  Alert,
  TextField,
  Select,
  MenuItem,
  Box,
  InputLabel,
  FormControl,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import RepeatIcon from "@mui/icons-material/Repeat";

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
  const theme = useTheme();

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [invoiceDay, setInvoiceDay] = useState(new Date().getDate());
  const [invoiceMonth, setInvoiceMonth] = useState(new Date().getMonth() + 1);
  const [invoiceYear, setInvoiceYear] = useState(new Date().getFullYear());
  const [confirmedItems, setConfirmedItems] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [calendarPosition, setCalendarPosition] = useState({
    top: 200,
    left: "50%",
  });

  // Month locking state
  const [monthLockStatus, setMonthLockStatus] = useState(null);
  const [lockedMonths, setLockedMonths] = useState([]);

  // Recurring invoice state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringEndType, setRecurringEndType] = useState("forever"); // "forever" or "specific"
  const [recurringEndMonth, setRecurringEndMonth] = useState(1);
  const [recurringEndYear, setRecurringEndYear] = useState(
    new Date().getFullYear() + 1
  );

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

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCalendar) {
        // Check if the click is inside the calendar popup or date picker container
        const calendarPopup = event.target.closest("[data-calendar-popup]");
        const datePickerContainer = event.target.closest("[data-date-picker]");

        if (!calendarPopup && !datePickerContainer) {
          setShowCalendar(false);
        }
      }
    };

    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar]);

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

  // Calendar functions
  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setCalendarViewDate(date); // Update view to show the selected month
    setInvoiceDay(date.getDate());
    setInvoiceMonth(date.getMonth() + 1);
    setInvoiceYear(date.getFullYear());
    setShowCalendar(false);
  };

  const isDateDisabled = (date) => {
    // Allow selection of any date
    return false;
  };

  const generateCalendarDays = () => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

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
      const res = await fetch(apiUrl("/api/invoiceread/read"), {
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
        setSelectedDate(newDate);
        setInvoiceMonth(parseInt(mm));
        setInvoiceDay(parseInt(dd));
        setInvoiceYear(parseInt(yyyy));
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

    //console.log("handleRemove - OLD extras:", extras);
    //console.log("handleRemove - OLD confirmedItems:", confirmedItems);

    if (isConfirmed) {
      const proceed = window.confirm(
        "This item is confirmed. Are you sure you want to remove it?"
      );
      if (!proceed) return;
    }

    setExtras((prev) => {
      const newExtras = prev.filter((_, i) => i !== idx);
      //console.log("handleRemove - NEW extras:", newExtras);
      return newExtras;
    });
    setConfirmedItems((prev) => {
      const newConfirmed = prev.filter((item) => item.id !== itemToRemove.id);
      //console.log("handleRemove - NEW confirmedItems:", newConfirmed);
      return newConfirmed;
    });
  };

  const handleConfirm = (idx) => {
    try {
      //console.log("handleConfirm - OLD extras:", extras);
      //console.log("handleConfirm - OLD confirmedItems:", confirmedItems);

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
        //console.log("handleConfirm - NEW confirmedItems:", newConfirmed);
        return newConfirmed;
      });
      setExtras((prev) => {
        const newExtras = prev.map((r, i) =>
          i === idx ? { ...r, confirmed: true } : r
        );
        //console.log("handleConfirm - NEW extras:", newExtras);
        return newExtras;
      });
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // For non-recurring invoices, image is required
    if (!isRecurring && !imageUpload) {
      alert("Please upload an image first.");
      return;
    }

    try {
      // Require at least one confirmed category/amount before submitting
      if (!confirmedItems || confirmedItems.length === 0) {
        alert("Please confirm at least one category amount before submitting.");
        return;
      }

      // Build categories payload from confirmed items
      const categories = confirmedItems.reduce((acc, { category, amount }) => {
        const key = String(category || "").trim();
        if (!key) return acc;
        if (!Array.isArray(acc[key])) acc[key] = [];
        acc[key].push(parseFloat(amount));
        return acc;
      }, {});

      // Double-check payload not empty (safety)
      if (Object.keys(categories).length === 0) {
        alert("Please confirm at least one category amount before submitting.");
        return;
      }

      // Create FormData for backend request
      const formData = new FormData();

      // Image is optional for recurring invoices
      if (imageUpload) {
        formData.append("image", imageUpload);
      }

      formData.append(
        "invoice_number",
        isRecurring ? "Re-Occurring" : invoiceNumber
      );
      formData.append("company_name", companyName);
      formData.append("invoice_day", invoiceDay.toString());
      formData.append("invoice_month", invoiceMonth.toString());
      formData.append("invoice_year", invoiceYear.toString());
      formData.append("target_month", Number(targetMonth).toString());
      formData.append("target_year", Number(targetYear).toString());
      formData.append("store_id", selectedStore);
      formData.append("user_email", user.email);
      formData.append("categories", JSON.stringify(categories));

      // Add recurring invoice parameters
      formData.append("is_recurring", isRecurring.toString());
      if (isRecurring) {
        formData.append("recurring_interval", recurringInterval.toString());
        if (recurringEndType === "forever") {
          formData.append("recurring_end_date", "forever");
        } else {
          formData.append(
            "recurring_end_date",
            `${recurringEndYear}-${String(recurringEndMonth).padStart(2, "0")}`
          );
        }
      }

      // Submit to backend service (no auth token required)
      const response = await fetch(apiUrl("/api/pac/invoices/submit"), {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Failed to submit invoice");
      }

      // Update invoice totals and PAC actual for affected months
      try {
        if (isRecurring && result.invoice_ids?.length > 0) {
          // For recurring invoices, we need to update totals for each month
          // The backend creates invoices for multiple months based on the interval
          // We'll update the current target month - the backend should handle the rest
          // But to be safe, let's calculate all affected months
          const startMonth = targetMonth;
          const startYear = targetYear;
          let endMonth, endYear;

          if (recurringEndType === "forever") {
            // Default to 1 year ahead
            endMonth = startMonth;
            endYear = startYear + 1;
          } else {
            endMonth = recurringEndMonth;
            endYear = recurringEndYear;
          }

          // Calculate all months that need totals updated
          let currentMonth = startMonth;
          let currentYear = startYear;
          const monthsToUpdate = [];

          while (
            currentYear < endYear ||
            (currentYear === endYear && currentMonth <= endMonth)
          ) {
            monthsToUpdate.push({ month: currentMonth, year: currentYear });
            currentMonth += recurringInterval;
            while (currentMonth > 12) {
              currentMonth -= 12;
              currentYear++;
            }
          }

          // Update totals for each affected month
          for (const { month, year } of monthsToUpdate) {
            await recomputeMonthlyTotals(selectedStore, month, year);
            console.log(
              `Invoice totals updated for ${selectedStore} - ${month}/${year}`
            );
          }
        } else {
          // Single invoice - just update the target month
          await recomputeMonthlyTotals(selectedStore, targetMonth, targetYear);
          console.log(
            `Invoice totals updated for ${selectedStore} - ${targetMonth}/${targetYear}`
          );
        }
      } catch (totalsError) {
        console.error("Error updating invoice totals:", totalsError);
        // Don't fail the submission if totals update fails
      }

      if (isRecurring) {
        alert(
          `Recurring invoice created successfully! ${
            result.invoice_ids?.length || 1
          } invoice entries generated.`
        );
      } else {
        alert("Invoice submitted successfully!");
      }

      // Reset form
      setInvoiceNumber("");
      setCompanyName("");
      setExtras([]);
      setConfirmedItems([]);
      setImageUpload(null);
      setIsRecurring(false);
      setRecurringInterval(1);
      setRecurringEndType("forever");
    } catch (err) {
      console.error(err);
      alert("Error submitting invoice: " + err.message);
    }
  };

  const verifyInput = async () => {
    if (invoiceNumber === "") throw new Error("Invoice Number Required");
    const d = new Date(invoiceYear, invoiceMonth - 1, invoiceDay);
    if (
      d.getFullYear() !== invoiceYear ||
      d.getMonth() + 1 !== invoiceMonth ||
      d.getDate() !== invoiceDay
    )
      throw new Error("Invalid Date Selected");
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
                // backgroundColor: "#cca8a8ff",
              }}
            >
              {selectedStore || "No store selected"}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Invoice #</label>
            <input
              type="text"
              placeholder={
                isMonthLocked()
                  ? "Please select valid month"
                  : isRecurring
                  ? "Re-Occurring"
                  : "Enter Invoice Number"
              }
              value={isRecurring ? "Re-Occurring" : invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              disabled={isMonthLocked() || isRecurring}
              style={
                isRecurring
                  ? { backgroundColor: "#e8e0f0", color: "#6b4c9a" }
                  : {}
              }
            />
          </div>

          {/* Recurring Invoice Option - Admin Only */}
          {userRole === "Admin" && (
            <div className={styles.formGroup}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    disabled={isMonthLocked()}
                    sx={{
                      color: "#9c27b0",
                      "&.Mui-checked": {
                        color: "#7b1fa2",
                      },
                    }}
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <RepeatIcon
                      sx={{ color: isRecurring ? "#7b1fa2" : "inherit" }}
                    />
                    <span>Recurring Invoice</span>
                  </Box>
                }
              />

              {isRecurring && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    border: "1px solid #9c27b0",
                    borderRadius: "8px",
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#2d1f3d" : "#f3e5f5",
                  }}
                >
                  {/* Recurring Interval */}
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Repeat Every</InputLabel>
                    <Select
                      value={recurringInterval}
                      onChange={(e) => setRecurringInterval(e.target.value)}
                      label="Repeat Every"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(
                        (months) => (
                          <MenuItem key={months} value={months}>
                            {months} {months === 1 ? "Month" : "Months"}
                          </MenuItem>
                        )
                      )}
                    </Select>
                  </FormControl>

                  {/* End Date Options */}
                  <FormControl component="fieldset" sx={{ width: "100%" }}>
                    <FormLabel
                      component="legend"
                      sx={{
                        color:
                          theme.palette.mode === "dark" ? "#ce93d8" : "#7b1fa2",
                      }}
                    >
                      End Date
                    </FormLabel>
                    <RadioGroup
                      value={recurringEndType}
                      onChange={(e) => setRecurringEndType(e.target.value)}
                    >
                      <FormControlLabel
                        value="forever"
                        control={
                          <Radio
                            sx={{
                              color: "#9c27b0",
                              "&.Mui-checked": { color: "#7b1fa2" },
                            }}
                          />
                        }
                        label="Forever (auto-extends 1 year ahead)"
                      />
                      <FormControlLabel
                        value="specific"
                        control={
                          <Radio
                            sx={{
                              color: "#9c27b0",
                              "&.Mui-checked": { color: "#7b1fa2" },
                            }}
                          />
                        }
                        label="End on specific month"
                      />
                    </RadioGroup>

                    {recurringEndType === "specific" && (
                      <Box display="flex" gap={2} mt={1}>
                        <FormControl sx={{ minWidth: 120 }}>
                          <InputLabel>End Month</InputLabel>
                          <Select
                            value={recurringEndMonth}
                            onChange={(e) =>
                              setRecurringEndMonth(e.target.value)
                            }
                            label="End Month"
                          >
                            {[
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
                            ].map((month, index) => (
                              <MenuItem key={month} value={index + 1}>
                                {month}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl sx={{ minWidth: 100 }}>
                          <InputLabel>End Year</InputLabel>
                          <Select
                            value={recurringEndYear}
                            onChange={(e) =>
                              setRecurringEndYear(e.target.value)
                            }
                            label="End Year"
                          >
                            {Array.from(
                              { length: 6 },
                              (_, i) => currentYear + i
                            ).map((year) => (
                              <MenuItem key={year} value={year}>
                                {year}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                  </FormControl>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    Recurring invoices will be automatically created for each
                    interval. The invoice number will be set to "Re-Occurring"
                    and photo upload is optional.
                  </Alert>
                </Box>
              )}
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Company Name</label>
            <input
              type="text"
              placeholder={
                isMonthLocked()
                  ? "Please select valid month"
                  : "Enter Company Name"
              }
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isMonthLocked()}
            />
          </div>

          {/* Invoice Date Picker */}
          <div className={styles.formGroup}>
            <label>Invoice Date</label>
            <div
              className={styles.datePickerContainer}
              style={{ position: "relative" }}
              data-date-picker
            >
              <input
                type="text"
                value={formatDate(selectedDate)}
                readOnly
                className={styles.dateInput}
                onClick={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  setCalendarPosition({
                    top: rect.bottom + window.scrollY + 5,
                    left: rect.left + window.scrollX,
                  });
                  // Set calendar view to show the selected date's month
                  setCalendarViewDate(selectedDate);
                  setShowCalendar(!showCalendar);
                }}
                placeholder="Select Date"
                disabled={isMonthLocked()}
              />
              <button
                type="button"
                className={styles.calendarButton}
                onClick={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  setCalendarPosition({
                    top: rect.bottom + window.scrollY + 5,
                    left: rect.left + window.scrollX,
                  });
                  // Set calendar view to show the selected date's month
                  setCalendarViewDate(selectedDate);
                  setShowCalendar(!showCalendar);
                }}
                disabled={isMonthLocked()}
              >
                📅
              </button>
            </div>

            {showCalendar && (
              <div
                data-calendar-popup
                style={{
                  position: "fixed",
                  top: `${calendarPosition.top}px`,
                  left: `${calendarPosition.left}px`,
                  background: "white",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  padding: "15px",
                  zIndex: 999999,
                  width: "280px",
                  maxHeight: "400px",
                  overflow: "auto",
                }}
              >
                <div className={styles.calendarHeader}>
                  <button
                    type="button"
                    className={styles.calendarNav}
                    onClick={() => {
                      const newDate = new Date(
                        calendarViewDate.getFullYear(),
                        calendarViewDate.getMonth() - 1,
                        1
                      );
                      setCalendarViewDate(newDate);
                    }}
                  >
                    ‹
                  </button>
                  <span className={styles.calendarMonthYear}>
                    {calendarViewDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    type="button"
                    className={styles.calendarNav}
                    onClick={() => {
                      const newDate = new Date(
                        calendarViewDate.getFullYear(),
                        calendarViewDate.getMonth() + 1,
                        1
                      );
                      setCalendarViewDate(newDate);
                    }}
                  >
                    ›
                  </button>
                </div>

                <div className={styles.calendarGrid}>
                  <div className={styles.calendarWeekdays}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <div key={day} className={styles.weekday}>
                          {day}
                        </div>
                      )
                    )}
                  </div>

                  <div className={styles.calendarDays}>
                    {generateCalendarDays().map((date, index) => {
                      const isCurrentMonth =
                        date.getMonth() === calendarViewDate.getMonth();
                      const isToday =
                        date.toDateString() === new Date().toDateString();
                      const isSelected =
                        date.toDateString() === selectedDate.toDateString();
                      const isDisabled = isDateDisabled(date);

                      return (
                        <button
                          key={index}
                          type="button"
                          className={`${styles.calendarDay} ${
                            !isCurrentMonth ? styles.otherMonth : ""
                          } ${isToday ? styles.today : ""} ${
                            isSelected ? styles.selected : ""
                          } ${isDisabled ? styles.disabled : ""}`}
                          onClick={() => !isDisabled && handleDateSelect(date)}
                          disabled={isDisabled}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.calendarFooter}>
                  <button
                    type="button"
                    className={styles.calendarClose}
                    onClick={() => setShowCalendar(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Month/Year Selectors for Invoice Assignment */}
          <div className={styles.formGroup}>
            <label>Invoice Assignment Month/Year</label>
            <Box display="flex" gap={2} alignItems="center">
              {/* Month Dropdown */}
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Month</InputLabel>
                <Select
                  data-testid="month-select"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  label="Month"
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
                disabled={row.confirmed || isMonthLocked()}
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
                  disabled={row.confirmed || isMonthLocked()}
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
              {!row.confirmed && !isMonthLocked() && (
                <button
                  type="button"
                  className={styles.confirmBtn}
                  onClick={() => handleConfirm(idx)}
                >
                  Confirm
                </button>
              )}
              {!isMonthLocked() && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemove(idx)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <div className={styles.formGroup}>
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAdd}
              disabled={isMonthLocked()}
            >
              + Add New Amount
            </button>
          </div>

          <div className={styles.buttonRow}>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <input
                type="file"
                onChange={(e) => setImageUpload(e.target.files[0])}
                disabled={isMonthLocked()}
              />
              {isRecurring && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#9c27b0",
                    fontStyle: "italic",
                  }}
                >
                  (Optional for recurring invoices)
                </span>
              )}
            </div>
            <button
              type="submit"
              data-testid="submit-invoice-btn"
              className={styles.submitBtn}
              disabled={isMonthLocked()}
              style={isRecurring ? { backgroundColor: "#7b1fa2" } : {}}
            >
              {isMonthLocked()
                ? "Month Locked - Cannot Submit"
                : isRecurring
                ? "Create Recurring Invoice"
                : "Submit Invoice"}
            </button>
            <button
              type="button"
              className={styles.readUploadBtn}
              onClick={handleReadFromUpload}
              disabled={loadingUpload || isMonthLocked()}
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

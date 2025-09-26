import React, { useState, useEffect, useContext } from "react";
import { auth, db } from "../../config/firebase-config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { StoreContext } from "../../context/storeContext";
import styles from "./submitInvoice.module.css";
import { invoiceCatList } from "../settings/InvoiceSettings";

const generateUUID = () => {
  return Math.random().toString(36).slice(2);
};

const SubmitInvoice = () => {
  const { selectedStore } = useContext(StoreContext);
  const [imageUpload, setImageUpload] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [extras, setExtras] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);

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
  const [calendarPosition, setCalendarPosition] = useState({ top: 200, left: '50%' });

  const user = auth.currentUser;

  useEffect(() => {
    document.title = "PAC Pro - Submit Invoice";
  }, []);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCalendar) {
        // Check if the click is inside the calendar popup or date picker container
        const calendarPopup = event.target.closest('[data-calendar-popup]');
        const datePickerContainer = event.target.closest('[data-date-picker]');
        
        if (!calendarPopup && !datePickerContainer) {
          setShowCalendar(false);
        }
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

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
            setIsAdmin(userData.role === 'admin' || userData.role === 'Admin');
          }
        }
      } catch (error) {
        console.error("Error loading data from Firestore:", error);
      }
    };

    fetchData();
  }, []);

  // lock previous months/years for non-admins
  const isMonthDisabled = (monthNumber) => {
    if (isAdmin) return false;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Any month in a past year is locked
    if (invoiceYear < currentYear) return true;
    // In current year, months before current month are locked
    if (invoiceYear === currentYear && monthNumber < currentMonth) return true;

    return false; // future months and current month remain selectable
  };
  const isYearDisabled = (yearNumber) => {
    if (isAdmin) return false;
    const currentYear = new Date().getFullYear();
    return yearNumber < currentYear; // lock/grey any previous year
  };

  const normalizeCategory = (rawCategory) => {
    const category = rawCategory?.toUpperCase().trim();
    const mapping = {
      SUPPLIES: "NONPRODUCT",
      MISC: "NONPRODUCT",
      OFFICE: "PAPER",
      SNACK: "FOOD",
      BEVERAGE: "FOOD",
      GAS: "TRAVEL"
    };
    if (invoiceCatList.includes(category)) return category;
    if (mapping[category]) return mapping[category];
    return "";
  };

  // Calendar functions
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
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
    if (isAdmin) return false;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    // Disable dates before current date
    return date < new Date(currentYear, currentMonth, currentDay);
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
        body: formData
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
        const newDate = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
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
          confirmed: false
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
    setExtras((prev) => [...prev, { id: generateUUID(), category: "", amount: "", confirmed: false }]);
  };

  const handleRemove = (idx) => {
    const itemToRemove = extras[idx];
    const isConfirmed = confirmedItems.some(item => item.id === itemToRemove.id);
    
    if (isConfirmed) {
      const proceed = window.confirm("This item is confirmed. Are you sure you want to remove it?");
      if (!proceed) return;
    }
    
    setExtras((prev) => {
      const newExtras = prev.filter((_, i) => i !== idx);
      return newExtras;
    });
    setConfirmedItems((prev) => {
      const newConfirmed = prev.filter(item => item.id !== itemToRemove.id);
      return newConfirmed;
    });
  };

  const handleConfirm = (idx) => {
    try {
      const rowCategory = extras[idx].category;
      if (rowCategory === "") throw new Error("Cannot Confirm: Must choose category");

      const raw = String(extras[idx].amount).trim();
      const amountRe = /^-?\d+(\.\d{1,2})?$/;
      if (!amountRe.test(raw)) throw new Error("Invalid amount format");

      const rowAmount = parseFloat(raw);
      const existing = confirmedItems.find((item) => item.category === rowCategory);
      if (existing) {
        const proceed = window.confirm(
          `${rowCategory} has already been confirmed. Add another?`
        );
        if (!proceed) return;
      }

      setConfirmedItems((prev) => {
        const newConfirmed = [...prev, { id: extras[idx].id, category: rowCategory, amount: rowAmount }];
        return newConfirmed;
      });
      setExtras((prev) => {
        const newExtras = prev.map((r, i) => (i === idx ? { ...r, confirmed: true } : r));
        return newExtras;
      });
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if all extras are confirmed
    const unconfirmedExtras = extras.filter(extra => !extra.confirmed);
    if (unconfirmedExtras.length > 0) {
      const unconfirmedList = unconfirmedExtras.map(extra => 
        `${extra.category || 'No category'}: $${extra.amount || 'No amount'}`
      ).join('\n');
      
      alert(`Please confirm or remove the following unconfirmed items before submitting:\n\n${unconfirmedList}`);
      return;
    }
    
    if (!window.confirm("Please double-check all entries before submitting invoice...")) return;
    try {
      await verifyInput();

      // Prepare invoice data for backend
      const invoiceFields = confirmedItems.reduce((acc, { category, amount }) => {
        if (!acc[category]) acc[category] = [];
        acc[category].push(amount);
        return acc;
      }, {});

      // Create FormData for the backend request
      const formData = new FormData();
      formData.append("image", imageUpload);
      formData.append("invoice_number", invoiceNumber);
      formData.append("company_name", companyName);
      formData.append("invoice_day", invoiceDay.toString());
      formData.append("invoice_month", invoiceMonth.toString());
      formData.append("invoice_year", invoiceYear.toString());
      formData.append("store_id", selectedStore);
      formData.append("user_email", user.email);
      formData.append("categories", JSON.stringify(invoiceFields));

      // Submit to backend
      const response = await fetch("http://localhost:5140/api/pac/invoices/submit", {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || "Failed to submit invoice");
      }

      alert("Invoice submitted successfully!");
      
      // Reset form
      setInvoiceNumber("");
      setInvoiceMonth(new Date().getMonth() + 1);
      setInvoiceYear(new Date().getFullYear());
      setSelectedDate(new Date());
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
      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Invoice #</label>
            <input
              type="text"
              placeholder="Enter Invoice Number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Store Number</label>
            <input type="text" value={selectedStore || ""} readOnly />
          </div>

          <div className={styles.formGroup}>
            <label>Company Name</label>
            <input
              type="text"
              placeholder="Enter Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Invoice Date</label>
            <div className={styles.datePickerContainer} style={{position: 'relative'}} data-date-picker>
                <input
                  type="text"
                  value={formatDate(selectedDate)}
                  readOnly
                  className={styles.dateInput}
                  onClick={(e) => {
                    const rect = e.target.getBoundingClientRect();
                    setCalendarPosition({
                      top: rect.bottom + window.scrollY + 5,
                      left: rect.left + window.scrollX
                    });
                    // Set calendar view to show the selected date's month
                    setCalendarViewDate(selectedDate);
                    setShowCalendar(!showCalendar);
                  }}
                  placeholder="Select Date"
                />
                <button
                  type="button"
                  className={styles.calendarButton}
                  onClick={(e) => {
                    const rect = e.target.getBoundingClientRect();
                    setCalendarPosition({
                      top: rect.bottom + window.scrollY + 5,
                      left: rect.left + window.scrollX
                    });
                    // Set calendar view to show the selected date's month
                    setCalendarViewDate(selectedDate);
                    setShowCalendar(!showCalendar);
                  }}
                >
                  📅
                </button>
            </div>
            
            {showCalendar && (
              <div 
                data-calendar-popup
                style={{
                  position: 'fixed',
                  top: `${calendarPosition.top}px`,
                  left: `${calendarPosition.left}px`,
                  background: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  padding: '15px',
                  zIndex: 999999,
                  width: '280px',
                  maxHeight: '400px',
                  overflow: 'auto'
                }}
              >
              <div className={styles.calendarHeader}>
                  <button
                    type="button"
                    className={styles.calendarNav}
                    onClick={() => {
                      const newDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1);
                      setCalendarViewDate(newDate);
                    }}
                  >
                    ‹
                  </button>
                  <span className={styles.calendarMonthYear}>
                    {calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    className={styles.calendarNav}
                    onClick={() => {
                      const newDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
                      setCalendarViewDate(newDate);
                    }}
                  >
                    ›
                  </button>
                </div>
                
                <div className={styles.calendarGrid}>
                  <div className={styles.calendarWeekdays}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className={styles.weekday}>{day}</div>
                    ))}
                  </div>
                  
                  <div className={styles.calendarDays}>
                    {generateCalendarDays().map((date, index) => {
                      const isCurrentMonth = date.getMonth() === calendarViewDate.getMonth();
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isSelected = date.toDateString() === selectedDate.toDateString();
                      const isDisabled = isDateDisabled(date);
                      
                      return (
                        <button
                          key={index}
                          type="button"
                          className={`${styles.calendarDay} ${
                            !isCurrentMonth ? styles.otherMonth : ''
                          } ${isToday ? styles.today : ''} ${
                            isSelected ? styles.selected : ''
                          } ${isDisabled ? styles.disabled : ''}`}
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
            
            {!isAdmin && (
              <small className={styles.helpText}>
                Previous dates are locked for your role. Contact an admin if you need changes.
              </small>
            )}
          </div>

          {extras.map((row, idx) => (
            <div key={idx} className={styles.extraRow}>
              <select
                value={row.category}
                disabled={row.confirmed}
                onChange={(e) => {
                  const val = e.target.value;
                  setExtras((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, category: val, confirmed: false } : r))
                  );
                }}
              >
                <option value="" disabled>Choose Category</option>
                {invoiceCatList.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
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
                      prev.map((r, i) => (i === idx ? { ...r, amount: val, confirmed: false } : r))
                    );
                  }}
                />
                {row.confirmed && <span className={styles.checkmark}>✓</span>}
              </div>
              {!row.confirmed && (
                <button type="button" className={styles.confirmBtn} onClick={() => handleConfirm(idx)}>
                  Confirm
                </button>
              )}
              <button type="button" className={styles.removeBtn} onClick={() => handleRemove(idx)}>
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
            <input type="file" onChange={(e) => setImageUpload(e.target.files[0])} />
            <button type="submit" className={styles.submitBtn}>Submit Invoice</button>
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

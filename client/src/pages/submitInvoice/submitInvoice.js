import React, { useState, useEffect, useContext } from "react";
import { auth, db } from "../../config/firebase-config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { StoreContext } from "../../context/storeContext";
import styles from "./submitInvoice.module.css";
import { invoiceCatList } from "../settings/InvoiceSettings";

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

  const user = auth.currentUser;

  useEffect(() => {
    document.title = "PAC Pro - Submit Invoice";
  }, []);

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
        setInvoiceMonth(parseInt(mm));
        setInvoiceDay(parseInt(dd));
        setInvoiceYear(parseInt(yyyy));
      }

      if (data.items && Array.isArray(data.items)) {
        const newExtras = data.items.map((item) => ({
          category: normalizeCategory(item.category),
          amount: item.amount?.toFixed(2) || "",
          confirmed: true
        }));
        setExtras(newExtras);
        setConfirmedItems(
          newExtras.map((i) => ({ category: i.category, amount: parseFloat(i.amount) }))
        );
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
    if (extras.length !== confirmedItems.length) {
      alert("Please confirm your current extra before adding another.");
      return;
    }
    setExtras((prev) => [...prev, { category: "", amount: "", confirmed: false }]);
  };

  const handleRemove = (idx) => {
    setExtras((prev) => prev.filter((_, i) => i !== idx));
    setConfirmedItems((prev) => prev.filter((_, i) => i !== idx));
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

      setConfirmedItems((prev) => [...prev, { category: rowCategory, amount: rowAmount }]);
      setExtras((prev) =>
        prev.map((r, i) => (i === idx ? { ...r, confirmed: true } : r))
      );
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
            <div className={styles.inputRow}>
              <div className={styles.formGroup}>
                <label>Day</label>
                <select value={invoiceDay} onChange={(e) => setInvoiceDay(+e.target.value)}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Month</label>
                <select
                  value={invoiceMonth}
                  onChange={(e) => {
                    const nextVal = +e.target.value;
                    if (isMonthDisabled(nextVal)) return; // guard against selecting locked options
                    setInvoiceMonth(nextVal);
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option
                      key={month}
                      value={month}
                      disabled={isMonthDisabled(month)}
                      title={!isAdmin && isMonthDisabled(month) ? "Locked for your role" : undefined}
                      className={!isAdmin && isMonthDisabled(month) ? styles.disabledOption : undefined}
                    >
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Year</label>
                <select
                  value={invoiceYear}
                  onChange={(e) => {
                    const nextYear = +e.target.value;
                    if (isYearDisabled(nextYear)) return;
                    setInvoiceYear(nextYear);
                    // keep your existing month safety:
                    if (isMonthDisabled(invoiceMonth)) {
                      const now = new Date();
                      const safeMonth =
                        nextYear < now.getFullYear()
                          ? now.getMonth() + 1
                          : invoiceMonth;
                      if (!isMonthDisabled(safeMonth)) setInvoiceMonth(safeMonth);
                    }
                  }}
                >
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option
                      key={year}
                      value={year}
                      disabled={isYearDisabled(year)}
                      title={!isAdmin && isYearDisabled(year) ? "Locked for your role" : undefined}
                      className={!isAdmin && isYearDisabled(year) ? styles.disabledOption : undefined}
                    >
                      {year}
                    </option>
                  ))}
                </select>
              </div>

            </div>
            {!isAdmin && (
              <small className={styles.helpText}>
                Previous months and years are locked for your role. Contact an admin if you need changes.
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

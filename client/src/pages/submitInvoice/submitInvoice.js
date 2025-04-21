import React, { useState, useEffect, useContext } from "react";
import { db, storage, auth } from "../../config/firebase-config"; // Import initialized Firebase storage
import { v4 } from "uuid"; // UUID for unique image names
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, doc, setDoc } from "firebase/firestore";
import { StoreContext } from "../../context/storeContext";  // import your context
import styles from "./submitInvoice.module.css";
import { invoiceCatList } from "../settings/InvoiceSettings";

const SubmitInvoice = () => {
  const { selectedStore } = useContext(StoreContext);
  const [imageUpload, setImageUpload] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [extras, setExtras] = useState([]);

  useEffect(() => {
    document.title = "PAC Pro - Submit Invoice";
  }, []);

  // State variables for each form field
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [companyName, setCompanyName]   = useState("");
  const [invoiceDay,   setInvoiceDay]   = useState(new Date().getDate());
  const [invoiceMonth, setInvoiceMonth] = useState(new Date().getMonth() + 1);
  const [invoiceYear,  setInvoiceYear]  = useState(new Date().getFullYear());
  const [confirmedItems, setConfirmedItems] = useState([]);

  const invoiceRef = collection(db, "invoices"); 
  const user = auth.currentUser;

  // Add a new blank category/amount row
  const handleAdd = () => {
    if (extras.length !== confirmedItems.length) {
      alert("Please confirm your current extra before adding another.");
      return;
    }
    setExtras(prev => [
      ...prev,
      { category: "", amount: "", confirmed: false }
    ]);
  };

  // Remove the row at index idx
  const handleRemove = idx => {
    // 1) Remove the input row
    setExtras(prev => prev.filter((_, i) => i !== idx));
    setConfirmedItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Placeholder confirm handler
  const handleConfirm = idx => {
    try{
      //validate fields before adding:
      //category:
      const rowCategory = extras[idx].category;
      if(rowCategory === ""){
        throw new Error("Cannot Confirm: Must choose category");
      }
      //amount:
      const raw = String(extras[idx].amount);     //to string
      const str = raw.trim();                     //trim leading and ending whitespace
      const amountRe = /^-?\d+(\.\d{1,2})?$/; 
      if (!amountRe.test(str)) {
        throw new Error(
          "Cannot Confirm: Amount must be a number with at most two decimal places, no scientific notation"
        );
      }
      const rowAmount = parseFloat(str);
      //amount and category have been validated. Check if the category already exists
      const existing = confirmedItems.find(item => item.category === rowCategory);
      if(existing){
        //handle warning
        const proceed = window.confirm(
          rowCategory + " has already been confirmed, would you like to add another " + rowCategory + " category?"
        );
        if(proceed){
          // add new confirmed item
          setConfirmedItems(prev => [
            ...prev,
            { category: rowCategory, amount: rowAmount }
          ]);
          // update confirmed status on this row
          setExtras(prev =>
            prev.map((r, i) =>
              i === idx
                ? { ...r, confirmed: true }
                : r
            )
          );
          return;
        }
        else{
          return;
        }
      }

      //warning handled, append item
      setConfirmedItems(prev => [
        ...prev,
        { category: rowCategory, amount: rowAmount }
      ]);
      //mark row as confirmed
      setExtras(prev =>
        prev.map((r, i) =>
          i === idx
            ? { ...r, confirmed: true } 
            : r
        )
      );
    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const proceed = window.confirm("Please double-check all entries before submitting invoice...");
    if(!proceed){
      console.log(confirmedItems);
      return;
    }
    try {
      await verifyInput();
      handleUploadClick();
      // convert confirmedItems = [{category, amount}, …]
      // into an object like { FOOD: 24, … }
      const newDocRef = doc(invoiceRef);
      const invoiceFields = confirmedItems.reduce((acc, { category, amount }) => {
        // if this category hasn’t been seen yet, start an empty array
        if (!acc[category]) acc[category] = [];
        // push the amount into that category’s array
        acc[category].push(amount);
        return acc;
      }, {});

      let invoiceDate = new Date(invoiceYear, invoiceMonth - 1, invoiceDay);
      let submitDate = new Date();
      let dd   = String(submitDate.getDate()).padStart(2, '0');
      let mm   = String(submitDate.getMonth() + 1).padStart(2, '0');
      let yyyy = submitDate.getFullYear();
      submitDate = String(mm + "/" + dd + "/" + yyyy);
      console.log(submitDate);
      dd   = String(invoiceDate.getDate()).padStart(2, '0');
      mm   = String(invoiceDate.getMonth() + 1).padStart(2, '0');
      yyyy = invoiceDate.getFullYear();
      invoiceDate = String(mm + "/" + dd + "/" + yyyy);

      const imageRef = ref(storage, `images/${imageUpload.name + v4()}`);
      const snapshot = await uploadBytes(imageRef, imageUpload);
      const url = await getDownloadURL(snapshot.ref);

      await setDoc(
        newDocRef,
        {
          categories:    invoiceFields,
          companyName:   companyName,
          dateSubmitted: submitDate,
          imageURL:      url,
          invoiceDate:   invoiceDate,
          invoiceNumber: invoiceNumber,
          storeID:       selectedStore,
          user_email:    user.email
        },
        { merge: true }
      );
  
      alert("Invoice submitted successfully!");
      // Reset everything
      setInvoiceNumber("");
      setInvoiceMonth(new Date().toLocaleString("default", { month: "long" }));
      setInvoiceYear(new Date().getFullYear().toString());
      setExtras([]);
      setConfirmedItems([]);
      setCompanyName("");
    } catch (error) {
      console.error("Error adding invoice: ", error);
      alert("Error submitting invoice: " + error.message);
    }
  };

  const verifyInput = async () => {
    if (invoiceNumber === "") {
      return Promise.reject(new Error("Invoice Number Required"));
    }
    const d = new Date(invoiceYear, invoiceMonth - 1, invoiceDay);
    if (
      d.getFullYear()  !== invoiceYear  ||
      d.getMonth() + 1 !== invoiceMonth ||
      d.getDate()      !== invoiceDay
    ) {
      return Promise.reject(new Error("Invalid Date Selected"));
    }
    if(!imageUpload){
      return Promise.reject(new Error("Image Upload Required"));
    }
    if(selectedStore === ""){
      return Promise.reject(new Error("Store Selection Required"));
    }
    /*
    try {
      const docSnapShot = await getDoc(doc(db, "invoices", invoiceNumber));
      if (docSnapShot.exists()) {
        return Promise.reject(new Error("Invoice Number Already Exists"));
      }
    } catch (error) {
      console.error("Failed querying the database", error);
      return Promise.reject(new Error("Failed querying the database"));
    }
    */
  };

  const handleUploadClick = async () => {
    if (!imageUpload) {
      alert("Please select a file before uploading.");
      return;
    }
    try {
      const imageRef = ref(storage, `images/${imageUpload.name + v4()}`);
      const snapshot = await uploadBytes(imageRef, imageUpload);
      const url = await getDownloadURL(snapshot.ref);
      setImageUrls(prev => [...prev, url]);
      alert("Image uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed, please try again.");
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.topBar}>Submit Invoice</div>

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          {/* Invoice # */}
          <div className={styles.formGroup}>
            <label>Invoice #</label>
            <input
              type="text"
              placeholder="Enter Invoice Number"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
            />
          </div>

          {/* Store Number (read-only) */}
          <div className={styles.formGroup}>
            <label>Store Number</label>
            <input type="text" value={selectedStore || ""} readOnly />
          </div>

          {/* Company Name */}
          <div className={styles.formGroup}>
            <label>Company Name</label>
            <input
              type="text"
              placeholder="Enter Company Name"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>

          {/* Invoice Date */}
          <div className={styles.formGroup}>
            <label>Invoice Date</label>
            <div className={styles.inputRow}>
              {/* Day */}
              <div className={styles.formGroup}>
                <label>Day</label>
                <select
                  value={invoiceDay}
                  onChange={e => setInvoiceDay(+e.target.value)}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div className={styles.formGroup}>
                <label>Month</label>
                <select
                  value={invoiceMonth}
                  onChange={e => setInvoiceMonth(+e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div className={styles.formGroup}>
                <label>Year</label>
                <select
                  value={invoiceYear}
                  onChange={e => setInvoiceYear(+e.target.value)}
                >
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic Category & Amount Rows */}
          {extras.map((row, idx) => (
            <div key={idx} className={styles.extraRow}>
              <select
                value={row.category}
                disabled={row.confirmed}
                onChange={e => {
                  const val = e.target.value;
                  setExtras(prev =>
                    prev.map((r, i) => (i === idx ? { ...r, category: val, confirmed: false } : r))
                  );
                }}
              >
                <option value="" disabled>Choose Category</option>
                {invoiceCatList.map(cat => (
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
                  onChange={e => {
                    const val = e.target.value;
                    setExtras(prev =>
                      prev.map((r, i) => (i === idx ? { ...r, amount: val, confirmed: false } : r)) //right here
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

          {/* + Add New Amount */}
          <div className={styles.formGroup}>
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAdd}
            >
              + Add New Amount
            </button>
          </div>

          {/* File & Submit */}
          <div className={styles.buttonRow}>
            <input
              type="file"
              onChange={e => setImageUpload(e.target.files[0])}
            />
            <button type="submit" className={styles.submitBtn}>
              Submit Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitInvoice;

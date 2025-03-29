import React, { useState } from "react";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebaseConfig"; // Adjust the path as needed
import styles from "./submitInvoice.module.css";

const SubmitInvoice = () => {
  // State variables for each form field
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [company, setCompany] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [invoiceMonth, setInvoiceMonth] = useState("");
  const [category, setCategory] = useState("Choose Category");
  const [amount, setAmount] = useState("");

  const invoiceRef = collection(db, "invoices");
  // Submit the invoice to Firestore using the invoice number as the document ID
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(invoiceRef, invoiceNumber), {  
        Amount: parseFloat(amount),
        Category: category,
        Company: company,
        Date: new Date(), // date of submission
        Invoice_month: invoiceMonth,
        User_email: userEmail,
      });
      alert("Invoice submitted successfully!");
      // Reset form fields
      setInvoiceNumber("");
      setCompany("");
      setUserEmail("");
      setInvoiceMonth("");
      setCategory("Choose Category");
      setAmount("");
    } catch (error) {
      console.error("Error adding invoice: ", error);
      alert("Error submitting invoice");
    }
  };

  const handleUploadClick = () => {
    alert("Upload Invoice clicked");
  };

  return (
    <div className={styles.pageContainer}>
      {/* Top Bar */}
      <div className={styles.topBar}>Submit Invoice</div>

      {/* Upload Invoice Button */}
      <button className={styles.uploadBar} onClick={handleUploadClick}>
        Upload Invoice (pdf, png, jpg)
      </button>

      {/* Form Container */}
      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          {/* Invoice # */}
          <div className={styles.formGroup}>
            <label>Invoice #</label>
            <input
              type="text"
              placeholder="Enter Invoice Number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>

          {/* Company (benefactor) */}
          <div className={styles.formGroup}>
            <label>Company (benefactor)</label>
            <input
              type="text"
              placeholder="Enter company name"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          {/* Submitting User's Email */}
          <div className={styles.formGroup}>
            <label>Submitting User's Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
          </div>

          {/* Invoice Month Dropdown */}
          <div className={styles.formGroup}>
            <label>Invoice Month</label>
            <select
              value={invoiceMonth}
              onChange={(e) => setInvoiceMonth(e.target.value)}
            >
              <option value="" disabled>
                Select Month
              </option>
              <option value="January">January</option>
              <option value="February">February</option>
              <option value="March">March</option>
              <option value="April">April</option>
              <option value="May">May</option>
              <option value="June">June</option>
              <option value="July">July</option>
              <option value="August">August</option>
              <option value="September">September</option>
              <option value="October">October</option>
              <option value="November">November</option>
              <option value="December">December</option>
            </select>
          </div>

          {/* Category & Amount Row */}
          <div className={styles.inputRow}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Choose Category</option>
              <option>Services</option>
              <option>Supplies</option>
              <option>Other</option>
            </select>
            <input
              type="text"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* + Add Another (for future expansion) */}
          <button type="button" className={styles.addAnotherBtn}>
            + Add Another
          </button>

          {/* Submit Invoice */}
          <button type="submit" className={styles.submitBtn}>
            Submit Invoice
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubmitInvoice;

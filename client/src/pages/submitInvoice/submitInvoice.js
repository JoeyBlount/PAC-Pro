import { db, storage } from "../../config/firebase-config"; // Import initialized Firebase storage
import { v4 } from "uuid"; // UUID for unique image names
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
} from "firebase/storage";
import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import styles from "./submitInvoice.module.css";

const SubmitInvoice = () => {
  const [imageUpload, setImageUpload] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);

  useEffect(() => {
    document.title = "PAC Pro - Submit Invoice";
  }, []); // Used to change title

  // State variables for each form field
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [company, setCompany] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [storeNumber, setStoreNumber] = useState("");
  const [invoiceMonth, setInvoiceMonth] = useState("");
  const [category, setCategory] = useState("Choose Category");
  const [amount, setAmount] = useState("");

  const invoiceRef = collection(db, "invoices");

  // Submit the invoice to Firestore using the invoice number as the document ID
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await verifyInput();

      await setDoc(doc(invoiceRef, invoiceNumber), {
        Amount: parseFloat(amount),
        Category: category,
        Company: company,
        Date: new Date(), // date of submission
        Invoice_month: invoiceMonth,
        User_email: userEmail,
        Store_number: storeNumber,
      });
      alert("Invoice submitted successfully!");
      // Reset form fields
      setInvoiceNumber("");
      setCompany("");
      setUserEmail("");
      setStoreNumber("");
      setInvoiceMonth("");
      setCategory("Choose Category");
      setAmount("");
    } catch (error) {
      console.error("Error adding invoice: ", error);
      alert("Error submitting invoice: " + error.message);
    }
  };

  const verifyInput = async () => {
    if (invoiceNumber === "") {
      return Promise.reject(new Error("Invoice Number Required"));
    } else if (isNaN(invoiceNumber)) {
      return Promise.reject(new Error("Invoice Number Needs to be a Number"));
    }
    if (company === "") {
      return Promise.reject(new Error("Company Required"));
    }
    if (userEmail === "") {
      return Promise.reject(new Error("Email Required"));
    }
    if (storeNumber === "") {
      return Promise.reject(new Error("Store Number Required"));
    } else if (isNaN(storeNumber)) {
      return Promise.reject(new Error("Store Number Needs to be a Number"));
    }
    if (invoiceMonth === "") {
      return Promise.reject(new Error("Invoice Month Required"));
    }
    if (category === "Choose Category") {
      return Promise.reject(new Error("Category Required"));
    }
    if (amount === "") {
      return Promise.reject(new Error("Amount Required"));
    } else if (isNaN(amount)) {
      return Promise.reject(new Error("Amount Needs to be a Number"));
    }
    // Check for duplicate invoice number
    try {
      const docRef = doc(db, "invoices", invoiceNumber);
      const docSnapShot = await getDoc(docRef);
      if (docSnapShot.exists()) {
        return Promise.reject(new Error("Invoice Number Already Exists"));
      }
    } catch (error) {
      console.error("Failed querying the database", error);
      return Promise.reject(new Error("Failed querying the database"));
    }
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
      
      setImageUrls((prev) => [...prev, url]);
      
      alert("Image uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed, please try again.");
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Top Bar */}
      <div className={styles.topBar}>Submit Invoice</div>
      
      {/* Upload Image Button at the Top */}
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

          {/* Store Number */}
          <div className={styles.formGroup}>
            <label>Store Number</label>
            <input
              type="text"
              placeholder="Enter Store Number"
              value={storeNumber}
              onChange={(e) => setStoreNumber(e.target.value)}
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
            {/* Amount input with dollar sign */}
            <div className={styles.amountInputWrapper}>
              <span className={styles.dollarSign}>$</span>
              <input
                type="text"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Bottom Row: File Input and Submit Invoice Button */}
          <div className={styles.buttonRow}>
            <input
              type="file"
              onChange={(event) => setImageUpload(event.target.files[0])}
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

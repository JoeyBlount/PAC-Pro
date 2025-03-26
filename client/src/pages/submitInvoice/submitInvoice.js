import React from "react";
import styles from "./submitInvoice.module.css";

const SubmitInvoice = () => {
  const handleUploadClick = () => {
    alert("Upload Invoice clicked");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Submit Invoice clicked");
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
            <input type="text" placeholder="Enter Invoice Number" />
          </div>

          {/* Company (benefactor) */}
          <div className={styles.formGroup}>
            <label>Company (benefactor)</label>
            <input type="text" placeholder="Enter company name" />
          </div>

          {/* Invoice Date */}
          <div className={styles.formGroup}>
            <label>Invoice Date</label>
            <input type="text" placeholder="mm/dd/yyyy" />
          </div>

          {/* Category & Amount Row */}
          <div className={styles.inputRow}>
            <select>
              <option>Choose Category</option>
              <option>Services</option>
              <option>Supplies</option>
              <option>Other</option>
            </select>
            <input type="text" placeholder="Amount" />
          </div>

          {/* + Add Another */}
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

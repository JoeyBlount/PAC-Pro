import React, { useEffect, useState } from "react";
import Spreadsheet from "react-spreadsheet";
import { db } from "../../config/firebase-config";
import { collection, addDoc, getDocs } from "firebase/firestore";


// Converts your original JSON format to 2D spreadsheet format
const reshapeToSpreadsheet = (json) => {
  const monetaryColumns = [
    "FOOD", "CONDIMENT", "PAPER", "NON PROD", "TRAVEL", "ADV-OTHER",
    "PROMO", "OUTSIDE SVC", "LINEN", "OP. SUPPLY", "M+R", "SML EQUIP",
    "UTILITIES", "OFFICE", "TRAINING", "CR",
  ];

  const headers = [
    "Date Submitted",
    "Invoice Date",
    "Company Name",
    "Invoice Number",
    ...monetaryColumns,
  ];

  const headerRow = headers.map((header) => ({ value: header }));

  const dataRows = json.invoices.map((invoice) => [
    { value: invoice.dateSubmitted || "" },
    { value: invoice.invoiceDate || "" },
    { value: invoice.companyName || "" },
    { value: invoice.invoiceNumber || "" },
    ...monetaryColumns.map((col) => ({
      value: invoice[col]?.[0] || "",
    })),
  ]);

  return [headerRow, ...dataRows];
};

const InvoiceSheet = () => {
  const [spreadsheetData, setSpreadsheetData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedCol, setSelectedCol] = useState(null);

  useEffect(() => {
    fetch("/InvoiceLogTest.json")
      .then((res) => res.json())
      .then((json) => {
        const reshaped = reshapeToSpreadsheet(json);
        setSpreadsheetData(reshaped);
      })
      .catch((err) => console.error("Failed to load JSON", err));
  }, []);

  const deleteSelectedRow = () => {
    console.log("clicked delete row")
    console.log(selectedRow)
    if (selectedRow !== null && selectedRow !== 0) {
      setSpreadsheetData((prev) => prev.filter((_, i) => i !== selectedRow));
      setSelectedRow(null);
    }
  };

  const deleteSelectedCol = () => {
    console.log("clicked delete col")
    if (selectedCol !== null) {
      setSpreadsheetData((prev) =>
        prev.map((row) => row.filter((_, i) => i !== selectedCol))
      );
      setSelectedCol(null);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Invoice Spreadsheet</h2>

      {/* <div style={{ marginBottom: "10px" }}>
        <button onClick={deleteSelectedRow}>Delete Row</button>
        <button onClick={deleteSelectedCol} style={{ marginLeft: "10px" }}>
          Delete Column
        </button>
      </div> */}

      <Spreadsheet
        data={spreadsheetData}
        onChange={setSpreadsheetData}
        onSelect={(cell) => {
            if (cell?.type === "EmptySelection") {
                setSelectedCol(null);
                setSelectedRow(null);
                return;
            } 
        const row = cell?.range?.end?.row;
        const col = cell?.range?.end?.column;

        // console.log("Selected row:", row, "Selected col:", col);
        setSelectedRow(row);
        setSelectedCol(col);
        }}
      />
        {/* <button
            onClick={async () => {
                try {
                const invoiceCollection = collection(db, "invoices");

                // Convert spreadsheetData back to a JSON array of rows
                const [headerRow, ...dataRows] = spreadsheetData;
                const headers = headerRow.map((cell) => cell.value);

                const invoices = dataRows.map((row) => {
                    const obj = {};
                    row.forEach((cell, index) => {
                    const key = headers[index];
                    obj[key] = cell.value;
                    });
                    return obj;
                });

                await addDoc(invoiceCollection, {
                    timestamp: new Date(),
                    invoices,
                });

                alert("Invoices saved to Firestore!");
                } catch (err) {
                console.error("Error saving to Firestore", err);
                }
            }}
            >
            Save to Firestore
            </button> */}
    </div>
    
  );
};

export default InvoiceSheet;

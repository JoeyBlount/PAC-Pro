import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase-config";
import { Container, Typography } from "@mui/material";
import styles from "./InvoiceSettings.module.css";

const InvoiceSettings = () => {
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId]     = useState(null);
  const [editValue, setEditValue]     = useState("");

  const invoiceCatRef  = collection(db, "invoiceCategories");
  const invoiceCatList = ["FOOD", "CONDIMENT", "NONPRODUCT", "PAPER", "TRAVEL"];

  const getCategories = async () => {
    const categoryData = [];
    try {
      for (const id of invoiceCatList) {
        const docRef  = doc(invoiceCatRef, id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          throw new Error("doc for " + id + " does not exist");
        }
        categoryData.push({ id, ...docSnap.data() });
      }
    } catch (error) {
      console.error("Failure querying database for categories:", error);
    }
    return categoryData;
  };

  useEffect(() => {
    getCategories()
      .then(data => setCategories(data))
      .catch(err => console.error(err));
  }, []);

  const editDoc = async (id, newAccount) => {
    try{
      if(isNaN(newAccount)){
        throw new Error("account number must be numeric");
      }
      const ref = doc(invoiceCatRef, id);
      await updateDoc(ref, { bankAccountNum: newAccount });
      //document is now updated, now re-set the local array to hold the updated value:
      const updatedData = await getCategories();
      setCategories(updatedData);
    } catch (error) {
      console.error("Error: ", error);
      alert("Failure changing bankAccountNum: " + error.message);
    }
  };

  return (
    <Container sx={{ textAlign: "center", mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Invoice Settings
      </Typography>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.headerCell}>Category</th>
            <th className={styles.headerCell}>Account</th>
            <th className={styles.headerCell}>Action</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => (
            <tr key={cat.id}>
              <td className={styles.cell}>{cat.id}</td>

              <td className={styles.cell}>
                {editingId === cat.id ? (
                  <input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                  />
                ) : (
                  cat.bankAccountNum 
                )}
              </td>

              <td className={styles.cell}>
                {editingId === cat.id ? (
                  <>
                    <button
                      className={styles.editButton}
                      onClick={() => {
                        editDoc(cat.id, editValue);
                        setEditingId(null);
                      }}
                    >
                      Save
                    </button>
                    <button
                      className={styles.editButton}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className={styles.editButton}
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditValue(cat.bankAccountNum);
                    }}
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Container>
  );
};

export default InvoiceSettings;

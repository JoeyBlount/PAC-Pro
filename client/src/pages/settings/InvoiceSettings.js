// invoicesettings.js (Modified)
import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase-config";
import { Container, Typography } from "@mui/material";
import styles from "./InvoiceSettings.module.css"; 
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';

export const invoiceCatList = ["FOOD", "CONDIMENT", "NONPRODUCT", "PAPER", "TRAVEL"];

const InvoiceSettings = () => {
  const { userRole } = useAuth(); // Get current user's role
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  // Determine permissions based on role
  const canEditSettings = userRole === ROLES.ADMIN; // Only Admin can edit invoice settings
  const canViewSettings = userRole === ROLES.ADMIN || userRole === ROLES.ACCOUNTANT || userRole === ROLES.OFFICE_MANAGER || userRole === ROLES.GENERAL_MANAGER || userRole === ROLES.SUPERVISOR; // Example: Everyone can view
  // Refine canViewSettings based on precise requirements if needed.
  // The story implies GM/Supervisor have NO access to settings. Let's adjust:
  const canActuallyView = userRole === ROLES.ADMIN || userRole === ROLES.ACCOUNTANT || userRole === ROLES.OFFICE_MANAGER; // Only these roles can view this page
  const isViewOnly = userRole === ROLES.ACCOUNTANT; // Accountants have view-only


  const invoiceCatRef = collection(db, "invoiceCategories");

  const getCategories = async () => {
    // ... (logic remains the same)
  };

  useEffect(() => {
    if (canActuallyView) { // Only fetch if allowed to view
      getCategories()
        .then(data => setCategories(data))
        .catch(err => console.error(err));
    }
  }, [canActuallyView]); // Re-run if view permission changes

  const editDoc = async (id, newAccount) => {
    // ... (logic remains the same, but it will only be called if canEditSettings is true)
  };

  // Render Access Denied if user doesn't have view permission
  if (!canActuallyView) {
    return (
      <Container sx={{ textAlign: "center", mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Invoice Settings
        </Typography>
        <Typography variant="body1" color="error" sx={{ mt: 2 }}>
          You do not have permission to access this page.
        </Typography>
      </Container>
    );
  }

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
            {/* Only show Action column if user can edit */}
            {canEditSettings && !isViewOnly && <th className={styles.headerCell}>Action</th>}
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => (
            <tr key={cat.id}>
              <td className={styles.cell}>{cat.id}</td>
              <td className={styles.cell}>
                {/* Show input only if editing AND user has edit permissions */}
                {editingId === cat.id && canEditSettings && !isViewOnly ? (
                  <input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                  />
                ) : (
                  cat.bankAccountNum
                )}
              </td>
              {/* Only show action cell content if user can edit */}
              {canEditSettings && !isViewOnly && (
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
                        // Only allow entering edit mode if user can edit
                        if (canEditSettings) {
                          setEditingId(cat.id);
                          setEditValue(cat.bankAccountNum);
                        }
                      }}
                    >
                      Edit
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </Container>
  );
};

export default InvoiceSettings;
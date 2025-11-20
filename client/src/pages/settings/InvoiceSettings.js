// invoicesettings.js (Modified)
import React, { useState, useEffect } from "react";
// Firestore access moved to backend API
import { Container, Typography } from "@mui/material";
import styles from "./InvoiceSettings.module.css"; 
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { apiUrl } from '../../utils/api';

//export const invoiceCatList = ["FOOD", "CONDIMENT", "NONPRODUCT", "PAPER", "TRAVEL"];
// All categories from invoice log, organized in PAC page order
// First 4: Food, Condiment, Paper, Non product (as requested)
// Then remaining categories from invoice log
export const invoiceCatList = [
  "FOOD", "CONDIMENT", "PAPER", "NONPRODUCT", // First 4 as requested
  "TRAVEL", "ADV-OTHER", "PROMO", "OUTSIDE SVC", 
  "LINEN", "OP. SUPPLY", "M+R", "SML EQUIP", 
  "UTILITIES", "OFFICE", "TRAINING", "CREW RELATIONS"
];

const InvoiceSettings = () => {
  const { userRole, getToken } = useAuth(); // Get current user's role
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


  // Fetch categories from backend
  const getCategories = async () => {
    try {
      const token = await getToken();
      const response = await fetch(apiUrl('/api/pac/invoice-settings/categories'), {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole || '',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }
      const data = await response.json();
      return Array.isArray(data.categories) ? data.categories : [];
    } catch (error) {
      console.error("Failure querying backend for categories:", error);
      return [];
    }
  };

  useEffect(() => {
    if (canActuallyView) { // Only fetch if allowed to view
      getCategories()
        .then(data => {
          console.log("Loaded categories:", data);
          setCategories(data);
        })
        .catch(err => console.error(err));
    }
  }, [canActuallyView]); // Re-run if view permission changes
  //broken code unflagged here?

  const editDoc = async (id, newAccount) => {
    try {
      if (isNaN(newAccount)) {
        throw new Error("account number must be numeric");
      }
      // Optimistic update: show new value immediately
      const previousCategories = categories;
      const optimisticCategories = categories.map(c =>
        c.id === id ? { ...c, bankAccountNum: String(newAccount) } : c
      );
      setCategories(optimisticCategories);

      const token = await getToken();
      const response = await fetch(apiUrl(`/api/pac/invoice-settings/category/${encodeURIComponent(id)}`) , {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'X-User-Role': userRole || '',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ bankAccountNum: String(newAccount) })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        // Revert optimistic update on error
        setCategories(previousCategories);
        throw new Error(err.detail || `HTTP ${response.status}`);
      }
      // Optionally refresh from backend to keep in sync (will keep optimistic UI)
      getCategories().then(setCategories).catch(() => {});
    } catch (error) {
      console.error("Error: ", error);
      alert("Failure changing bankAccountNum: " + error.message);
    }
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
          {categories.length === 0 ? (
            <tr>
              <td colSpan={canEditSettings && !isViewOnly ? 3 : 2} className={styles.cell}>
                Loading categories... (Check browser console for details)
              </td>
            </tr>
          ) : (
            categories.map(cat => (
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
            ))
          )}
        </tbody>
      </table>
    </Container>
  );
};

export default InvoiceSettings;
import { db, auth } from "../config/firebase-config";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { invoiceCatList } from "../pages/settings/InvoiceSettings";
import { apiUrl } from "../utils/api";
// PAC Actual computation now handled by backend API

/**
 * Service to manage invoice totals aggregation
 * Creates and updates invoice_log_totals collection with monthly totals per store
 */

// Category IDs that match the invoice categories
const CATEGORY_IDS = [
  "FOOD",
  "CONDIMENT",
  "PAPER",
  "NONPRODUCT",
  "TRAVEL",
  "ADV-OTHER",
  "PROMO",
  "OUTSIDE SVC",
  "LINEN",
  "OP. SUPPLY",
  "M+R",
  "SML EQUIP",
  "UTILITIES",
  "OFFICE",
  "TRAINING",
  "CREW RELATIONS",
];

/**
 * Recompute monthly totals for a specific store and month/year
 * @param {string} storeID - Store identifier
 * @param {number} targetMonth - Month (1-12)
 * @param {number} targetYear - Year
 */
export const recomputeMonthlyTotals = async (
  storeID,
  targetMonth,
  targetYear
) => {
  if (!storeID || !targetMonth || !targetYear) {
    console.warn("Missing required parameters for recomputeMonthlyTotals");
    return;
  }

  try {
    // Query all invoices for this store and month/year
    const invoicesQuery = query(
      collection(db, "invoices"),
      where("storeID", "==", storeID),
      where("targetMonth", "==", Number(targetMonth)),
      where("targetYear", "==", Number(targetYear))
    );

    const invoicesSnapshot = await getDocs(invoicesQuery);

    // Initialize totals object with all categories set to 0
    const totals = {};
    CATEGORY_IDS.forEach((categoryId) => {
      totals[categoryId] = 0;
    });

    // Aggregate totals from all invoices
    invoicesSnapshot.forEach((invoiceDoc) => {
      const invoiceData = invoiceDoc.data() || {};
      const categories = invoiceData.categories || {};

      CATEGORY_IDS.forEach((categoryId) => {
        const categoryValue = categories[categoryId];

        if (Array.isArray(categoryValue)) {
          // Sum all values in the array
          const sum = categoryValue.reduce(
            (acc, val) => acc + (Number(val) || 0),
            0
          );
          totals[categoryId] += sum;
        } else if (typeof categoryValue === "number") {
          totals[categoryId] += categoryValue;
        }
      });
    });

    // Create document ID: storeID_YYYYMM
    const docId = `${storeID}_${targetYear}${String(targetMonth).padStart(
      2,
      "0"
    )}`;

    // Save to invoice_log_totals collection
    const totalsRef = doc(db, "invoice_log_totals", docId);
    await setDoc(
      totalsRef,
      {
        storeID,
        targetMonth: Number(targetMonth),
        targetYear: Number(targetYear),
        totals,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    /*console.log(
      `Updated invoice totals for ${storeID} - ${targetMonth}/${targetYear}:`,
      totals
    );*/

    // Trigger PAC actual recalculation after invoice totals are updated
    try {
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const monthName = months[targetMonth - 1];
      const yearMonth = `${targetYear}${String(targetMonth).padStart(2, "0")}`;

      /*console.log(
        `[Invoice Totals] Triggering PAC actual recalculation for ${storeID} - ${monthName} ${targetYear}`
      );*/

      // Ensure user is authenticated before making API call
      if (!auth.currentUser) {
        throw new Error(
          "User not authenticated. Cannot compute PAC actual without authentication."
        );
      }

      const token = await auth.currentUser.getIdToken();
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const response = await fetch(apiUrl(`/api/pac/actual/compute`), {
        method: "POST",
        headers,
        body: JSON.stringify({
          store_id: storeID,
          year_month: yearMonth,
          submitted_by: "System",
        }),
      });

      if (!response.ok) {
        // 404 is expected for future months that don't have generate_input data yet
        if (response.status === 404) {
          console.log(
            `[Invoice Totals] No generate_input data for ${storeID} - ${monthName} ${targetYear} (expected for future months)`
          );
        } else {
          const errorText = await response.text();
          throw new Error(
            `Failed to compute PAC actual: ${errorText || response.statusText}`
          );
        }
      } else {
        console.log(
          `[Invoice Totals] PAC actual recalculation completed for ${storeID} - ${monthName} ${targetYear}`
        );
      }

      /*console.log(
        `[Invoice Totals] PAC actual recalculation completed for ${storeID} - ${monthName} ${targetYear}`
      );*/
    } catch (pacError) {
      console.error(
        `[Invoice Totals] Failed to recalculate PAC actual for ${storeID}:`,
        pacError
      );
      // Don't fail the invoice totals update if PAC recalculation fails
    }
  } catch (error) {
    console.error("Error recomputing monthly totals:", error);
    throw error;
  }
};

/**
 * Recompute totals for all stores and months (backfill)
 * @param {string} storeID - Optional store ID to limit to specific store
 */
export const backfillInvoiceTotals = async (storeID = null) => {
  try {
    // Query all invoices (optionally filtered by store)
    let invoicesQuery = collection(db, "invoices");
    if (storeID) {
      invoicesQuery = query(invoicesQuery, where("storeID", "==", storeID));
    }

    const invoicesSnapshot = await getDocs(invoicesQuery);

    // Collect unique (storeID, targetMonth, targetYear) combinations
    const uniqueCombinations = new Set();

    invoicesSnapshot.forEach((invoiceDoc) => {
      const invoiceData = invoiceDoc.data() || {};
      if (
        invoiceData.storeID &&
        invoiceData.targetMonth &&
        invoiceData.targetYear
      ) {
        const key = `${invoiceData.storeID}|${invoiceData.targetMonth}|${invoiceData.targetYear}`;
        uniqueCombinations.add(key);
      }
    });

    /*console.log(
      `Found ${uniqueCombinations.size} unique store/month combinations to process`
    );*/

    // Process each unique combination
    let processed = 0;
    for (const combination of uniqueCombinations) {
      const [s, m, y] = combination.split("|");
      await recomputeMonthlyTotals(s, Number(m), Number(y));
      processed++;
    }

    console.log(`Successfully processed ${processed} store/month combinations`);
    return { success: true, processed };
  } catch (error) {
    console.error("Error in backfillInvoiceTotals:", error);
    throw error;
  }
};

/**
 * Get invoice totals for a specific store and month
 * @param {string} storeID - Store identifier
 * @param {number} targetMonth - Month (1-12)
 * @param {number} targetYear - Year
 * @returns {Promise<Object|null>} - Totals object or null if not found
 */
export const getInvoiceTotals = async (storeID, targetMonth, targetYear) => {
  try {
    const docId = `${storeID}_${targetYear}${String(targetMonth).padStart(
      2,
      "0"
    )}`;
    const totalsRef = doc(db, "invoice_log_totals", docId);
    const totalsDoc = await getDoc(totalsRef);

    if (totalsDoc.exists()) {
      return totalsDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting invoice totals:", error);
    return null;
  }
};

export default {
  recomputeMonthlyTotals,
  backfillInvoiceTotals,
  getInvoiceTotals,
};

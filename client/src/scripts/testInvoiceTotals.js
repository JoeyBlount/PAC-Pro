/**
 * Test script for invoice totals functionality
 * Run this in browser console to test the invoice totals service
 */

import {
  backfillInvoiceTotals,
  getInvoiceTotals,
} from "../services/invoiceTotalsService";

// Test function to run backfill
window.testInvoiceTotals = async () => {
  try {
    console.log("Starting invoice totals backfill...");
    const result = await backfillInvoiceTotals();
    console.log("Backfill completed:", result);
    return result;
  } catch (error) {
    console.error("Backfill failed:", error);
    throw error;
  }
};

// Test function to get totals for a specific store/month
window.getTotalsForStore = async (storeID, month, year) => {
  try {
    const totals = await getInvoiceTotals(storeID, month, year);
    console.log(`Totals for ${storeID} - ${month}/${year}:`, totals);
    return totals;
  } catch (error) {
    console.error("Failed to get totals:", error);
    throw error;
  }
};

console.log("Invoice totals test functions loaded:");
console.log("- testInvoiceTotals() - Run backfill for all stores");
console.log(
  "- getTotalsForStore(storeID, month, year) - Get totals for specific store/month"
);

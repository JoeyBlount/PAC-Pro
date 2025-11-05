import { db } from "../config/firebase-config";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { computeAndSavePacActual } from "./pacActualService";

/**
 * Service to manage generate input data
 * Saves user inputs from the Generate tab to Firebase
 */

/**
 * Save generate input data to Firestore
 * @param {string} storeID - Store identifier
 * @param {number} year - Year
 * @param {string} month - Month name
 * @param {Object} inputData - All input fields from Generate tab
 * @param {string} submittedBy - User's full name who submitted the data
 */
export const saveGenerateInput = async (
  storeID,
  year,
  month,
  inputData,
  submittedBy
) => {
  if (!storeID || !year || !month) {
    throw new Error("Missing required parameters for saveGenerateInput");
  }

  try {
    // Convert month name to number (1-12)
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
    const monthIndex = months.indexOf(month);
    if (monthIndex === -1) {
      throw new Error(`Invalid month name: ${month}`);
    }
    const monthNumber = monthIndex + 1;

    // Create document ID: storeID_YYYYMM
    const docId = `${storeID}_${year}${String(monthNumber).padStart(2, "0")}`;

    // Get existing data to preserve non-zero values
    const docRef = doc(db, "generate_input", docId);
    const existingDoc = await getDoc(docRef);
    const existingData = existingDoc.exists() ? existingDoc.data() : null;

    // Helper function to get existing value or default to 0
    const getExistingValue = (section, field) => {
      if (
        existingData &&
        existingData[section] &&
        existingData[section][field] !== undefined
      ) {
        return Number(existingData[section][field]) || 0;
      }
      return 0;
    };

    // Helper function to update value only if provided in inputData
    const getValue = (section, field, inputKey) => {
      if (
        inputData[inputKey] !== undefined &&
        inputData[inputKey] !== null &&
        inputData[inputKey] !== ""
      ) {
        return Number(inputData[inputKey]) || 0;
      }
      return getExistingValue(section, field);
    };

    // Structure the data, preserving existing values for fields not provided
    const generateData = {
      storeID,
      year: Number(year),
      month,
      monthNumber,
      submittedBy: submittedBy || "Unknown User",

      // Sales section - only update fields that are provided
      sales: {
        productNetSales: getValue(
          "sales",
          "productNetSales",
          "productNetSales"
        ),
        cash: getValue("sales", "cash", "cash"),
        promo: getValue("sales", "promo", "promo"),
        allNetSales: getValue("sales", "allNetSales", "allNetSales"),
        managerMeal: getValue("sales", "managerMeal", "managerMeal"),
        advertising: getValue("sales", "advertising", "advertising"),
        duesAndSubscriptions: getValue(
          "sales",
          "duesAndSubscriptions",
          "duesAndSubscriptions"
        ),
      },

      // Labor section - only update fields that are provided
      labor: {
        crewLabor: getValue("labor", "crewLabor", "crewLabor"),
        totalLabor: getValue("labor", "totalLabor", "totalLabor"),
        payrollTax: getValue("labor", "payrollTax", "payrollTax"),
        additionalLaborDollars: getValue(
          "labor",
          "additionalLaborDollars",
          "additionalLaborDollars"
        ),
      },

      // Food section - only update fields that are provided
      food: {
        completeWaste: getValue("food", "completeWaste", "completeWaste"),
        rawWaste: getValue("food", "rawWaste", "rawWaste"),
        condiment: getValue("food", "condiment", "condiment"),
        variance: getValue("food", "variance", "variance"),
        unexplained: getValue("food", "unexplained", "unexplained"),
        discounts: getValue("food", "discounts", "discounts"),
        baseFood: getValue("food", "baseFood", "baseFood"),
      },

      // Inventory - Starting - only update fields that are provided
      inventoryStarting: {
        food: getValue("inventoryStarting", "food", "startingFood"),
        condiment: getValue(
          "inventoryStarting",
          "condiment",
          "startingCondiment"
        ),
        paper: getValue("inventoryStarting", "paper", "startingPaper"),
        nonProduct: getValue(
          "inventoryStarting",
          "nonProduct",
          "startingNonProduct"
        ),
        opsSupplies: getValue(
          "inventoryStarting",
          "opsSupplies",
          "startingOpsSupplies"
        ),
      },

      // Inventory - Ending - only update fields that are provided
      inventoryEnding: {
        food: getValue("inventoryEnding", "food", "endingFood"),
        condiment: getValue("inventoryEnding", "condiment", "endingCondiment"),
        paper: getValue("inventoryEnding", "paper", "endingPaper"),
        nonProduct: getValue(
          "inventoryEnding",
          "nonProduct",
          "endingNonProduct"
        ),
        opsSupplies: getValue(
          "inventoryEnding",
          "opsSupplies",
          "endingOpsSupplies"
        ),
      },

      // Timestamp
      updatedAt: serverTimestamp(),
    };

    // Save to Firestore
    await setDoc(docRef, generateData, { merge: true });

    console.log(`Saved generate input data for ${storeID} - ${month} ${year}`);

    // Trigger PAC actual recalculation after generate input is saved
    try {
      console.log(
        `[Generate Input] Triggering PAC actual recalculation for ${storeID} - ${month} ${year}`
      );
      await computeAndSavePacActual(storeID, year, month, submittedBy);
      console.log(
        `[Generate Input] PAC actual recalculation completed for ${storeID} - ${month} ${year}`
      );
    } catch (pacError) {
      console.error(
        `[Generate Input] Failed to recalculate PAC actual for ${storeID}:`,
        pacError
      );
      // Don't fail the generate input save if PAC recalculation fails
    }

    return { success: true, docId };
  } catch (error) {
    console.error("Error saving generate input:", error);
    throw error;
  }
};

/**
 * Get generate input data from Firestore
 * @param {string} storeID - Store identifier
 * @param {number} year - Year
 * @param {string} month - Month name
 * @returns {Promise<Object|null>} - Generate input data or null if not found
 */
export const getGenerateInput = async (storeID, year, month) => {
  try {
    // Convert month name to number (1-12)
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
    const monthIndex = months.indexOf(month);
    if (monthIndex === -1) {
      throw new Error(`Invalid month name: ${month}`);
    }
    const monthNumber = monthIndex + 1;

    const docId = `${storeID}_${year}${String(monthNumber).padStart(2, "0")}`;
    const docRef = doc(db, "generate_input", docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting generate input:", error);
    return null;
  }
};

export default {
  saveGenerateInput,
  getGenerateInput,
};

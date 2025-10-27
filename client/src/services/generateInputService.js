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

    // Structure the data exactly as it appears on the frontend
    const generateData = {
      storeID,
      year: Number(year),
      month,
      monthNumber,
      submittedBy: submittedBy || "Unknown User",

      // Sales section
      sales: {
        productNetSales: Number(inputData.productNetSales) || 0,
        cash: Number(inputData.cash) || 0,
        promo: Number(inputData.promo) || 0,
        allNetSales: Number(inputData.allNetSales) || 0,
        managerMeal: Number(inputData.managerMeal) || 0,
        advertising: Number(inputData.advertising) || 0,
      },

      // Labor section
      labor: {
        crewLabor: Number(inputData.crewLabor) || 0,
        totalLabor: Number(inputData.totalLabor) || 0,
        payrollTax: Number(inputData.payrollTax) || 0,
      },

      // Food section (renamed from waste to match frontend title)
      food: {
        completeWaste: Number(inputData.completeWaste) || 0,
        rawWaste: Number(inputData.rawWaste) || 0,
        condiment: Number(inputData.condiment) || 0,
        variance: Number(inputData.variance) || 0,
        unexplained: Number(inputData.unexplained) || 0,
        discounts: Number(inputData.discounts) || 0,
        baseFood: Number(inputData.baseFood) || 0,
      },

      // Inventory - Starting
      inventoryStarting: {
        food: Number(inputData.startingFood) || 0,
        condiment: Number(inputData.startingCondiment) || 0,
        paper: Number(inputData.startingPaper) || 0,
        nonProduct: Number(inputData.startingNonProduct) || 0,
        opsSupplies: Number(inputData.startingOpsSupplies) || 0,
      },

      // Inventory - Ending
      inventoryEnding: {
        food: Number(inputData.endingFood) || 0,
        condiment: Number(inputData.endingCondiment) || 0,
        paper: Number(inputData.endingPaper) || 0,
        nonProduct: Number(inputData.endingNonProduct) || 0,
        opsSupplies: Number(inputData.endingOpsSupplies) || 0,
      },

      // Timestamp
      updatedAt: serverTimestamp(),
    };

    // Save to Firestore
    const docRef = doc(db, "generate_input", docId);
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

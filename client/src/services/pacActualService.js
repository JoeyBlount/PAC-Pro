import { db } from "../config/firebase-config";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

/**
 * Service to calculate and store PAC actual data
 * This service computes actual PAC values based on generate input and invoice log totals
 */

// Normalize various store id formats to canonical "store_XXX"
// Accepts: "store_001", "Store 1", "1", "001" → returns "store_001"
function normalizeStoreId(storeId) {
  if (!storeId) return storeId;
  const raw = String(storeId).trim();
  const match = raw.match(/(\d{1,3})$/); // capture trailing number
  if (match) {
    const num = String(parseInt(match[1], 10)).padStart(3, "0");
    return `store_${num}`;
  }
  return raw.toLowerCase();
}

/**
 * Calculate PAC actual data and save to Firestore
 * @param {string} storeID - Store identifier
 * @param {number} year - Year
 * @param {string} month - Month name
 * @param {string} submittedBy - User who triggered the calculation
 */
export const computeAndSavePacActual = async (
  storeID,
  year,
  month,
  submittedBy
) => {
  try {
    const normalizedStoreId = normalizeStoreId(storeID);
    console.log("[PAC Actual] Starting computation for:", {
      storeID: normalizedStoreId,
      year,
      month,
      submittedBy,
    });

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

    console.log("[PAC Actual] Fetching data from collections...");
    // Get data from all three collections
    const [generateInput, invoiceLogTotals, pacProjections] = await Promise.all(
      [
        getGenerateInput(normalizedStoreId, year, month),
        getInvoiceLogTotals(normalizedStoreId, year, month),
        getPacProjections(normalizedStoreId, year, month),
      ]
    );

    console.log("[PAC Actual] Data fetched:", {
      hasGenerateInput: !!generateInput,
      hasInvoiceLogTotals: !!invoiceLogTotals,
      hasPacProjections: !!pacProjections,
    });

    // Debug: Log the actual data structures
    if (generateInput) {
      console.log("[PAC Actual] Generate Input data:", generateInput);
    }
    if (invoiceLogTotals) {
      console.log("[PAC Actual] Invoice Log Totals data:", invoiceLogTotals);
    }

    if (!generateInput) {
      throw new Error("No generate input data found");
    }

    // Make invoice log totals optional - use empty data if not found
    if (!invoiceLogTotals) {
      console.warn(
        "[PAC Actual] No invoice log totals found - using empty data"
      );
      invoiceLogTotals = { totals: {} };
    }

    // Make pac projections optional
    if (!pacProjections) {
      console.warn("[PAC Actual] No pac projections found - using empty data");
      pacProjections = {};
    }

    // Calculate PAC actual data
    const pacActualData = calculatePacActual(
      generateInput,
      invoiceLogTotals,
      pacProjections
    );

    // Determine last updated timestamp and user
    const timestamps = [
      {
        timestamp: generateInput.updatedAt,
        user: generateInput.submittedBy || submittedBy || "System",
      },
      ...(invoiceLogTotals?.updatedAt
        ? [
            {
              timestamp: invoiceLogTotals.updatedAt, // invoice_log_totals uses 'updatedAt', not 'lastUpdatedAt'
              user: invoiceLogTotals.updatedBy || submittedBy || "System",
            },
          ]
        : []),
      ...(pacProjections?.updatedAt
        ? [
            {
              timestamp: pacProjections.updatedAt,
              user: pacProjections?.updatedBy || submittedBy || "System",
            },
          ]
        : []),
    ].filter((item) => item.timestamp);

    const mostRecent =
      timestamps.length > 0
        ? timestamps.reduce((latest, current) =>
            current.timestamp > latest.timestamp ? current : latest
          )
        : { timestamp: null, user: submittedBy };

    // Create document ID: storeID_YYYYMM
    const docId = `${normalizedStoreId}_${year}${String(monthNumber).padStart(
      2,
      "0"
    )}`;

    const pacActualDoc = {
      storeID: normalizedStoreId,
      store: `Store ${normalizedStoreId.split("_")[1] || normalizedStoreId}`, // Extract store number
      year: Number(year),
      month,
      monthNumber,
      lastUpdatedAt: serverTimestamp(),
      lastUpdatedBy: submittedBy || "System",

      // Store the source data timestamps for reference
      sourceData: {
        generateInputUpdatedAt: generateInput.updatedAt,
        generateInputUpdatedBy:
          generateInput.submittedBy || submittedBy || "System",
        invoiceLogTotalsUpdatedAt: invoiceLogTotals?.updatedAt || null,
        invoiceLogTotalsUpdatedBy:
          invoiceLogTotals?.updatedBy || submittedBy || "System",
        pacProjectionsUpdatedAt: pacProjections?.updatedAt || null,
        pacProjectionsUpdatedBy:
          pacProjections?.updatedBy || submittedBy || "System",
        mostRecentSourceUpdatedAt: mostRecent.timestamp || null,
        mostRecentSourceUpdatedBy: mostRecent.user || submittedBy || "System",
      },

      ...pacActualData,
    };

    console.log("[PAC Actual] Saving to Firestore...", {
      collection: "pac_actual",
      docId,
      storeID: pacActualDoc.storeID,
      year: pacActualDoc.year,
      month: pacActualDoc.month,
    });

    // Save to Firestore
    const docRef = doc(db, "pac_actual", docId);
    await setDoc(docRef, pacActualDoc, { merge: true });

    console.log(
      `[PAC Actual] ✅ Saved successfully for ${storeID} - ${month} ${year}`
    );
    return { success: true, docId, data: pacActualDoc };
  } catch (error) {
    console.error("[PAC Actual] ❌ Error computing and saving:", error);
    console.error("[PAC Actual] Error details:", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Calculate PAC actual values based on generate input and invoice data
 */
const calculatePacActual = (
  generateInput,
  invoiceLogTotals,
  pacProjections
) => {
  const sales = generateInput.sales;
  const food = generateInput.food;
  const labor = generateInput.labor;
  const inventoryStarting = generateInput.inventoryStarting;
  const inventoryEnding = generateInput.inventoryEnding;
  const invoiceTotals = invoiceLogTotals.totals;

  console.log("[PAC Actual] Calculation inputs:", {
    sales,
    food,
    labor,
    inventoryStarting,
    inventoryEnding,
    invoiceTotals,
  });

  console.log("[PAC Actual] Sales data details:", {
    productNetSales: sales.productNetSales,
    allNetSales: sales.allNetSales,
    cash: sales.cash,
    promo: sales.promo,
    managerMeal: sales.managerMeal,
    advertising: sales.advertising,
  });

  console.log("[PAC Actual] Cash value specifically:", sales.cash);
  console.log("[PAC Actual] Cash type:", typeof sales.cash);

  const productSales = Number(sales.productNetSales) || 0;
  const allNetSales = Number(sales.allNetSales) || 0;

  console.log("[PAC Actual] Key values:", {
    productSales,
    allNetSales,
  });

  console.log("[PAC Actual] Inventory values:", {
    inventoryStarting,
    inventoryEnding,
    invoiceTotals,
  });

  // Calculate intermediate values
  const otherFoodComponents =
    (Number(sales.promo) || 0) * 0.3 + // Promotion * 30%
    (Number(sales.managerMeal) || 0) * 0.3 + // Manager Meal * 30%
    ((Number(food.rawWaste) || 0) / 100) * productSales + // Raw Waste % * Product Sales
    ((Number(food.completeWaste) || 0) / 100) * productSales; // Complete Waste % * Product Sales

  const rti =
    ((Number(food.condiment) || 0) / 100) * productSales + // Condiment % * Product Sales
    (Number(inventoryEnding.condiment) || 0) - // Ending Inventory Condiment
    (Number(inventoryStarting.condiment) || 0) - // Beginning Inventory Condiment
    (Number(invoiceTotals.CONDIMENT) || 0); // Invoice Log Totals Condiment

  // Food & Paper calculations
  const baseFood =
    (Number(inventoryStarting.food) || 0) + // Beginning Inventory Food
    (Number(invoiceTotals.FOOD) || 0) - // Invoice Log Totals Food
    (Number(inventoryEnding.food) || 0) - // Ending Inventory Food
    rti - // RTI
    otherFoodComponents; // Other Food Components

  const employeeMeal = (Number(sales.managerMeal) || 0) * 0.3;
  const condiment = ((Number(food.condiment) || 0) / 100) * productSales;
  const totalWaste =
    ((Number(food.completeWaste) || 0) / 100) * productSales +
    ((Number(food.rawWaste) || 0) / 100) * productSales;
  const paper =
    (Number(inventoryStarting.paper) || 0) + // Beginning Inventory Paper
    (Number(invoiceTotals.PAPER) || 0) - // Invoice Log Totals Paper
    (Number(inventoryEnding.paper) || 0); // Ending Inventory Paper

  // Purchases calculations (from invoice log totals)
  const promotionFromGenerateInput = (Number(sales.promo) || 0) * 0.3;
  const advertisingFromGenerateInput =
    ((Number(sales.advertising) || 0) / 100) * allNetSales;

  // Include invoice log totals for advertising and promotion if they exist
  const promotionFromInvoices = Number(invoiceTotals.PROMOTION) || 0;
  const advertisingFromInvoices = Number(invoiceTotals.ADVERTISING) || 0;

  // Combine both sources for total values
  const promotion = promotionFromGenerateInput + promotionFromInvoices;
  const advertising = advertisingFromGenerateInput + advertisingFromInvoices;

  const cashPlusMinus = -(Number(sales.cash) || 0); // Flip the sign

  console.log("[PAC Actual] Calculated values:", {
    otherFoodComponents,
    rti,
    baseFood,
    employeeMeal,
    condiment,
    totalWaste,
    paper,
    promotion,
    promotionFromGenerateInput,
    promotionFromInvoices,
    advertising,
    advertisingFromGenerateInput,
    advertisingFromInvoices,
    cashPlusMinus,
  });

  console.log("[PAC Actual] Cash calculation details:", {
    originalCash: sales.cash,
    numberCash: Number(sales.cash),
    flippedCash: -(Number(sales.cash) || 0),
    finalCashPlusMinus: cashPlusMinus,
  });

  // Labor calculations
  const crewLaborDollars =
    ((Number(labor.crewLabor) || 0) / 100) * productSales;
  const managementLaborDollars =
    (((Number(labor.totalLabor) || 0) - (Number(labor.crewLabor) || 0)) / 100) *
    productSales;
  const payrollTaxDollars =
    ((crewLaborDollars + managementLaborDollars) *
      (Number(labor.payrollTax) || 0)) /
    100;

  // Calculate totals
  const foodAndPaperTotal =
    baseFood + employeeMeal + condiment + totalWaste + paper;
  const laborTotal =
    crewLaborDollars + managementLaborDollars + payrollTaxDollars;
  const purchasesTotal =
    (Number(invoiceTotals.TRAVEL) || 0) +
    advertising + // Advertising (generate input % + invoice log totals)
    (Number(invoiceTotals["ADV-OTHER"]) || 0) +
    promotion + // Promotion (generate input % + invoice log totals)
    (Number(invoiceTotals["OUTSIDE SVC"]) || 0) +
    (Number(invoiceTotals.LINEN) || 0) +
    (Number(invoiceTotals["OP. SUPPLY"]) || 0) +
    (Number(invoiceTotals["M+R"]) || 0) +
    (Number(invoiceTotals["SML EQUIP"]) || 0) +
    (Number(invoiceTotals.UTILITIES) || 0) +
    (Number(invoiceTotals.OFFICE) || 0) +
    cashPlusMinus +
    (Number(invoiceTotals["CREW RELATIONS"]) || 0) +
    (Number(invoiceTotals.TRAINING) || 0);

  const totalControllable = foodAndPaperTotal + laborTotal + purchasesTotal;
  const pacTotal = productSales - totalControllable;

  // Check for NaN values
  if (
    isNaN(foodAndPaperTotal) ||
    isNaN(laborTotal) ||
    isNaN(purchasesTotal) ||
    isNaN(totalControllable) ||
    isNaN(pacTotal)
  ) {
    console.error("[PAC Actual] NaN detected in calculations:", {
      foodAndPaperTotal,
      laborTotal,
      purchasesTotal,
      totalControllable,
      pacTotal,
      productSales,
    });
  }

  console.log("[PAC Actual] Total calculations:", {
    foodAndPaperTotal,
    laborTotal,
    purchasesTotal,
    totalControllable,
    pacTotal,
    productSales,
  });

  // Calculate percentages
  const calculatePercentage = (dollars) =>
    productSales > 0 ? (dollars / productSales) * 100 : 0;

  return {
    sales: {
      productSales: {
        dollars: productSales,
        percent: 100, // Product sales is always 100% of itself
      },
      allNetSales: {
        dollars: allNetSales,
        percent: calculatePercentage(allNetSales),
      },
    },

    foodAndPaper: {
      baseFood: {
        dollars: baseFood,
        percent: calculatePercentage(baseFood),
      },
      employeeMeal: {
        dollars: employeeMeal,
        percent: calculatePercentage(employeeMeal),
      },
      condiment: {
        dollars: condiment,
        percent: calculatePercentage(condiment),
      },
      totalWaste: {
        dollars: totalWaste,
        percent: calculatePercentage(totalWaste),
      },
      paper: {
        dollars: paper,
        percent: calculatePercentage(paper),
      },
      total: {
        dollars: foodAndPaperTotal,
        percent: calculatePercentage(foodAndPaperTotal),
      },
    },

    labor: {
      crewLabor: {
        dollars: crewLaborDollars,
        percent: calculatePercentage(crewLaborDollars),
      },
      managementLabor: {
        dollars: managementLaborDollars,
        percent: calculatePercentage(managementLaborDollars),
      },
      payrollTax: {
        dollars: payrollTaxDollars,
        percent: calculatePercentage(payrollTaxDollars),
      },
      total: {
        dollars: laborTotal,
        percent: calculatePercentage(laborTotal),
      },
    },

    purchases: {
      travel: {
        dollars: Number(invoiceTotals.TRAVEL) || 0,
        percent: calculatePercentage(Number(invoiceTotals.TRAVEL) || 0),
      },
      advOther: {
        dollars: Number(invoiceTotals["ADV-OTHER"]) || 0,
        percent: calculatePercentage(Number(invoiceTotals["ADV-OTHER"]) || 0),
      },
      promotion: {
        dollars: promotion,
        percent: calculatePercentage(promotion),
      },
      outsideServices: {
        dollars: Number(invoiceTotals["OUTSIDE SVC"]) || 0,
        percent: calculatePercentage(Number(invoiceTotals["OUTSIDE SVC"]) || 0),
      },
      linen: {
        dollars: Number(invoiceTotals.LINEN) || 0,
        percent: calculatePercentage(Number(invoiceTotals.LINEN) || 0),
      },
      opsSupplies: {
        dollars: Number(invoiceTotals["OP. SUPPLY"]) || 0,
        percent: calculatePercentage(Number(invoiceTotals["OP. SUPPLY"]) || 0),
      },
      maintenanceRepair: {
        dollars: Number(invoiceTotals["M+R"]) || 0,
        percent: calculatePercentage(Number(invoiceTotals["M+R"]) || 0),
      },
      smallEquipment: {
        dollars: Number(invoiceTotals["SML EQUIP"]) || 0,
        percent: calculatePercentage(Number(invoiceTotals["SML EQUIP"]) || 0),
      },
      utilities: {
        dollars: Number(invoiceTotals.UTILITIES) || 0,
        percent: calculatePercentage(Number(invoiceTotals.UTILITIES) || 0),
      },
      office: {
        dollars: Number(invoiceTotals.OFFICE) || 0,
        percent: calculatePercentage(Number(invoiceTotals.OFFICE) || 0),
      },
      cashPlusMinus: {
        dollars: cashPlusMinus,
        percent: calculatePercentage(cashPlusMinus),
      },
      crewRelations: {
        dollars: Number(invoiceTotals["CREW RELATIONS"]) || 0,
        percent: calculatePercentage(
          Number(invoiceTotals["CREW RELATIONS"]) || 0
        ),
      },
      training: {
        dollars: Number(invoiceTotals.TRAINING) || 0,
        percent: calculatePercentage(Number(invoiceTotals.TRAINING) || 0),
      },
      advertising: {
        dollars: advertising,
        percent: calculatePercentage(advertising),
      },
      total: {
        dollars: purchasesTotal,
        percent: calculatePercentage(purchasesTotal),
      },
    },

    totals: {
      otherFoodComponents,
      rti,
      totalControllable: {
        dollars: totalControllable,
        percent: calculatePercentage(totalControllable),
      },
      pac: {
        dollars: pacTotal,
        percent: 100 - calculatePercentage(totalControllable),
      },
    },
  };
};

/**
 * Get generate input data
 */
const getGenerateInput = async (storeID, year, month) => {
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
  const monthNumber = monthIndex + 1;
  const docId = `${storeID}_${year}${String(monthNumber).padStart(2, "0")}`;

  console.log("[PAC Actual] Fetching generate_input:", docId);
  const docRef = doc(db, "generate_input", docId);
  const docSnap = await getDoc(docRef);
  const exists = docSnap.exists();
  console.log(`[PAC Actual] generate_input ${exists ? "found" : "NOT FOUND"}`);
  return exists ? docSnap.data() : null;
};

/**
 * Get invoice log totals data
 */
const getInvoiceLogTotals = async (storeID, year, month) => {
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
  const monthNumber = monthIndex + 1;
  const docId = `${storeID}_${year}${String(monthNumber).padStart(2, "0")}`;

  console.log("[PAC Actual] Fetching invoice_log_totals:", docId);
  const docRef = doc(db, "invoice_log_totals", docId);
  const docSnap = await getDoc(docRef);
  const exists = docSnap.exists();
  console.log(
    `[PAC Actual] invoice_log_totals ${exists ? "found" : "NOT FOUND"}`
  );
  return exists ? docSnap.data() : null;
};

/**
 * Get PAC projections data
 */
const getPacProjections = async (storeID, year, month) => {
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
  const monthNumber = monthIndex + 1;
  const docId = `${storeID}_${year}${String(monthNumber).padStart(2, "0")}`;

  const docRef = doc(db, "pac-projections", docId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};

/**
 * Get PAC actual data from Firestore
 * @param {string} storeID - Store identifier
 * @param {number} year - Year
 * @param {string} month - Month name
 * @returns {Promise<Object|null>} - PAC actual data or null if not found
 */
export const getPacActual = async (storeID, year, month) => {
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
    const monthIndex = months.indexOf(month);
    const monthNumber = monthIndex + 1;
    const docId = `${storeID}_${year}${String(monthNumber).padStart(2, "0")}`;

    const docRef = doc(db, "pac_actual", docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error getting PAC actual:", error);
    return null;
  }
};

export default {
  computeAndSavePacActual,
  getPacActual,
};

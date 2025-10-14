// Script to create all invoice categories in Firestore
// Run this script once to set up all the required categories

import { db } from "../config/firebase-config";
import { collection, doc, setDoc } from "firebase/firestore";

// All categories from invoice log, organized in PAC page order
const invoiceCategories = [
  "FOOD", "CONDIMENT", "PAPER", "NONPRODUCT", // First 4 as requested
  "TRAVEL", "ADV-OTHER", "PROMO", "OUTSIDE SVC", 
  "LINEN", "OP. SUPPLY", "M+R", "SML EQUIP", 
  "UTILITIES", "OFFICE", "TRAINING", "CREW RELATIONS"
];

const setupInvoiceCategories = async () => {
  console.log("Setting up invoice categories...");
  
  try {
    const invoiceCatRef = collection(db, "invoiceCategories");
    
    for (const categoryId of invoiceCategories) {
      const docRef = doc(invoiceCatRef, categoryId);
      
      // Create document with default values
      await setDoc(docRef, {
        bankAccountNum: "0000", // Default account number
        name: categoryId,
        createdAt: new Date().toISOString(),
        description: `Account settings for ${categoryId} category`
      });
      
      console.log(`✅ Created category: ${categoryId}`);
    }
    
    console.log("🎉 All invoice categories have been created successfully!");
    console.log("You can now use the Invoice Settings page to edit account numbers.");
    
  } catch (error) {
    console.error("❌ Error setting up categories:", error);
  }
};

// Run the setup
setupInvoiceCategories();

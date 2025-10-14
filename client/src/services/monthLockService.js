import { db } from "../config/firebase-config";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
} from "firebase/firestore";

class MonthLockService {
  static getMonthLockDocId(storeId, month, year) {
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
    const yearMonth = `${year}${String(monthIndex + 1).padStart(2, "0")}`;
    return `${storeId}_${yearMonth}`;
  }

  static async getMonthLockStatus(storeId, month, year) {
    try {
      const docId = this.getMonthLockDocId(storeId, month, year);
      const lockRef = doc(db, "month_locks", docId);
      const lockDoc = await getDoc(lockRef);

      if (lockDoc.exists()) {
        return lockDoc.data();
      } else {
        return { is_locked: false };
      }
    } catch (error) {
      console.error("Error fetching month lock status:", error);
      return { is_locked: false };
    }
  }

  static async lockMonth(storeId, month, year, userEmail, userRole) {
    try {
      // Check if user has permission to lock (General Manager, Supervisor, or Admin)
      const canLock = ["admin", "general manager", "supervisor"].includes(
        userRole?.toLowerCase()
      );
      if (!canLock) {
        throw new Error(
          "Only General Managers, Supervisors, and Admins can lock months."
        );
      }

      const docId = this.getMonthLockDocId(storeId, month, year);
      const lockRef = doc(db, "month_locks", docId);

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
      const yearMonth = `${year}${String(monthIndex + 1).padStart(2, "0")}`;

      // Get existing lock data to preserve audit trail
      const existingDoc = await getDoc(lockRef);
      const existingData = existingDoc.exists() ? existingDoc.data() : {};

      // Create the lock history entry with current timestamp
      const lockHistoryEntry = {
        action: "locked",
        user: userEmail,
        role: userRole,
        timestamp: new Date().toISOString(), // Use regular Date instead of serverTimestamp for array
      };

      await setDoc(
        lockRef,
        {
          store_id: storeId,
          year_month: yearMonth,
          is_locked: true,
          locked_by: userEmail,
          locked_at: serverTimestamp(),
          locked_by_role: userRole,
          // Preserve existing audit trail
          previous_unlocks: existingData.previous_unlocks || [],
          previous_locks: existingData.previous_locks || [],
          // Add current lock to history using arrayUnion
          lock_history: arrayUnion(lockHistoryEntry),
        },
        { merge: true }
      );

      return { success: true, message: "Month locked successfully." };
    } catch (error) {
      console.error("Error locking month:", error);
      return { success: false, message: error.message };
    }
  }

  static async unlockMonth(storeId, month, year, userEmail, userRole) {
    try {
      // Check if user has permission to unlock (Admin only)
      const isAdmin = userRole?.toLowerCase() === "admin";
      if (!isAdmin) {
        throw new Error("Only Administrators can unlock months.");
      }

      const docId = this.getMonthLockDocId(storeId, month, year);
      const lockRef = doc(db, "month_locks", docId);

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
      const yearMonth = `${year}${String(monthIndex + 1).padStart(2, "0")}`;

      // Get existing lock data to preserve audit trail
      const existingDoc = await getDoc(lockRef);
      const existingData = existingDoc.exists() ? existingDoc.data() : {};

      // Create the unlock history entry with current timestamp
      const unlockHistoryEntry = {
        action: "unlocked",
        user: userEmail,
        role: userRole,
        timestamp: new Date().toISOString(), // Use regular Date instead of serverTimestamp for array
      };

      await setDoc(
        lockRef,
        {
          store_id: storeId,
          year_month: yearMonth,
          is_locked: false,
          unlocked_by: userEmail,
          unlocked_at: serverTimestamp(),
          unlocked_by_role: userRole,
          // Preserve existing data
          locked_by: existingData.locked_by,
          locked_at: existingData.locked_at,
          locked_by_role: existingData.locked_by_role,
          // Add current unlock to history using arrayUnion
          lock_history: arrayUnion(unlockHistoryEntry),
        },
        { merge: true }
      );

      return { success: true, message: "Month unlocked successfully." };
    } catch (error) {
      console.error("Error unlocking month:", error);
      return { success: false, message: error.message };
    }
  }

  static async getAllLockedMonths(storeId) {
    try {
      const locksRef = collection(db, "month_locks");
      const q = query(
        locksRef,
        where("store_id", "==", storeId),
        where("is_locked", "==", true)
      );
      const querySnapshot = await getDocs(q);

      const lockedMonths = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        lockedMonths.push({
          id: doc.id,
          ...data,
        });
      });

      return lockedMonths;
    } catch (error) {
      console.error("Error fetching locked months:", error);
      return [];
    }
  }

  static isMonthLocked(month, year, lockedMonths) {
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
    const yearMonth = `${year}${String(monthIndex + 1).padStart(2, "0")}`;

    return lockedMonths.some((lock) => lock.year_month === yearMonth);
  }

  static formatTimestamp(timestamp) {
    if (!timestamp) return "Unknown";
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  }
}

export default MonthLockService;

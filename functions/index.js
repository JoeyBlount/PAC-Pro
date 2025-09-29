const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * 🔔 When a new invoice is submitted
 */
exports.notifyInvoiceSubmitted = functions.firestore
  .document("invoices/{invoiceId}")
  .onCreate(async (snap, context) => {
    const invoice = snap.data();

    // Get submitter info
    let submitterName = invoice.user_email;
    try {
      const userQuery = await db
        .collection("users")
        .where("email", "==", invoice.user_email)
        .limit(1)
        .get();
      if (!userQuery.empty) {
        const u = userQuery.docs[0].data();
        submitterName =
          u.firstName && u.lastName
            ? `${u.firstName} ${u.lastName}`
            : u.firstName || u.email || invoice.user_email;
      }
    } catch (err) {
      console.error("Error fetching submitter info:", err);
    }

    // Find all supervisors (admins)
    const supervisors = await db
      .collection("users")
      .where("role", "in", ["Admin", "admin"])
      .get();

    const batch = db.batch();
    supervisors.forEach((doc) => {
      const data = doc.data();
      if (data.email === invoice.user_email) return; // skip sender

      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        toEmail: data.email,
        type: "invoice_submitted",
        title: "Invoice Submitted",
        message: `${submitterName} submitted invoice ${invoice.invoiceNumber} from ${invoice.companyName}.`,
        invoiceId: context.params.invoiceId,
        storeId: invoice.storeID,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });
    });

    await batch.commit();
    console.log(
      `📢 Invoice submitted notification sent for ${invoice.invoiceNumber}`
    );
  });

/**
 * 🔔 When an invoice is deleted
 */
exports.notifyInvoiceDeleted = functions.firestore
  .document("invoices/{invoiceId}")
  .onDelete(async (snap, context) => {
    const invoice = snap.data();

    // Get submitter info
    let submitterName = invoice.user_email || "A user";

    const supervisors = await db
      .collection("users")
      .where("role", "in", ["Admin", "admin"])
      .get();

    const batch = db.batch();
    supervisors.forEach((doc) => {
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        toEmail: doc.data().email,
        type: "invoice_deleted",
        title: "Invoice Deleted",
        message: `${submitterName} deleted invoice ${invoice.invoiceNumber} from ${invoice.companyName}.`,
        invoiceId: context.params.invoiceId,
        storeId: invoice.storeID,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });
    });

    await batch.commit();
    console.log(`🗑️ Invoice deleted notification sent for ${invoice.invoiceNumber}`);
  });

/**
 * 🔔 When a new user is created
 */
exports.notifyNewUser = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    const user = snap.data();

    const notifRef = db.collection("notifications").doc();
    await notifRef.set({
      toEmail: user.email,
      type: "welcome",
      title: "Welcome to PAC Pro 🎉",
      message: `Hi ${user.firstName || ""}, your account has been created. Start by exploring your dashboard!`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });

    console.log(`👋 Welcome notification created for ${user.email}`);
  });

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
    console.log(
      `🗑️ Invoice deleted notification sent for ${invoice.invoiceNumber}`
    );
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
      message: `Hi ${
        user.firstName || ""
      }, your account has been created. Start by exploring your dashboard!`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });

    console.log(`👋 Welcome notification created for ${user.email}`);
  });

/**
 * Aggregate invoice totals per store and month into a dedicated collection
 * Collection: invoice_log_totals
 * DocId: `${storeID}_${YYYYMM}`
 * Fields: { totals: { [categoryId]: number }, updatedAt }
 */
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

function pad2(n) {
  return String(n).padStart(2, "0");
}

async function recomputeMonthlyTotals(storeID, targetMonth, targetYear) {
  if (!storeID || !targetMonth || !targetYear) return;

  const qSnap = await db
    .collection("invoices")
    .where("storeID", "==", storeID)
    .where("targetMonth", "==", Number(targetMonth))
    .where("targetYear", "==", Number(targetYear))
    .get();

  const totals = {};
  CATEGORY_IDS.forEach((id) => (totals[id] = 0));

  qSnap.forEach((doc) => {
    const d = doc.data() || {};
    const cats = d.categories || {};
    CATEGORY_IDS.forEach((id) => {
      const val = cats[id];
      if (Array.isArray(val)) {
        totals[id] += val.reduce((s, n) => s + (Number(n) || 0), 0);
      } else if (typeof val === "number") {
        totals[id] += val;
      }
    });
  });

  const docId = `${storeID}_${targetYear}${pad2(targetMonth)}`;
  await db
    .collection("invoice_log_totals")
    .doc(docId)
    .set(
      { totals, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
}

exports.onInvoiceWrite = functions.firestore
  .document("invoices/{invoiceId}")
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    // recompute for old assignment if it changed or was deleted
    if (before) {
      await recomputeMonthlyTotals(
        before.storeID,
        before.targetMonth,
        before.targetYear
      );
    }
    // recompute for new assignment on create/update
    if (after) {
      await recomputeMonthlyTotals(
        after.storeID,
        after.targetMonth,
        after.targetYear
      );
    }
  });

/**
 * Manual backfill endpoint to recompute invoice_log_totals for existing invoices.
 * Usage: POST with optional JSON body { storeID?: string }
 * If storeID omitted, recomputes for all stores/months present in invoices.
 */
exports.recomputeInvoiceTotals = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { storeID } = req.body || {};

    // Fetch invoices (optionally scoped to store)
    let q = db.collection("invoices");
    if (storeID) {
      q = q.where("storeID", "==", storeID);
    }
    const snap = await q.get();

    // Collect unique (storeID, targetMonth, targetYear)
    const keySet = new Set();
    snap.forEach((doc) => {
      const d = doc.data() || {};
      if (!d.storeID || !d.targetMonth || !d.targetYear) return;
      keySet.add(`${d.storeID}|${d.targetMonth}|${d.targetYear}`);
    });

    let updated = 0;
    for (const key of keySet) {
      const [s, m, y] = key.split("|");
      await recomputeMonthlyTotals(s, Number(m), Number(y));
      updated += 1;
    }

    return res.json({ success: true, updated });
  } catch (err) {
    console.error("Backfill error", err);
    return res
      .status(500)
      .json({ success: false, error: String((err && err.message) || err) });
  }
});
/**
 * 📧 Daily Notification Digest (runs once per day)
 * Groups notifications from the past 24 hours and emails them as a summary.
 * Uses Gmail via Nodemailer.
 */

const nodemailer = require("nodemailer");

exports.dailyNotificationDigest = functions.pubsub
  .schedule("0 7 * * *") // every day at 7 AM PST
  .timeZone("America/Los_Angeles")
  .onRun(async (context) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: functions.config().gmail.email,
        pass: functions.config().gmail.password,
      },
    });

    const now = admin.firestore.Timestamp.now();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const since = admin.firestore.Timestamp.fromDate(yesterday);

    // Get notifications created in the past 24 hours and not yet emailed
    const snapshot = await db
      .collection("notifications")
      .where("createdAt", ">", since)
      .where("emailed", "==", false)
      .get()
      .catch((err) => {
        console.error("Error fetching notifications:", err);
        return null;
      });

    if (!snapshot || snapshot.empty) {
      console.log("No notifications to email today.");
      return null;
    }

    // Group notifications by recipient
    const grouped = {};
    snapshot.forEach((doc) => {
      const n = doc.data();
      if (!n.toEmail) return;
      if (!grouped[n.toEmail]) grouped[n.toEmail] = [];
      grouped[n.toEmail].push({ id: doc.id, ...n });
    });

    // Loop through each user and send their summary
    for (const [email, notifs] of Object.entries(grouped)) {
      const lines = notifs.map(
        (n) => `• ${n.title || n.type}\n  ${n.message || ""}`
      );

      const mailOptions = {
        from: `"PAC-Pro Notifications" <${functions.config().gmail.email}>`,
        to: email,
        subject: "Your Daily PAC-Pro Activity Summary",
        text: `Hello,\n\nHere’s your summary for ${new Date().toLocaleDateString()}:\n\n${lines.join(
          "\n\n"
        )}\n\n— PAC-Pro System`,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Sent digest to ${email}`);

        // Mark as emailed
        const batch = db.batch();
        notifs.forEach((n) => {
          const ref = db.collection("notifications").doc(n.id);
          batch.update(ref, { emailed: true, emailedAt: admin.firestore.FieldValue.serverTimestamp() });
        });
        await batch.commit();
      } catch (error) {
        console.error(`❌ Failed to send to ${email}:`, error);
      }
    }

    return null;
  });

// -------------------------
// ✅ Imports & Initialization
// -------------------------
const { onDocumentCreated, onDocumentDeleted, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

initializeApp();
const db = getFirestore();

// -------------------------
// 🔔 Notify when a new invoice is submitted
// -------------------------
exports.notifyInvoiceSubmitted = onDocumentCreated("invoices/{invoiceId}", async (event) => {
  const invoice = event.data.data();
  const context = event.params;

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
      invoiceId: context.invoiceId,
      storeId: invoice.storeID,
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    });
  });

  await batch.commit();
  console.log(`📢 Invoice submitted notification sent for ${invoice.invoiceNumber}`);
});

// -------------------------
// 🗑️ Notify when an invoice is deleted
// -------------------------
exports.notifyInvoiceDeleted = onDocumentDeleted("invoices/{invoiceId}", async (event) => {
  const invoice = event.data.data();
  const context = event.params;

  const submitterName = invoice.user_email || "A user";

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
      invoiceId: context.invoiceId,
      storeId: invoice.storeID,
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    });
  });

  await batch.commit();
  console.log(`🗑️ Invoice deleted notification sent for ${invoice.invoiceNumber}`);
});

// -------------------------
// 👋 Welcome new user
// -------------------------
exports.notifyNewUser = onDocumentCreated("users/{userId}", async (event) => {
  const user = event.data.data();

  const notifRef = db.collection("notifications").doc();
  await notifRef.set({
    toEmail: user.email,
    type: "welcome",
    title: "Welcome to PAC Pro 🎉",
    message: `Hi ${user.firstName || ""}, your account has been created. Start by exploring your dashboard!`,
    createdAt: FieldValue.serverTimestamp(),
    read: false,
  });

  console.log(`👋 Welcome notification created for ${user.email}`);
});

// -------------------------
// 📊 Monthly Aggregation Logic
// -------------------------
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
      { totals, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
}

// -------------------------
// 🔁 Recompute totals on write
// -------------------------
exports.onInvoiceWrite = onDocumentWritten("invoices/{invoiceId}", async (event) => {
  const before = event.data.before ? event.data.before.data() : null;
  const after = event.data.after ? event.data.after.data() : null;

  if (before) {
    await recomputeMonthlyTotals(before.storeID, before.targetMonth, before.targetYear);
  }
  if (after) {
    await recomputeMonthlyTotals(after.storeID, after.targetMonth, after.targetYear);
  }
});

// -------------------------
// 🧮 Manual backfill endpoint
// -------------------------
exports.recomputeInvoiceTotals = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { storeID } = req.body || {};

    // Fetch invoices (optionally scoped to store)
    let q = db.collection("invoices");
    if (storeID) q = q.where("storeID", "==", storeID);
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
      updated++;
    }

    return res.json({ success: true, updated });
  } catch (err) {
    console.error("Backfill error", err);
    return res.status(500).json({ success: false, error: String(err.message || err) });
  }
});

// -------------------------
// 📧 Daily Notification Digest
// -------------------------
exports.dailyNotificationDigest = onSchedule("0 7 * * *", async (event) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_EMAIL || "noreply.pacpro@gmail.com",
      pass: process.env.GMAIL_PASS || "your_app_password_here",
    },
  });

  const now = Timestamp.now();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const since = Timestamp.fromDate(yesterday);

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

  // Group by recipient
  const grouped = {};
  snapshot.forEach((doc) => {
    const n = doc.data();
    if (!n.toEmail) return;
    if (!grouped[n.toEmail]) grouped[n.toEmail] = [];
    grouped[n.toEmail].push({ id: doc.id, ...n });
  });

  // Send emails
  for (const [email, notifs] of Object.entries(grouped)) {
    const lines = notifs.map((n) => `• ${n.title || n.type}\n  ${n.message || ""}`);
    const mailOptions = {
      from: `"PAC-Pro Notifications" <${process.env.GMAIL_EMAIL || "noreply.pacpro@gmail.com"}>`,
      to: email,
      subject: "Your Daily PAC-Pro Activity Summary",
      text: `Hello,\n\nHere’s your summary for ${new Date().toLocaleDateString()}:\n\n${lines.join(
        "\n\n"
      )}\n\n— PAC-Pro System`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Sent digest to ${email}`);

      const batch = db.batch();
      notifs.forEach((n) => {
        const ref = db.collection("notifications").doc(n.id);
        batch.update(ref, {
          emailed: true,
          emailedAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (error) {
      console.error(`❌ Failed to send to ${email}:`, error);
    }
  }

  return null;
});

exports.sendUserInvite = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { email, firstName, role, invitedBy } = req.body || {};

    if (!email || !role) {
      return res.status(400).json({ success: false, error: "Missing required fields." });
    }

    const inviteToken = Math.random().toString(36).substring(2, 15);
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create or update user document
    await db.collection("users").doc(email).set(
      {
        email,
        firstName,
        role,
        invitedBy: invitedBy || "system",
        acceptState: false,
        inviteToken,
        inviteExpiresAt: expiresAt,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const inviteLink = `https://pacpro.web.app/invite?email=${encodeURIComponent(email)}&token=${inviteToken}`;

    // Configure email transport
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_EMAIL || "noreply.pacpro@gmail.com",
        pass: process.env.GMAIL_PASS || "your_app_password_here",
      },
    });

    const mailOptions = {
      from: `"PAC-Pro" <${process.env.GMAIL_EMAIL || "noreply.pacpro@gmail.com"}>`,
      to: email,
      subject: "PAC-Pro Invitation",
      text: `Hi ${firstName || ""},\n\nYou've been invited to join PAC-Pro as a ${role}.\nClick the link below to accept your invite:\n\n${inviteLink}\n\nThis link expires in 24 hours.\n\n— The PAC-Pro Team`,
    };

    await transporter.sendMail(mailOptions);

    return res.json({ success: true, message: `Invite sent to ${email}` });
  } catch (err) {
    console.error("Invite send failed:", err);
    return res.status(500).json({ success: false, error: err.message || err });
  }
});

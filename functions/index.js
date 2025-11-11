// -------------------------
// ✅ Imports & Initialization
// -------------------------
// Load .env from parent directory (project root)
// At the top of functions/index.js
const path = require("path");

// Try loading from functions folder first, then parent
require("dotenv").config({ path: path.join(__dirname, ".env") });
if (!process.env.GMAIL_EMAIL) {
  require("dotenv").config({ path: path.join(__dirname, "../.env") });
}

const cors = require("cors");
const { onDocumentCreated, onDocumentDeleted, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

// -------------------------
// 🔥 Initialize Firebase Admin
// -------------------------
initializeApp();
const db = getFirestore();

// -------------------------
// 🧠 Confirm .env loaded
// -------------------------
console.log("✅ Gmail env loaded:", {
  email: process.env.GMAIL_EMAIL || "Missing ❌",
  pass: process.env.GMAIL_PASS ? "Loaded ✅" : "Missing ❌",
});

// -------------------------
// 🌐 CORS Configuration
// -------------------------
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "https://pacpro-ef499.web.app",
  "https://pacpro-ef499.firebaseapp.com",
];

const corsHandler = cors({
  origin: function (origin, callback) {
    console.log("🔍 Checking origin:", origin);
    
    if (!origin) {
      console.log("✅ No origin - allowing");
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log("✅ Origin allowed:", origin);
      return callback(null, true);
    }
    
    console.error("❌ Origin blocked:", origin);
    return callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
});

// -------------------------
// 🔔 Notify when a new invoice is submitted
// -------------------------
exports.notifyInvoiceSubmitted = onDocumentCreated("invoices/{invoiceId}", async (event) => {
  const invoice = event.data.data();
  const context = event.params;

  let submitterName = invoice.user_email;
  try {
    const userQuery = await db.collection("users").where("email", "==", invoice.user_email).limit(1).get();
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

  const supervisors = await db.collection("users").where("role", "in", ["Admin", "admin"]).get();

  const batch = db.batch();
  supervisors.forEach((doc) => {
    const data = doc.data();
    if (data.email === invoice.user_email) return;

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

  const supervisors = await db.collection("users").where("role", "in", ["Admin", "admin"]).get();

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
// 📊 Monthly Aggregation
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
      if (Array.isArray(val)) totals[id] += val.reduce((s, n) => s + (Number(n) || 0), 0);
      else if (typeof val === "number") totals[id] += val;
    });
  });

  const docId = `${storeID}_${targetYear}${pad2(targetMonth)}`;
  await db.collection("invoice_log_totals").doc(docId).set(
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

  if (before) await recomputeMonthlyTotals(before.storeID, before.targetMonth, before.targetYear);
  if (after) await recomputeMonthlyTotals(after.storeID, after.targetMonth, after.targetYear);
});

// -------------------------
// 🧮 Manual backfill endpoint
// -------------------------
exports.recomputeInvoiceTotals = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const { storeID } = req.body || {};
    let q = db.collection("invoices");
    if (storeID) q = q.where("storeID", "==", storeID);
    const snap = await q.get();

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
exports.dailyNotificationDigest = onSchedule("0 7 * * *", async () => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_EMAIL, pass: process.env.GMAIL_PASS },
  });

  const now = Timestamp.now();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const since = Timestamp.fromDate(yesterday);

  console.log("📬 Fetching notifications created since:", since.toDate());

  const snapshot = await db
    .collection("notifications")
    .where("createdAt", ">", since)
    .get()
    .catch((err) => {
      console.error("Error fetching notifications:", err);
      return null;
    });

  if (!snapshot || snapshot.empty) {
    console.log("No notifications to email today.");
    return null;
  }

  const grouped = {};
  snapshot.forEach((doc) => {
    const n = doc.data();
    if (!n.toEmail) return;
    if (!grouped[n.toEmail]) grouped[n.toEmail] = [];
    grouped[n.toEmail].push({ id: doc.id, ...n });
  });

  for (const [email, notifs] of Object.entries(grouped)) {
    const lines = notifs.map((n) => `• ${n.title || n.type}\n  ${n.message || ""}`);
    const mailOptions = {
      from: `"PAC-Pro Notifications" <${process.env.GMAIL_EMAIL}>`,
      to: email,
      subject: "Your Daily PAC-Pro Activity Summary",
      text: `Hello,\n\nHere's your summary for ${new Date().toLocaleDateString()}:\n\n${lines.join(
        "\n\n"
      )}\n\n— PAC-Pro System`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Sent digest to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send to ${email}:`, error);
    }
  }

  return null;
});

// -------------------------
// 📩 Send User Invite (with CORS)
// -------------------------
exports.sendUserInvite = onRequest({ cors: true }, async (req, res) => {
  try {
    console.log("📨 sendUserInvite called, method:", req.method);

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      console.log("✅ Handling OPTIONS preflight");
      return res.status(204).send("");
    }

    const { email, firstName, role } = req.body;

    if (!email) {
      console.error("❌ No email provided in request body");
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    console.log("📧 Processing invite for:", email, "| Name:", firstName, "| Role:", role);

    // ✅ Get environment variables
    const emailUser = process.env.GMAIL_EMAIL;
    const emailPass = process.env.GMAIL_PASS;

    console.log("🔑 Email config check:", {
      email: emailUser ? "✅ Set" : "❌ Missing",
      pass: emailPass ? "✅ Set" : "❌ Missing",
    });

    if (!emailUser || !emailPass) {
      console.error("❌ Gmail credentials not configured!");
      return res.status(500).json({
        success: false,
        error: "Email service not configured. Please contact administrator.",
      });
    }

    // ✅ Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // ✅ Email content
    const mailOptions = {
      from: `"PAC-Pro System" <${emailUser}>`,
      to: email,
      subject: "Welcome to PAC-Pro - Your Account Has Been Created",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to PAC-Pro! 🎉</h2>
          <p>Hi ${firstName || "there"},</p>
          <p>Your account has been created with the role: <strong>${role || "User"}</strong></p>
          <p>To get started:</p>
          <ol>
            <li>Visit <a href="https://pacpro-ef499.web.app">PAC-Pro Portal</a></li>
            <li>Click "Sign Up" or "Create Account"</li>
            <li>Use this email address: <strong>${email}</strong></li>
            <li>Create your password</li>
          </ol>
          <p>If you have any questions, please contact your administrator.</p>
          <p>Best regards,<br/>The PAC-Pro Team</p>
        </div>
      `,
      text: `
Welcome to PAC-Pro!

Hi ${firstName || "there"},

Your account has been created with the role: ${role || "User"}

To get started:
1. Visit https://pacpro-ef499.web.app
2. Use this email address: ${email}

If you have any questions, please contact your administrator.

Best regards,
The PAC-Pro Team
      `,
    };

    // ✅ Send email
    console.log("📮 Attempting to send email...");
    await transporter.sendMail(mailOptions);

    console.log(`✅ SUCCESS! Invite email sent to ${email}`);

    return res.status(200).json({
      success: true,
      message: `Invite sent to ${email}`,
    });
  } catch (error) {
    console.error("❌ ERROR in sendUserInvite:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send invite",
    });
  }
});
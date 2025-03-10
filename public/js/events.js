// HTML sections for show/hide
const dashboardSection = document.getElementById("dashboardSection");
const accountSection = document.getElementById("accountSection");
const invoiceSection = document.getElementById("invoiceSection");
const invoiceLogSection = document.getElementById("invoiceLogSection");
const pacSection = document.getElementById("pacSection");
const settingsSection = document.getElementById("settingsSection");

// Navigation
function showDashboard() {
  dashboardSection.style.display = "block";
  accountSection.style.display = "none";
  invoiceSection.style.display = "none";
  invoiceLogSection.style.display = "none";
  pacSection.style.display = "none";
  settingsSection.style.display = "none";
}
function showAccount() {
  accountSection.style.display = "block";
  dashboardSection.style.display = "none";
  invoiceSection.style.display = "none";
  invoiceLogSection.style.display = "none";
  pacSection.style.display = "none";
  settingsSection.style.display = "none";
}
function showInvoicePage() {
  invoiceSection.style.display = "block";
  dashboardSection.style.display = "none";
  accountSection.style.display = "none";
  invoiceLogSection.style.display = "none";
  pacSection.style.display = "none";
  settingsSection.style.display = "none";
}
function showInvoiceLog() {
  invoiceLogSection.style.display = "block";
  dashboardSection.style.display = "none";
  accountSection.style.display = "none";
  invoiceSection.style.display = "none";
  pacSection.style.display = "none";
  settingsSection.style.display = "none";
}
function showPAC() {
  pacSection.style.display = "block";
  dashboardSection.style.display = "none";
  accountSection.style.display = "none";
  invoiceSection.style.display = "none";
  invoiceLogSection.style.display = "none";
  settingsSection.style.display = "none";
}
function showSettings() {
  settingsSection.style.display = "block";
  dashboardSection.style.display = "none";
  accountSection.style.display = "none";
  invoiceSection.style.display = "none";
  invoiceLogSection.style.display = "none";
  pacSection.style.display = "none";
}

// Minimal tab logic for P.A.C.
function setupPacTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((tc) => tc.classList.remove("active"));
      button.classList.add("active");
      const tabName = button.getAttribute("data-tab");
      document.getElementById(tabName).classList.add("active");
      // If we want to re-render a table for “3) P.A.C.” specifically
      if (tabName === "pacView") {
        renderPAC(); // or whatever your updated function is
      }
    });
  });
}

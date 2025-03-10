/* Additional logic hooking it all together */

// Basic test function for cost lines
let costLineCount = 0;
function addCostLine() {
  const container = document.getElementById("costLinesContainer");
  costLineCount++;
  const lineDiv = document.createElement("div");
  lineDiv.className = "cost-line";
  lineDiv.id = `costLine${costLineCount}`;

  const categorySelect = document.createElement("select");
  categorySelect.innerHTML = `
    <option value="">Choose Category</option>
    <option value="Food">Food</option>
    <option value="Condiment">Condiment</option>
    <option value="Paper">Paper</option>
    <option value="Non Prod">Non Prod</option>
    <option value="Travel">Travel</option>
    <option value="Any Other">Any Other</option>
    <option value="Promo">Promo</option>
    <option value="Outside SVC">Outside SVC</option>
  `;
  const amountInput = document.createElement("input");
  amountInput.type = "text";
  amountInput.placeholder = "Amount";

  lineDiv.appendChild(categorySelect);
  lineDiv.appendChild(amountInput);
  container.appendChild(lineDiv);
}

function applyProjections() {
  alert("Projections have been applied (placeholder)!");
}

// Minimal 'monthEnd' or 'PAC View' logic
function renderMonthEndTable() {
  const tableBody = document.querySelector("#monthEndTable tbody");
  if (!tableBody) return; // if that table doesn't exist
  tableBody.innerHTML = "";
  let totalActual = 0,
    totalProjected = 0;
  expensesData.forEach((item) => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = item.name;
    const actualCell = document.createElement("td");
    actualCell.textContent = item.actual?.toFixed(1) + "%";
    const projectedCell = document.createElement("td");
    projectedCell.textContent = item.projected?.toFixed(1) + "%";
    row.appendChild(nameCell);
    row.appendChild(actualCell);
    row.appendChild(projectedCell);
    tableBody.appendChild(row);
    totalActual += item.actual || 0;
    totalProjected += item.projected || 0;
  });
  const actualTotalCell = document.getElementById("monthEndActualTotal");
  const projectedTotalCell = document.getElementById("monthEndProjectedTotal");
  if (actualTotalCell)
    actualTotalCell.textContent = totalActual.toFixed(1) + "%";
  if (projectedTotalCell)
    projectedTotalCell.textContent = totalProjected.toFixed(1) + "%";
}

window.addEventListener("DOMContentLoaded", () => {
  // from chart.js
  initProfitLossChart();

  // from events.js
  setupPacTabs();

  // Basic test for addCostLine
  const container = document.getElementById("costLinesContainer");
  const initialLines = container.querySelectorAll(".cost-line").length;
  addCostLine();
  const linesAfter = container.querySelectorAll(".cost-line").length;
  if (linesAfter === initialLines + 1) {
    console.log(
      "PASS: addCostLine created a new line item in #costLinesContainer"
    );
  } else {
    console.error(
      `FAIL: Expected ${initialLines + 1} lines, got ${linesAfter}`
    );
  }
});
function renderPAC() {
  // If you had logic to refresh the “PAC” table, do it here
  // For example, if it used to call something like renderMonthEndTable
  // just rename it or adapt it:
  // Example:
  // renderMonthEndTable();
  // or something like updatePACDisplay();
}

// Then, in DOMContentLoaded, remove any references to non-existent #monthEnd or so:
window.addEventListener("DOMContentLoaded", () => {
  initProfitLossChart();
  setupPacTabs();
  // ... rest of your setup

  // If you want to test your new PAC function:
  // renderPAC();
});

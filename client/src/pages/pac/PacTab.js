import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
// PAC Actual functions now handled by backend API
import {
  Container,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import "./pac.css";
import { useTheme } from "@mui/material/styles";
import { apiUrl } from "../../utils/api";
import { auth } from "../../config/firebase-config";

// Helper function for authenticated API calls
async function apiCall(path, options = {}) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
  });
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`API call failed: ${response.statusText}`);
  }
  return response.json();
}

// Add print styles
const printStyles = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 0.3in;
    }
    
    * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      line-height: 1.2;
      color: #000;
      background: white;
      margin: 0;
      padding: 0;
    }
    
    .print-header {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #000;
      page-break-after: avoid;
    }
    
    .print-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      font-size: 9px;
      table-layout: fixed;
    }
    
    .print-table th,
    .print-table td {
      border: 1px solid #000;
      padding: 2px 4px;
      text-align: left;
      vertical-align: top;
      word-wrap: break-word;
      overflow: hidden;
    }
    
    .print-table th {
      background-color: #f0f0f0 !important;
      font-weight: bold;
      text-align: center;
      font-size: 9px;
    }
    
    .print-table th:nth-child(1) { width: 25%; }
    .print-table th:nth-child(2) { width: 12%; }
    .print-table th:nth-child(3) { width: 10%; }
    .print-table th:nth-child(4) { width: 12%; }
    .print-table th:nth-child(5) { width: 10%; }
    .print-table th:nth-child(6) { width: 12%; }
    
    .print-table td:nth-child(2),
    .print-table td:nth-child(4),
    .print-table td:nth-child(6) {
      text-align: right;
    }
    
    .print-table td:nth-child(3),
    .print-table td:nth-child(5) {
      text-align: center;
    }
    
    /* Section headers with colors matching main page */
    .print-section-header td {
      font-weight: bold;
      text-align: center;
      font-size: 10px;
    }
    
    .print-sales-header td {
      background-color: #e3f2fd !important;
      color: #000;
    }
    
    .print-food-paper-header td {
      background-color: #e8f5e9 !important;
      color: #000;
    }
    
    .print-labor-header td {
      background-color: #fff3e0 !important;
      color: #000;
    }
    
    .print-purchases-header td {
      background-color: #f3e5f5 !important;
      color: #000;
    }
    
    .print-totals-header td {
      background-color: #f5f5f5 !important;
      color: #000;
      border-top: 2px solid #ccc !important;
    }
    
    .print-pac-header td {
      background-color: #f5f5f5 !important;
      color: #000;
      border-top: 2px solid #ccc !important;
    }
    
    .text-red {
      color: #d32f2f !important;
      font-weight: bold;
    }
    
    .text-green {
      color: #2e7d32 !important;
      font-weight: bold;
    }
    
    .no-print {
      display: none !important;
    }
    
    .print-status, .print-timestamp {
      font-size: 10px;
      margin: 5px 0;
      page-break-after: avoid;
    }
    
    /* Ensure content fits on one page */
    .print-table {
      page-break-inside: avoid;
    }
    
    .print-table tbody tr {
      page-break-inside: avoid;
    }
    
    /* Alternating row colors for better readability */
    .print-table tbody tr:nth-child(even) {
      background-color: #f9f9f9 !important;
    }
    
    .print-table tbody tr:nth-child(odd) {
      background-color: #ffffff !important;
    }
  }
`;

const PacTab = ({
  storeId,
  year,
  month,
  isMonthLocked = false,
  monthLockStatus = null,
  lastUpdatedTimestamp = null,
}) => {
  const [pacData, setPacData] = useState(null);
  const [projectionsData, setProjectionsData] = useState(null);
  const [pacActualData, setPacActualData] = useState(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  // Inject print styles
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Generate print content
  const generatePrintContent = () => {
    if (!pacData || !actualData.controllableExpenses)
      return "<p>No data available</p>";

    // Helper functions for print content - use main component functions

    const calculateDifference = (actual, projected) => {
      if (
        actual === null ||
        actual === undefined ||
        projected === null ||
        projected === undefined
      )
        return "-";
      const actualNum =
        typeof actual === "number" ? actual : parseFloat(actual);
      const projectedNum =
        typeof projected === "number" ? projected : parseFloat(projected);
      if (isNaN(actualNum) || isNaN(projectedNum)) return "-";
      return actualNum - projectedNum;
    };

    const formatDifference = (actual, projected) => {
      const diff = calculateDifference(actual, projected);
      if (diff === "-") return "-";
      return formatCurrency(diff);
    };

    const getColorClass = (actual, projected) => {
      if (!projectionsData || projected === null || projected === undefined)
        return "";
      const actualNum =
        typeof actual === "number" ? actual : parseFloat(actual);
      const projectedNum =
        typeof projected === "number" ? projected : parseFloat(projected);
      return actualNum < projectedNum
        ? "text-red"
        : actualNum > projectedNum
        ? "text-green"
        : "";
    };

    const getDiffColorClass = (actual, projected) => {
      if (!projectionsData || projected === null || projected === undefined)
        return "";
      const diff = actual - projected;
      return diff < 0 ? "text-red" : diff > 0 ? "text-green" : "";
    };

    // Helper function to get color class for difference column based on diff value and type
    const getDiffPercentColorClass = (diff, type = "default") => {
      if (diff === "-" || diff === null || diff === undefined) return "";
      const diffNum = typeof diff === "number" ? diff : parseFloat(diff);
      if (isNaN(diffNum)) return "";

      if (type === "sales" || type === "pac") {
        // Sales and P.A.C.: green when positive, red when negative
        return diffNum > 0 ? "text-green" : diffNum < 0 ? "text-red" : "";
      } else {
        // Other items: red when actual > projected (bad), green when actual < projected (good)
        return diffNum > 0 ? "text-red" : diffNum < 0 ? "text-green" : "";
      }
    };

    // Generate status information for print
    let statusInfo = "";
    if (isMonthLocked) {
      statusInfo += `<div class="print-status" style="text-align: center; margin-bottom: 10px; padding: 5px; background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; font-weight: bold;">
        🔒 Month Locked by ${monthLockStatus?.locked_by || "Unknown"}
      </div>`;
    }
    if (lastUpdatedTimestamp) {
      const ts = new Date(lastUpdatedTimestamp);
      statusInfo += `<div class="print-timestamp" style="text-align: center; margin-bottom: 10px; padding: 5px; background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; font-weight: bold;">
      Last Updated: ${ts.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })}
      </div>`;
    }

    return `
      <div class="print-header">
        PAC Report - ${storeId} - ${month} ${year}
      </div>
      ${statusInfo}
      <table class="print-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Actual $</th>
            <th>Actual %</th>
            <th>Projected $</th>
            <th>Projected %</th>
            <th>Difference %</th>
          </tr>
        </thead>
        <tbody>
          <!-- Sales Section -->
          <tr class="print-section-header print-sales-header">
            <td colspan="6">Sales</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Product Net Sales</td>
            <td>${formatCurrency(actualData.productNetSales)}</td>
            <td>-</td>
            <td>${getProjectedValue("Product Net Sales", "dollar")}</td>
            <td>-</td>
            <td class="${getDiffPercentColorClass(
              ((actualData.productNetSales -
                getProjectedValueAsNumber("Product Net Sales")) /
                Math.max(getProjectedValueAsNumber("Product Net Sales"), 1)) *
                100,
              "sales"
            )}">${formatDiffPercentForPrint(
      ((actualData.productNetSales -
        getProjectedValueAsNumber("Product Net Sales")) /
        Math.max(getProjectedValueAsNumber("Product Net Sales"), 1)) *
        100,
      "sales"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">All Net Sales</td>
            <td>${formatCurrency(actualData.allNetSales)}</td>
            <td>-</td>
            <td>${getProjectedValue("All Net Sales", "dollar")}</td>
            <td>-</td>
            <td class="${getDiffPercentColorClass(
              ((actualData.allNetSales -
                getProjectedValueAsNumber("All Net Sales")) /
                Math.max(getProjectedValueAsNumber("All Net Sales"), 1)) *
                100,
              "sales"
            )}">${formatDiffPercentForPrint(
      ((actualData.allNetSales - getProjectedValueAsNumber("All Net Sales")) /
        Math.max(getProjectedValueAsNumber("All Net Sales"), 1)) *
        100,
      "sales"
    )}</td>
          </tr>
          
          <!-- Food & Paper Section -->
          <tr class="print-section-header print-food-paper-header">
            <td colspan="6">Food & Paper</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Base Food</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.baseFood.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.baseFood?.percent || 0
            )}</td>
            <td>${getProjectedValue("Base Food", "dollar")}</td>
            <td>${getProjectedValue("Base Food", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.baseFood?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Base Food", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.baseFood?.percent || 0,
        parseFloat(
          String(getProjectedValue("Base Food", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Employee Meal</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.employeeMeal.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.employeeMeal?.percent || 0
            )}</td>
            <td>${getProjectedValue("Employee Meal", "dollar")}</td>
            <td>${getProjectedValue("Employee Meal", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.employeeMeal?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Employee Meal", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.employeeMeal?.percent || 0,
        parseFloat(
          String(getProjectedValue("Employee Meal", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Condiment</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.condiment.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.condiment?.percent || 0
            )}</td>
            <td>${getProjectedValue("Condiment", "dollar")}</td>
            <td>${getProjectedValue("Condiment", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.condiment?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Condiment", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.condiment?.percent || 0,
        parseFloat(
          String(getProjectedValue("Condiment", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Total Waste</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.totalWaste.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.totalWaste?.percent || 0
            )}</td>
            <td>${getProjectedValue("Total Waste", "dollar")}</td>
            <td>${getProjectedValue("Total Waste", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.totalWaste?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Total Waste", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.totalWaste?.percent || 0,
        parseFloat(
          String(getProjectedValue("Total Waste", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Paper</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.paper.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.paper?.percent || 0
            )}</td>
            <td>${getProjectedValue("Paper", "dollar")}</td>
            <td>${getProjectedValue("Paper", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.paper?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Paper", "percent")).replace("%", "")
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.paper?.percent || 0,
        parseFloat(
          String(getProjectedValue("Paper", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          
          <!-- Food & Paper Total -->
          <tr class="print-section-header print-food-paper-total">
            <td style="padding-left: 20px; font-weight: bold; background-color: #e8f5e8;">Food & Paper Total</td>
            <td style="font-weight: bold; background-color: #e8f5e8;">${formatCurrency(
              (actualData.controllableExpenses.baseFood?.dollars || 0) +
                (actualData.controllableExpenses.employeeMeal?.dollars || 0) +
                (actualData.controllableExpenses.condiment?.dollars || 0) +
                (actualData.controllableExpenses.totalWaste?.dollars || 0) +
                (actualData.controllableExpenses.paper?.dollars || 0)
            )}</td>
            <td style="font-weight: bold; background-color: #e8f5e8;">${formatPercentage(
              (actualData.controllableExpenses.baseFood?.percent || 0) +
                (actualData.controllableExpenses.employeeMeal?.percent || 0) +
                (actualData.controllableExpenses.condiment?.percent || 0) +
                (actualData.controllableExpenses.totalWaste?.percent || 0) +
                (actualData.controllableExpenses.paper?.percent || 0)
            )}</td>
            <td style="font-weight: bold; background-color: #e8f5e8;">${formatCurrency(
              (getProjectedValueAsNumber("Base Food") || 0) +
                (getProjectedValueAsNumber("Employee Meal") || 0) +
                (getProjectedValueAsNumber("Condiment") || 0) +
                (getProjectedValueAsNumber("Total Waste") || 0) +
                (getProjectedValueAsNumber("Paper") || 0)
            )}</td>
            <td style="font-weight: bold; background-color: #e8f5e8;">${formatPercentage(
              (() => {
                const val = getProjectedValue("Base Food", "percent");
                const num = parseFloat(String(val || "0").replace("%", ""));
                return isNaN(num) ? 0 : num;
              })() +
                (() => {
                  const val = getProjectedValue("Employee Meal", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Condiment", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Total Waste", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Paper", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })()
            )}</td>
            <td style="font-weight: bold; background-color: #e8f5e8;">-</td>
          </tr>
          
          <!-- Labor Section -->
          <tr class="print-section-header print-labor-header">
            <td colspan="6">Labor</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Crew Labor</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.crewLabor.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.crewLabor?.percent || 0
            )}</td>
            <td>${getProjectedValue("Crew Labor", "dollar")}</td>
            <td>${getProjectedValue("Crew Labor", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.crewLabor?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Crew Labor", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.crewLabor?.percent || 0,
        parseFloat(
          String(getProjectedValue("Crew Labor", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Management Labor</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.managementLabor.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.managementLabor?.percent || 0
            )}</td>
            <td>${getProjectedValue("Management Labor", "dollar")}</td>
            <td>${getProjectedValue("Management Labor", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.managementLabor?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Management Labor", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.managementLabor?.percent || 0,
        parseFloat(
          String(getProjectedValue("Management Labor", "percent")).replace(
            "%",
            ""
          )
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Payroll Tax</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.payrollTax.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.payrollTax?.percent || 0
            )}</td>
            <td>${getProjectedValue("Payroll Tax", "dollar")}</td>
            <td>${getProjectedValue("Payroll Tax", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.payrollTax?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Payroll Tax", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.payrollTax?.percent || 0,
        parseFloat(
          String(getProjectedValue("Payroll Tax", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Additional Labor Dollars</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.additionalLaborDollars?.dollars ||
                0
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.additionalLaborDollars?.percent ||
                0
            )}</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
          </tr>
          
          <!-- Labor Total -->
          <tr class="print-section-header print-labor-total">
            <td style="padding-left: 20px; font-weight: bold; background-color: #e3f2fd;">Labor Total</td>
            <td style="font-weight: bold; background-color: #e3f2fd;">${formatCurrency(
              (actualData.controllableExpenses.crewLabor?.dollars || 0) +
                (actualData.controllableExpenses.managementLabor?.dollars ||
                  0) +
                (actualData.controllableExpenses.payrollTax?.dollars || 0) +
                (actualData.controllableExpenses.additionalLaborDollars
                  ?.dollars || 0)
            )}</td>
            <td style="font-weight: bold; background-color: #e3f2fd;">${formatPercentage(
              (actualData.controllableExpenses.crewLabor?.percent || 0) +
                (actualData.controllableExpenses.managementLabor?.percent ||
                  0) +
                (actualData.controllableExpenses.payrollTax?.percent || 0) +
                (actualData.controllableExpenses.additionalLaborDollars
                  ?.percent || 0)
            )}</td>
            <td style="font-weight: bold; background-color: #e3f2fd;">${formatCurrency(
              getProjectedValueAsNumber("Crew Labor") +
                getProjectedValueAsNumber("Management Labor") +
                getProjectedValueAsNumber("Payroll Tax")
            )}</td>
            <td style="font-weight: bold; background-color: #e3f2fd;">${formatPercentage(
              parseFloat(
                String(getProjectedValue("Crew Labor", "percent")).replace(
                  "%",
                  ""
                )
              ) +
                parseFloat(
                  String(
                    getProjectedValue("Management Labor", "percent")
                  ).replace("%", "")
                ) +
                parseFloat(
                  String(getProjectedValue("Payroll Tax", "percent")).replace(
                    "%",
                    ""
                  )
                )
            )}</td>
            <td style="font-weight: bold; background-color: #e3f2fd;">-</td>
          </tr>
          
          <!-- Purchases Section -->
          <tr class="print-section-header print-purchases-header">
            <td colspan="6">Purchases</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Travel</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.travel.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.travel?.percent || 0
            )}</td>
            <td>${getProjectedValue("Travel", "dollar")}</td>
            <td>${getProjectedValue("Travel", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.travel?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Travel", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.travel?.percent || 0,
        parseFloat(
          String(getProjectedValue("Travel", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Advertising</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.advertising.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.advertising?.percent || 0
            )}</td>
            <td>${getProjectedValue("Advertising", "dollar")}</td>
            <td>${getProjectedValue("Advertising", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.advertising?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Advertising", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.advertising?.percent || 0,
        parseFloat(
          String(getProjectedValue("Advertising", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Advertising Other</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.advOther.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.advOther?.percent || 0
            )}</td>
            <td>${getProjectedValue("Advertising Other", "dollar")}</td>
            <td>${getProjectedValue("Advertising Other", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.advOther?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Advertising Other", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.advOther?.percent || 0,
        parseFloat(
          String(getProjectedValue("Advertising Other", "percent")).replace(
            "%",
            ""
          )
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Promotion</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.promotion.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.promotion?.percent || 0
            )}</td>
            <td>${getProjectedValue("Promotion", "dollar")}</td>
            <td>${getProjectedValue("Promotion", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.promotion?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Promotion", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.promotion?.percent || 0,
        parseFloat(
          String(getProjectedValue("Promotion", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Outside Services</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.outsideServices.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.outsideServices?.percent || 0
            )}</td>
            <td>${getProjectedValue("Outside Services", "dollar")}</td>
            <td>${getProjectedValue("Outside Services", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.outsideServices?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Outside Services", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.outsideServices?.percent || 0,
        parseFloat(
          String(getProjectedValue("Outside Services", "percent")).replace(
            "%",
            ""
          )
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Linen</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.linen.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.linen?.percent || 0
            )}</td>
            <td>${getProjectedValue("Linen", "dollar")}</td>
            <td>${getProjectedValue("Linen", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.linen?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Linen", "percent")).replace("%", "")
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.linen?.percent || 0,
        parseFloat(
          String(getProjectedValue("Linen", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Operating Supply</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.opsSupplies.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.opsSupplies?.percent || 0
            )}</td>
            <td>${getProjectedValue("Operating Supply", "dollar")}</td>
            <td>${getProjectedValue("Operating Supply", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.opsSupplies?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Operating Supply", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.opsSupplies?.percent || 0,
        parseFloat(
          String(getProjectedValue("Operating Supply", "percent")).replace(
            "%",
            ""
          )
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Maintenance & Repair</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.maintenanceRepair.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.maintenanceRepair?.percent || 0
            )}</td>
            <td>${getProjectedValue("Maintenance & Repair", "dollar")}</td>
            <td>${getProjectedValue("Maintenance & Repair", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.maintenanceRepair?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Maintenance & Repair", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.maintenanceRepair?.percent || 0,
        parseFloat(
          String(getProjectedValue("Maintenance & Repair", "percent")).replace(
            "%",
            ""
          )
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Small Equipment</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.smallEquipment.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.smallEquipment?.percent || 0
            )}</td>
            <td>${getProjectedValue("Small Equipment", "dollar")}</td>
            <td>${getProjectedValue("Small Equipment", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.smallEquipment?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Small Equipment", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.smallEquipment?.percent || 0,
        parseFloat(
          String(getProjectedValue("Small Equipment", "percent")).replace(
            "%",
            ""
          )
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Utilities</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.utilities.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.utilities?.percent || 0
            )}</td>
            <td>${getProjectedValue("Utilities", "dollar")}</td>
            <td>${getProjectedValue("Utilities", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.utilities?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Utilities", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.utilities?.percent || 0,
        parseFloat(
          String(getProjectedValue("Utilities", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Office</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.office.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.office?.percent || 0
            )}</td>
            <td>${getProjectedValue("Office", "dollar")}</td>
            <td>${getProjectedValue("Office", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.office?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Office", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.office?.percent || 0,
        parseFloat(
          String(getProjectedValue("Office", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Cash +/-</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.cashPlusMinus.dollars
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.cashPlusMinus?.percent || 0
            )}</td>
            <td>${getProjectedValue("Cash +/-", "dollar")}</td>
            <td>${getProjectedValue("Cash +/-", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.cashPlusMinus?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Cash +/-", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.cashPlusMinus?.percent || 0,
        parseFloat(
          String(getProjectedValue("Cash +/-", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Crew Relations</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.crewRelations?.dollars || 0
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.crewRelations?.percent || 0
            )}</td>
            <td>${getProjectedValue("Crew Relations", "dollar")}</td>
            <td>${getProjectedValue("Crew Relations", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.crewRelations?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Crew Relations", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.crewRelations?.percent || 0,
        parseFloat(
          String(getProjectedValue("Crew Relations", "percent")).replace(
            "%",
            ""
          )
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Training</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.training?.dollars || 0
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.training?.percent || 0
            )}</td>
            <td>${getProjectedValue("Training", "dollar")}</td>
            <td>${getProjectedValue("Training", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.controllableExpenses.training?.percent || 0,
                parseFloat(
                  String(getProjectedValue("Training", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "default"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.controllableExpenses.training?.percent || 0,
        parseFloat(
          String(getProjectedValue("Training", "percent")).replace("%", "")
        )
      ),
      "default"
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Dues and Subscriptions</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.duesAndSubscriptions?.dollars || 0
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.duesAndSubscriptions?.percent || 0
            )}</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
          </tr>
          
          <!-- Purchases Total -->
          <tr class="print-section-header print-purchases-total">
            <td style="padding-left: 20px; font-weight: bold; background-color: #fce4ec;">Purchases Total</td>
            <td style="font-weight: bold; background-color: #fce4ec;">${formatCurrency(
              (actualData.controllableExpenses.travel?.dollars || 0) +
                (actualData.controllableExpenses.advertising?.dollars || 0) +
                (actualData.controllableExpenses.promotion?.dollars || 0) +
                (actualData.controllableExpenses.outsideServices?.dollars ||
                  0) +
                (actualData.controllableExpenses.linen?.dollars || 0) +
                (actualData.controllableExpenses.opsSupplies?.dollars || 0) +
                (actualData.controllableExpenses.maintenanceRepair?.dollars ||
                  0) +
                (actualData.controllableExpenses.smallEquipment?.dollars || 0) +
                (actualData.controllableExpenses.utilities?.dollars || 0) +
                (actualData.controllableExpenses.office?.dollars || 0) +
                (actualData.controllableExpenses.cashPlusMinus?.dollars || 0) +
                (actualData.controllableExpenses.crewRelations?.dollars || 0) +
                (actualData.controllableExpenses.training?.dollars || 0) +
                (actualData.controllableExpenses.duesAndSubscriptions
                  ?.dollars || 0)
            )}</td>
            <td style="font-weight: bold; background-color: #fce4ec;">${formatPercentage(
              (actualData.controllableExpenses.travel?.percent || 0) +
                (actualData.controllableExpenses.advertising?.percent || 0) +
                (actualData.controllableExpenses.advOther?.percent || 0) +
                (actualData.controllableExpenses.promotion?.percent || 0) +
                (actualData.controllableExpenses.outsideServices?.percent ||
                  0) +
                (actualData.controllableExpenses.linen?.percent || 0) +
                (actualData.controllableExpenses.opsSupplies?.percent || 0) +
                (actualData.controllableExpenses.maintenanceRepair?.percent ||
                  0) +
                (actualData.controllableExpenses.smallEquipment?.percent || 0) +
                (actualData.controllableExpenses.utilities?.percent || 0) +
                (actualData.controllableExpenses.office?.percent || 0) +
                (actualData.controllableExpenses.cashPlusMinus?.percent || 0) +
                (actualData.controllableExpenses.crewRelations?.percent || 0) +
                (actualData.controllableExpenses.training?.percent || 0) +
                (actualData.controllableExpenses.duesAndSubscriptions
                  ?.percent || 0)
            )}</td>
            <td style="font-weight: bold; background-color: #fce4ec;">${formatCurrency(
              (getProjectedValueAsNumber("Travel") || 0) +
                (getProjectedValueAsNumber("Advertising") || 0) +
                (getProjectedValueAsNumber("Advertising Other") || 0) +
                (getProjectedValueAsNumber("Promotion") || 0) +
                (getProjectedValueAsNumber("Outside Services") || 0) +
                (getProjectedValueAsNumber("Linen") || 0) +
                (getProjectedValueAsNumber("Operating Supply") || 0) +
                (getProjectedValueAsNumber("Maintenance & Repair") || 0) +
                (getProjectedValueAsNumber("Small Equipment") || 0) +
                (getProjectedValueAsNumber("Utilities") || 0) +
                (getProjectedValueAsNumber("Office") || 0) +
                (getProjectedValueAsNumber("Cash +/-") || 0) +
                (getProjectedValueAsNumber("Crew Relations") || 0) +
                (getProjectedValueAsNumber("Training") || 0)
            )}</td>
            <td style="font-weight: bold; background-color: #fce4ec;">${formatPercentage(
              (() => {
                const val = getProjectedValue("Travel", "percent");
                const num = parseFloat(String(val || "0").replace("%", ""));
                return isNaN(num) ? 0 : num;
              })() +
                (() => {
                  const val = getProjectedValue("Advertising", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Advertising Other", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Promotion", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Outside Services", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Linen", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Operating Supply", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue(
                    "Maintenance & Repair",
                    "percent"
                  );
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Small Equipment", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Utilities", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Office", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Cash +/-", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Crew Relations", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })() +
                (() => {
                  const val = getProjectedValue("Training", "percent");
                  const num = parseFloat(String(val || "0").replace("%", ""));
                  return isNaN(num) ? 0 : num;
                })()
            )}</td>
            <td style="font-weight: bold; background-color: #fce4ec;">-</td>
          </tr>
          
          <!-- Totals -->
          <tr class="print-section-header print-totals-header">
            <td>Total Controllable</td>
            <td>${formatCurrency(actualData.totalControllableDollars)}</td>
            <td>${formatPercentage(actualData.totalControllablePercent)}</td>
            <td>${getProjectedValue("Total Controllable", "dollar")}</td>
            <td>${getProjectedValue("Total Controllable", "percent")}</td>
            <td>-</td>
          </tr>
          
          <!-- P.A.C. -->
          <tr class="print-section-header print-pac-header">
            <td>P.A.C.</td>
            <td class="${getColorClass(
              actualData.pacDollars,
              getProjectedValueAsNumber("P.A.C.")
            )}">${formatCurrency(actualData.pacDollars)}</td>
            <td class="${getColorClass(
              actualData.pacPercent,
              (getProjectedValueAsNumber("P.A.C.") /
                (actualData.productNetSales || 1)) *
                100
            )}">${formatPercentage(actualData.pacPercent)}</td>
            <td>${getProjectedValue("P.A.C.", "dollar")}</td>
            <td>${getProjectedValue("P.A.C.", "percent")}</td>
            <td class="${getDiffPercentColorClass(
              calculateDiffPercent(
                actualData.pacPercent,
                parseFloat(
                  String(getProjectedValue("P.A.C.", "percent")).replace(
                    "%",
                    ""
                  )
                )
              ),
              "pac"
            )}">${formatDiffPercentForPrint(
      calculateDiffPercent(
        actualData.pacPercent,
        parseFloat(
          String(getProjectedValue("P.A.C.", "percent")).replace("%", "")
        )
      ),
      "pac"
    )}</td>
          </tr>
        </tbody>
      </table>
    `;
  };

  // Custom print function
  const handlePrint = () => {
    try {
      if (!pacData || !actualData.controllableExpenses) {
        alert("No data available to print. Please wait for data to load.");
        return;
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups for this site to enable printing.");
        return;
      }

      const printContent = generatePrintContent();

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>PAC Report - ${storeId} - ${month} ${year}</title>
            <meta charset="utf-8">
            <style>
              ${printStyles}
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);

      printWindow.document.close();

      // Wait for content to load before printing
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        // Don't close immediately, let user see the result
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 1000);
    } catch (error) {
      console.error("Print error:", error);
      alert("Error generating print preview. Please try again.");
    }
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Convert month name to number for API call
  const getMonthNumber = (monthName) => {
    const months = {
      January: "01",
      February: "02",
      March: "03",
      April: "04",
      May: "05",
      June: "06",
      July: "07",
      August: "08",
      September: "09",
      October: "10",
      November: "11",
      December: "12",
    };
    return months[monthName] || "01";
  };

  const fetchProjectionsData = async (formattedStoreId, yearMonth) => {
    try {
      const data = await apiCall(
        `/api/pac/projections/${formattedStoreId}/${yearMonth}`
      );
      return data;
    } catch (error) {
      console.warn(`Error fetching projections: ${error.message}`);
      return null;
    }
  };

  const fetchPacData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const yearMonth = `${year}${getMonthNumber(month)}`;

      // Convert store ID to proper format (e.g., "001" -> "store_001")
      const formattedStoreId = storeId.startsWith("store_")
        ? storeId
        : `store_${storeId.padStart(3, "0")}`;

      // Fetch actual, projections, and PAC actual data in parallel
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
      const monthNumber = monthIndex >= 0 ? monthIndex + 1 : 1;
      const pacActualYearMonth = `${year}${String(monthNumber).padStart(
        2,
        "0"
      )}`;

      const [actualData, projectionsData, pacActualData] = await Promise.all([
        apiCall(`/api/pac/calc/${formattedStoreId}/${yearMonth}`).catch(
          () => null
        ),
        fetchProjectionsData(formattedStoreId, yearMonth),
        apiCall(
          `/api/pac/actual/${formattedStoreId}/${pacActualYearMonth}`
        ).catch(() => null),
      ]);

      if (!actualData) {
        throw new Error("Failed to fetch PAC data");
      }
      const data = actualData;

      // Convert snake_case from backend to camelCase for frontend
      const convertedData = {
        productNetSales: parseFloat(data.product_net_sales),
        allNetSales: parseFloat(data.all_net_sales),
        amountUsed: {
          food: parseFloat(data.amount_used.food),
          paper: parseFloat(data.amount_used.paper),
          condiment: parseFloat(data.amount_used.condiment),
          nonProduct: parseFloat(data.amount_used.non_product),
          opSupplies: parseFloat(data.amount_used.op_supplies),
        },
        controllableExpenses: {
          baseFood: {
            dollars: parseFloat(data.controllable_expenses.base_food.dollars),
            percent: parseFloat(data.controllable_expenses.base_food.percent),
          },
          employeeMeal: {
            dollars: parseFloat(
              data.controllable_expenses.employee_meal.dollars
            ),
            percent: parseFloat(
              data.controllable_expenses.employee_meal.percent
            ),
          },
          condiment: {
            dollars: parseFloat(data.controllable_expenses.condiment.dollars),
            percent: parseFloat(data.controllable_expenses.condiment.percent),
          },
          totalWaste: {
            dollars: parseFloat(data.controllable_expenses.total_waste.dollars),
            percent: parseFloat(data.controllable_expenses.total_waste.percent),
          },
          paper: {
            dollars: parseFloat(data.controllable_expenses.paper.dollars),
            percent: parseFloat(data.controllable_expenses.paper.percent),
          },
          crewLabor: {
            dollars: parseFloat(data.controllable_expenses.crew_labor.dollars),
            percent: parseFloat(data.controllable_expenses.crew_labor.percent),
          },
          managementLabor: {
            dollars: parseFloat(
              data.controllable_expenses.management_labor.dollars
            ),
            percent: parseFloat(
              data.controllable_expenses.management_labor.percent
            ),
          },
          payrollTax: {
            dollars: parseFloat(data.controllable_expenses.payroll_tax.dollars),
            percent: parseFloat(data.controllable_expenses.payroll_tax.percent),
          },
          additionalLaborDollars: {
            dollars: parseFloat(
              data.controllable_expenses.additional_labor_dollars?.dollars || 0
            ),
            percent: parseFloat(
              data.controllable_expenses.additional_labor_dollars?.percent || 0
            ),
          },
          travel: {
            dollars: parseFloat(data.controllable_expenses.travel.dollars),
            percent: parseFloat(data.controllable_expenses.travel.percent),
          },
          advertising: {
            dollars: parseFloat(data.controllable_expenses.advertising.dollars),
            percent: parseFloat(data.controllable_expenses.advertising.percent),
          },
          advertisingOther: {
            dollars: parseFloat(
              data.controllable_expenses.advertising_other.dollars
            ),
            percent: parseFloat(
              data.controllable_expenses.advertising_other.percent
            ),
          },
          promotion: {
            dollars: parseFloat(data.controllable_expenses.promotion.dollars),
            percent: parseFloat(data.controllable_expenses.promotion.percent),
          },
          outsideServices: {
            dollars: parseFloat(
              data.controllable_expenses.outside_services.dollars
            ),
            percent: parseFloat(
              data.controllable_expenses.outside_services.percent
            ),
          },
          linen: {
            dollars: parseFloat(data.controllable_expenses.linen.dollars),
            percent: parseFloat(data.controllable_expenses.linen.percent),
          },
          opSupply: {
            dollars: parseFloat(data.controllable_expenses.op_supply.dollars),
            percent: parseFloat(data.controllable_expenses.op_supply.percent),
          },
          maintenanceRepair: {
            dollars: parseFloat(
              data.controllable_expenses.maintenance_repair.dollars
            ),
            percent: parseFloat(
              data.controllable_expenses.maintenance_repair.percent
            ),
          },
          smallEquipment: {
            dollars: parseFloat(
              data.controllable_expenses.small_equipment.dollars
            ),
            percent: parseFloat(
              data.controllable_expenses.small_equipment.percent
            ),
          },
          utilities: {
            dollars: parseFloat(data.controllable_expenses.utilities.dollars),
            percent: parseFloat(data.controllable_expenses.utilities.percent),
          },
          office: {
            dollars: parseFloat(data.controllable_expenses.office.dollars),
            percent: parseFloat(data.controllable_expenses.office.percent),
          },
          cashAdjustments: {
            dollars: parseFloat(
              data.controllable_expenses.cash_adjustments.dollars
            ),
            percent: parseFloat(
              data.controllable_expenses.cash_adjustments.percent
            ),
          },
          crewRelations: {
            dollars: parseFloat(
              data.controllable_expenses.crew_relations.dollars
            ),
            percent: parseFloat(
              data.controllable_expenses.crew_relations.percent
            ),
          },
          training: {
            dollars: parseFloat(data.controllable_expenses.training.dollars),
            percent: parseFloat(data.controllable_expenses.training.percent),
          },
          duesAndSubscriptions: {
            dollars: parseFloat(
              data.controllable_expenses.dues_and_subscriptions?.dollars || 0
            ),
            percent: parseFloat(
              data.controllable_expenses.dues_and_subscriptions?.percent || 0
            ),
          },
        },
        totalControllableDollars: parseFloat(data.total_controllable_dollars),
        totalControllablePercent: parseFloat(data.total_controllable_percent),
        pacPercent: parseFloat(data.pac_percent),
        pacDollars: parseFloat(data.pac_dollars),
      };

      setPacData(convertedData);
      setProjectionsData(projectionsData);
      setPacActualData(pacActualData);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching PAC data:", err);
      // Set empty data structure on error
      setPacData({
        productNetSales: 0,
        allNetSales: 0,
        amountUsed: {
          food: 0,
          paper: 0,
          condiment: 0,
          nonProduct: 0,
          opSupplies: 0,
        },
        controllableExpenses: {
          baseFood: { dollars: 0, percent: 0 },
          employeeMeal: { dollars: 0, percent: 0 },
          condiment: { dollars: 0, percent: 0 },
          totalWaste: { dollars: 0, percent: 0 },
          paper: { dollars: 0, percent: 0 },
          crewLabor: { dollars: 0, percent: 0 },
          managementLabor: { dollars: 0, percent: 0 },
          payrollTax: { dollars: 0, percent: 0 },
          additionalLaborDollars: { dollars: 0, percent: 0 },
          travel: { dollars: 0, percent: 0 },
          advertising: { dollars: 0, percent: 0 },
          advertisingOther: { dollars: 0, percent: 0 },
          promotion: { dollars: 0, percent: 0 },
          outsideServices: { dollars: 0, percent: 0 },
          linen: { dollars: 0, percent: 0 },
          operatingSupply: { dollars: 0, percent: 0 },
          maintenanceRepair: { dollars: 0, percent: 0 },
          smallEquipment: { dollars: 0, percent: 0 },
          utilities: { dollars: 0, percent: 0 },
          office: { dollars: 0, percent: 0 },
          cashAdjustments: { dollars: 0, percent: 0 },
          crewRelations: { dollars: 0, percent: 0 },
          training: { dollars: 0, percent: 0 },
        },
        totals: {
          totalControllableDollars: 0,
          totalControllablePercent: 0,
          pacPercent: 0,
          pacDollars: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [storeId, year, month]);

  useEffect(() => {
    if (storeId && year && month) {
      fetchPacData();
    }
  }, [storeId, year, month, fetchPacData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };

  // Helper function to get actual data (prioritize PAC actual data over backend data)
  const getActualData = () => {
    if (pacActualData) {
      const def = { dollars: 0, percent: 0 };
      const fp = pacActualData.foodAndPaper || {};
      const lb = pacActualData.labor || {};
      const pu = pacActualData.purchases || {};
      const tt = pacActualData.totals || {};
      const sl = pacActualData.sales || {};
      return {
        productNetSales: sl.productSales?.dollars ?? 0,
        allNetSales: sl.allNetSales?.dollars ?? 0,
        controllableExpenses: {
          baseFood: fp.baseFood || def,
          employeeMeal: fp.employeeMeal || def,
          condiment: fp.condiment || def,
          totalWaste: fp.totalWaste || def,
          paper: fp.paper || def,
          crewLabor: lb.crewLabor || def,
          managementLabor: lb.managementLabor || def,
          payrollTax: lb.payrollTax || def,
          additionalLaborDollars: lb.additionalLaborDollars || def,
          travel: pu.travel || def,
          advOther: pu.advOther || def,
          promotion: pu.promotion || def,
          outsideServices: pu.outsideServices || def,
          linen: pu.linen || def,
          opsSupplies: pu.opsSupplies || def,
          maintenanceRepair: pu.maintenanceRepair || def,
          smallEquipment: pu.smallEquipment || def,
          utilities: pu.utilities || def,
          office: pu.office || def,
          cashPlusMinus: pu.cashPlusMinus || def,
          crewRelations: pu.crewRelations || def,
          training: pu.training || def,
          duesAndSubscriptions: pu.duesAndSubscriptions || def,
          advertising: pu.advertising || def,
        },
        totalControllableDollars: tt.totalControllable?.dollars ?? 0,
        totalControllablePercent: tt.totalControllable?.percent ?? 0,
        pacPercent: tt.pac?.percent ?? 0,
        pacDollars: tt.pac?.dollars ?? 0,
      };
    }
    // Fallback: map backend shape into the same structure to avoid runtime errors
    if (pacData) {
      // Helper to extract dollars and percent from data structure
      const toObj = (val) => {
        if (!val) return { dollars: 0, percent: 0 };
        // If it's already an object with dollars and percent, use it
        if (typeof val === "object" && ("dollars" in val || "percent" in val)) {
          return {
            dollars: Number(val.dollars || 0),
            percent: Number(val.percent || 0),
          };
        }
        // Otherwise, treat as a number (legacy format)
        return { dollars: Number(val || 0), percent: 0 };
      };
      const ce = pacData.controllableExpenses || {};
      return {
        productNetSales: Number(pacData.productNetSales || 0),
        allNetSales: Number(pacData.allNetSales || 0),
        controllableExpenses: {
          baseFood: toObj(ce.baseFood),
          employeeMeal: toObj(ce.employeeMeal),
          condiment: toObj(ce.condiment),
          totalWaste: toObj(ce.totalWaste),
          paper: toObj(ce.paper),
          crewLabor: toObj(ce.crewLabor),
          managementLabor: toObj(ce.managementLabor),
          payrollTax: toObj(ce.payrollTax),
          additionalLaborDollars: toObj(ce.additionalLaborDollars),
          travel: toObj(ce.travel),
          advOther: toObj(ce.advOther || ce.advertisingOther),
          promotion: toObj(ce.promotion),
          outsideServices: toObj(ce.outsideServices),
          linen: toObj(ce.linen),
          opsSupplies: toObj(ce.opSupply || ce.opsSupplies),
          maintenanceRepair: toObj(ce.maintenanceRepair),
          smallEquipment: toObj(ce.smallEquipment),
          utilities: toObj(ce.utilities),
          office: toObj(ce.office),
          cashPlusMinus: toObj(ce.cashAdjustments || ce.cashPlusMinus),
          crewRelations: toObj(ce.crewRelations),
          training: toObj(ce.training),
          duesAndSubscriptions: toObj(ce.duesAndSubscriptions),
          advertising: toObj(ce.advertising),
        },
        totalControllableDollars: Number(pacData.totalControllableDollars || 0),
        totalControllablePercent: Number(pacData.totalControllablePercent || 0),
        pacPercent: Number(pacData.pacPercent || 0),
        pacDollars: Number(pacData.pacDollars || 0),
      };
    }
    return null;
  };

  const calculateDiffPercent = (
    actualValue,
    projectedValue,
    type = "percent"
  ) => {
    if (
      projectedValue === null ||
      projectedValue === undefined ||
      actualValue === null ||
      actualValue === undefined
    ) {
      return "-";
    }

    // Special handling for sales type (Product Sales and All Net Sales)
    if (type === "sales") {
      if (projectedValue === 0) return 0;
      // Calculate difference as (actual $ / projected $ - 1) * 100
      return (actualValue / projectedValue - 1) * 100;
    }

    // Default: subtract percentages
    return actualValue - projectedValue;
  };

  const formatDiffPercent = (diff, type = "default") => {
    if (diff === "-") return "-";

    let color = "black";
    let prefix = "";

    if (type === "sales") {
      // Sales: green when positive, red when negative
      color = diff > 0 ? "green" : diff < 0 ? "red" : "black";
      prefix = diff > 0 ? "+" : diff < 0 ? "-" : "";
    } else if (type === "pac") {
      // P.A.C.: green when positive, red when negative
      color = diff > 0 ? "green" : diff < 0 ? "red" : "black";
      prefix = diff > 0 ? "+" : diff < 0 ? "-" : "";
    } else {
      // Other items: red when actual > projected (bad), green when actual < projected (good)
      color = diff > 0 ? "red" : diff < 0 ? "green" : "black";
      prefix = diff > 0 ? "+" : diff < 0 ? "-" : "";
    }

    return (
      <span style={{ color }}>
        {prefix}
        {formatPercentage(Math.abs(diff))}
      </span>
    );
  };

  // Helper function for print formatting (returns plain string)
  const formatDiffPercentForPrint = (diff, type = "default") => {
    if (diff === "-") return "-";

    let prefix = "";

    if (type === "sales") {
      prefix = diff > 0 ? "+" : diff < 0 ? "-" : "";
    } else if (type === "pac") {
      prefix = diff > 0 ? "+" : diff < 0 ? "-" : "";
    } else {
      prefix = diff > 0 ? "+" : diff < 0 ? "-" : "";
    }

    return `${prefix}${formatPercentage(Math.abs(diff))}`;
  };

  // Helper function to format actual values with color coding
  const formatActualWithColor = (actual, projected, type = "dollar") => {
    if (!projectionsData || projected === null || projected === undefined) {
      return type === "dollar"
        ? formatCurrency(actual)
        : formatPercentage(actual);
    }

    const projectedNum =
      typeof projected === "number" ? projected : parseFloat(projected);
    const actualNum = typeof actual === "number" ? actual : parseFloat(actual);

    // Special handling for sales type (Product Sales and All Net Sales)
    if (type === "sales") {
      if (projectedNum === 0) return formatPercentage(0);

      // Calculate difference as (actual $ / projected $ - 1) * 100
      const diffPercent = (actualNum / projectedNum - 1) * 100;

      const color =
        diffPercent < 0 ? "red" : diffPercent > 0 ? "green" : "black";
      return (
        <span style={{ color }}>{formatPercentage(Math.abs(diffPercent))}</span>
      );
    }

    // Red when actual < projected, Green when actual > projected
    const color =
      actualNum < projectedNum
        ? "red"
        : actualNum > projectedNum
        ? "green"
        : "black";

    const formatted =
      type === "dollar"
        ? formatCurrency(actualNum)
        : formatPercentage(actualNum);
    return <span style={{ color }}>{formatted}</span>;
  };

  const getProjectedValueAsNumber = (expenseName) => {
    if (!projectionsData) return null;

    const fieldMap = {
      "Product Net Sales": "product_net_sales",
      "All Net Sales": "all_net_sales",
      "Base Food": "controllable_expenses.base_food.dollars",
      "Employee Meal": "controllable_expenses.employee_meal.dollars",
      Condiment: "controllable_expenses.condiment.dollars",
      "Total Waste": "controllable_expenses.total_waste.dollars",
      Paper: "controllable_expenses.paper.dollars",
      "Crew Labor": "controllable_expenses.crew_labor.dollars",
      "Management Labor": "controllable_expenses.management_labor.dollars",
      "Payroll Tax": "controllable_expenses.payroll_tax.dollars",
      Travel: "controllable_expenses.travel.dollars",
      Advertising: "controllable_expenses.advertising.dollars",
      "Advertising Other": "controllable_expenses.advertising_other.dollars",
      Promotion: "controllable_expenses.promotion.dollars",
      "Outside Services": "controllable_expenses.outside_services.dollars",
      Linen: "controllable_expenses.linen.dollars",
      "Operating Supply": "controllable_expenses.op_supply.dollars",
      "Maintenance & Repair":
        "controllable_expenses.maintenance_repair.dollars",
      "Small Equipment": "controllable_expenses.small_equipment.dollars",
      Utilities: "controllable_expenses.utilities.dollars",
      Office: "controllable_expenses.office.dollars",
      "Cash +/-": "controllable_expenses.cash_adjustments.dollars",
      "Crew Relations": "controllable_expenses.crew_relations.dollars",
      Training: "controllable_expenses.training.dollars",
      "Total Controllable": "total_controllable_dollars",
      "P.A.C.": "pac_dollars",
    };

    const fieldPath = fieldMap[expenseName];
    if (!fieldPath) return null;

    const value = fieldPath
      .split(".")
      .reduce((obj, key) => obj?.[key], projectionsData);
    return value !== null && value !== undefined ? parseFloat(value) : null;
  };

  const getProjectedPercent = (accountName) => {
    // Use getProjectedValue to calculate percent from dollars
    return getProjectedValue(accountName, "percent");
  };

  // Helper function to get projected values from projections data
  const getProjectedValue = (expenseName, type) => {
    if (!projectionsData) return "-";

    const dollarFieldMap = {
      "Product Net Sales": "product_net_sales",
      "All Net Sales": "all_net_sales",
      "Base Food": "controllable_expenses.base_food.dollars",
      "Employee Meal": "controllable_expenses.employee_meal.dollars",
      Condiment: "controllable_expenses.condiment.dollars",
      "Total Waste": "controllable_expenses.total_waste.dollars",
      Paper: "controllable_expenses.paper.dollars",
      "Crew Labor": "controllable_expenses.crew_labor.dollars",
      "Management Labor": "controllable_expenses.management_labor.dollars",
      "Payroll Tax": "controllable_expenses.payroll_tax.dollars",
      Travel: "controllable_expenses.travel.dollars",
      Advertising: "controllable_expenses.advertising.dollars",
      "Advertising Other": "controllable_expenses.advertising_other.dollars",
      Promotion: "controllable_expenses.promotion.dollars",
      "Outside Services": "controllable_expenses.outside_services.dollars",
      Linen: "controllable_expenses.linen.dollars",
      "Operating Supply": "controllable_expenses.op_supply.dollars",
      "Maintenance & Repair":
        "controllable_expenses.maintenance_repair.dollars",
      "Small Equipment": "controllable_expenses.small_equipment.dollars",
      Utilities: "controllable_expenses.utilities.dollars",
      Office: "controllable_expenses.office.dollars",
      "Cash +/-": "controllable_expenses.cash_adjustments.dollars",
      "Crew Relations": "controllable_expenses.crew_relations.dollars",
      Training: "controllable_expenses.training.dollars",
      "Total Controllable": "total_controllable_dollars",
      "P.A.C.": "pac_dollars",
    };

    const percentFieldMap = {
      "Base Food": "controllable_expenses.base_food.percent",
      "Employee Meal": "controllable_expenses.employee_meal.percent",
      Condiment: "controllable_expenses.condiment.percent",
      "Total Waste": "controllable_expenses.total_waste.percent",
      Paper: "controllable_expenses.paper.percent",
      "Crew Labor": "controllable_expenses.crew_labor.percent",
      "Management Labor": "controllable_expenses.management_labor.percent",
      "Payroll Tax": "controllable_expenses.payroll_tax.percent",
      Travel: "controllable_expenses.travel.percent",
      Advertising: "controllable_expenses.advertising.percent",
      "Advertising Other": "controllable_expenses.advertising_other.percent",
      Promotion: "controllable_expenses.promotion.percent",
      "Outside Services": "controllable_expenses.outside_services.percent",
      Linen: "controllable_expenses.linen.percent",
      "Operating Supply": [
        "controllable_expenses.operating_supply.percent",
        "controllable_expenses.op_supply.percent",
      ],
      "Maintenance & Repair":
        "controllable_expenses.maintenance_repair.percent",
      "Small Equipment": "controllable_expenses.small_equipment.percent",
      Utilities: "controllable_expenses.utilities.percent",
      Office: "controllable_expenses.office.percent",
      "Cash +/-": "controllable_expenses.cash_adjustments.percent",
      "Crew Relations": "controllable_expenses.crew_relations.percent",
      Training: "controllable_expenses.training.percent",
      "Total Controllable": "total_controllable_percent",
      "P.A.C.": "pac_percent",
    };

    // Helper to resolve a value from a path or array of paths
    const resolveValue = (pathOrPaths) => {
      const paths = Array.isArray(pathOrPaths) ? pathOrPaths : [pathOrPaths];
      for (const path of paths) {
        const next = path
          .split(".")
          .reduce((obj, key) => obj?.[key], projectionsData);
        if (next !== undefined && next !== null) {
          return next;
        }
      }
      return undefined;
    };

    // For percent type, calculate from dollars / product sales * 100
    if (type === "percent") {
      const dollarFieldPath = dollarFieldMap[expenseName];
      if (!dollarFieldPath) return "-";

      const projectedDollars = resolveValue(dollarFieldPath);
      const productSales = projectionsData.product_net_sales || 0;

      if (projectedDollars === undefined || projectedDollars === null)
        return "-";
      if (productSales === 0) return "0.00%";

      const calculatedPercent =
        (parseFloat(projectedDollars) / parseFloat(productSales)) * 100;
      return formatPercentage(calculatedPercent);
    }

    // For dollar type, use the dollar field map
    const fieldPath = dollarFieldMap[expenseName];
    if (!fieldPath) return "-";

    const value = resolveValue(fieldPath);
    if (value === undefined || value === null) return "-";

    return formatCurrency(parseFloat(value));
  };

  if (!storeId) {
    return (
      <Container sx={{ textAlign: "center", marginTop: 5 }}>
        <Alert severity="info" sx={{ marginBottom: 2 }}>
          Please select a store from the dropdown above to view PAC data.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 2 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchPacData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  const actualData = getActualData();

  // Guard: ensure all nested objects exist to avoid runtime errors in JSX below
  const safe = (v) => (v == null ? 0 : v);
  const ce = actualData?.controllableExpenses || {};
  const ensureObj = (o) =>
    o && typeof o === "object" ? o : { dollars: 0, percent: 0 };
  Object.assign(ce, {
    baseFood: ensureObj(ce.baseFood),
    employeeMeal: ensureObj(ce.employeeMeal),
    condiment: ensureObj(ce.condiment),
    totalWaste: ensureObj(ce.totalWaste),
    paper: ensureObj(ce.paper),
    crewLabor: ensureObj(ce.crewLabor),
    managementLabor: ensureObj(ce.managementLabor),
    payrollTax: ensureObj(ce.payrollTax),
    travel: ensureObj(ce.travel),
    advertising: ensureObj(ce.advertising),
    advertisingOther: ensureObj(ce.advertisingOther),
    promotion: ensureObj(ce.promotion),
    outsideServices: ensureObj(ce.outsideServices),
    linen: ensureObj(ce.linen),
    opSupply: ensureObj(ce.opSupply),
    operatingSupply: ensureObj(ce.operatingSupply),
    opsSupplies: ensureObj(ce.opsSupplies),
    maintenanceRepair: ensureObj(ce.maintenanceRepair),
    smallEquipment: ensureObj(ce.smallEquipment),
    utilities: ensureObj(ce.utilities),
    office: ensureObj(ce.office),
    cashAdjustments: ensureObj(ce.cashAdjustments),
    cashPlusMinus: ensureObj(ce.cashPlusMinus),
    crewRelations: ensureObj(ce.crewRelations),
    training: ensureObj(ce.training),
    promo: ensureObj(ce.promo),
  });

  if (!actualData || !actualData.controllableExpenses) {
    return (
      <Container sx={{ mt: 2 }}>
        <Alert severity="info">
          No PAC data available. Please select a store, year, and month.
        </Alert>
      </Container>
    );
  }
  const handleExportExcel = () => {
    if (!actualData || !actualData.controllableExpenses) {
      alert("No data available to export.");
      return;
    }

    // Helper function to calculate difference % for sales
    const calculateSalesDiffPercent = (actual, projected) => {
      if (!projected || projected === 0) return null;
      return ((actual - projected) / projected) * 100;
    };

    // Helper function to calculate difference % for other items
    const calculateOtherDiffPercent = (actualPercent, projectedPercentStr) => {
      if (!projectedPercentStr || projectedPercentStr === "-") return null;
      const projectedNum = parseFloat(
        String(projectedPercentStr).replace("%", "")
      );
      if (isNaN(projectedNum)) return null;
      return actualPercent - projectedNum;
    };

    // Format difference % for display
    const formatDiffPercent = (diff) => {
      if (diff === null || diff === undefined || isNaN(diff)) return "-";
      const sign = diff > 0 ? "+" : "";
      return `${sign}${diff.toFixed(2)}%`;
    };

    // Format last updated timestamp
    const formatLastUpdated = () => {
      if (!lastUpdatedTimestamp) return "-";
      const ts = new Date(lastUpdatedTimestamp);
      return ts.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    };

    // Flatten into rows for Excel
    const rows = [
      // Metadata rows
      {
        Account: "Store Number",
        "Actual $": storeId,
        "Actual %": "",
        "Projected $": "",
        "Projected %": "",
        "Difference %": "",
      },
      {
        Account: "Month",
        "Actual $": month,
        "Actual %": "",
        "Projected $": "",
        "Projected %": "",
        "Difference %": "",
      },
      {
        Account: "Year",
        "Actual $": year,
        "Actual %": "",
        "Projected $": "",
        "Projected %": "",
        "Difference %": "",
      },
      {
        Account: "Last Updated",
        "Actual $": formatLastUpdated(),
        "Actual %": "",
        "Projected $": "",
        "Projected %": "",
        "Difference %": "",
      },
      {
        Account: "Month Locked By",
        "Actual $": monthLockStatus?.locked_by || "-",
        "Actual %": "",
        "Projected $": "",
        "Projected %": "",
        "Difference %": "",
      },
      {
        Account: "",
        "Actual $": "",
        "Actual %": "",
        "Projected $": "",
        "Projected %": "",
        "Difference %": "",
      }, // Empty row separator

      // --- Sales ---
      {
        Account: "Product Net Sales",
        "Actual $": actualData?.productNetSales ?? 0,
        "Actual %": "-",
        "Projected $": getProjectedValueAsNumber("Product Net Sales") || 0,
        "Projected %": "-",
        "Difference %": formatDiffPercent(
          calculateSalesDiffPercent(
            actualData?.productNetSales ?? 0,
            getProjectedValueAsNumber("Product Net Sales")
          )
        ),
      },
      {
        Account: "All Net Sales",
        "Actual $": actualData?.allNetSales ?? 0,
        "Actual %": "-",
        "Projected $": getProjectedValueAsNumber("All Net Sales") || 0,
        "Projected %": "-",
        "Difference %": formatDiffPercent(
          calculateSalesDiffPercent(
            actualData?.allNetSales ?? 0,
            getProjectedValueAsNumber("All Net Sales")
          )
        ),
      },

      // --- Food & Paper ---
      {
        Account: "Base Food",
        "Actual $": actualData.controllableExpenses.baseFood?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.baseFood?.percent !== undefined
            ? formatPercentage(actualData.controllableExpenses.baseFood.percent)
            : "-",
        "Projected $": getProjectedValueAsNumber("Base Food") || 0,
        "Projected %": getProjectedPercent("Base Food"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.baseFood?.percent || 0,
            getProjectedPercent("Base Food")
          )
        ),
      },
      {
        Account: "Employee Meal",
        "Actual $": actualData.controllableExpenses.employeeMeal?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.employeeMeal?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.employeeMeal.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Employee Meal") || 0,
        "Projected %": getProjectedPercent("Employee Meal"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.employeeMeal?.percent || 0,
            getProjectedPercent("Employee Meal")
          )
        ),
      },
      {
        Account: "Condiment",
        "Actual $": actualData.controllableExpenses.condiment?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.condiment?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.condiment.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Condiment") || 0,
        "Projected %": getProjectedPercent("Condiment"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.condiment?.percent || 0,
            getProjectedPercent("Condiment")
          )
        ),
      },
      {
        Account: "Total Waste",
        "Actual $": actualData.controllableExpenses.totalWaste?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.totalWaste?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.totalWaste.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Total Waste") || 0,
        "Projected %": getProjectedPercent("Total Waste"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.totalWaste?.percent || 0,
            getProjectedPercent("Total Waste")
          )
        ),
      },
      {
        Account: "Paper",
        "Actual $": actualData.controllableExpenses.paper?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.paper?.percent !== undefined
            ? formatPercentage(actualData.controllableExpenses.paper.percent)
            : "-",
        "Projected $": getProjectedValueAsNumber("Paper") || 0,
        "Projected %": getProjectedPercent("Paper"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.paper?.percent || 0,
            getProjectedPercent("Paper")
          )
        ),
      },

      // --- Labor ---
      {
        Account: "Crew Labor",
        "Actual $": actualData.controllableExpenses.crewLabor?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.crewLabor?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.crewLabor.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Crew Labor") || 0,
        "Projected %": getProjectedPercent("Crew Labor"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.crewLabor?.percent || 0,
            getProjectedPercent("Crew Labor")
          )
        ),
      },
      {
        Account: "Management Labor",
        "Actual $":
          actualData.controllableExpenses.managementLabor?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.managementLabor?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.managementLabor.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Management Labor") || 0,
        "Projected %": getProjectedPercent("Management Labor"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.managementLabor?.percent || 0,
            getProjectedPercent("Management Labor")
          )
        ),
      },
      {
        Account: "Payroll Tax",
        "Actual $": actualData.controllableExpenses.payrollTax?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.payrollTax?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.payrollTax.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Payroll Tax") || 0,
        "Projected %": getProjectedPercent("Payroll Tax"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.payrollTax?.percent || 0,
            getProjectedPercent("Payroll Tax")
          )
        ),
      },
      {
        Account: "Additional Labor Dollars",
        "Actual $":
          actualData.controllableExpenses.additionalLaborDollars?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.additionalLaborDollars?.percent !==
          undefined
            ? formatPercentage(
                actualData.controllableExpenses.additionalLaborDollars.percent
              )
            : "-",
        "Projected $": 0,
        "Projected %": "-",
        "Difference %": "-",
      },

      // --- Other Expenses ---
      {
        Account: "Travel",
        "Actual $": actualData.controllableExpenses.travel?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.travel?.percent !== undefined
            ? formatPercentage(actualData.controllableExpenses.travel.percent)
            : "-",
        "Projected $": getProjectedValueAsNumber("Travel") || 0,
        "Projected %": getProjectedPercent("Travel"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.travel?.percent || 0,
            getProjectedPercent("Travel")
          )
        ),
      },
      {
        Account: "Advertising",
        "Actual $": actualData.controllableExpenses.advertising?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.advertising?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.advertising.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Advertising") || 0,
        "Projected %": getProjectedPercent("Advertising"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.advertising?.percent || 0,
            getProjectedPercent("Advertising")
          )
        ),
      },
      {
        Account: "Advertising Other",
        "Actual $": actualData.controllableExpenses.advOther?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.advOther?.percent !== undefined
            ? formatPercentage(actualData.controllableExpenses.advOther.percent)
            : "-",
        "Projected $": getProjectedValueAsNumber("Advertising Other") || 0,
        "Projected %": getProjectedPercent("Advertising Other"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.advOther?.percent || 0,
            getProjectedPercent("Advertising Other")
          )
        ),
      },
      {
        Account: "Promotion",
        "Actual $": actualData.controllableExpenses.promotion?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.promotion?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.promotion.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Promotion") || 0,
        "Projected %": getProjectedPercent("Promotion"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.promotion?.percent || 0,
            getProjectedPercent("Promotion")
          )
        ),
      },
      {
        Account: "Outside Services",
        "Actual $":
          actualData.controllableExpenses.outsideServices?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.outsideServices?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.outsideServices.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Outside Services") || 0,
        "Projected %": getProjectedPercent("Outside Services"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.outsideServices?.percent || 0,
            getProjectedPercent("Outside Services")
          )
        ),
      },
      {
        Account: "Linen",
        "Actual $": actualData.controllableExpenses.linen?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.linen?.percent !== undefined
            ? formatPercentage(actualData.controllableExpenses.linen.percent)
            : "-",
        "Projected $": getProjectedValueAsNumber("Linen") || 0,
        "Projected %": getProjectedPercent("Linen"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.linen?.percent || 0,
            getProjectedPercent("Linen")
          )
        ),
      },
      {
        Account: "Operating Supply",
        "Actual $": actualData.controllableExpenses.opsSupplies?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.opsSupplies?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.opsSupplies.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Operating Supply") || 0,
        "Projected %": getProjectedPercent("Operating Supply"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.opsSupplies?.percent || 0,
            getProjectedPercent("Operating Supply")
          )
        ),
      },
      {
        Account: "Maintenance & Repair",
        "Actual $":
          actualData.controllableExpenses.maintenanceRepair?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.maintenanceRepair?.percent !==
          undefined
            ? formatPercentage(
                actualData.controllableExpenses.maintenanceRepair.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Maintenance & Repair") || 0,
        "Projected %": getProjectedPercent("Maintenance & Repair"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.maintenanceRepair?.percent || 0,
            getProjectedPercent("Maintenance & Repair")
          )
        ),
      },
      {
        Account: "Small Equipment",
        "Actual $":
          actualData.controllableExpenses.smallEquipment?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.smallEquipment?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.smallEquipment.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Small Equipment") || 0,
        "Projected %": getProjectedPercent("Small Equipment"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.smallEquipment?.percent || 0,
            getProjectedPercent("Small Equipment")
          )
        ),
      },
      {
        Account: "Utilities",
        "Actual $": actualData.controllableExpenses.utilities?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.utilities?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.utilities.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Utilities") || 0,
        "Projected %": getProjectedPercent("Utilities"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.utilities?.percent || 0,
            getProjectedPercent("Utilities")
          )
        ),
      },
      {
        Account: "Office",
        "Actual $": actualData.controllableExpenses.office?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.office?.percent !== undefined
            ? formatPercentage(actualData.controllableExpenses.office.percent)
            : "-",
        "Projected $": getProjectedValueAsNumber("Office") || 0,
        "Projected %": getProjectedPercent("Office"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.office?.percent || 0,
            getProjectedPercent("Office")
          )
        ),
      },
      {
        Account: "Cash +/-",
        "Actual $": actualData.controllableExpenses.cashPlusMinus?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.cashPlusMinus?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.cashPlusMinus.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Cash +/-") || 0,
        "Projected %": getProjectedPercent("Cash +/-"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.cashPlusMinus?.percent || 0,
            getProjectedPercent("Cash +/-")
          )
        ),
      },
      {
        Account: "Crew Relations",
        "Actual $": actualData.controllableExpenses.crewRelations?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.crewRelations?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.crewRelations.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Crew Relations") || 0,
        "Projected %": getProjectedPercent("Crew Relations"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.crewRelations?.percent || 0,
            getProjectedPercent("Crew Relations")
          )
        ),
      },
      {
        Account: "Training",
        "Actual $": actualData.controllableExpenses.training?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.training?.percent !== undefined
            ? formatPercentage(actualData.controllableExpenses.training.percent)
            : "-",
        "Projected $": getProjectedValueAsNumber("Training") || 0,
        "Projected %": getProjectedPercent("Training"),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.controllableExpenses.training?.percent || 0,
            getProjectedPercent("Training")
          )
        ),
      },
      {
        Account: "Dues and Subscriptions",
        "Actual $":
          actualData.controllableExpenses.duesAndSubscriptions?.dollars ?? 0,
        "Actual %":
          actualData.controllableExpenses.duesAndSubscriptions?.percent !==
          undefined
            ? formatPercentage(
                actualData.controllableExpenses.duesAndSubscriptions.percent
              )
            : "-",
        "Projected $": 0,
        "Projected %": "-",
        "Difference %": "-",
      },

      // --- Totals ---
      {
        Account: "Total Controllable",
        "Actual $": actualData.totalControllableDollars ?? 0,
        "Actual %":
          actualData.totalControllablePercent !== undefined
            ? formatPercentage(actualData.totalControllablePercent)
            : "-",
        "Projected $": getProjectedValueAsNumber("Total Controllable") || 0,
        "Projected %": getProjectedPercent("Total Controllable"),
        "Difference %": "-",
      },
      {
        Account: "P.A.C.",
        "Actual $": actualData.pacDollars ?? 0,
        "Actual %":
          actualData.pacPercent !== undefined
            ? formatPercentage(actualData.pacPercent)
            : "-",
        "Projected $": getProjectedValueAsNumber("P.A.C.") || 0,
        "Projected %": getProjectedPercent("P.A.C."),
        "Difference %": formatDiffPercent(
          calculateOtherDiffPercent(
            actualData.pacPercent || 0,
            getProjectedPercent("P.A.C.")
          )
        ),
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const currencyCols = ["B", "D"]; // Actual $ and Projected $ columns
    const metadataRowCount = 6; // Store, Month, Year, Last Updated, Month Locked By, empty separator
    currencyCols.forEach((col) => {
      // Start after headers (row 1) and metadata rows (rows 2-7), so data starts at row 8
      for (let row = metadataRowCount + 2; row <= rows.length + 1; row++) {
        const cellRef = `${col}${row}`;
        if (
          worksheet[cellRef] &&
          worksheet[cellRef].v !== "" &&
          worksheet[cellRef].v !== "-"
        ) {
          // Only format if it's a number
          const value = worksheet[cellRef].v;
          if (typeof value === "number") {
            worksheet[cellRef].z = "$#,##0.00"; // Excel currency format
          }
        }
      }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PAC Report");

    XLSX.writeFile(
      workbook,
      `pac_report_${storeId}_${year}${getMonthNumber(month)}.xlsx`
    );

    // saveAs(data, `pac_report_${storeId}_${year}${getMonthNumber(month)}.xlsx`);
  };

  const sectionColors = {
    sales: isDark ? "#1a2b3d" : "#e3f2fd", // navy blue
    food: isDark ? "#1a2a1a" : "#e8f5e9", // green tint
    labor: isDark ? "#332a1c" : "#fff3e0", // amber/brown
    purchases: isDark ? "#2a1f2f" : "#f3e5f5", // purple tint
    total: isDark ? "#101010" : "#f0f0f0", // neutral gray
  };

  return (
    <Container sx={{ mt: 2, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ color: isDark ? "#e0e0e0" : "#000" }}
        >
          PAC Report - {storeId} - {month} {year}
        </Typography>
        <Box>
          <Button
            variant="contained"
            onClick={handlePrint}
            sx={{
              backgroundColor: "#1976d2",
              color: "white",
              mr: 2,
              "&:hover": { backgroundColor: "#1565c0" },
            }}
          >
            Print Report
          </Button>
          <Button
            variant="contained"
            onClick={handleExportExcel}
            sx={{
              backgroundColor: "#2e7d32",
              color: "white",
              "&:hover": { backgroundColor: "#1b5e20" },
            }}
          >
            Export to Excel
          </Button>
        </Box>
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          mb: 3,
          backgroundColor: isDark ? "#121212" : "#fff",
          color: isDark ? "#e0e0e0" : "#000",
          boxShadow: isDark ? "0 0 10px rgba(255,255,255,0.1)" : "none",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "bold", width: "30%" }}>
                Account
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", width: "12%" }}
              >
                Actual $
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", width: "12%" }}
              >
                Actual %
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", width: "12%" }}
              >
                Projected $
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", width: "12%" }}
              >
                Projected %
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", width: "12%" }}
              >
                Difference %
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {/* SALES */}
            <TableRow sx={{ backgroundColor: sectionColors.sales }}>
              <TableCell
                colSpan={6}
                sx={{ fontWeight: "bold", fontSize: "1.1em" }}
              >
                Sales
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Product Net Sales</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatActualWithColor(
                  actualData.productNetSales,
                  getProjectedValueAsNumber("Product Net Sales"),
                  "dollar"
                )}
              </TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {getProjectedValue("Product Net Sales", "dollar")}
              </TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.productNetSales,
                    getProjectedValueAsNumber("Product Net Sales"),
                    "sales"
                  ),
                  "sales"
                )}
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell sx={{ pl: 4 }}>All Net Sales</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatActualWithColor(
                  actualData.allNetSales,
                  getProjectedValueAsNumber("All Net Sales"),
                  "dollar"
                )}
              </TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {getProjectedValue("All Net Sales", "dollar")}
              </TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.allNetSales,
                    getProjectedValueAsNumber("All Net Sales"),
                    "sales"
                  ),
                  "sales"
                )}
              </TableCell>
            </TableRow>

            {/* FOOD & PAPER */}
            <TableRow sx={{ backgroundColor: sectionColors.food }}>
              <TableCell colSpan={6} sx={{ fontWeight: "bold" }}>
                Food & Paper
              </TableCell>
            </TableRow>

            {[
              { name: "Base Food", field: "baseFood" },
              { name: "Employee Meal", field: "employeeMeal" },
              { name: "Condiment", field: "condiment" },
              { name: "Total Waste", field: "totalWaste" },
              { name: "Paper", field: "paper" },
            ].map(({ name, field }) => (
              <TableRow key={name}>
                <TableCell sx={{ pl: 4 }}>{name}</TableCell>
                <TableCell align="right">
                  {formatCurrency(
                    actualData.controllableExpenses[field]?.dollars || 0
                  )}
                </TableCell>
                <TableCell align="right">
                  {formatPercentage(
                    actualData.controllableExpenses[field]?.percent || 0
                  )}
                </TableCell>
                <TableCell align="right">
                  {getProjectedValue(name, "dollar")}
                </TableCell>
                <TableCell align="right">
                  {getProjectedValue(name, "percent")}
                </TableCell>
                <TableCell align="right">
                  {formatDiffPercent(
                    calculateDiffPercent(
                      actualData.controllableExpenses[field]?.percent || 0,
                      parseFloat(
                        String(getProjectedValue(name, "percent")).replace(
                          "%",
                          ""
                        )
                      )
                    ),
                    "default"
                  )}
                </TableCell>
              </TableRow>
            ))}

            {/* Food & Paper Total */}
            <TableRow
              sx={{
                backgroundColor: sectionColors.food,
                borderTop: `2px solid ${isDark ? "#333" : "#ccc"}`,
              }}
            >
              <TableCell sx={{ pl: 4, fontWeight: "bold" }}>
                Food & Paper Total
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  (actualData.controllableExpenses.baseFood?.dollars || 0) +
                    (actualData.controllableExpenses.employeeMeal?.dollars ||
                      0) +
                    (actualData.controllableExpenses.condiment?.dollars || 0) +
                    (actualData.controllableExpenses.totalWaste?.dollars || 0) +
                    (actualData.controllableExpenses.paper?.dollars || 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatPercentage(
                  (actualData.controllableExpenses.baseFood?.percent || 0) +
                    (actualData.controllableExpenses.employeeMeal?.percent ||
                      0) +
                    (actualData.controllableExpenses.condiment?.percent || 0) +
                    (actualData.controllableExpenses.totalWaste?.percent || 0) +
                    (actualData.controllableExpenses.paper?.percent || 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  (getProjectedValueAsNumber("Base Food") || 0) +
                    (getProjectedValueAsNumber("Employee Meal") || 0) +
                    (getProjectedValueAsNumber("Condiment") || 0) +
                    (getProjectedValueAsNumber("Total Waste") || 0) +
                    (getProjectedValueAsNumber("Paper") || 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatPercentage(
                  (() => {
                    const val = getProjectedValue("Base Food", "percent");
                    const num = parseFloat(String(val || "0").replace("%", ""));
                    return isNaN(num) ? 0 : num;
                  })() +
                    (() => {
                      const val = getProjectedValue("Employee Meal", "percent");
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue("Condiment", "percent");
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue("Total Waste", "percent");
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue("Paper", "percent");
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })()
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                -
              </TableCell>
            </TableRow>

            {/* LABOR */}
            <TableRow sx={{ backgroundColor: sectionColors.labor }}>
              <TableCell colSpan={6} sx={{ fontWeight: "bold" }}>
                Labor
              </TableCell>
            </TableRow>

            {[
              { name: "Crew Labor", field: "crewLabor" },
              { name: "Management Labor", field: "managementLabor" },
              { name: "Payroll Tax", field: "payrollTax" },
              {
                name: "Additional Labor Dollars",
                field: "additionalLaborDollars",
              },
            ].map(({ name, field }) => {
              const expenseData = actualData.controllableExpenses[field];
              const dollars = expenseData?.dollars;
              const percent = expenseData?.percent;
              const isAdditionalLabor = field === "additionalLaborDollars";
              const shouldShowDash =
                isAdditionalLabor && (!dollars || dollars === 0);
              const projectedPercentStr = getProjectedValue(name, "percent");
              const projectedPercentNum = parseFloat(
                String(projectedPercentStr || "").replace("%", "")
              );
              const hasProjectedData =
                !isNaN(projectedPercentNum) &&
                projectedPercentStr !== "" &&
                projectedPercentStr !== "-";
              const shouldShowDashForDiff =
                isAdditionalLabor && (!hasProjectedData || shouldShowDash);
              return (
                <TableRow key={name}>
                  <TableCell sx={{ pl: 4 }}>{name}</TableCell>
                  <TableCell align="right">
                    {shouldShowDash ? "-" : formatCurrency(dollars || 0)}
                  </TableCell>
                  <TableCell align="right">
                    {shouldShowDash ? "-" : formatPercentage(percent || 0)}
                  </TableCell>
                  <TableCell align="right">
                    {getProjectedValue(name, "dollar")}
                  </TableCell>
                  <TableCell align="right">
                    {getProjectedValue(name, "percent")}
                  </TableCell>
                  <TableCell align="right">
                    {shouldShowDashForDiff
                      ? "-"
                      : formatDiffPercent(
                          calculateDiffPercent(
                            percent || 0,
                            projectedPercentNum
                          ),
                          "default"
                        )}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Labor Total */}
            <TableRow
              sx={{
                backgroundColor: sectionColors.labor,
                borderTop: `2px solid ${isDark ? "#333" : "#ccc"}`,
              }}
            >
              <TableCell sx={{ pl: 4, fontWeight: "bold" }}>
                Labor Total
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  (actualData.controllableExpenses.crewLabor?.dollars || 0) +
                    (actualData.controllableExpenses.managementLabor?.dollars ||
                      0) +
                    (actualData.controllableExpenses.payrollTax?.dollars || 0) +
                    (actualData.controllableExpenses.additionalLaborDollars
                      ?.dollars || 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatPercentage(
                  (actualData.controllableExpenses.crewLabor?.percent || 0) +
                    (actualData.controllableExpenses.managementLabor?.percent ||
                      0) +
                    (actualData.controllableExpenses.payrollTax?.percent || 0) +
                    (actualData.controllableExpenses.additionalLaborDollars
                      ?.percent || 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  (getProjectedValueAsNumber("Crew Labor") || 0) +
                    (getProjectedValueAsNumber("Management Labor") || 0) +
                    (getProjectedValueAsNumber("Payroll Tax") || 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatPercentage(
                  (() => {
                    const val = getProjectedValue("Crew Labor", "percent");
                    const num = parseFloat(String(val || "0").replace("%", ""));
                    return isNaN(num) ? 0 : num;
                  })() +
                    (() => {
                      const val = getProjectedValue(
                        "Management Labor",
                        "percent"
                      );
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue("Payroll Tax", "percent");
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })()
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                -
              </TableCell>
            </TableRow>

            {/* PURCHASES */}
            <TableRow sx={{ backgroundColor: sectionColors.purchases }}>
              <TableCell colSpan={6} sx={{ fontWeight: "bold" }}>
                Purchases
              </TableCell>
            </TableRow>

            {[
              { name: "Travel", field: "travel" },
              { name: "Advertising", field: "advertising" },
              { name: "Advertising Other", field: "advOther" },
              { name: "Promotion", field: "promotion" },
              { name: "Outside Services", field: "outsideServices" },
              { name: "Linen", field: "linen" },
              { name: "Operating Supply", field: "opsSupplies" },
              { name: "Maintenance & Repair", field: "maintenanceRepair" },
              { name: "Small Equipment", field: "smallEquipment" },
              { name: "Utilities", field: "utilities" },
              { name: "Office", field: "office" },
              { name: "Cash +/-", field: "cashPlusMinus" },
              { name: "Crew Relations", field: "crewRelations" },
              { name: "Training", field: "training" },
              { name: "Dues and Subscriptions", field: "duesAndSubscriptions" },
            ].map(({ name, field }) => {
              const expenseData = actualData.controllableExpenses[field];
              const dollars = expenseData?.dollars;
              const percent = expenseData?.percent;
              const isDuesAndSubs = field === "duesAndSubscriptions";
              const shouldShowDash =
                isDuesAndSubs && (!dollars || dollars === 0);
              const projectedPercentStr = getProjectedValue(name, "percent");
              const projectedPercentNum = parseFloat(
                String(projectedPercentStr || "").replace("%", "")
              );
              const hasProjectedData =
                !isNaN(projectedPercentNum) &&
                projectedPercentStr !== "" &&
                projectedPercentStr !== "-";
              const shouldShowDashForDiff =
                isDuesAndSubs && (!hasProjectedData || shouldShowDash);
              return (
                <TableRow key={name}>
                  <TableCell sx={{ pl: 4 }}>{name}</TableCell>
                  <TableCell align="right">
                    {shouldShowDash ? "-" : formatCurrency(dollars || 0)}
                  </TableCell>
                  <TableCell align="right">
                    {shouldShowDash ? "-" : formatPercentage(percent || 0)}
                  </TableCell>
                  <TableCell align="right">
                    {getProjectedValue(name, "dollar")}
                  </TableCell>
                  <TableCell align="right">
                    {getProjectedValue(name, "percent")}
                  </TableCell>
                  <TableCell align="right">
                    {shouldShowDashForDiff
                      ? "-"
                      : formatDiffPercent(
                          calculateDiffPercent(
                            percent || 0,
                            projectedPercentNum
                          ),
                          "default"
                        )}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Purchases Total */}
            <TableRow
              sx={{
                backgroundColor: sectionColors.purchases,
                borderTop: `2px solid ${isDark ? "#333" : "#ccc"}`,
              }}
            >
              <TableCell sx={{ pl: 4, fontWeight: "bold" }}>
                Purchases Total
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  (actualData.controllableExpenses.travel?.dollars || 0) +
                    (actualData.controllableExpenses.advertising?.dollars ||
                      0) +
                    (actualData.controllableExpenses.advOther?.dollars || 0) +
                    (actualData.controllableExpenses.promotion?.dollars || 0) +
                    (actualData.controllableExpenses.outsideServices?.dollars ||
                      0) +
                    (actualData.controllableExpenses.linen?.dollars || 0) +
                    (actualData.controllableExpenses.opsSupplies?.dollars ||
                      0) +
                    (actualData.controllableExpenses.maintenanceRepair
                      ?.dollars || 0) +
                    (actualData.controllableExpenses.smallEquipment?.dollars ||
                      0) +
                    (actualData.controllableExpenses.utilities?.dollars || 0) +
                    (actualData.controllableExpenses.office?.dollars || 0) +
                    (actualData.controllableExpenses.cashPlusMinus?.dollars ||
                      0) +
                    (actualData.controllableExpenses.crewRelations?.dollars ||
                      0) +
                    (actualData.controllableExpenses.training?.dollars || 0) +
                    (actualData.controllableExpenses.duesAndSubscriptions
                      ?.dollars || 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatPercentage(
                  (actualData.controllableExpenses.travel?.percent || 0) +
                    (actualData.controllableExpenses.advertising?.percent ||
                      0) +
                    (actualData.controllableExpenses.advOther?.percent || 0) +
                    (actualData.controllableExpenses.promotion?.percent || 0) +
                    (actualData.controllableExpenses.outsideServices?.percent ||
                      0) +
                    (actualData.controllableExpenses.linen?.percent || 0) +
                    (actualData.controllableExpenses.opsSupplies?.percent ||
                      0) +
                    (actualData.controllableExpenses.maintenanceRepair
                      ?.percent || 0) +
                    (actualData.controllableExpenses.smallEquipment?.percent ||
                      0) +
                    (actualData.controllableExpenses.utilities?.percent || 0) +
                    (actualData.controllableExpenses.office?.percent || 0) +
                    (actualData.controllableExpenses.cashPlusMinus?.percent ||
                      0) +
                    (actualData.controllableExpenses.crewRelations?.percent ||
                      0) +
                    (actualData.controllableExpenses.training?.percent || 0) +
                    (actualData.controllableExpenses.duesAndSubscriptions
                      ?.percent || 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  (getProjectedValueAsNumber("Travel") || 0) +
                    (getProjectedValueAsNumber("Advertising") || 0) +
                    (getProjectedValueAsNumber("Advertising Other") || 0) +
                    (getProjectedValueAsNumber("Promotion") || 0) +
                    (getProjectedValueAsNumber("Outside Services") || 0) +
                    (getProjectedValueAsNumber("Linen") || 0) +
                    (getProjectedValueAsNumber("Operating Supply") || 0) +
                    (getProjectedValueAsNumber("Maintenance & Repair") || 0) +
                    (getProjectedValueAsNumber("Small Equipment") || 0) +
                    (getProjectedValueAsNumber("Utilities") || 0) +
                    (getProjectedValueAsNumber("Office") || 0) +
                    (getProjectedValueAsNumber("Cash +/-") || 0) +
                    (getProjectedValueAsNumber("Crew Relations") || 0) +
                    (getProjectedValueAsNumber("Training") || 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatPercentage(
                  (() => {
                    const val = getProjectedValue("Travel", "percent");
                    const num = parseFloat(String(val || "0").replace("%", ""));
                    return isNaN(num) ? 0 : num;
                  })() +
                    (() => {
                      const val = getProjectedValue("Advertising", "percent");
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue(
                        "Advertising Other",
                        "percent"
                      );
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue("Promotion", "percent");
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue(
                        "Outside Services",
                        "percent"
                      );
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue("Linen", "percent");
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue(
                        "Operating Supply",
                        "percent"
                      );
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue(
                        "Maintenance & Repair",
                        "percent"
                      );
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue(
                        "Small Equipment",
                        "percent"
                      );
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue("Utilities", "percent");
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue("Office", "percent");
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue("Cash +/-", "percent");
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue(
                        "Crew Relations",
                        "percent"
                      );
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })() +
                    (() => {
                      const val = getProjectedValue("Training", "percent");
                      const num = parseFloat(
                        String(val || "0").replace("%", "")
                      );
                      return isNaN(num) ? 0 : num;
                    })()
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                -
              </TableCell>
            </TableRow>

            {/* TOTAL CONTROLLABLE */}
            <TableRow
              sx={{
                backgroundColor: sectionColors.total,
                borderTop: `2px solid ${isDark ? "#333" : "#ccc"}`,
              }}
            >
              <TableCell sx={{ fontWeight: "bold", fontSize: "1.1em" }}>
                Total Controllable
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(actualData.totalControllableDollars)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatPercentage(actualData.totalControllablePercent)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {getProjectedValue("Total Controllable", "dollar")}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {getProjectedValue("Total Controllable", "percent")}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                -
              </TableCell>
            </TableRow>

            {/* P.A.C. */}
            <TableRow
              sx={{
                backgroundColor:
                  actualData.pacPercent >= 0
                    ? isDark
                      ? "rgba(0,255,0,0.15)"
                      : "rgba(0,255,0,0.1)"
                    : isDark
                    ? "rgba(255,0,0,0.15)"
                    : "rgba(255,0,0,0.1)",
                borderTop: `2px solid ${isDark ? "#333" : "#ccc"}`,
              }}
            >
              <TableCell sx={{ fontWeight: "bold", fontSize: "1.2em" }}>
                P.A.C.
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatActualWithColor(
                  actualData.pacDollars,
                  getProjectedValueAsNumber("P.A.C."),
                  "dollar"
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatActualWithColor(
                  actualData.pacPercent,
                  (getProjectedValueAsNumber("P.A.C.") /
                    (actualData.productNetSales || 1)) *
                    100,
                  "percent"
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {getProjectedValue("P.A.C.", "dollar")}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {getProjectedValue("P.A.C.", "percent")}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.pacPercent,
                    parseFloat(
                      String(getProjectedValue("P.A.C.", "percent")).replace(
                        "%",
                        ""
                      )
                    )
                  ),
                  "pac"
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default PacTab;

import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { getPacActual } from "../../services/pacActualService";
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

    //Timestamp for last updated.
    const printGeneratedTime = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    return `
      <div class="print-header">
        PAC Report - ${storeId} - ${month} ${year}
      </div>
      <div class="print-timestamp" style="text-align: center; margin-bottom: 10px; color: #555;">
        Last Updated: ${printGeneratedTime}
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
            <td class="${getColorClass(
              actualData.productNetSales,
              getProjectedValueAsNumber("Product Net Sales")
            )}">${formatCurrency(actualData.productNetSales)}</td>
            <td>-</td>
            <td>${getProjectedValue("Product Net Sales", "dollar")}</td>
            <td>${formatDiffPercentForPrint(
              ((actualData.productNetSales -
                getProjectedValueAsNumber("Product Net Sales")) /
                Math.max(getProjectedValueAsNumber("Product Net Sales"), 1)) *
                100,
              "sales"
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">All Net Sales</td>
            <td class="${getColorClass(
              actualData.allNetSales,
              getProjectedValueAsNumber("All Net Sales")
            )}">${formatCurrency(actualData.allNetSales)}</td>
            <td>-</td>
            <td>${getProjectedValue("All Net Sales", "dollar")}</td>
            <td>${formatDiffPercentForPrint(
              ((actualData.allNetSales -
                getProjectedValueAsNumber("All Net Sales")) /
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
            <td class="${getColorClass(
              actualData.controllableExpenses.baseFood.dollars,
              getProjectedValueAsNumber("Base Food")
            )}">${formatCurrency(
      actualData.controllableExpenses.baseFood.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.baseFood?.percent || 0
            )}</td>
            <td>${getProjectedValue("Base Food", "dollar")}</td>
            <td>${getProjectedValue("Base Food", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Employee Meal</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.employeeMeal.dollars,
              getProjectedValueAsNumber("Employee Meal")
            )}">${formatCurrency(
      actualData.controllableExpenses.employeeMeal.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.employeeMeal?.percent || 0
            )}</td>
            <td>${getProjectedValue("Employee Meal", "dollar")}</td>
            <td>${getProjectedValue("Employee Meal", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Condiment</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.condiment.dollars,
              getProjectedValueAsNumber("Condiment")
            )}">${formatCurrency(
      actualData.controllableExpenses.condiment.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.condiment?.percent || 0
            )}</td>
            <td>${getProjectedValue("Condiment", "dollar")}</td>
            <td>${getProjectedValue("Condiment", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Total Waste</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.totalWaste.dollars,
              getProjectedValueAsNumber("Total Waste")
            )}">${formatCurrency(
      actualData.controllableExpenses.totalWaste.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.totalWaste?.percent || 0
            )}</td>
            <td>${getProjectedValue("Total Waste", "dollar")}</td>
            <td>${getProjectedValue("Total Waste", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Paper</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.paper.dollars,
              getProjectedValueAsNumber("Paper")
            )}">${formatCurrency(
      actualData.controllableExpenses.paper.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.paper?.percent || 0
            )}</td>
            <td>${getProjectedValue("Paper", "dollar")}</td>
            <td>${getProjectedValue("Paper", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
                (actualData.controllableExpenses.condiment?.dollars || 0) +
                (actualData.controllableExpenses.totalWaste?.dollars || 0) +
                (actualData.controllableExpenses.paper?.dollars || 0)
            )}</td>
            <td style="font-weight: bold; background-color: #e8f5e8;">${formatPercentage(
              (actualData.controllableExpenses.baseFood?.percent || 0) +
                (actualData.controllableExpenses.condiment?.percent || 0) +
                (actualData.controllableExpenses.totalWaste?.percent || 0) +
                (actualData.controllableExpenses.paper?.percent || 0)
            )}</td>
            <td style="font-weight: bold; background-color: #e8f5e8;">${formatCurrency(
              getProjectedValueAsNumber("Base Food") +
                getProjectedValueAsNumber("Condiment") +
                getProjectedValueAsNumber("Total Waste") +
                getProjectedValueAsNumber("Paper")
            )}</td>
            <td style="font-weight: bold; background-color: #e8f5e8;">${formatPercentage(
              parseFloat(
                String(getProjectedValue("Base Food", "percent")).replace(
                  "%",
                  ""
                )
              ) +
                parseFloat(
                  String(getProjectedValue("Condiment", "percent")).replace(
                    "%",
                    ""
                  )
                ) +
                parseFloat(
                  String(getProjectedValue("Total Waste", "percent")).replace(
                    "%",
                    ""
                  )
                ) +
                parseFloat(
                  String(getProjectedValue("Paper", "percent")).replace("%", "")
                )
            )}</td>
            <td style="font-weight: bold; background-color: #e8f5e8;">-</td>
          </tr>
          
          <!-- Labor Section -->
          <tr class="print-section-header print-labor-header">
            <td colspan="6">Labor</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Crew Labor</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.crewLabor.dollars,
              getProjectedValueAsNumber("Crew Labor")
            )}">${formatCurrency(
      actualData.controllableExpenses.crewLabor.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.crewLabor?.percent || 0
            )}</td>
            <td>${getProjectedValue("Crew Labor", "dollar")}</td>
            <td>${getProjectedValue("Crew Labor", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Management Labor</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.managementLabor.dollars,
              getProjectedValueAsNumber("Management Labor")
            )}">${formatCurrency(
      actualData.controllableExpenses.managementLabor.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.managementLabor?.percent || 0
            )}</td>
            <td>${getProjectedValue("Management Labor", "dollar")}</td>
            <td>${getProjectedValue("Management Labor", "percent")}</td>
            <td>${formatDiffPercentForPrint(
              calculateDiffPercent(
                actualData.controllableExpenses.managementLabor?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Management Labor", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Payroll Tax</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.payrollTax.dollars,
              getProjectedValueAsNumber("Payroll Tax")
            )}">${formatCurrency(
      actualData.controllableExpenses.payrollTax.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.payrollTax?.percent || 0
            )}</td>
            <td>${getProjectedValue("Payroll Tax", "dollar")}</td>
            <td>${getProjectedValue("Payroll Tax", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Additional Labor Dollars</td>
            <td>${formatCurrency(
              actualData.controllableExpenses.additionalLaborDollars?.dollars || 0
            )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.additionalLaborDollars?.percent || 0
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
                (actualData.controllableExpenses.additionalLaborDollars?.dollars || 0)
            )}</td>
            <td style="font-weight: bold; background-color: #e3f2fd;">${formatPercentage(
              (actualData.controllableExpenses.crewLabor?.percent || 0) +
                (actualData.controllableExpenses.managementLabor?.percent ||
                  0) +
                (actualData.controllableExpenses.payrollTax?.percent || 0) +
                (actualData.controllableExpenses.additionalLaborDollars?.percent || 0)
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
            <td class="${getColorClass(
              actualData.controllableExpenses.travel.dollars,
              getProjectedValueAsNumber("Travel")
            )}">${formatCurrency(
      actualData.controllableExpenses.travel.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.travel?.percent || 0
            )}</td>
            <td>${getProjectedValue("Travel", "dollar")}</td>
            <td>${getProjectedValue("Travel", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Advertising</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.advertising.dollars,
              getProjectedValueAsNumber("Advertising")
            )}">${formatCurrency(
      actualData.controllableExpenses.advertising.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.advertising?.percent || 0
            )}</td>
            <td>${getProjectedValue("Advertising", "dollar")}</td>
            <td>${getProjectedValue("Advertising", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Advertising Other</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.advOther.dollars,
              getProjectedValueAsNumber("Advertising Other")
            )}">${formatCurrency(
      actualData.controllableExpenses.advOther.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.advOther?.percent || 0
            )}</td>
            <td>${getProjectedValue("Advertising Other", "dollar")}</td>
            <td>${getProjectedValue("Advertising Other", "percent")}</td>
            <td>${formatDiffPercentForPrint(
              calculateDiffPercent(
                actualData.controllableExpenses.advOther?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Advertising Other", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Promotion</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.promotion.dollars,
              getProjectedValueAsNumber("Promotion")
            )}">${formatCurrency(
      actualData.controllableExpenses.promotion.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.promotion?.percent || 0
            )}</td>
            <td>${getProjectedValue("Promotion", "dollar")}</td>
            <td>${getProjectedValue("Promotion", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Outside Services</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.outsideServices.dollars,
              getProjectedValueAsNumber("Outside Services")
            )}">${formatCurrency(
      actualData.controllableExpenses.outsideServices.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.outsideServices?.percent || 0
            )}</td>
            <td>${getProjectedValue("Outside Services", "dollar")}</td>
            <td>${getProjectedValue("Outside Services", "percent")}</td>
            <td>${formatDiffPercentForPrint(
              calculateDiffPercent(
                actualData.controllableExpenses.outsideServices?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Outside Services", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Linen</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.linen.dollars,
              getProjectedValueAsNumber("Linen")
            )}">${formatCurrency(
      actualData.controllableExpenses.linen.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.linen?.percent || 0
            )}</td>
            <td>${getProjectedValue("Linen", "dollar")}</td>
            <td>${getProjectedValue("Linen", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            <td class="${getColorClass(
              actualData.controllableExpenses.opsSupplies.dollars,
              getProjectedValueAsNumber("Operating Supply")
            )}">${formatCurrency(
      actualData.controllableExpenses.opsSupplies.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.opsSupplies?.percent || 0
            )}</td>
            <td>${getProjectedValue("Operating Supply", "dollar")}</td>
            <td>${getProjectedValue("Operating Supply", "percent")}</td>
            <td>${formatDiffPercentForPrint(
              calculateDiffPercent(
                actualData.controllableExpenses.opsSupplies?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Operating Supply", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Maintenance & Repair</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.maintenanceRepair.dollars,
              getProjectedValueAsNumber("Maintenance & Repair")
            )}">${formatCurrency(
      actualData.controllableExpenses.maintenanceRepair.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.maintenanceRepair?.percent || 0
            )}</td>
            <td>${getProjectedValue("Maintenance & Repair", "dollar")}</td>
            <td>${getProjectedValue("Maintenance & Repair", "percent")}</td>
            <td>${formatDiffPercentForPrint(
              calculateDiffPercent(
                actualData.controllableExpenses.maintenanceRepair?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Maintenance & Repair", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Small Equipment</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.smallEquipment.dollars,
              getProjectedValueAsNumber("Small Equipment")
            )}">${formatCurrency(
      actualData.controllableExpenses.smallEquipment.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.smallEquipment?.percent || 0
            )}</td>
            <td>${getProjectedValue("Small Equipment", "dollar")}</td>
            <td>${getProjectedValue("Small Equipment", "percent")}</td>
            <td>${formatDiffPercentForPrint(
              calculateDiffPercent(
                actualData.controllableExpenses.smallEquipment?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Small Equipment", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Utilities</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.utilities.dollars,
              getProjectedValueAsNumber("Utilities")
            )}">${formatCurrency(
      actualData.controllableExpenses.utilities.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.utilities?.percent || 0
            )}</td>
            <td>${getProjectedValue("Utilities", "dollar")}</td>
            <td>${getProjectedValue("Utilities", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Office</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.office.dollars,
              getProjectedValueAsNumber("Office")
            )}">${formatCurrency(
      actualData.controllableExpenses.office.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.office?.percent || 0
            )}</td>
            <td>${getProjectedValue("Office", "dollar")}</td>
            <td>${getProjectedValue("Office", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Cash +/-</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.cashPlusMinus.dollars,
              getProjectedValueAsNumber("Cash +/-")
            )}">${formatCurrency(
      actualData.controllableExpenses.cashPlusMinus.dollars
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.cashPlusMinus?.percent || 0
            )}</td>
            <td>${getProjectedValue("Cash +/-", "dollar")}</td>
            <td>${getProjectedValue("Cash +/-", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Crew Relations</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.crewRelations?.dollars || 0,
              getProjectedValueAsNumber("Crew Relations")
            )}">${formatCurrency(
      actualData.controllableExpenses.crewRelations?.dollars || 0
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.crewRelations?.percent || 0
            )}</td>
            <td>${getProjectedValue("Crew Relations", "dollar")}</td>
            <td>${getProjectedValue("Crew Relations", "percent")}</td>
            <td>${formatDiffPercentForPrint(
              calculateDiffPercent(
                actualData.controllableExpenses.crewRelations?.percent || 0,
                parseFloat(
                  String(
                    getProjectedValue("Crew Relations", "percent")
                  ).replace("%", "")
                )
              ),
              "default"
            )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Training</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.training?.dollars || 0,
              getProjectedValueAsNumber("Training")
            )}">${formatCurrency(
      actualData.controllableExpenses.training?.dollars || 0
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.training?.percent || 0
            )}</td>
            <td>${getProjectedValue("Training", "dollar")}</td>
            <td>${getProjectedValue("Training", "percent")}</td>
            <td>${formatDiffPercentForPrint(
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
            )}</td>
          </tr>
          
          <!-- Purchases Total -->
          <tr class="print-section-header print-purchases-total">
            <td style="padding-left: 20px; font-weight: bold; background-color: #fce4ec;">Purchases Total</td>
            <td style="font-weight: bold; background-color: #fce4ec;">${formatCurrency(
              (actualData.controllableExpenses.travel?.dollars || 0) +
                (actualData.controllableExpenses.advertising?.dollars || 0) +
                (actualData.controllableExpenses.promo?.dollars || 0) +
                (actualData.controllableExpenses.outsideServices?.dollars ||
                  0) +
                (actualData.controllableExpenses.linen?.dollars || 0) +
                (actualData.controllableExpenses.operatingSupply?.dollars ||
                  0) +
                (actualData.controllableExpenses.maintenanceRepair?.dollars ||
                  0) +
                (actualData.controllableExpenses.smallEquipment?.dollars || 0) +
                (actualData.controllableExpenses.utilities?.dollars || 0) +
                (actualData.controllableExpenses.office?.dollars || 0) +
                (actualData.controllableExpenses.cashAdjustments?.dollars ||
                  0) +
                (actualData.controllableExpenses.crewRelations?.dollars || 0) +
                (actualData.controllableExpenses.training?.dollars || 0)
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
                (actualData.controllableExpenses.training?.percent || 0)
            )}</td>
            <td style="font-weight: bold; background-color: #fce4ec;">${formatCurrency(
              getProjectedValueAsNumber("Travel") +
                getProjectedValueAsNumber("Advertising") +
                getProjectedValueAsNumber("Promo") +
                getProjectedValueAsNumber("Outside Services") +
                getProjectedValueAsNumber("Linen") +
                getProjectedValueAsNumber("Operating Supply") +
                getProjectedValueAsNumber("Maintenance & Repair") +
                getProjectedValueAsNumber("Small Equipment") +
                getProjectedValueAsNumber("Utilities") +
                getProjectedValueAsNumber("Office") +
                getProjectedValueAsNumber("Cash +/-") +
                getProjectedValueAsNumber("Crew Relations") +
                getProjectedValueAsNumber("Training")
            )}</td>
            <td style="font-weight: bold; background-color: #fce4ec;">${formatPercentage(
              parseFloat(
                String(getProjectedValue("Travel", "percent")).replace("%", "")
              ) +
                parseFloat(
                  String(getProjectedValue("Advertising", "percent")).replace(
                    "%",
                    ""
                  )
                ) +
                parseFloat(
                  String(getProjectedValue("Promo", "percent")).replace("%", "")
                ) +
                parseFloat(
                  String(
                    getProjectedValue("Outside Services", "percent")
                  ).replace("%", "")
                ) +
                parseFloat(
                  String(getProjectedValue("Linen", "percent")).replace("%", "")
                ) +
                parseFloat(
                  String(
                    getProjectedValue("Operating Supply", "percent")
                  ).replace("%", "")
                ) +
                parseFloat(
                  String(
                    getProjectedValue("Maintenance & Repair", "percent")
                  ).replace("%", "")
                ) +
                parseFloat(
                  String(
                    getProjectedValue("Small Equipment", "percent")
                  ).replace("%", "")
                ) +
                parseFloat(
                  String(getProjectedValue("Utilities", "percent")).replace(
                    "%",
                    ""
                  )
                ) +
                parseFloat(
                  String(getProjectedValue("Office", "percent")).replace(
                    "%",
                    ""
                  )
                ) +
                parseFloat(
                  String(getProjectedValue("Cash +/-", "percent")).replace(
                    "%",
                    ""
                  )
                ) +
                parseFloat(
                  String(
                    getProjectedValue("Crew Relations", "percent")
                  ).replace("%", "")
                ) +
                parseFloat(
                  String(getProjectedValue("Training", "percent")).replace(
                    "%",
                    ""
                  )
                )
            )}</td>
            <td style="font-weight: bold; background-color: #fce4ec;">-</td>
          </tr>
          
          <!-- Add missing expense categories -->
          <tr>
            <td style="padding-left: 20px;">Adv Other</td>
            <td class="${getColorClass(
              actualData.controllableExpenses.advertisingOther?.dollars || 0,
              getProjectedValueAsNumber("Adv Other")
            )}">${formatCurrency(
      actualData.controllableExpenses.advertisingOther?.dollars || 0
    )}</td>
            <td>${formatPercentage(
              actualData.controllableExpenses.advOther?.percent || 0
            )}</td>
            <td>${getProjectedValue("Adv Other", "dollar")}</td>
            <td>${getProjectedValue("Adv Other", "percent")}</td>
            <td class="${getDiffColorClass(
              actualData.controllableExpenses.advertisingOther?.dollars || 0,
              getProjectedValueAsNumber("Adv Other")
            )}">${formatDiffPercent(
      calculateDiffPercent(
        actualData.controllableExpenses.advOther?.percent || 0,
        parseFloat(
          String(getProjectedValue("Adv Other", "percent")).replace("%", "")
        )
      )
    )}</td>
          </tr>
          
          <!-- Totals -->
          <tr class="print-section-header print-totals-header">
            <td>Total Controllable</td>
            <td class="${getColorClass(
              actualData.totalControllableDollars,
              getProjectedValueAsNumber("Total Controllable")
            )}">${formatCurrency(actualData.totalControllableDollars)}</td>
            <td class="${getColorClass(
              actualData.totalControllablePercent,
              (getProjectedValueAsNumber("Total Controllable") /
                (actualData.productNetSales || 1)) *
                100
            )}">${formatPercentage(actualData.totalControllablePercent)}</td>
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
            <td>${formatDiffPercentForPrint(
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
      const response = await fetch(
        `http://localhost:5140/api/pac/projections/${formattedStoreId}/${yearMonth}`
      );
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        console.warn(
          `No projections data found for ${formattedStoreId} - ${yearMonth}`
        );
        return null;
      }
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
      const [actualResponse, projectionsData, pacActualData] =
        await Promise.all([
          fetch(
            `http://localhost:5140/api/pac/${formattedStoreId}/${yearMonth}`
          ),
          fetchProjectionsData(formattedStoreId, yearMonth),
          getPacActual(formattedStoreId, year, month),
        ]);

      if (!actualResponse.ok) {
        throw new Error(
          `Failed to fetch PAC data: ${actualResponse.statusText}`
        );
      }
      const data = await actualResponse.json();

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
            dollars: parseFloat(data.controllable_expenses.additional_labor_dollars?.dollars || 0),
            percent: parseFloat(data.controllable_expenses.additional_labor_dollars?.percent || 0),
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
      const toObj = (val) => ({ dollars: Number(val || 0), percent: 0 });
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
          advOther: toObj(ce.advOther),
          promotion: toObj(ce.promotion),
          outsideServices: toObj(ce.outsideServices),
          linen: toObj(ce.linen),
          opsSupplies: toObj(ce.opsSupplies),
          maintenanceRepair: toObj(ce.maintenanceRepair),
          smallEquipment: toObj(ce.smallEquipment),
          utilities: toObj(ce.utilities),
          office: toObj(ce.office),
          cashPlusMinus: toObj(ce.cashPlusMinus),
          crewRelations: toObj(ce.crewRelations),
          training: toObj(ce.training),
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
    if (!projectionsData) return "-";

    const expenseMap = {
      "Base Food": projectionsData.controllable_expenses?.base_food?.percent,
      "Employee Meal":
        projectionsData.controllable_expenses?.employee_meal?.percent,
      Condiment: projectionsData.controllable_expenses?.condiment?.percent,
      "Total Waste":
        projectionsData.controllable_expenses?.total_waste?.percent,
      Paper: projectionsData.controllable_expenses?.paper?.percent,
      "Crew Labor": projectionsData.controllable_expenses?.crew_labor?.percent,
      "Management Labor":
        projectionsData.controllable_expenses?.management_labor?.percent,
      "Payroll Tax":
        projectionsData.controllable_expenses?.payroll_tax?.percent,
      Travel: projectionsData.controllable_expenses?.travel?.percent,
      Advertising: projectionsData.controllable_expenses?.advertising?.percent,
      "Advertising Other":
        projectionsData.controllable_expenses?.advertising_other?.percent,
      Promotion: projectionsData.controllable_expenses?.promotion?.percent,
      "Outside Services":
        projectionsData.controllable_expenses?.outside_services?.percent,
      Linen: projectionsData.controllable_expenses?.linen?.percent,
      "Operating Supply":
        projectionsData.controllable_expenses?.operating_supply?.percent ??
        projectionsData.controllable_expenses?.op_supply?.percent,
      "Maintenance & Repair":
        projectionsData.controllable_expenses?.maintenance_repair?.percent,
      "Small Equipment":
        projectionsData.controllable_expenses?.small_equipment?.percent,
      Utilities: projectionsData.controllable_expenses?.utilities?.percent,
      Office: projectionsData.controllable_expenses?.office?.percent,
      "Cash +/-":
        projectionsData.controllable_expenses?.cash_adjustments?.percent,
      "Crew Relations":
        projectionsData.controllable_expenses?.crew_relations?.percent,
      Training: projectionsData.controllable_expenses?.training?.percent,
      "Total Controllable": projectionsData.total_controllable_percent,
      "P.A.C.": projectionsData.pac_percent,
    };

    const raw = expenseMap[accountName];
    return raw !== undefined && raw !== null ? formatPercentage(raw) : "-";
  };

  // Helper function to get projected values from projections data
  const getProjectedValue = (expenseName, type) => {
    if (!projectionsData) return "-";

    // Map expense names to projections data fields
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
    if (!fieldPath) return "-";

    // Navigate nested object path
    const value = fieldPath
      .split(".")
      .reduce((obj, key) => obj?.[key], projectionsData);

    if (value === null || value === undefined) return "-";

    if (type === "dollar") {
      return formatCurrency(parseFloat(value));
    } else if (type === "percent") {
      // For percentages, we need to calculate them from the dollar amounts
      // Get the projected net sales for percentage calculation
      const projectedNetSales =
        projectionsData.product_net_sales || projectionsData.all_net_sales;
      if (!projectedNetSales || projectedNetSales === 0) return "-";

      const percentage =
        (parseFloat(value) / parseFloat(projectedNetSales)) * 100;
      return formatPercentage(percentage);
    }
    return "-";
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
    // Flatten into rows for Excel
    const rows = [
      // --- Sales ---
      {
        Account: "Product Net Sales",
        "Actual $": actualData?.productNetSales ?? 0,
        "Actual %": "-",
        "Projected $": getProjectedValueAsNumber("Product Net Sales"),
        "Projected %": getProjectedPercent("Product Net Sales"),
        "Difference $":
          (actualData?.productNetSales ?? 0) -
          getProjectedValueAsNumber("Product Net Sales"),
      },
      {
        Account: "All Net Sales",
        "Actual $": actualData?.allNetSales ?? 0,
        "Actual %": "-",
        "Projected $": getProjectedValueAsNumber("All Net Sales"),
        "Projected %": getProjectedPercent("All Net Sales"),
        "Difference $":
          (actualData?.allNetSales ?? 0) -
          getProjectedValueAsNumber("All Net Sales"),
      },

      // --- Food & Paper ---
      {
        Account: "Base Food",
        "Actual $": pacData?.controllableExpenses?.baseFood?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.baseFood?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.baseFood?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Base Food"),
        "Projected %": getProjectedPercent("Base Food"),
        "Difference $":
          (pacData?.controllableExpenses?.baseFood?.dollars ?? 0) -
          getProjectedValueAsNumber("Base Food"),
      },
      {
        Account: "Employee Meal",
        "Actual $": pacData?.controllableExpenses?.employeeMeal?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.employeeMeal?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.employeeMeal.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Employee Meal"),
        "Projected %": getProjectedPercent("Employee Meal"),
        "Difference $":
          (pacData?.controllableExpenses?.employeeMeal?.dollars ?? 0) -
          getProjectedValueAsNumber("Employee Meal"),
      },
      {
        Account: "Condiment",
        "Actual $": pacData?.controllableExpenses?.condiment?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.condiment?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.condiment?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Condiment"),
        "Projected %": getProjectedPercent("Condiment"),
        "Difference $":
          (pacData?.controllableExpenses?.condiment?.dollars ?? 0) -
          getProjectedValueAsNumber("Condiment"),
      },
      {
        Account: "Total Waste",
        "Actual $": pacData?.controllableExpenses?.totalWaste?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.totalWaste?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.totalWaste?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Total Waste"),
        "Projected %": getProjectedPercent("Total Waste"),
        "Difference $":
          (pacData?.controllableExpenses?.totalWaste?.dollars ?? 0) -
          getProjectedValueAsNumber("Total Waste"),
      },
      {
        Account: "Paper",
        "Actual $": pacData?.controllableExpenses?.paper?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.paper?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.paper?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Paper"),
        "Projected %": getProjectedPercent("Paper"),
        "Difference $":
          (pacData?.controllableExpenses?.paper?.dollars ?? 0) -
          getProjectedValueAsNumber("Paper"),
      },

      // --- Labor ---
      {
        Account: "Crew Labor",
        "Actual $": pacData?.controllableExpenses?.crewLabor?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.crewLabor?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.crewLabor?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Crew Labor"),
        "Projected %": getProjectedPercent("Crew Labor"),
        "Difference $":
          (pacData?.controllableExpenses?.crewLabor?.dollars ?? 0) -
          getProjectedValueAsNumber("Crew Labor"),
      },
      {
        Account: "Management Labor",
        "Actual $":
          pacData?.controllableExpenses?.managementLabor?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.managementLabor?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.managementLabor.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Management Labor"),
        "Projected %": getProjectedPercent("Management Labor"),
        "Difference $":
          (pacData?.controllableExpenses?.managementLabor?.dollars ?? 0) -
          getProjectedValueAsNumber("Management Labor"),
      },
      {
        Account: "Payroll Tax",
        "Actual $": pacData?.controllableExpenses?.payrollTax?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.payrollTax?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.payrollTax?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Payroll Tax"),
        "Projected %": getProjectedPercent("Payroll Tax"),
        "Difference $":
          (pacData?.controllableExpenses?.payrollTax?.dollars ?? 0) -
          getProjectedValueAsNumber("Payroll Tax"),
      },
      {
        Account: "Additional Labor Dollars",
        "Actual $": pacData?.controllableExpenses?.additionalLaborDollars?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.additionalLaborDollars?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.additionalLaborDollars?.percent || 0
              )
            : "-",
        "Projected $": 0,
        "Projected %": "-",
        "Difference $": pacData?.controllableExpenses?.additionalLaborDollars?.dollars ?? 0,
      },

      // --- Other Expenses ---
      {
        Account: "Travel",
        "Actual $": pacData?.controllableExpenses?.travel?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.travel?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.travel?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Travel"),
        "Projected %": getProjectedPercent("Travel"),
        "Difference $":
          (pacData?.controllableExpenses?.travel?.dollars ?? 0) -
          getProjectedValueAsNumber("Travel"),
      },
      {
        Account: "Advertising",
        "Actual $": pacData?.controllableExpenses?.advertising?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.advertising?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.advertising?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Advertising"),
        "Projected %": getProjectedPercent("Advertising"),
        "Difference $":
          (pacData?.controllableExpenses?.advertising?.dollars ?? 0) -
          getProjectedValueAsNumber("Advertising"),
      },
      {
        Account: "Advertising Other",
        "Actual $": pacData?.controllableExpenses?.advOther?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.advertisingOther?.percent !== undefined
            ? formatPercentage(actualData.controllableExpenses.advOther.percent)
            : "-",
        "Projected $": getProjectedValueAsNumber("Advertising Other"),
        "Projected %": getProjectedPercent("Advertising Other"),
        "Difference $":
          (pacData?.controllableExpenses?.advOther?.dollars ?? 0) -
          getProjectedValueAsNumber("Advertising Other"),
      },
      {
        Account: "Promotion",
        "Actual $": pacData?.controllableExpenses?.promotion?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.promotion?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.promotion?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Promotion"),
        "Projected %": getProjectedPercent("Promotion"),
        "Difference $":
          (pacData?.controllableExpenses?.promotion?.dollars ?? 0) -
          getProjectedValueAsNumber("Promotion"),
      },
      {
        Account: "Outside Services",
        "Actual $":
          pacData?.controllableExpenses?.outsideServices?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.outsideServices?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.outsideServices.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Outside Services"),
        "Projected %": getProjectedPercent("Outside Services"),
        "Difference $":
          (pacData?.controllableExpenses?.outsideServices?.dollars ?? 0) -
          getProjectedValueAsNumber("Outside Services"),
      },
      {
        Account: "Linen",
        "Actual $": pacData?.controllableExpenses?.linen?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.linen?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.linen?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Linen"),
        "Projected %": getProjectedPercent("Linen"),
        "Difference $":
          (pacData?.controllableExpenses?.linen?.dollars ?? 0) -
          getProjectedValueAsNumber("Linen"),
      },
      {
        Account: "Operating Supply",
        "Actual $": pacData?.controllableExpenses?.opsSupplies?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.opsSupplies?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.opsSupplies?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Operating Supply"),
        "Projected %": getProjectedPercent("Operating Supply"),
        "Difference $":
          (pacData?.controllableExpenses?.opsSupplies?.dollars ?? 0) -
          getProjectedValueAsNumber("Operating Supply"),
      },
      {
        Account: "Maintenance & Repair",
        "Actual $":
          pacData?.controllableExpenses?.maintenanceRepair?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.maintenanceRepair?.percent !==
          undefined
            ? formatPercentage(
                actualData.controllableExpenses.maintenanceRepair.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Maintenance & Repair"),
        "Projected %": getProjectedPercent("Maintenance & Repair"),
        "Difference $":
          (pacData?.controllableExpenses?.maintenanceRepair?.dollars ?? 0) -
          getProjectedValueAsNumber("Maintenance & Repair"),
      },
      {
        Account: "Small Equipment",
        "Actual $": pacData?.controllableExpenses?.smallEquipment?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.smallEquipment?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.smallEquipment.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Small Equipment"),
        "Projected %": getProjectedPercent("Small Equipment"),
        "Difference $":
          (pacData?.controllableExpenses?.smallEquipment?.dollars ?? 0) -
          getProjectedValueAsNumber("Small Equipment"),
      },
      {
        Account: "Utilities",
        "Actual $": pacData?.controllableExpenses?.utilities?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.utilities?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.utilities?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Utilities"),
        "Projected %": getProjectedPercent("Utilities"),
        "Difference $":
          (pacData?.controllableExpenses?.utilities?.dollars ?? 0) -
          getProjectedValueAsNumber("Utilities"),
      },
      {
        Account: "Office",
        "Actual $": pacData?.controllableExpenses?.office?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.office?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.office?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Office"),
        "Projected %": getProjectedPercent("Office"),
        "Difference $":
          (pacData?.controllableExpenses?.office?.dollars ?? 0) -
          getProjectedValueAsNumber("Office"),
      },
      {
        Account: "Cash +/-",
        "Actual $": pacData?.controllableExpenses?.cashPlusMinus?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.cashAdjustments?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.cashPlusMinus.percent
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Cash +/-"),
        "Projected %": getProjectedPercent("Cash +/-"),
        "Difference $":
          (pacData?.controllableExpenses?.cashPlusMinus?.dollars ?? 0) -
          getProjectedValueAsNumber("Cash +/-"),
      },
      {
        Account: "Crew Relations",
        "Actual $": pacData?.controllableExpenses?.crewRelations?.dollars ?? 0,
        "Actual %":
          pacData?.controllableExpenses?.crewRelations?.percent !== undefined
            ? formatPercentage(
                actualData.controllableExpenses.crewRelations?.percent || 0
              )
            : "-",
        "Projected $": getProjectedValueAsNumber("Crew Relations"),
        "Projected %": getProjectedPercent("Crew Relations"),
        "Difference $":
          (pacData?.controllableExpenses?.crewRelations?.dollars ?? 0) -
          getProjectedValueAsNumber("Crew Relations"),
      },

      // --- Totals ---
      {
        Account: "Total Controllable",
        "Actual $": pacData?.totalControllableDollars ?? 0,
        "Actual %":
          pacData?.totalControllablePercent !== undefined
            ? formatPercentage(actualData.totalControllablePercent)
            : "-",
        "Projected $": getProjectedValueAsNumber("Total Controllable"),
        "Projected %": getProjectedPercent("Total Controllable"),
        "Difference $":
          (pacData?.totalControllableDollars ?? 0) -
          getProjectedValueAsNumber("Total Controllable"),
      },
      {
        Account: "P.A.C.",
        "Actual $": pacData?.pacDollars ?? 0,
        "Actual %":
          pacData?.pacPercent !== undefined
            ? formatPercentage(actualData.pacPercent)
            : "-",
        "Projected $": getProjectedValueAsNumber("P.A.C."),
        "Projected %": getProjectedPercent("P.A.C."),
        "Difference $":
          (pacData?.pacDollars ?? 0) - getProjectedValueAsNumber("P.A.C."),
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const currencyCols = ["B", "D", "F"]; // adjust column letters based on where these land
    currencyCols.forEach((col) => {
      for (let row = 2; row <= rows.length + 1; row++) {
        // start at row 2 (skip headers)
        const cellRef = `${col}${row}`;
        if (worksheet[cellRef]) {
          worksheet[cellRef].z = "$#,##0.00"; // Excel currency format
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
        <Typography variant="h4" component="h1">
          PAC Report - {storeId} - {month} {year}
        </Typography>
        <Box>
          <Button
            variant="contained"
            onClick={handlePrint}
            sx={{ backgroundColor: "#1976d2", color: "white", mr: 2 }}
          >
            Print Report
          </Button>
          <Button
            variant="contained"
            onClick={handleExportExcel}
            sx={{ backgroundColor: "#2e7d32", color: "white" }}
          >
            Export to Excel
          </Button>
        </Box>
      </Box>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
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
            {/* Sales Section */}
            <TableRow sx={{ backgroundColor: "#e3f2fd" }}>
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

            {/* Food & Paper */}
            <TableRow sx={{ backgroundColor: "#e8f5e9" }}>
              <TableCell sx={{ pl: 2, fontWeight: "bold" }}>
                Food & Paper
              </TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Base Food</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.baseFood.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.baseFood?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Base Food", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Base Food", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
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
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Employee Meal</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.employeeMeal.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.employeeMeal?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Employee Meal", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Employee Meal", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.employeeMeal?.percent || 0,
                    parseFloat(
                      String(
                        getProjectedValue("Employee Meal", "percent")
                      ).replace("%", "")
                    )
                  )
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Condiment</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.condiment.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.condiment?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Condiment", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Condiment", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
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
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Total Waste</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.totalWaste.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.totalWaste?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Total Waste", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Total Waste", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.totalWaste?.percent || 0,
                    parseFloat(
                      String(
                        getProjectedValue("Total Waste", "percent")
                      ).replace("%", "")
                    )
                  )
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Paper</TableCell>
              <TableCell align="right">
                {formatCurrency(actualData.controllableExpenses.paper.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.paper?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Paper", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Paper", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.paper?.percent || 0,
                    parseFloat(
                      String(getProjectedValue("Paper", "percent")).replace(
                        "%",
                        ""
                      )
                    )
                  ),
                  "default"
                )}
              </TableCell>
            </TableRow>

            {/* Food & Paper Total */}
            <TableRow sx={{ backgroundColor: "#e8f5e9" }}>
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
                  getProjectedValueAsNumber("Base Food") +
                    getProjectedValueAsNumber("Condiment") +
                    getProjectedValueAsNumber("Total Waste") +
                    getProjectedValueAsNumber("Paper")
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatPercentage(
                  parseFloat(
                    String(getProjectedValue("Base Food", "percent")).replace(
                      "%",
                      ""
                    )
                  ) +
                    parseFloat(
                      String(getProjectedValue("Condiment", "percent")).replace(
                        "%",
                        ""
                      )
                    ) +
                    parseFloat(
                      String(
                        getProjectedValue("Total Waste", "percent")
                      ).replace("%", "")
                    ) +
                    parseFloat(
                      String(getProjectedValue("Paper", "percent")).replace(
                        "%",
                        ""
                      )
                    )
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                -
              </TableCell>
            </TableRow>

            {/* Labor */}
            <TableRow sx={{ backgroundColor: "#fff3e0" }}>
              <TableCell sx={{ pl: 2, fontWeight: "bold" }}>Labor</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Crew Labor</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.crewLabor.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.crewLabor?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Crew Labor", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Crew Labor", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.crewLabor?.percent || 0,
                    parseFloat(
                      String(
                        getProjectedValue("Crew Labor", "percent")
                      ).replace("%", "")
                    )
                  )
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Management Labor</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.managementLabor.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.managementLabor?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Management Labor", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Management Labor", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.managementLabor?.percent ||
                      0,
                    parseFloat(
                      String(
                        getProjectedValue("Management Labor", "percent")
                      ).replace("%", "")
                    )
                  ),
                  "default"
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Payroll Tax</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.payrollTax.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.payrollTax?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Payroll Tax", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Payroll Tax", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.payrollTax?.percent || 0,
                    parseFloat(
                      String(
                        getProjectedValue("Payroll Tax", "percent")
                      ).replace("%", "")
                    )
                  )
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Additional Labor Dollars</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.additionalLaborDollars?.dollars || 0
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.additionalLaborDollars?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">-</TableCell>
            </TableRow>

            {/* Labor Total */}
            <TableRow sx={{ backgroundColor: "#fff3e0" }}>
              <TableCell sx={{ pl: 4, fontWeight: "bold" }}>
                Labor Total
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  (actualData.controllableExpenses.crewLabor?.dollars || 0) +
                    (actualData.controllableExpenses.managementLabor?.dollars ||
                      0) +
                    (actualData.controllableExpenses.payrollTax?.dollars || 0) +
                    (actualData.controllableExpenses.additionalLaborDollars?.dollars || 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatPercentage(
                  (actualData.controllableExpenses.crewLabor?.percent || 0) +
                    (actualData.controllableExpenses.managementLabor?.percent ||
                      0) +
                    (actualData.controllableExpenses.payrollTax?.percent || 0) +
                    (actualData.controllableExpenses.additionalLaborDollars?.percent || 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  getProjectedValueAsNumber("Crew Labor") +
                    getProjectedValueAsNumber("Management Labor") +
                    getProjectedValueAsNumber("Payroll Tax")
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatPercentage(
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
                      String(
                        getProjectedValue("Payroll Tax", "percent")
                      ).replace("%", "")
                    )
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                -
              </TableCell>
            </TableRow>

            {/* Purchases */}
            <TableRow sx={{ backgroundColor: "#f3e5f5" }}>
              <TableCell sx={{ pl: 2, fontWeight: "bold" }}>
                Purchases
              </TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Travel</TableCell>
              <TableCell align="right">
                {formatCurrency(actualData.controllableExpenses.travel.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.travel?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Travel", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Travel", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
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
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Advertising</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.advertising.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.advertising?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Advertising", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Advertising", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.advertising?.percent || 0,
                    parseFloat(
                      String(
                        getProjectedValue("Advertising", "percent")
                      ).replace("%", "")
                    )
                  )
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Advertising Other</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.advOther.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.advOther?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Advertising Other", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Advertising Other", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.advOther?.percent || 0,
                    parseFloat(
                      String(
                        getProjectedValue("Advertising Other", "percent")
                      ).replace("%", "")
                    )
                  ),
                  "default"
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Promotion</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.promotion.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.promotion?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Promotion", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Promotion", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
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
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Outside Services</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.outsideServices.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.outsideServices?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Outside Services", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Outside Services", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.outsideServices?.percent ||
                      0,
                    parseFloat(
                      String(
                        getProjectedValue("Outside Services", "percent")
                      ).replace("%", "")
                    )
                  ),
                  "default"
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Linen</TableCell>
              <TableCell align="right">
                {formatCurrency(actualData.controllableExpenses.linen.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.linen?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Linen", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Linen", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.linen?.percent || 0,
                    parseFloat(
                      String(getProjectedValue("Linen", "percent")).replace(
                        "%",
                        ""
                      )
                    )
                  ),
                  "default"
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Operating Supply</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.opsSupplies.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.opsSupplies?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Operating Supply", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Operating Supply", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.opsSupplies?.percent || 0,
                    parseFloat(
                      String(
                        getProjectedValue("Operating Supply", "percent")
                      ).replace("%", "")
                    )
                  ),
                  "default"
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Maintenance & Repair</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.maintenanceRepair.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.maintenanceRepair?.percent ||
                    0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Maintenance & Repair", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Maintenance & Repair", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.maintenanceRepair
                      ?.percent || 0,
                    parseFloat(
                      String(
                        getProjectedValue("Maintenance & Repair", "percent")
                      ).replace("%", "")
                    )
                  ),
                  "default"
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Small Equipment</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.smallEquipment.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.smallEquipment?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Small Equipment", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Small Equipment", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.smallEquipment?.percent ||
                      0,
                    parseFloat(
                      String(
                        getProjectedValue("Small Equipment", "percent")
                      ).replace("%", "")
                    )
                  ),
                  "default"
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Utilities</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.utilities.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.utilities?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Utilities", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Utilities", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
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
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Office</TableCell>
              <TableCell align="right">
                {formatCurrency(actualData.controllableExpenses.office.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.office?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Office", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Office", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
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
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Cash +/-</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.cashPlusMinus.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.cashPlusMinus?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Cash +/-", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Cash +/-", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
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
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Crew Relations</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.crewRelations?.dollars || 0
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.crewRelations?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Crew Relations", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Crew Relations", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
                  calculateDiffPercent(
                    actualData.controllableExpenses.crewRelations?.percent || 0,
                    parseFloat(
                      String(
                        getProjectedValue("Crew Relations", "percent")
                      ).replace("%", "")
                    )
                  ),
                  "default"
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Training</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  actualData.controllableExpenses.training?.dollars || 0
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  actualData.controllableExpenses.training?.percent || 0
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Training", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Training", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDiffPercent(
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
                )}
              </TableCell>
            </TableRow>

            {/* Purchases Total */}
            <TableRow sx={{ backgroundColor: "#f3e5f5" }}>
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
                    (actualData.controllableExpenses.training?.dollars || 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatPercentage(
                  pacActualData?.purchases?.total?.percent || 0
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  getProjectedValueAsNumber("Travel") +
                    getProjectedValueAsNumber("Advertising") +
                    getProjectedValueAsNumber("Promo") +
                    getProjectedValueAsNumber("Outside Services") +
                    getProjectedValueAsNumber("Linen") +
                    getProjectedValueAsNumber("Operating Supply") +
                    getProjectedValueAsNumber("Maintenance & Repair") +
                    getProjectedValueAsNumber("Small Equipment") +
                    getProjectedValueAsNumber("Utilities") +
                    getProjectedValueAsNumber("Office") +
                    getProjectedValueAsNumber("Cash +/-") +
                    getProjectedValueAsNumber("Crew Relations") +
                    getProjectedValueAsNumber("Training")
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {(() => {
                  const purchaseItems = [
                    "Travel",
                    "Advertising",
                    "Promo",
                    "Outside Services",
                    "Linen",
                    "Operating Supply",
                    "Maintenance & Repair",
                    "Small Equipment",
                    "Utilities",
                    "Office",
                    "Cash +/-",
                    "Crew Relations",
                    "Training",
                  ];

                  const total = purchaseItems.reduce((sum, item) => {
                    const value = getProjectedPercent(item);
                    const numValue = value === "-" ? 0 : parseFloat(value);
                    return sum + (isNaN(numValue) ? 0 : numValue);
                  }, 0);

                  return formatPercentage(total);
                })()}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                -
              </TableCell>
            </TableRow>

            {/* Totals */}
            <TableRow
              sx={{ backgroundColor: "#f0f0f0", borderTop: "2px solid #ccc" }}
            >
              <TableCell sx={{ fontWeight: "bold", fontSize: "1.1em" }}>
                Total Controllable
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", fontSize: "1.1em" }}
              >
                {formatCurrency(actualData.totalControllableDollars)}
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", fontSize: "1.1em" }}
              >
                {formatPercentage(actualData.totalControllablePercent)}
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", fontSize: "1.1em" }}
              >
                {getProjectedValue("Total Controllable", "dollar")}
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", fontSize: "1.1em" }}
              >
                {getProjectedValue("Total Controllable", "percent")}
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", fontSize: "1.1em" }}
              >
                -
              </TableCell>
            </TableRow>

            {/* P.A.C. */}
            <TableRow
              sx={{
                backgroundColor:
                  actualData.pacPercent >= 0
                    ? "rgba(0, 255, 0, 0.1)"
                    : "rgba(255, 0, 0, 0.1)",
                borderTop: "2px solid #ccc",
              }}
            >
              <TableCell sx={{ fontWeight: "bold", fontSize: "1.2em" }}>
                P.A.C.
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", fontSize: "1.2em" }}
              >
                {formatActualWithColor(
                  actualData.pacDollars,
                  getProjectedValueAsNumber("P.A.C."),
                  "dollar"
                )}
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", fontSize: "1.2em" }}
              >
                {formatActualWithColor(
                  actualData.pacPercent,
                  (getProjectedValueAsNumber("P.A.C.") /
                    (actualData.productNetSales || 1)) *
                    100,
                  "percent"
                )}
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", fontSize: "1.2em" }}
              >
                {getProjectedValue("P.A.C.", "dollar")}
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", fontSize: "1.2em" }}
              >
                {getProjectedValue("P.A.C.", "percent")}
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", fontSize: "1.2em" }}
              >
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

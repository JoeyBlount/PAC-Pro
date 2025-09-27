import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
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

const PacTab = ({ storeId, year, month, projections = [] }) => {
  const [pacData, setPacData] = useState(null);
  const [projectionsData, setProjectionsData] = useState(null);

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
    if (!pacData) return "<p>No data available</p>";

    // Helper functions for print content
    const formatCurrency = (value) => {
      if (value === null || value === undefined || isNaN(value)) return "-";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    };

    const formatPercentage = (value) => {
      if (value === null || value === undefined || isNaN(value)) return "-";
      return `${value.toFixed(2)}%`;
    };

    const getProjectedValueAsNumber = (expenseName) => {
      if (!projectionsData) return 0;
      
      // Map expense names to the correct backend field structure
      const expenseMap = {
        "Product Net Sales": projectionsData.product_net_sales,
        "All Net Sales": projectionsData.all_net_sales,
        "Base Food": projectionsData.controllable_expenses?.base_food,
        "Employee Meal": projectionsData.controllable_expenses?.employee_meal,
        Condiment: projectionsData.controllable_expenses?.condiment,
        "Total Waste": projectionsData.controllable_expenses?.total_waste,
        Paper: projectionsData.controllable_expenses?.paper,
        "Crew Labor": projectionsData.controllable_expenses?.crew_labor,
        "Management Labor": projectionsData.controllable_expenses?.management_labor,
        "Payroll Tax": projectionsData.controllable_expenses?.payroll_tax,
        Travel: projectionsData.controllable_expenses?.travel,
        Advertising: projectionsData.controllable_expenses?.advertising,
        "Advertising Other": projectionsData.controllable_expenses?.advertising_other,
        "Adv Other": projectionsData.controllable_expenses?.advertising_other, // Alternative naming
        Promotion: projectionsData.controllable_expenses?.promotion,
        "Outside Services": projectionsData.controllable_expenses?.outside_services,
        Linen: projectionsData.controllable_expenses?.linen,
        "Operating Supply": projectionsData.controllable_expenses?.op_supply,
        "Maintenance & Repair": projectionsData.controllable_expenses?.maintenance_repair,
        "Small Equipment": projectionsData.controllable_expenses?.small_equipment,
        Utilities: projectionsData.controllable_expenses?.utilities,
        Office: projectionsData.controllable_expenses?.office,
        "Cash +/-": projectionsData.controllable_expenses?.cash_adjustments,
        "Misc: CR/TR/D&S": projectionsData.controllable_expenses?.misc_cr_tr_ds,
        "Total Controllable": projectionsData.total_controllable_dollars,
        "P.A.C.": projectionsData.pac_dollars,
      };
      
      const expenseData = expenseMap[expenseName];
      if (!expenseData) return 0;
      
      // Handle different data structures
      if (typeof expenseData === 'number') {
        // Direct number (for sales, totals, P.A.C.)
        return expenseData;
      } else if (expenseData && typeof expenseData === 'object') {
        // Object with dollars/percent structure
        return parseFloat(expenseData.dollars || 0);
      }
      
      return 0;
    };

    const getProjectedValue = (expenseName, type) => {
      if (!projectionsData) return "-";
      
      // Map expense names to the correct backend field structure
      const expenseMap = {
        "Product Net Sales": projectionsData.product_net_sales,
        "All Net Sales": projectionsData.all_net_sales,
        "Base Food": projectionsData.controllable_expenses?.base_food,
        "Employee Meal": projectionsData.controllable_expenses?.employee_meal,
        Condiment: projectionsData.controllable_expenses?.condiment,
        "Total Waste": projectionsData.controllable_expenses?.total_waste,
        Paper: projectionsData.controllable_expenses?.paper,
        "Crew Labor": projectionsData.controllable_expenses?.crew_labor,
        "Management Labor": projectionsData.controllable_expenses?.management_labor,
        "Payroll Tax": projectionsData.controllable_expenses?.payroll_tax,
        Travel: projectionsData.controllable_expenses?.travel,
        Advertising: projectionsData.controllable_expenses?.advertising,
        "Advertising Other": projectionsData.controllable_expenses?.advertising_other,
        "Adv Other": projectionsData.controllable_expenses?.advertising_other, // Alternative naming
        Promotion: projectionsData.controllable_expenses?.promotion,
        "Outside Services": projectionsData.controllable_expenses?.outside_services,
        Linen: projectionsData.controllable_expenses?.linen,
        "Operating Supply": projectionsData.controllable_expenses?.op_supply,
        "Maintenance & Repair": projectionsData.controllable_expenses?.maintenance_repair,
        "Small Equipment": projectionsData.controllable_expenses?.small_equipment,
        Utilities: projectionsData.controllable_expenses?.utilities,
        Office: projectionsData.controllable_expenses?.office,
        "Cash +/-": projectionsData.controllable_expenses?.cash_adjustments,
        "Misc: CR/TR/D&S": projectionsData.controllable_expenses?.misc_cr_tr_ds,
        "Total Controllable": projectionsData.total_controllable_dollars,
        "P.A.C.": projectionsData.pac_dollars,
      };
      
      const expenseData = expenseMap[expenseName];
      if (!expenseData) return "-";
      
      // Handle different data structures
      let value;
      if (typeof expenseData === 'number') {
        // Direct number (for sales, totals, P.A.C.)
        value = expenseData;
      } else if (expenseData && typeof expenseData === 'object') {
        // Object with dollars/percent structure
        value = expenseData.dollars;
      } else {
        return "-";
      }
      
      if (value === null || value === undefined) return "-";
      
      if (type === "dollar") {
        return formatCurrency(parseFloat(value));
      } else if (type === "percent") {
        // For percentage, use the percent from the object if available, otherwise calculate
        if (expenseData && typeof expenseData === 'object' && expenseData.percent !== undefined) {
          return formatPercentage(expenseData.percent);
        } else {
          // Calculate percentage based on net sales
          const projectedNetSales = projectionsData.product_net_sales || projectionsData.all_net_sales;
          if (!projectedNetSales || projectedNetSales === 0) return "-";
          const percentage = (parseFloat(value) / parseFloat(projectedNetSales)) * 100;
          return formatPercentage(percentage);
        }
      }
      return "-";
    };

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

    return `
      <div class="print-header">
        PAC Report - ${storeId} - ${month} ${year}
      </div>
      <table class="print-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Actual $</th>
            <th>Actual %</th>
            <th>Projected $</th>
            <th>Projected %</th>
            <th>Difference $</th>
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
              pacData.productNetSales,
              getProjectedValueAsNumber("Product Net Sales")
            )}">${formatCurrency(pacData.productNetSales)}</td>
            <td>-</td>
            <td>${getProjectedValue("Product Net Sales", "dollar")}</td>
            <td>-</td>
            <td class="${getDiffColorClass(
              pacData.productNetSales,
              getProjectedValueAsNumber("Product Net Sales")
            )}">${formatDifference(
      pacData.productNetSales,
      getProjectedValueAsNumber("Product Net Sales")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">All Net Sales</td>
            <td class="${getColorClass(
              pacData.allNetSales,
              getProjectedValueAsNumber("All Net Sales")
            )}">${formatCurrency(pacData.allNetSales)}</td>
            <td>-</td>
            <td>${getProjectedValue("All Net Sales", "dollar")}</td>
            <td>-</td>
            <td class="${getDiffColorClass(
              pacData.allNetSales,
              getProjectedValueAsNumber("All Net Sales")
            )}">${formatDifference(
      pacData.allNetSales,
      getProjectedValueAsNumber("All Net Sales")
    )}</td>
          </tr>
          
          <!-- Food & Paper Section -->
          <tr class="print-section-header print-food-paper-header">
            <td colspan="6">Food & Paper</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Base Food</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.baseFood.dollars,
              getProjectedValueAsNumber("Base Food")
            )}">${formatCurrency(
      pacData.controllableExpenses.baseFood.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.baseFood.percent
            )}</td>
            <td>${getProjectedValue("Base Food", "dollar")}</td>
            <td>${getProjectedValue("Base Food", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.baseFood.dollars,
              getProjectedValueAsNumber("Base Food")
            )}">${formatDifference(
      pacData.controllableExpenses.baseFood.dollars,
      getProjectedValueAsNumber("Base Food")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Employee Meal</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.employeeMeal.dollars,
              getProjectedValueAsNumber("Employee Meal")
            )}">${formatCurrency(
      pacData.controllableExpenses.employeeMeal.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.employeeMeal.percent
            )}</td>
            <td>${getProjectedValue("Employee Meal", "dollar")}</td>
            <td>${getProjectedValue("Employee Meal", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.employeeMeal.dollars,
              getProjectedValueAsNumber("Employee Meal")
            )}">${formatDifference(
      pacData.controllableExpenses.employeeMeal.dollars,
      getProjectedValueAsNumber("Employee Meal")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Condiment</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.condiment.dollars,
              getProjectedValueAsNumber("Condiment")
            )}">${formatCurrency(
      pacData.controllableExpenses.condiment.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.condiment.percent
            )}</td>
            <td>${getProjectedValue("Condiment", "dollar")}</td>
            <td>${getProjectedValue("Condiment", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.condiment.dollars,
              getProjectedValueAsNumber("Condiment")
            )}">${formatDifference(
      pacData.controllableExpenses.condiment.dollars,
      getProjectedValueAsNumber("Condiment")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Total Waste</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.totalWaste.dollars,
              getProjectedValueAsNumber("Total Waste")
            )}">${formatCurrency(
      pacData.controllableExpenses.totalWaste.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.totalWaste.percent
            )}</td>
            <td>${getProjectedValue("Total Waste", "dollar")}</td>
            <td>${getProjectedValue("Total Waste", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.totalWaste.dollars,
              getProjectedValueAsNumber("Total Waste")
            )}">${formatDifference(
      pacData.controllableExpenses.totalWaste.dollars,
      getProjectedValueAsNumber("Total Waste")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Paper</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.paper.dollars,
              getProjectedValueAsNumber("Paper")
            )}">${formatCurrency(
      pacData.controllableExpenses.paper.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.paper.percent
            )}</td>
            <td>${getProjectedValue("Paper", "dollar")}</td>
            <td>${getProjectedValue("Paper", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.paper.dollars,
              getProjectedValueAsNumber("Paper")
            )}">${formatDifference(
      pacData.controllableExpenses.paper.dollars,
      getProjectedValueAsNumber("Paper")
    )}</td>
          </tr>
          
          <!-- Labor Section -->
          <tr class="print-section-header print-labor-header">
            <td colspan="6">Labor</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Crew Labor</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.crewLabor.dollars,
              getProjectedValueAsNumber("Crew Labor")
            )}">${formatCurrency(
      pacData.controllableExpenses.crewLabor.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.crewLabor.percent
            )}</td>
            <td>${getProjectedValue("Crew Labor", "dollar")}</td>
            <td>${getProjectedValue("Crew Labor", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.crewLabor.dollars,
              getProjectedValueAsNumber("Crew Labor")
            )}">${formatDifference(
      pacData.controllableExpenses.crewLabor.dollars,
      getProjectedValueAsNumber("Crew Labor")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Management Labor</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.managementLabor.dollars,
              getProjectedValueAsNumber("Management Labor")
            )}">${formatCurrency(
      pacData.controllableExpenses.managementLabor.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.managementLabor.percent
            )}</td>
            <td>${getProjectedValue("Management Labor", "dollar")}</td>
            <td>${getProjectedValue("Management Labor", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.managementLabor.dollars,
              getProjectedValueAsNumber("Management Labor")
            )}">${formatDifference(
      pacData.controllableExpenses.managementLabor.dollars,
      getProjectedValueAsNumber("Management Labor")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Payroll Tax</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.payrollTax.dollars,
              getProjectedValueAsNumber("Payroll Tax")
            )}">${formatCurrency(
      pacData.controllableExpenses.payrollTax.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.payrollTax.percent
            )}</td>
            <td>${getProjectedValue("Payroll Tax", "dollar")}</td>
            <td>${getProjectedValue("Payroll Tax", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.payrollTax.dollars,
              getProjectedValueAsNumber("Payroll Tax")
            )}">${formatDifference(
      pacData.controllableExpenses.payrollTax.dollars,
      getProjectedValueAsNumber("Payroll Tax")
    )}</td>
          </tr>
          
          <!-- Other Expenses Section -->
          <tr class="print-section-header print-purchases-header">
            <td colspan="6">Other Expenses</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Travel</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.travel.dollars,
              getProjectedValueAsNumber("Travel")
            )}">${formatCurrency(
      pacData.controllableExpenses.travel.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.travel.percent
            )}</td>
            <td>${getProjectedValue("Travel", "dollar")}</td>
            <td>${getProjectedValue("Travel", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.travel.dollars,
              getProjectedValueAsNumber("Travel")
            )}">${formatDifference(
      pacData.controllableExpenses.travel.dollars,
      getProjectedValueAsNumber("Travel")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Advertising</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.advertising.dollars,
              getProjectedValueAsNumber("Advertising")
            )}">${formatCurrency(
      pacData.controllableExpenses.advertising.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.advertising.percent
            )}</td>
            <td>${getProjectedValue("Advertising", "dollar")}</td>
            <td>${getProjectedValue("Advertising", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.advertising.dollars,
              getProjectedValueAsNumber("Advertising")
            )}">${formatDifference(
      pacData.controllableExpenses.advertising.dollars,
      getProjectedValueAsNumber("Advertising")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Advertising Other</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.advertisingOther.dollars,
              getProjectedValueAsNumber("Advertising Other")
            )}">${formatCurrency(
      pacData.controllableExpenses.advertisingOther.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.advertisingOther.percent
            )}</td>
            <td>${getProjectedValue("Advertising Other", "dollar")}</td>
            <td>${getProjectedValue("Advertising Other", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.advertisingOther.dollars,
              getProjectedValueAsNumber("Advertising Other")
            )}">${formatDifference(
      pacData.controllableExpenses.advertisingOther.dollars,
      getProjectedValueAsNumber("Advertising Other")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Promotion</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.promotion.dollars,
              getProjectedValueAsNumber("Promotion")
            )}">${formatCurrency(
      pacData.controllableExpenses.promotion.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.promotion.percent
            )}</td>
            <td>${getProjectedValue("Promotion", "dollar")}</td>
            <td>${getProjectedValue("Promotion", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.promotion.dollars,
              getProjectedValueAsNumber("Promotion")
            )}">${formatDifference(
      pacData.controllableExpenses.promotion.dollars,
      getProjectedValueAsNumber("Promotion")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Outside Services</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.outsideServices.dollars,
              getProjectedValueAsNumber("Outside Services")
            )}">${formatCurrency(
      pacData.controllableExpenses.outsideServices.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.outsideServices.percent
            )}</td>
            <td>${getProjectedValue("Outside Services", "dollar")}</td>
            <td>${getProjectedValue("Outside Services", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.outsideServices.dollars,
              getProjectedValueAsNumber("Outside Services")
            )}">${formatDifference(
      pacData.controllableExpenses.outsideServices.dollars,
      getProjectedValueAsNumber("Outside Services")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Linen</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.linen.dollars,
              getProjectedValueAsNumber("Linen")
            )}">${formatCurrency(
      pacData.controllableExpenses.linen.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.linen.percent
            )}</td>
            <td>${getProjectedValue("Linen", "dollar")}</td>
            <td>${getProjectedValue("Linen", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.linen.dollars,
              getProjectedValueAsNumber("Linen")
            )}">${formatDifference(
      pacData.controllableExpenses.linen.dollars,
      getProjectedValueAsNumber("Linen")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Operating Supply</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.opSupply.dollars,
              getProjectedValueAsNumber("Operating Supply")
            )}">${formatCurrency(
      pacData.controllableExpenses.opSupply.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.opSupply.percent
            )}</td>
            <td>${getProjectedValue("Operating Supply", "dollar")}</td>
            <td>${getProjectedValue("Operating Supply", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.opSupply.dollars,
              getProjectedValueAsNumber("Operating Supply")
            )}">${formatDifference(
      pacData.controllableExpenses.opSupply.dollars,
      getProjectedValueAsNumber("Operating Supply")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Maintenance & Repair</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.maintenanceRepair.dollars,
              getProjectedValueAsNumber("Maintenance & Repair")
            )}">${formatCurrency(
      pacData.controllableExpenses.maintenanceRepair.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.maintenanceRepair.percent
            )}</td>
            <td>${getProjectedValue("Maintenance & Repair", "dollar")}</td>
            <td>${getProjectedValue("Maintenance & Repair", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.maintenanceRepair.dollars,
              getProjectedValueAsNumber("Maintenance & Repair")
            )}">${formatDifference(
      pacData.controllableExpenses.maintenanceRepair.dollars,
      getProjectedValueAsNumber("Maintenance & Repair")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Small Equipment</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.smallEquipment.dollars,
              getProjectedValueAsNumber("Small Equipment")
            )}">${formatCurrency(
      pacData.controllableExpenses.smallEquipment.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.smallEquipment.percent
            )}</td>
            <td>${getProjectedValue("Small Equipment", "dollar")}</td>
            <td>${getProjectedValue("Small Equipment", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.smallEquipment.dollars,
              getProjectedValueAsNumber("Small Equipment")
            )}">${formatDifference(
      pacData.controllableExpenses.smallEquipment.dollars,
      getProjectedValueAsNumber("Small Equipment")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Utilities</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.utilities.dollars,
              getProjectedValueAsNumber("Utilities")
            )}">${formatCurrency(
      pacData.controllableExpenses.utilities.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.utilities.percent
            )}</td>
            <td>${getProjectedValue("Utilities", "dollar")}</td>
            <td>${getProjectedValue("Utilities", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.utilities.dollars,
              getProjectedValueAsNumber("Utilities")
            )}">${formatDifference(
      pacData.controllableExpenses.utilities.dollars,
      getProjectedValueAsNumber("Utilities")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Office</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.office.dollars,
              getProjectedValueAsNumber("Office")
            )}">${formatCurrency(
      pacData.controllableExpenses.office.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.office.percent
            )}</td>
            <td>${getProjectedValue("Office", "dollar")}</td>
            <td>${getProjectedValue("Office", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.office.dollars,
              getProjectedValueAsNumber("Office")
            )}">${formatDifference(
      pacData.controllableExpenses.office.dollars,
      getProjectedValueAsNumber("Office")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Cash +/-</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.cashAdjustments.dollars,
              getProjectedValueAsNumber("Cash +/-")
            )}">${formatCurrency(
      pacData.controllableExpenses.cashAdjustments.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.cashAdjustments.percent
            )}</td>
            <td>${getProjectedValue("Cash +/-", "dollar")}</td>
            <td>${getProjectedValue("Cash +/-", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.cashAdjustments.dollars,
              getProjectedValueAsNumber("Cash +/-")
            )}">${formatDifference(
      pacData.controllableExpenses.cashAdjustments.dollars,
      getProjectedValueAsNumber("Cash +/-")
    )}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Misc: CR/TR/D&S</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.miscCrTrDs.dollars,
              getProjectedValueAsNumber("Misc: CR/TR/D&S")
            )}">${formatCurrency(
      pacData.controllableExpenses.miscCrTrDs.dollars
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.miscCrTrDs.percent
            )}</td>
            <td>${getProjectedValue("Misc: CR/TR/D&S", "dollar")}</td>
            <td>${getProjectedValue("Misc: CR/TR/D&S", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.miscCrTrDs.dollars,
              getProjectedValueAsNumber("Misc: CR/TR/D&S")
            )}">${formatDifference(
      pacData.controllableExpenses.miscCrTrDs.dollars,
      getProjectedValueAsNumber("Misc: CR/TR/D&S")
    )}</td>
          </tr>
          
          <!-- Add missing expense categories -->
          <tr>
            <td style="padding-left: 20px;">Adv Other</td>
            <td class="${getColorClass(
              pacData.controllableExpenses.advertisingOther?.dollars || 0,
              getProjectedValueAsNumber("Adv Other")
            )}">${formatCurrency(
      pacData.controllableExpenses.advertisingOther?.dollars || 0
    )}</td>
            <td>${formatPercentage(
              pacData.controllableExpenses.advertisingOther?.percent || 0
            )}</td>
            <td>${getProjectedValue("Adv Other", "dollar")}</td>
            <td>${getProjectedValue("Adv Other", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.controllableExpenses.advertisingOther?.dollars || 0,
              getProjectedValueAsNumber("Adv Other")
            )}">${formatDifference(
      pacData.controllableExpenses.advertisingOther?.dollars || 0,
      getProjectedValueAsNumber("Adv Other")
    )}</td>
          </tr>
          
          <!-- Totals -->
          <tr class="print-section-header print-totals-header">
            <td>Total Controllable</td>
            <td class="${getColorClass(
              pacData.totalControllableDollars,
              getProjectedValueAsNumber("Total Controllable")
            )}">${formatCurrency(pacData.totalControllableDollars)}</td>
            <td class="${getColorClass(
              pacData.totalControllablePercent,
              (getProjectedValueAsNumber("Total Controllable") /
                (pacData.productNetSales || 1)) *
                100
            )}">${formatPercentage(pacData.totalControllablePercent)}</td>
            <td>${getProjectedValue("Total Controllable", "dollar")}</td>
            <td>${getProjectedValue("Total Controllable", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.totalControllableDollars,
              getProjectedValueAsNumber("Total Controllable")
            )}">${formatDifference(
      pacData.totalControllableDollars,
      getProjectedValueAsNumber("Total Controllable")
    )}</td>
          </tr>
          
          <!-- P.A.C. -->
          <tr class="print-section-header print-pac-header">
            <td>P.A.C.</td>
            <td class="${getColorClass(
              pacData.pacDollars,
              getProjectedValueAsNumber("P.A.C.")
            )}">${formatCurrency(pacData.pacDollars)}</td>
            <td class="${getColorClass(
              pacData.pacPercent,
              (getProjectedValueAsNumber("P.A.C.") /
                (pacData.productNetSales || 1)) *
                100
            )}">${formatPercentage(pacData.pacPercent)}</td>
            <td>${getProjectedValue("P.A.C.", "dollar")}</td>
            <td>${getProjectedValue("P.A.C.", "percent")}</td>
            <td class="${getDiffColorClass(
              pacData.pacDollars,
              getProjectedValueAsNumber("P.A.C.")
            )}">${formatDifference(
      pacData.pacDollars,
      getProjectedValueAsNumber("P.A.C.")
    )}</td>
          </tr>
        </tbody>
      </table>
    `;
  };

  // Custom print function
  const handlePrint = () => {
    try {
      if (!pacData) {
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
        console.log("Here is projected data: ", data)
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

      console.log(
        `Fetching PAC data for store: ${formattedStoreId}, month: ${yearMonth}`
      );

      // Fetch both actual and projections data in parallel
      const [actualResponse, projectionsData] = await Promise.all([
        fetch(`http://localhost:5140/api/pac/${formattedStoreId}/${yearMonth}`),
        fetchProjectionsData(formattedStoreId, yearMonth),
      ]);

      if (!actualResponse.ok) {
        throw new Error(
          `Failed to fetch PAC data: ${actualResponse.statusText}`
        );
      }
      const data = await actualResponse.json();
      console.log("RAW PAC JSON from API:", data);

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
          miscCrTrDs: {
            dollars: parseFloat(
              data.controllable_expenses.misc_cr_tr_ds.dollars
            ),
            percent: parseFloat(
              data.controllable_expenses.misc_cr_tr_ds.percent
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
          misc: { dollars: 0, percent: 0 },
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

  const calculateDifference = (actual, projected) => {
    if (!projectionsData || projected === null || projected === undefined) {
      return "-";
    }
    const diff = actual - projected;
    return diff;
  };

  const formatDifference = (actual, projected) => {
    const diff = calculateDifference(actual, projected);
    if (diff === "-") return "-";

    const formatted = formatCurrency(diff);
    // Red for negative differences (actual < projected), Green for positive (actual > projected)
    const color = diff < 0 ? "red" : diff > 0 ? "green" : "black";
    return <span style={{ color }}>{formatted}</span>;
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
      "Misc: CR/TR/D&S": "controllable_expenses.misc_cr_tr_ds.dollars",
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
      "Misc: CR/TR/D&S": "controllable_expenses.misc_cr_tr_ds.dollars",
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

  if (!pacData) {
    return (
      <Container sx={{ mt: 2 }}>
        <Alert severity="info">
          No PAC data available. Please select a store, year, and month.
        </Alert>
      </Container>
    );
  }
  const handleExportExcel = () => {
  if (!pacData) {
    alert("No data available to export.");
    return;
  }
const getProjectedPercent = (accountName) => {
  if (!projectionsData) return "-";

  const expenseMap = {
    "Base Food": projectionsData.controllable_expenses?.base_food?.percent,
    "Employee Meal": projectionsData.controllable_expenses?.employee_meal?.percent,
    "Condiment": projectionsData.controllable_expenses?.condiment?.percent,
    "Total Waste": projectionsData.controllable_expenses?.total_waste?.percent,
    "Paper": projectionsData.controllable_expenses?.paper?.percent,
    "Crew Labor": projectionsData.controllable_expenses?.crew_labor?.percent,
    "Management Labor": projectionsData.controllable_expenses?.management_labor?.percent,
    "Payroll Tax": projectionsData.controllable_expenses?.payroll_tax?.percent,
    "Travel": projectionsData.controllable_expenses?.travel?.percent,
    "Advertising": projectionsData.controllable_expenses?.advertising?.percent,
    "Advertising Other": projectionsData.controllable_expenses?.advertising_other?.percent,
    "Promotion": projectionsData.controllable_expenses?.promotion?.percent,
    "Outside Services": projectionsData.controllable_expenses?.outside_services?.percent,
    "Linen": projectionsData.controllable_expenses?.linen?.percent,
    "Operating Supply": projectionsData.controllable_expenses?.op_supply?.percent,
    "Maintenance & Repair": projectionsData.controllable_expenses?.maintenance_repair?.percent,
    "Small Equipment": projectionsData.controllable_expenses?.small_equipment?.percent,
    "Utilities": projectionsData.controllable_expenses?.utilities?.percent,
    "Office": projectionsData.controllable_expenses?.office?.percent,
    "Cash +/-": projectionsData.controllable_expenses?.cash_adjustments?.percent,
    "Misc: CR/TR/D&S": projectionsData.controllable_expenses?.misc_cr_tr_ds?.percent,
    "Total Controllable": projectionsData.total_controllable_percent,
    "P.A.C.": projectionsData.pac_percent,
  };

  const raw = expenseMap[accountName];
  return raw !== undefined && raw !== null ? formatPercentage(raw) : "-";
};

  // Flatten into rows for Excel
const rows = [
  // --- Sales ---
  {
    Account: "Product Net Sales",
    "Actual $": pacData?.productNetSales ?? 0,
    "Actual %": "-",
    "Projected $": getProjectedValueAsNumber("Product Net Sales"),
    "Projected %": getProjectedPercent("Product Net Sales"),
    "Difference $":
      (pacData?.productNetSales ?? 0) -
      getProjectedValueAsNumber("Product Net Sales"),
  },
  {
    Account: "All Net Sales",
    "Actual $": pacData?.allNetSales ?? 0,
    "Actual %": "-",
    "Projected $": getProjectedValueAsNumber("All Net Sales"),
    "Projected %": getProjectedPercent("All Net Sales"),
    "Difference $":
      (pacData?.allNetSales ?? 0) -
      getProjectedValueAsNumber("All Net Sales"),
  },

  // --- Food & Paper ---
  {
    Account: "Base Food",
    "Actual $": pacData?.controllableExpenses?.baseFood?.dollars ?? 0,
    "Actual %": pacData?.controllableExpenses?.baseFood?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.baseFood.percent)
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
    "Actual %": pacData?.controllableExpenses?.employeeMeal?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.employeeMeal.percent)
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
    "Actual %": pacData?.controllableExpenses?.condiment?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.condiment.percent)
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
    "Actual %": pacData?.controllableExpenses?.totalWaste?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.totalWaste.percent)
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
    "Actual %": pacData?.controllableExpenses?.paper?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.paper.percent)
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
    "Actual %": pacData?.controllableExpenses?.crewLabor?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.crewLabor.percent)
      : "-",
    "Projected $": getProjectedValueAsNumber("Crew Labor"),
    "Projected %": getProjectedPercent("Crew Labor"),
    "Difference $":
      (pacData?.controllableExpenses?.crewLabor?.dollars ?? 0) -
      getProjectedValueAsNumber("Crew Labor"),
  },
  {
    Account: "Management Labor",
    "Actual $": pacData?.controllableExpenses?.managementLabor?.dollars ?? 0,
    "Actual %": pacData?.controllableExpenses?.managementLabor?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.managementLabor.percent)
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
    "Actual %": pacData?.controllableExpenses?.payrollTax?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.payrollTax.percent)
      : "-",
    "Projected $": getProjectedValueAsNumber("Payroll Tax"),
    "Projected %": getProjectedPercent("Payroll Tax"),
    "Difference $":
      (pacData?.controllableExpenses?.payrollTax?.dollars ?? 0) -
      getProjectedValueAsNumber("Payroll Tax"),
  },

  // --- Other Expenses ---
  {
    Account: "Travel",
    "Actual $": pacData?.controllableExpenses?.travel?.dollars ?? 0,
    "Actual %": pacData?.controllableExpenses?.travel?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.travel.percent)
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
    "Actual %": pacData?.controllableExpenses?.advertising?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.advertising.percent)
      : "-",
    "Projected $": getProjectedValueAsNumber("Advertising"),
    "Projected %": getProjectedPercent("Advertising"),
    "Difference $":
      (pacData?.controllableExpenses?.advertising?.dollars ?? 0) -
      getProjectedValueAsNumber("Advertising"),
  },
  {
    Account: "Advertising Other",
    "Actual $": pacData?.controllableExpenses?.advertisingOther?.dollars ?? 0,
    "Actual %": pacData?.controllableExpenses?.advertisingOther?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.advertisingOther.percent)
      : "-",
    "Projected $": getProjectedValueAsNumber("Advertising Other"),
    "Projected %": getProjectedPercent("Advertising Other"),
    "Difference $":
      (pacData?.controllableExpenses?.advertisingOther?.dollars ?? 0) -
      getProjectedValueAsNumber("Advertising Other"),
  },
  {
    Account: "Promotion",
    "Actual $": pacData?.controllableExpenses?.promotion?.dollars ?? 0,
    "Actual %": pacData?.controllableExpenses?.promotion?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.promotion.percent)
      : "-",
    "Projected $": getProjectedValueAsNumber("Promotion"),
    "Projected %": getProjectedPercent("Promotion"),
    "Difference $":
      (pacData?.controllableExpenses?.promotion?.dollars ?? 0) -
      getProjectedValueAsNumber("Promotion"),
  },
  {
    Account: "Outside Services",
    "Actual $": pacData?.controllableExpenses?.outsideServices?.dollars ?? 0,
    "Actual %": pacData?.controllableExpenses?.outsideServices?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.outsideServices.percent)
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
    "Actual %": pacData?.controllableExpenses?.linen?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.linen.percent)
      : "-",
    "Projected $": getProjectedValueAsNumber("Linen"),
    "Projected %": getProjectedPercent("Linen"),
    "Difference $":
      (pacData?.controllableExpenses?.linen?.dollars ?? 0) -
      getProjectedValueAsNumber("Linen"),
  },
{
  Account: "Operating Supply",
  "Actual $": pacData?.controllableExpenses?.opSupply?.dollars ?? 0,
  "Actual %": pacData?.controllableExpenses?.opSupply?.percent !== undefined
    ? formatPercentage(pacData.controllableExpenses.opSupply.percent)
    : "-",
  "Projected $": getProjectedValueAsNumber("Operating Supply"),
  "Projected %": getProjectedPercent("Operating Supply"),
  "Difference $":
    (pacData?.controllableExpenses?.opSupply?.dollars ?? 0) -
    getProjectedValueAsNumber("Operating Supply"),
},
  {
    Account: "Maintenance & Repair",
    "Actual $": pacData?.controllableExpenses?.maintenanceRepair?.dollars ?? 0,
    "Actual %": pacData?.controllableExpenses?.maintenanceRepair?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.maintenanceRepair.percent)
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
    "Actual %": pacData?.controllableExpenses?.smallEquipment?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.smallEquipment.percent)
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
    "Actual %": pacData?.controllableExpenses?.utilities?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.utilities.percent)
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
    "Actual %": pacData?.controllableExpenses?.office?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.office.percent)
      : "-",
    "Projected $": getProjectedValueAsNumber("Office"),
    "Projected %": getProjectedPercent("Office"),
    "Difference $":
      (pacData?.controllableExpenses?.office?.dollars ?? 0) -
      getProjectedValueAsNumber("Office"),
  },
  {
    Account: "Cash +/-",
    "Actual $": pacData?.controllableExpenses?.cashAdjustments?.dollars ?? 0,
    "Actual %": pacData?.controllableExpenses?.cashAdjustments?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.cashAdjustments.percent)
      : "-",
    "Projected $": getProjectedValueAsNumber("Cash +/-"),
    "Projected %": getProjectedPercent("Cash +/-"),
    "Difference $":
      (pacData?.controllableExpenses?.cashAdjustments?.dollars ?? 0) -
      getProjectedValueAsNumber("Cash +/-"),
  },
  {
    Account: "Misc: CR/TR/D&S",
    "Actual $": pacData?.controllableExpenses?.miscCrTrDs?.dollars ?? 0,
    "Actual %": pacData?.controllableExpenses?.miscCrTrDs?.percent !== undefined
      ? formatPercentage(pacData.controllableExpenses.miscCrTrDs.percent)
      : "-",
    "Projected $": getProjectedValueAsNumber("Misc: CR/TR/D&S"),
    "Projected %": getProjectedPercent("Misc: CR/TR/D&S"),
    "Difference $":
      (pacData?.controllableExpenses?.miscCrTrDs?.dollars ?? 0) -
      getProjectedValueAsNumber("Misc: CR/TR/D&S"),
  },

  // --- Totals ---
  {
    Account: "Total Controllable",
    "Actual $": pacData?.totalControllableDollars ?? 0,
    "Actual %": pacData?.totalControllablePercent !== undefined
      ? formatPercentage(pacData.totalControllablePercent)
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
    "Actual %": pacData?.pacPercent !== undefined
      ? formatPercentage(pacData.pacPercent)
      : "-",
    "Projected $": getProjectedValueAsNumber("P.A.C."),
    "Projected %": getProjectedPercent("P.A.C."),
    "Difference $":
      (pacData?.pacDollars ?? 0) -
      getProjectedValueAsNumber("P.A.C."),
  },
];



  const worksheet = XLSX.utils.json_to_sheet(rows);
   const currencyCols = ["B", "D", "F"]; // adjust column letters based on where these land
  currencyCols.forEach((col) => {
    for (let row = 2; row <= rows.length + 1; row++) { // start at row 2 (skip headers)
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
                Difference $
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
                  pacData.productNetSales,
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
                {formatDifference(
                  pacData.productNetSales,
                  getProjectedValueAsNumber("Product Net Sales")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>All Net Sales</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatActualWithColor(
                  pacData.allNetSales,
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
                {formatDifference(
                  pacData.allNetSales,
                  getProjectedValueAsNumber("All Net Sales")
                )}
              </TableCell>
            </TableRow>

            {/* Food & Paper */}
            <TableRow sx={{ backgroundColor: "#f1f8e9" }}>
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
                {formatCurrency(pacData.controllableExpenses.baseFood.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.baseFood.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Base Food", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Base Food", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.baseFood.dollars,
                  getProjectedValueAsNumber("Base Food")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Employee Meal</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  pacData.controllableExpenses.employeeMeal.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.employeeMeal.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Employee Meal", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Employee Meal", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.employeeMeal.dollars,
                  getProjectedValueAsNumber("Employee Meal")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Condiment</TableCell>
              <TableCell align="right">
                {formatCurrency(pacData.controllableExpenses.condiment.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.condiment.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Condiment", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Condiment", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.condiment.dollars,
                  getProjectedValueAsNumber("Condiment")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Total Waste</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  pacData.controllableExpenses.totalWaste.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.totalWaste.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Total Waste", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Total Waste", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.totalWaste.dollars,
                  getProjectedValueAsNumber("Total Waste")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Paper</TableCell>
              <TableCell align="right">
                {formatCurrency(pacData.controllableExpenses.paper.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(pacData.controllableExpenses.paper.percent)}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Paper", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Paper", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.paper.dollars,
                  getProjectedValueAsNumber("Paper")
                )}
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
                {formatCurrency(pacData.controllableExpenses.crewLabor.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.crewLabor.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Crew Labor", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Crew Labor", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.crewLabor.dollars,
                  getProjectedValueAsNumber("Crew Labor")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Management Labor</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  pacData.controllableExpenses.managementLabor.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.managementLabor.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Management Labor", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Management Labor", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.managementLabor.dollars,
                  getProjectedValueAsNumber("Management Labor")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Payroll Tax</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  pacData.controllableExpenses.payrollTax.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.payrollTax.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Payroll Tax", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Payroll Tax", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.payrollTax.dollars,
                  getProjectedValueAsNumber("Payroll Tax")
                )}
              </TableCell>
            </TableRow>

            {/* Other Expenses */}
            <TableRow sx={{ backgroundColor: "#f3e5f5" }}>
              <TableCell sx={{ pl: 2, fontWeight: "bold" }}>
                Other Expenses
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
                {formatCurrency(pacData.controllableExpenses.travel.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(pacData.controllableExpenses.travel.percent)}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Travel", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Travel", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.travel.dollars,
                  getProjectedValueAsNumber("Travel")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Advertising</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  pacData.controllableExpenses.advertising.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.advertising.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Advertising", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Advertising", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.advertising.dollars,
                  getProjectedValueAsNumber("Advertising")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Advertising Other</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  pacData.controllableExpenses.advertisingOther.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.advertisingOther.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Advertising Other", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Advertising Other", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.advertisingOther.dollars,
                  getProjectedValueAsNumber("Advertising Other")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Promotion</TableCell>
              <TableCell align="right">
                {formatCurrency(pacData.controllableExpenses.promotion.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.promotion.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Promotion", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Promotion", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.promotion.dollars,
                  getProjectedValueAsNumber("Promotion")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Outside Services</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  pacData.controllableExpenses.outsideServices.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.outsideServices.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Outside Services", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Outside Services", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.outsideServices.dollars,
                  getProjectedValueAsNumber("Outside Services")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Linen</TableCell>
              <TableCell align="right">
                {formatCurrency(pacData.controllableExpenses.linen.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(pacData.controllableExpenses.linen.percent)}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Linen", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Linen", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.linen.dollars,
                  getProjectedValueAsNumber("Linen")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Operating Supply</TableCell>
              <TableCell align="right">
                {formatCurrency(pacData.controllableExpenses.opSupply.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.opSupply.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Operating Supply", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Operating Supply", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.opSupply.dollars,
                  getProjectedValueAsNumber("Operating Supply")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Maintenance & Repair</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  pacData.controllableExpenses.maintenanceRepair.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.maintenanceRepair.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Maintenance & Repair", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Maintenance & Repair", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.maintenanceRepair.dollars,
                  getProjectedValueAsNumber("Maintenance & Repair")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Small Equipment</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  pacData.controllableExpenses.smallEquipment.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.smallEquipment.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Small Equipment", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Small Equipment", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.smallEquipment.dollars,
                  getProjectedValueAsNumber("Small Equipment")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Utilities</TableCell>
              <TableCell align="right">
                {formatCurrency(pacData.controllableExpenses.utilities.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.utilities.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Utilities", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Utilities", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.utilities.dollars,
                  getProjectedValueAsNumber("Utilities")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Office</TableCell>
              <TableCell align="right">
                {formatCurrency(pacData.controllableExpenses.office.dollars)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(pacData.controllableExpenses.office.percent)}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Office", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Office", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.office.dollars,
                  getProjectedValueAsNumber("Office")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Cash +/-</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  pacData.controllableExpenses.cashAdjustments.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.cashAdjustments.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Cash +/-", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Cash +/-", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.cashAdjustments.dollars,
                  getProjectedValueAsNumber("Cash +/-")
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Misc: CR/TR/D&S</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  pacData.controllableExpenses.miscCrTrDs.dollars
                )}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(
                  pacData.controllableExpenses.miscCrTrDs.percent
                )}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Misc: CR/TR/D&S", "dollar")}
              </TableCell>
              <TableCell align="right">
                {getProjectedValue("Misc: CR/TR/D&S", "percent")}
              </TableCell>
              <TableCell align="right">
                {formatDifference(
                  pacData.controllableExpenses.miscCrTrDs.dollars,
                  getProjectedValueAsNumber("Misc: CR/TR/D&S")
                )}
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
                {formatActualWithColor(
                  pacData.totalControllableDollars,
                  getProjectedValueAsNumber("Total Controllable"),
                  "dollar"
                )}
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", fontSize: "1.1em" }}
              >
                {formatActualWithColor(
                  pacData.totalControllablePercent,
                  (getProjectedValueAsNumber("Total Controllable") /
                    (pacData.productNetSales || 1)) *
                    100,
                  "percent"
                )}
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
                {formatDifference(
                  pacData.totalControllableDollars,
                  getProjectedValueAsNumber("Total Controllable")
                )}
              </TableCell>
            </TableRow>

            {/* P.A.C. */}
            <TableRow
              sx={{
                backgroundColor:
                  pacData.pacPercent >= 0
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
                  pacData.pacDollars,
                  getProjectedValueAsNumber("P.A.C."),
                  "dollar"
                )}
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", fontSize: "1.2em" }}
              >
                {formatActualWithColor(
                  pacData.pacPercent,
                  (getProjectedValueAsNumber("P.A.C.") /
                    (pacData.productNetSales || 1)) *
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
                {formatDifference(
                  pacData.pacDollars,
                  getProjectedValueAsNumber("P.A.C.")
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

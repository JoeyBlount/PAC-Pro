import React, { useContext, useEffect, useState } from "react";
import { Box, Container, Grid2 as Grid, Paper, Skeleton } from "@mui/material";
import { Bar, Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import './dashboard.css';
import { auth } from "../../config/firebase-config";
import { StoreContext } from "../../context/storeContext"; // Save for future

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend); 

const months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];

const Dashboard = () => {
  React.useEffect(() => {
    document.title = "PAC Pro - Home";
  }, []); // Used to change the title.

  const { selectedStore } = useContext(StoreContext);  // Save for future
  const user = auth.currentUser;

  if (user) {
    console.log("User is logged in: ", user.displayName);
  } else {
    console.log("Error no user logged in")
  }

  const [fetching, setFetching] = useState(false);

  const [jdata, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTotals, setLoadingTotals] = useState(true);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [loadingPAC, setLoadingPAC] = useState(true);

  const [totalSalesData, setTotalSalesData] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [pacData, setPACData] = useState(null);

  // Fetch .json file data.
  useEffect(() => {
    const fetchData = async () => { 
      try {
        const response = await fetch('/dashboardTestData.json');
        const jsonData = await response.json();
  
        setData(jsonData.store);
      } catch (error) { 
        console.error('Error loading json data for dashboard', error)
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Fetch from database
  const fetchFromDatabase = async () => {
    const yearMonth = `${todayDate.getFullYear()}${String(todayDate.getMonth()).padStart(2, "0")}`;

    // Convert store ID to proper format (e.g., "001" -> "store_001")
    const sID = selectedStore || "store_001";
    const formattedStoreId = sID.startsWith("store_")
      ? sID
      : `store_${sID.padStart(3, "0")}`;

    try {
      const response = await fetch(
        `http://localhost:5140/api/pac/info/sales/${formattedStoreId}/${yearMonth}`
      );
      if (response.ok) {
        const jsonData = await response.json();
        setTotalSalesData(jsonData.totalsales);
      }
    } catch (error) {
      console.warn(`Error fetching totalSales: ${error.message}`);
    } finally {
      setLoadingTotals(false);
    }

    try {
      const response = await fetch(
        `http://localhost:5140/api/pac/info/budget/${formattedStoreId}/${yearMonth}`
      );
      if (response.ok) {
        const jsonData = await response.json();
        setBudgetData(jsonData.budgetspending);
      }
    } catch (error) {
      console.warn(`Error fetching totalSales: ${error.message}`);
    } finally {
      setLoadingBudget(false);
    }

    try {
      const response = await fetch(
        `http://localhost:5140/api/pac/info/pac/${formattedStoreId}/${yearMonth}`
      );
      if (response.ok) {
        const jsonData = await response.json();
        setPACData(jsonData.pacprojections);
      }
    } catch (error) {
      console.warn(`Error fetching totalSales: ${error.message}`);
    } finally {
      setLoadingPAC(false);
    }

    setFetching(false);
  };

  useEffect(() => {
    if (fetching || !selectedStore) return;
    
    fetchFromDatabase();
    setFetching(true);

    const timer = setTimeout(() => {
      setFetching(false);
    }, 1000);

    return () => clearTimeout(timer);    
  }, [selectedStore]);

  var startMonth, startYear, fData;

  const todayDate = new Date();
  startMonth = todayDate.getMonth() + 1;
  startYear = todayDate.getFullYear() - 1;
 
  var monthlySalesData, monthlySalesLabels;
  monthlySalesData = [];
  monthlySalesLabels = [];
  for (let i = 0; i < 12; i ++) {
    if (!loadingTotals) {
      let point = (startYear * 100) + (startMonth); // YYYY * 100 = YYYY00 + month = YYYYMM <- Key
      fData = totalSalesData.find(item => item.key === (point.toString()));
      monthlySalesData[i] = (fData == null) ? (null) : fData.netsales;
    } else {
      monthlySalesData[i] = 1;
    }

    const includeYear = (startMonth == 12 || startMonth == 1) ? "yes" : "no";
    monthlySalesLabels[i] =  months[startMonth - 1] + ((includeYear == "yes") ? " '" + (startYear).toString().substring(2) : "");
    startMonth += 1;
    if (startMonth > 12)
    {
      startMonth = 1;
      startYear += 1;
    }
  }

  const MonthlySalesChart = () => {
    const data = {
      labels: monthlySalesLabels,
      datasets: [
        {
          label: 'Total Sales',
          data: monthlySalesData,
          borderColor: 'rgba(233, 40, 40, 0.9)',
          backgroundColor: 'rgba(233, 40, 40, 0.8)',
        }
      ],
    };
  
    const option = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: function(value) {
              return '$' + value;
            }
          }
        }
      },
      plugins: {
        legend: { 
          position: 'top',
          onClick: null, 
        },
        title: { 
          display: true, 
          text: 'Monthly Sales For The Past Year' 
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ": $" + (context.raw).toLocaleString();
            }
          }
        },
      }
    };
  
    return <Line data = {data} options = {option} />;
  };

  // Reset for second chart
  startMonth = (todayDate.getMonth() + 1) - 1; 
  startYear = todayDate.getFullYear();

  if (startMonth === 0) {
    startMonth = 12;
    startYear -= 1;
  }

  var budgetDataS, budgetDataB, budgetTitle;
  budgetTitle = months[startMonth - 1] + ' ' + startYear + ' Budget and Spending';
  if (!loadingBudget) {
    let point = (startYear * 100) + (startMonth);
    fData = budgetData.find(item => item.key === point.toString());
    if (fData != null)
    {
      budgetDataS = [fData.foodpaperspending, fData.laborspending, fData.purchasespending];
      budgetDataB = [fData.foodpaperbudget, fData.laborbudget, fData.purchasebudget];
    } else {
      budgetDataS = [null, null, null];
      budgetDataB = [null, null, null];
    }
  } else {
    budgetDataS = [1, 1, 1];
    budgetDataB = [1, 1, 1];
  }

  const BudgetChart = () => {
    const data = {
      labels: ['Food & Paper', 'Labor', 'Purchases'],
      datasets: [
        {
          label: 'Budget',
          data: budgetDataB,
          borderColor: 'rgba(40, 59, 233, 0.9)',
          backgroundColor: 'rgba(40, 59, 233, 0.8)',
        },
        {
          label: 'Spent',
          data: budgetDataS,
          borderColor: 'rgba(233, 40, 40, 0.9)',
          backgroundColor: 'rgba(233, 40, 40, 0.8)',
        }
      ],
    };
  
    const option = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: function(value) {
              return '$' + value;
            }
          }
        }
      },
      plugins: {
        legend: { 
          position: 'top',
          onClick: null, 
        },
        title: { 
          display: true, 
          text: budgetTitle 
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ": $" + (context.raw).toLocaleString();
            }
          }
        },
      }
    };
  
    return <Bar data = {data} options = {option} />;
  };

  //Reset for third chart
  startMonth = todayDate.getMonth() - 2;
  startYear = todayDate.getFullYear();

  if (startMonth < 0) {
    let r = -(startMonth);
    startMonth = 12 - r;
    startYear -= 1;
  }
  
  var pacDataValues, projDataValues, pacVSProjlabels;
  pacDataValues = [];
  projDataValues = [];
  pacVSProjlabels = [];
  for (let i = 0; i < 3; i++) {
    if (!loadingPAC) {
      let point = (startYear * 100) + (startMonth);
      fData = pacData.find(item => item.key === point.toString());
      pacDataValues[i] = (fData == null) ? (null) : fData.pac;
      projDataValues[i] = (fData == null) ? (null) : fData.projections;
    } else {
      pacDataValues[i] = 1;
      projDataValues[i] = 1;
    }

    pacVSProjlabels[i] = months[startMonth - 1] + " " + (startYear).toString();
    
    startMonth += 1;
    if (startMonth > 12)
    {
      startMonth = 1;
      startYear += 1;
    }
  }
  
  const PacVSProjectedChart = () => {
    const data = {
      labels: pacVSProjlabels,
      datasets: [
        {
          label: 'Projected',
          data: projDataValues,
          borderColor: 'rgba(40, 59, 233, 0.9)',
          backgroundColor: 'rgba(40, 59, 233, 0.8)',
        },
        {
          label: 'P.A.C.',
          data: pacDataValues,
          borderColor: 'rgba(233, 40, 40, 0.9)',
          backgroundColor: 'rgba(233, 40, 40, 0.8)',
        }
      ],
    };
  
    const option = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: function(value) {
              return '$' + value;
            }
          }
        }
      },
      plugins: {
        legend: { 
          position: 'top',
          onClick: null,
        },
        title: { 
          display: true, 
          text: 'P.A.C v.s. Projections' 
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ": $" + (context.raw).toLocaleString();
            }
          }
        },
      }
    };
  
    return <Bar data = {data} options = {option} />;
  };
  
  return (
    <Box sx={{flexGrow: 1}}>
      <Container sx={{ gridArea: 'header', textAlign: "center" }}>
        <h1 className="Header">Welcome back</h1>
      </Container>
      <Grid container spacing={3} columns={{ xs: 6, sm: 12, md: 12}} sx={{ padding: 2, height: '75vh'}}>
        <Grid size = {6}>
          <Paper sx={{ padding: 2, minHeight: '35vh' }}>
            { /* Placeholder */ }
            {loadingTotals
              ? (<Skeleton variant="rectangular" animation="wave" height={'inherit'} />) 
              : (<p />)}
          </Paper>
        </Grid>
        <Grid size = {6}>
          <Paper sx={{ padding: 2, minHeight: '35vh' }}>
            {loadingTotals 
              ? (<Skeleton variant="rectangular" animation="wave" height={'inherit'} />) 
              : (<MonthlySalesChart />)}
          </Paper>
        </Grid>
        <Grid size = {6}>
          <Paper sx={{ padding: 2, minHeight: '35vh' }}>
            {loading 
              ? (<Skeleton variant="rectangular" animation="wave" height={'inherit'} />) 
              : (<BudgetChart />)}
          </Paper>
        </Grid>
        <Grid size = {6}>
          <Paper sx={{ padding: 2, minHeight: '35vh' }}>
            {loading 
              ? (<Skeleton variant="rectangular" animation="wave" height={'inherit'} />) 
              : (<PacVSProjectedChart />)}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
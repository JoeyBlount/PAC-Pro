import React, { useEffect, useState } from "react";
import { Box, Container, Grid2 as Grid, Paper, Skeleton } from "@mui/material";
import { Bar, Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import './dashboard.css';
import { auth } from "../../config/firebase-config";
import Notepad from "./notepad";
//import { StoreContext } from "../../context/storeContext"; // Save for future

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend); 

const months = [ 'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May.', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.' ];

const Dashboard = () => {
  React.useEffect(() => {
    document.title = "PAC Pro - Home";
  }, []); // Used to change the title.

  //const { selectedStore } = useContext(StoreContext);  // Save for future
  const user = auth.currentUser;

  if (user) {
    console.log("User is logged in: ", user.displayName);
  } else {
    console.log("Error no user logged in")
  }

  const [jdata, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch .json file data. In the future, this would be replaced with fetching from database
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

  var startMonth, startYear, fData;

  const todayDate = new Date();
  startMonth = todayDate.getMonth() + 1;
  startYear = todayDate.getFullYear() - 1;
 
  var monthlySalesData, monthlySalesLabels;
  monthlySalesData = [];
  monthlySalesLabels = [];
  for (let i = 0; i < 12; i ++) {
    if (!loading) {
      let point = (startYear * 100) + (startMonth);
      fData = jdata.find(item => item.date === (point));
      monthlySalesData[i] = (fData == null) ? (null) : fData.totalSales;
    } else {
      monthlySalesData[i] = 1;
    }

    monthlySalesLabels[i] = months[startMonth - 1] + " " + (startYear).toString().substring(2);
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
  if (!loading) {
    let point = (startYear * 100) + (startMonth);
    fData = jdata.find(item => item.date === point);
    if (fData != null)
    {
      budgetDataS = [fData.foodAndPaperCosts, fData.laborCosts, fData.purchaseCosts];
      budgetDataB = [fData.foodAndPaperBudget, fData.laborBudget, fData.purchaseBudget];
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
          label: 'Spent',
          data: budgetDataS,
          borderColor: 'rgba(233, 40, 40, 0.9)',
          backgroundColor: 'rgba(233, 40, 40, 0.8)',
        },
        {
          label: 'Budget',
          data: budgetDataB,
          borderColor: 'rgba(40, 59, 233, 0.9)',
          backgroundColor: 'rgba(40, 59, 233, 0.8)',
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
  
  var pacData, projData, pacVSProjlabels;
  pacData = [];
  projData = [];
  pacVSProjlabels = [];
  for (let i = 0; i < 3; i++) {
    if (!loading) {
      let point = (startYear * 100) + (startMonth);
      fData = jdata.find(item => item.date === (point));
      pacData[i] = (fData == null) ? (null) : fData.pac;
      projData[i] = (fData == null) ? (null) : fData.projections;
    } else {
      pacData[i] = 1;
      projData[i] = 1;
    }

    pacVSProjlabels[i] = months[startMonth - 1] + " " + (startYear).toString().substring(2);
    
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
          label: 'P.A.C.',
          data: pacData,
          borderColor: 'rgba(233, 40, 40, 0.9)',
          backgroundColor: 'rgba(233, 40, 40, 0.8)',
        },
        {
          label: 'Projected',
          data: projData,
          borderColor: 'rgba(40, 59, 233, 0.9)',
          backgroundColor: 'rgba(40, 59, 233, 0.8)',
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
            {loading 
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
        <Grid size = {6}>
          <Paper sx={{ padding: 2, minHeight: '35vh' }}>
            <Notepad />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
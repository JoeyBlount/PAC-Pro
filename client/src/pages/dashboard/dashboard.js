import React, { useContext, useEffect, useState } from "react";
import { Box, Grid2 as Grid, Paper, Skeleton, Typography, IconButton, Stack, List, ListItem, ListItemText, Chip, Button } from "@mui/material";
import { ArrowBackIosNew, ArrowForwardIos } from '@mui/icons-material'; 
import { Bar, Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import EventIcon from '@mui/icons-material/Event';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';
import { auth } from "../../config/firebase-config";
import { StoreContext } from "../../context/storeContext"; // Save for future
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "@mui/material/styles";
import { apiUrl } from "../../utils/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend); 

const months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
const todayDate = new Date();

const formatStoreID = (selectedStore) => {
  const sID = selectedStore || "store_001";
  const formattedStoreId = sID.startsWith("store_")
    ? sID
    : `store_${sID.padStart(3, "0")}`;
  return formattedStoreId;
}

const AnnouncementBox = () => {
  const [scrollIndex, setScrollIndex] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [fetching, setFetching] = useState(false);
  const { userRole } = useAuth();
  const theme = useTheme();

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const res = await fetch(apiUrl(`/api/pac/announcements?role=${userRole}`), {
        credentials: 'include',
      });
      const data = await res.json();
      setAnnouncements(data);
      setScrollIndex(0);
    } catch (err) {
      console.error("Error fetching announcements:", err);
    } finally {
      setLoadingAnnouncements(false);
    }
    setFetching(false);
  };

  useEffect(() => {
    if (fetching) return;

    fetchAnnouncements();
    setFetching(true);

    const timer = setTimeout(() => {
      setFetching(false);
    }, 1000);

    return () => clearTimeout(timer);
    
    // The line below removes the warning about not putting fetching as a dependency. Don't put fetching into the dependency. 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextA = () => {
    setScrollIndex(prev => (prev + 1) % announcements.length);
  };

  const prevA = () => {
    setScrollIndex(prev => (prev - 1 + announcements.length) % announcements.length);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        minHeight: 100,
        height: "auto",
        overflow: "hidden",
        position: "relative",
        padding: 1,
        backgroundColor: theme.palette.background.paper, // 👈 dark/light friendly
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`,
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
    <Typography
      variant="subtitle1"
      sx={{
        position: 'absolute',
        top: 4,
        left: '50%',
        transform: 'translateX(-50%)',
        fontWeight: 'bold',
        color: 'text.primary',
      }}
    >
      Announcements
    </Typography>
    
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
      <IconButton onClick={prevA}>
        <ArrowBackIosNew fontSize="small" />
      </IconButton>

      <Box
        sx={{
          flexGrow: 1,
          height: 60,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box>
          {loadingAnnouncements
            ? "Loading announcements..."
            : announcements.length > 0 ? (
            <Box>
              <Typography>

              </Typography>
              <Typography variant="h6" gutterBottom>
                {announcements[scrollIndex].title}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {announcements[scrollIndex].message}
              </Typography>
            </Box>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", py: 4 }}
            >
              No announcements.
            </Typography>
          )
          }
        </Box>
      </Box>

      <IconButton onClick={nextA}>
        <ArrowForwardIos fontSize="small" />
      </IconButton>
    </Stack>

    {announcements.length > 0 && (
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 4,
          left: '50%',
          color: 'text.secondary',
        }}
      >
        {scrollIndex + 1} / {announcements.length}
      </Typography>
    )}
  </Paper>
  );
};

const MonthlySalesChart = ({selectedStore}) => {
  const [fetching, setFetching] = useState(false);
  const [loadingTotals, setLoadingTotals] = useState(true);
  const [totalSalesData, setTotalSalesData] = useState(null);

  const fetchTotalSales = async () => {
    setLoadingTotals(true);
    const yearMonth = `${todayDate.getFullYear()}${String(todayDate.getMonth()).padStart(2, "0")}`;
    try {
      const response = await fetch(
        apiUrl(`/api/pac/info/sales/${formatStoreID(selectedStore)}/${yearMonth}`),
        {
          credentials: 'include',
        }
      );
      if (response.ok) {
        const jsonData = await response.json();
        setTotalSalesData(jsonData.totalsales);
      }
    } catch (error) {
      console.warn(`Error fetching Monthly sales chart data: ${error.message}`);
    } finally {
      setLoadingTotals(false);
    }

    setFetching(false);
  };

  useEffect(() => {
    if (fetching || !selectedStore) return;

    fetchTotalSales();
    setFetching(true);

  const timer = setTimeout(() => {
      setFetching(false);
    }, 1000);

    return () => clearTimeout(timer); 

    // The line below removes the warning about not putting fetching as a dependency. Don't put fetching into the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [selectedStore]);

  var startMonth, startYear, fData;

  startMonth = todayDate.getMonth() + 1;
  startYear = todayDate.getFullYear() - 1;
 
  var monthlySalesData, monthlySalesLabels;
  monthlySalesData = [];
  monthlySalesLabels = [];
  for (let i = 0; i < 12; i ++) {
    if (!loadingTotals && totalSalesData != null) {
      let point = (startYear * 100) + (startMonth); // YYYY * 100 = YYYY00 + month = YYYYMM <- Key
      fData = totalSalesData.find(item => item.key === (point.toString()));
      monthlySalesData[i] = (fData == null) ? (null) : fData.netsales;
    } else {
      monthlySalesData[i] = 1;
    }

    const includeYear = (startMonth === 12 || startMonth === 1) ? "yes" : "no";
    monthlySalesLabels[i] =  months[startMonth - 1] + ((includeYear === "yes") ? " '" + (startYear).toString().substring(2) : "");
    startMonth += 1;
    if (startMonth > 12)
    {
      startMonth = 1;
      startYear += 1;
    }
  }

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

  return (loadingTotals
    ? (<Skeleton variant="rectangular" animation="wave" height={'35vh'} />)
    : (totalSalesData != null) 
      ? <Line data = {data} options = {option} />
      : <p>ERROR: Unable to load data for chart.</p>
  );
}

const BudgetChart = ({selectedStore}) => {
  const [fetching, setFetching] = useState(false);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [budgetData, setBudgetData] = useState(null);

  const fetchBudget = async () => {
    setLoadingBudget(true);
    const yearMonth = `${todayDate.getFullYear()}${String(todayDate.getMonth()).padStart(2, "0")}`;
    try {
      const response = await fetch(
        apiUrl(`/api/pac/info/budget/${formatStoreID(selectedStore)}/${yearMonth}`),
        {
          credentials: 'include',
        }
      );
      if (response.ok) {
        const jsonData = await response.json();
        setBudgetData(jsonData.budgetspending);
      }
    } catch (error) {
      console.warn(`Error fetching budget chart data: ${error.message}`);
    } finally {
      setLoadingBudget(false);
    }

    setFetching(false);
  };

  useEffect(() => {
    if (fetching || !selectedStore) return;

    fetchBudget();
    setFetching(true);

  const timer = setTimeout(() => {
      setFetching(false);
    }, 1000);

    return () => clearTimeout(timer);  

    // The line below removes the warning about not putting fetching as a dependency. Don't put fetching into the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  var startMonth, startYear, fData;

  startMonth = (todayDate.getMonth() + 1) - 1; 
  startYear = todayDate.getFullYear();

  if (startMonth === 0) {
    startMonth = 12;
    startYear -= 1;
  }

  var budgetDataS, budgetDataB, budgetTitle;
  budgetTitle = months[startMonth - 1] + ' ' + startYear + ' Budget and Spending';
  if (!loadingBudget && budgetData != null) {
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

  return (loadingBudget
    ? (<Skeleton variant="rectangular" animation="wave" height={'35vh'} />)
    : (budgetData != null) 
      ? <Bar data = {data} options = {option} />
      : <p>ERROR: Unable to load data for chart.</p>
  );
}

const PacVSProjectedChart = ({selectedStore}) => {
  const [fetching, setFetching] = useState(false);
  const [loadingPAC, setLoadingPAC] = useState(true);
  const [pacData, setPACData] = useState(null);

  const fetchBudget = async () => {
    setLoadingPAC(true);
    const yearMonth = `${todayDate.getFullYear()}${String(todayDate.getMonth()).padStart(2, "0")}`;
    try {
      const response = await fetch(
        apiUrl(`/api/pac/info/pac/${formatStoreID(selectedStore)}/${yearMonth}`),
        {
          credentials: 'include',
        }
      );
      if (response.ok) {
        const jsonData = await response.json();
        setPACData(jsonData.pacprojections);
      }
    } catch (error) {
      console.warn(`Error fetching Pac chart data: ${error.message}`);
    } finally {
      setLoadingPAC(false);
    }

    setFetching(false);
  };

  useEffect(() => {
    if (fetching || !selectedStore) return;

    fetchBudget();
    setFetching(true);

  const timer = setTimeout(() => {
      setFetching(false);
    }, 1000);

    return () => clearTimeout(timer);  

    // The line below removes the warning about not putting fetching as a dependency. Don't put fetching into the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  var startMonth, startYear, fData;

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
    if (!loadingPAC && pacData != null) {
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

  return (loadingPAC
    ? (<Skeleton variant="rectangular" animation="wave" height={'35vh'} />)
    : (pacData != null) 
      ? <Bar data = {data} options = {option} />
      : <p>ERROR: Unable to load data for chart.</p>
  );
}

// DeadlinesWidget Helper Function
const getDaysUntil = (dateString) => {
  if (!dateString) return null;
  const deadline = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  const diffTime = deadline - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// DeadlinesWidget Helper Function
const getDeadlineStatus = (dateString) => {
  const days = getDaysUntil(dateString);
  if (days === null) return { label: 'Unknown', color: 'default' };
  if (days < 0) return { label: 'Overdue', color: 'error' };
  if (days === 0) return { label: 'Today', color: 'error' };
  if (days <= 3) return { label: `${days} days`, color: 'warning' };
  if (days <= 7) return { label: `${days} days`, color: 'info' };
  return { label: `${days} days`, color: 'success' };
};

// DeadlinesWidget Helper Function
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
};

const DeadlinesWidget = () => {
  const [deadlines, setDeadlines] = useState([]);
  const [loadingDeadlines, setLoadingDeadlines] = useState(true);
  const { currentUser } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDeadlines = async () => {
      try {
        let headers = {
          'Content-Type': 'application/json',
        };

        // Handle authentication for both Firebase and Microsoft users
        if (currentUser && currentUser.authMethod === 'microsoft') {
          // For Microsoft users, use credentials with session cookies
          headers['X-Auth-Method'] = 'microsoft';
        } else if (currentUser && auth.currentUser) {
          // For Firebase users, use ID token
          const token = await auth.currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(apiUrl('/api/pac/deadlines/upcoming?days_ahead=30&limit=5'), {
          headers: headers,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setDeadlines(data);
      } catch (error) {
        console.error('Error fetching deadlines:', error);
      } finally {
        setLoadingDeadlines(false);
      }
    };

    fetchDeadlines();
  }, [currentUser]);

  if (loadingDeadlines) {
    return <Skeleton variant="rectangular" animation="wave" height={'100%'} />;
  }

  if (deadlines.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        py: 4
      }}>
        <EventIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Upcoming Deadlines
        </Typography>
        <Typography variant="body2" color="text.secondary">
          All deadlines are complete or none are set
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Upcoming Deadlines
        </Typography>
        <Button 
          size="small" 
          onClick={() => navigate('/navi/settings/deadline-management')}
        >
          View All
        </Button>
      </Box>
      <List sx={{ pt: 0 }}>
        {deadlines.map((deadline) => {
          const status = getDeadlineStatus(deadline.dueDate);
          return (
            <ListItem 
              key={deadline.id}
              sx={{ 
                px: 0,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' }
              }}
            >
              <ListItemText
                primaryTypographyProps={{ component: 'div' }}
                secondaryTypographyProps={{ component: 'div' }}
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" component="span" fontWeight={500}>
                      {deadline.title}
                    </Typography>
                    <Chip
                      label={deadline.type?.toUpperCase()}
                      size="small"
                      color={
                        deadline.type === 'pac' ? 'primary' :
                        deadline.type === 'invoice' ? 'success' :
                        'warning'
                      }
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="body2" component="span" color="text.secondary">
                      {formatDate(deadline.dueDate)}
                    </Typography>
                    <Chip
                      label={status.label}
                      size="small"
                      color={status.color}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

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

  // Future note to devs: Don't put anything that needs to fetch from the database via fastAPI in here.
  // Build it outside the Dashboard const otherwise you'll have fastAPI backend spam every time something renders.

  return (
    <Box sx={{flexGrow: 1}}>
      <Grid container spacing={3} columns={{ xs: 6, sm: 12, md: 12}} sx={{ padding: 2, height: '75vh'}}>
        <Grid size = {12}>
          <AnnouncementBox />
        </Grid>
        <Grid size = {6}>
          <Paper sx={{ padding: 2, minHeight: '35vh' }}>
            <DeadlinesWidget />
          </Paper>
        </Grid>
        <Grid size = {6}>
          <Paper sx={{ padding: 2, minHeight: '35vh' }}>
            <MonthlySalesChart selectedStore={selectedStore} />
          </Paper>
        </Grid>
        <Grid size = {6}>
          <Paper sx={{ padding: 2, minHeight: '35vh' }}>
            <BudgetChart selectedStore={selectedStore} />
          </Paper>
        </Grid>
        <Grid size = {6}>
          <Paper sx={{ padding: 2, minHeight: '35vh' }}>
            <PacVSProjectedChart selectedStore={selectedStore} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
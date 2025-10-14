import React, { useState, useContext } from "react";
import { 
  Container, 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import PrintIcon from '@mui/icons-material/Print';
import DescriptionIcon from '@mui/icons-material/Description';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { StoreContext } from "../../context/storeContext";
import './reports.css';

const Reports = () => {
  const navigate = useNavigate();
  const { selectedStore } = useContext(StoreContext);
  
  // State for dialogs
  const [pacDialogOpen, setPacDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  
  // State for month/year selection
  const currentDate = new Date();
  const months = ["January", "February", "March", "April", "May", "June", 
                  "July", "August", "September", "October", "November", "December"];
  const currentYear = currentDate.getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - i);
  
  const [pacMonth, setPacMonth] = useState(months[currentDate.getMonth()]);
  const [pacYear, setPacYear] = useState(currentYear);
  
  const [invoiceMonth, setInvoiceMonth] = useState(String(currentDate.getMonth() + 1));
  const [invoiceYear, setInvoiceYear] = useState(String(currentYear));

  React.useEffect(() => {
    document.title = "PAC Pro - Reports";
  }, []);

  const handlePacPrint = () => {
    // Navigate to PAC page with the Actual tab selected
    navigate('/navi/pac', { 
      state: { 
        openActualTab: true, 
        month: pacMonth, 
        year: pacYear 
      } 
    });
  };

  const handleInvoiceLogPrint = () => {
    // Navigate to Invoice Logs page
    navigate('/navi/invoiceLogs', { 
      state: { 
        openPrintDialog: true,
        month: invoiceMonth,
        year: invoiceYear
      } 
    });
  };

  const reports = [
    {
      id: 'pac-actual',
      title: 'PAC Actual Report',
      description: 'View and print the Profit After Controllables (PAC) actual report with detailed expense breakdowns.',
      icon: <DescriptionIcon sx={{ fontSize: 60, color: '#1976d2' }} />,
      color: '#e3f2fd',
      action: () => setPacDialogOpen(true)
    },
    {
      id: 'invoice-log',
      title: 'Invoice Log Report',
      description: 'View and print the complete invoice log with all submitted invoices and totals.',
      icon: <ReceiptIcon sx={{ fontSize: 60, color: '#388e3c' }} />,
      color: '#e8f5e9',
      action: () => setInvoiceDialogOpen(true)
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ marginTop: 4 }}>
      <Paper elevation={3} sx={{ padding: 3, marginBottom: 4 }}>
        <Box sx={{ textAlign: "center", marginBottom: 3 }}>
          <h1 className="Header">Reports</h1>
          <Typography variant="subtitle1" color="text.secondary" sx={{ marginTop: 1 }}>
            Select a report to view and print
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ marginTop: 2 }}>
          {reports.map((report) => (
            <Grid item xs={12} md={6} key={report.id}>
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, backgroundColor: report.color, textAlign: 'center' }}>
                  <Box sx={{ marginBottom: 2 }}>
                    {report.icon}
                  </Box>
                  <Typography variant="h5" component="div" gutterBottom sx={{ fontWeight: 600 }}>
                    {report.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 3, minHeight: 60 }}>
                    {report.description}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<PrintIcon />}
                    onClick={report.action}
                    fullWidth
                    size="large"
                    sx={{ marginTop: 'auto' }}
                  >
                    Print Report
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* PAC Actual Report Dialog */}
      <Dialog 
        open={pacDialogOpen} 
        onClose={() => setPacDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            PAC Actual Report
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ marginTop: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 3 }}>
              Select the month and year for the PAC Actual Report you want to view and print.
            </Typography>
            
            <FormControl fullWidth sx={{ marginBottom: 2 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={pacMonth}
                label="Month"
                onChange={(e) => setPacMonth(e.target.value)}
              >
                {months.map((month) => (
                  <MenuItem key={month} value={month}>
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ marginBottom: 2 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={pacYear}
                label="Year"
                onChange={(e) => setPacYear(e.target.value)}
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {!selectedStore && (
              <Typography variant="body2" color="error" sx={{ marginTop: 2 }}>
                Please select a store before printing the report.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: 2 }}>
          <Button onClick={() => setPacDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handlePacPrint}
            startIcon={<PrintIcon />}
            disabled={!selectedStore}
          >
            View & Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Log Report Dialog */}
      <Dialog 
        open={invoiceDialogOpen} 
        onClose={() => setInvoiceDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Invoice Log Report
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ marginTop: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 3 }}>
              Select the month and year for the Invoice Log you want to view and print.
            </Typography>
            
            <FormControl fullWidth sx={{ marginBottom: 2 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={invoiceMonth}
                label="Month"
                onChange={(e) => setInvoiceMonth(e.target.value)}
              >
                <MenuItem value="">All Months</MenuItem>
                <MenuItem value="1">January</MenuItem>
                <MenuItem value="2">February</MenuItem>
                <MenuItem value="3">March</MenuItem>
                <MenuItem value="4">April</MenuItem>
                <MenuItem value="5">May</MenuItem>
                <MenuItem value="6">June</MenuItem>
                <MenuItem value="7">July</MenuItem>
                <MenuItem value="8">August</MenuItem>
                <MenuItem value="9">September</MenuItem>
                <MenuItem value="10">October</MenuItem>
                <MenuItem value="11">November</MenuItem>
                <MenuItem value="12">December</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ marginBottom: 2 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={invoiceYear}
                label="Year"
                onChange={(e) => setInvoiceYear(e.target.value)}
              >
                <MenuItem value="">All Years</MenuItem>
                <MenuItem value="2023">2023</MenuItem>
                <MenuItem value="2024">2024</MenuItem>
                <MenuItem value="2025">2025</MenuItem>
              </Select>
            </FormControl>

            {!selectedStore && (
              <Typography variant="body2" color="error" sx={{ marginTop: 2 }}>
                Please select a store before printing the report.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: 2 }}>
          <Button onClick={() => setInvoiceDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleInvoiceLogPrint}
            startIcon={<PrintIcon />}
            disabled={!selectedStore}
          >
            View & Print
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Reports;
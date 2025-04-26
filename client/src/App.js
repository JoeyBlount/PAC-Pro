import React from 'react';
import { Outlet } from "react-router-dom";
import { NavBar } from './pages/navBar/navBar';

// import PrivateRoute from "./routes/PrivateRoute"; // ✅ Import PrivateRoute
// import InvoiceSheet from "./pages/invoiceLogs/InvoiceSheet";




// // Define the routing configuration
// const router = createBrowserRouter([
//   { path: '/', element: <Login /> }, // Root login page
//   { path: 'signupscreen', element: <SignUpScreen /> },
//   {
//     path: '/navi',
//     element: <PrivateRoute element={<NavBar />} />, // Protected NavBar with child routes
//     children: [
//       { path: 'dashboard', element: <Dashboard /> },
//       { path: 'invoiceLogs', element: <InvoiceLogs /> },
//       { path: 'submitInvoice', element: <SubmitInvoice /> },
//       { path: 'reports', element: <Reports /> },
//       { path: 'settings', element: <Settings /> },
//       { path: 'pac', element: <PAC /> },
//       { path: 'account', element: <Account /> },
//       { path: 'invoiceSheet', element: <InvoiceSheet /> },

//       { path: '*', element: <h1>404 - Page Not Found</h1> } // Catch-all for invalid child routes
//     ]
//   },
//   { path: '*', element: <h1>404 - Page Not Found</h1> } // Catch-all for invalid routes
// ]);

import { Box } from '@mui/material';


function App() {
  return (
    <div>
      <NavBar />
      <Box sx={{top: '40px', marginLeft: '80px'}}>
        <Outlet />
      </Box>
    </div>
  );
}

export default App;

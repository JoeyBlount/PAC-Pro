import React from 'react';
import { Outlet } from "react-router-dom";
import { NavBar } from './pages/navBar/navBar';
<<<<<<< HEAD
import PrivateRoute from "./routes/PrivateRoute"; // ✅ Import PrivateRoute
import UserManagement from "./pages/settings/UserManagement";
import StoreManagement from "./pages/settings/StoreManagement";
import Notifications from "./pages/settings/Notifications";
import InvoiceSettings from "./pages/settings/InvoiceSettings";
import Invite from "./pages/invite/invite"
import NotAllowed from './pages/notAllowed/notAllowed';

// Define the routing configuration
const router = createBrowserRouter([
  { path: '/', element: <Login /> }, // Root login page
  { path: 'invite', element: <Invite /> },
  { path: 'not-allowed', element: <NotAllowed /> },
  {
    path: '/navi',
    element: <PrivateRoute element={<NavBar />} />, // Protected NavBar with child routes
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'invoiceLogs', element: <InvoiceLogs /> },
      { path: 'submitInvoice', element: <SubmitInvoice /> },
      { path: 'reports', element: <Reports /> },
      { path: 'settings', element: <Settings /> }, // Main Settings Page
      { path: 'pac', element: <PAC /> },
      { path: 'account', element: <Account /> },

      // ✅ Add individual settings pages as sub-routes
      {
        path: 'settings/user-management',
        element: <UserManagement />,
      },
      {
        path: 'settings/store-management',
        element: <StoreManagement />,
      },
      {
        path: 'settings/notifications',
        element: <Notifications />,
      },
      {
        path: 'settings/invoice-settings',
        element: <InvoiceSettings />,
      },

      { path: '*', element: <h1>404 - Page Not Found</h1> } // Catch-all for invalid child routes
    ]
  },
  { path: '*', element: <h1>404 - Page Not Found</h1> } // Catch-all for invalid routes
]);
=======
import { Box } from '@mui/material';
>>>>>>> 8ff8decee1336c10390d82fb7e45cd28b3461d9a

function App() {
  return (
    <div>
      <NavBar />
      <Box sx={{top: '40px', marginLeft: '40px'}}>
        <Outlet />
      </Box>
    </div>
  );
}

export default App;

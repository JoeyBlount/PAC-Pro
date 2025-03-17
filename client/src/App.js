import React, { useEffect, useState } from 'react';
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import Login from "./pages/login/login";
import Dashboard from "./pages/dashboard/dashboard"; 
import InvoiceLogs from "./pages/invoiceLogs/invoiceLogs"; 
import SubmitInvoice from "./pages/submitInvoice/submitInvoice"; 
import Reports from "./pages/reports/reports"; 
import Settings from "./pages/settings/settings"; 
import PAC from "./pages/pac/pac"; 
import SignUpScreen from "./pages/login/signupscreen";
import { NavBar } from './pages/navBar/navBar';
import PrivateRoute from "./routes/PrivateRoute"; // ✅ Import PrivateRoute





// Define the routing configuration
const router = createBrowserRouter([
  { path: '/', element: <Login /> }, // Root login page
  { path: 'signupscreen', element: <SignUpScreen /> },
  {
    path: '/navi',
    element: <PrivateRoute element={<NavBar />} />, // Protected NavBar with child routes
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'invoiceLogs', element: <InvoiceLogs /> },
      { path: 'submitInvoice', element: <SubmitInvoice /> },
      { path: 'reports', element: <Reports /> },
      { path: 'settings', element: <Settings /> },
      { path: 'pac', element: <PAC /> },

      { path: '*', element: <h1>404 - Page Not Found</h1> } // Catch-all for invalid child routes
    ]
  },
  { path: '*', element: <h1>404 - Page Not Found</h1> } // Catch-all for invalid routes
]);


function App() {
  return (
    <div>
      <RouterProvider router={router} />
    </div>
  );
}

export default App;

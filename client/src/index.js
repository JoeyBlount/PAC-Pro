import React from 'react';
import ReactDOM from "react-dom/client";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
// Imports for react-router-dom v6 data routers (createBrowserRouter)
import { createBrowserRouter, RouterProvider } from "react-router-dom";
// Imports for react-router-dom standard component routing (BrowserRouter, Routes, etc.)
// NOTE: You typically use one style or the other, not both. See note below.
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import PrivateRoute from "./routes/PrivateRoute"; // Assuming this is used with the Router/Routes structure
import ProtectedRoute from './routes/ProtectedRoute';
import Login from "./pages/login/login";
import SignUpScreen from "./pages/login/signupscreen";
import NotAllowed from "./pages/login/NotAllowed";
import App from "./App"; // Often used with Router/Routes structure
import Dashboard from "./pages/dashboard/dashboard";
import InvoiceLogs from "./pages/invoiceLogs/invoiceLogs";
import SubmitInvoice from "./pages/submitInvoice/submitInvoice";
import Reports from "./pages/reports/reports";
import Settings from "./pages/settings/settings";
import PAC from "./pages/pac/pac";
import Account from "./pages/account/account";
import UserManagement from "./pages/settings/UserManagement";
import StoreManagement from "./pages/settings/StoreManagement";
import Notifications from "./pages/settings/Notifications";
import InvoiceSettings from "./pages/settings/InvoiceSettings";
import DeadlineManagement from "./pages/settings/DeadlineManagement";
// import InviteUser from './pages/InviteUser'; // Kept unique import
// import NavigationLayout from './components/NavigationLayout'; // Kept unique import
// import NotAllowed from './pages/NotAllowed'; // Kept unique import

import { StoreProvider } from "./context/storeContext";
import { AuthProvider } from './context/AuthContext';
import { AdminRoute, AdminOrOmRoute, SettingsViewRoute, StoreManagementRoute, UserManagementRoute, ViewOnlyRoute, AllAuthenticatedUsersRoute } from './routes/ProtectedRoute';
import { ThemeContextProvider } from "./context/ThemeContext";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "signupscreen",
    element: <SignUpScreen />,
  },
  {
    path: "not-allowed",
    element: <NotAllowed />,
  },
  {
    path: "/navi",
    element: <PrivateRoute><App /></PrivateRoute>,
    children: [
      { path: "dashboard", element: <ViewOnlyRoute><Dashboard /></ViewOnlyRoute> },
      { path: "invoiceLogs", element: <ViewOnlyRoute><InvoiceLogs /></ViewOnlyRoute> },
      { path: "submitInvoice", element: <ViewOnlyRoute><SubmitInvoice /></ViewOnlyRoute> },
      { path: "reports", element: <ViewOnlyRoute><Reports /></ViewOnlyRoute> },
      { path: "settings", element: <SettingsViewRoute><Settings /></SettingsViewRoute> },
      { path: "pac", element: <ViewOnlyRoute><PAC /></ViewOnlyRoute> },
      { path: "account", element: <AllAuthenticatedUsersRoute><Account /></AllAuthenticatedUsersRoute> },

      // Settings sub-pages with role-based access
      { path: "settings/user-management", element: <UserManagementRoute><UserManagement /></UserManagementRoute> },
      { path: "settings/store-management", element: <StoreManagementRoute><StoreManagement /></StoreManagementRoute> },
      { path: "settings/deadline-management", element: <SettingsViewRoute><DeadlineManagement /></SettingsViewRoute> },
      { path: "settings/notifications", element: <SettingsViewRoute><Notifications /></SettingsViewRoute> },
      { path: "settings/invoice-settings", element: <AdminRoute><InvoiceSettings /></AdminRoute> },
    ],
  },
  {
    path: "*",
    element: <h1>404 - Page Not Found</h1>,
  },
]);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeContextProvider>
      <AuthProvider>
        <StoreProvider>
          <RouterProvider router={router} />
        </StoreProvider>
      </AuthProvider>
    </ThemeContextProvider>
  </React.StrictMode>
);

reportWebVitals();
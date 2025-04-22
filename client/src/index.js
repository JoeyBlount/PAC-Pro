import React from 'react';
import ReactDOM from "react-dom/client";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./authconfig";
// Imports for react-router-dom v6 data routers (createBrowserRouter)
import { createBrowserRouter, RouterProvider } from "react-router-dom";
// Imports for react-router-dom standard component routing (BrowserRouter, Routes, etc.)
// NOTE: You typically use one style or the other, not both. See note below.
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import PrivateRoute from "./routes/PrivateRoute"; // Assuming this is used with the Router/Routes structure
import ProtectedRoute from './routes/ProtectedRoute';
import Login from "./pages/login/login";
import SignUpScreen from "./pages/login/signupscreen";
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
// import InviteUser from './pages/InviteUser'; // Kept unique import
// import NavigationLayout from './components/NavigationLayout'; // Kept unique import
// import NotAllowed from './pages/NotAllowed'; // Kept unique import

import { StoreProvider } from "./context/storeContext";
import { AuthProvider } from './context/AuthContext';

const msalInstance = new PublicClientApplication(msalConfig);

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
    path: "/navi",
    element: <PrivateRoute element={<App />} />,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "invoiceLogs", element: <InvoiceLogs /> },
      { path: "submitInvoice", element: <SubmitInvoice /> },
      { path: "reports", element: <Reports /> },
      { path: "settings", element: <Settings /> },
      { path: "pac", element: <PAC /> },
      { path: "account", element: <Account /> },
      // 404 page for unmatched nested routes
      { path: "*", element: <h1>404 - Page Not Found</h1> },

      // Settings sub-pages
      { path: "settings/user-management", element: <UserManagement /> },
      { path: "settings/store-management", element: <StoreManagement /> },
      { path: "settings/notifications", element: <Notifications /> },
      { path: "settings/invoice-settings", element: <InvoiceSettings /> },
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
    <MsalProvider instance={msalInstance}>
      <AuthProvider>
        <StoreProvider>
          <RouterProvider router={router} />
        </StoreProvider>
      </AuthProvider>
    </MsalProvider>
  </React.StrictMode>
);

reportWebVitals();

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./authconfig";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import PrivateRoute from "./routes/PrivateRoute";
import Login from "./pages/login/login";
import SignUpScreen from "./pages/login/signupscreen";
import App from "./App";
import Dashboard from "./pages/dashboard/dashboard";
import InvoiceLogs from "./pages/invoiceLogs/invoiceLogs";
import SubmitInvoice from "./pages/submitInvoice/submitInvoice";
import InvoiceUploader from "./pages/submitInvoice/invoiceuploader";
import Reports from "./pages/reports/reports";
import Settings from "./pages/settings/settings";
import PAC from "./pages/pac/pac";
import Account from "./pages/account/account";
import UserManagement from "./pages/settings/UserManagement";
import StoreManagement from "./pages/settings/StoreManagement";
import Notifications from "./pages/settings/Notifications";
import InvoiceSettings from "./pages/settings/InvoiceSettings";
import { StoreProvider } from "./context/storeContext";

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
      { path: "InvoiceUploader", element: <InvoiceUploader /> },

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
      <StoreProvider>
        <RouterProvider router={router} />
      </StoreProvider>
    </MsalProvider>
  </React.StrictMode>
);

reportWebVitals();

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { PublicClientApplication } from "@azure/msal-browser"; 
import { MsalProvider } from "@azure/msal-react"; 
import { msalConfig } from "./authconfig";
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import PrivateRoute from './routes/PrivateRoute';
import Login from './pages/login/login';
import SignUpScreen from './pages/login/signupscreen';
import Dashboard from './pages/dashboard/dashboard';
import InvoiceLogs from './pages/invoiceLogs/invoiceLogs';
import SubmitInvoice from './pages/submitInvoice/submitInvoice';
import Reports from './pages/reports/reports';
import Settings from './pages/settings/settings';
import PAC from './pages/pac/pac';
import Account from './pages/account/account';
import UserManagement from "./pages/settings/UserManagement";
import StoreManagement from "./pages/settings/StoreManagement";
import Notifications from "./pages/settings/Notifications";
import InvoiceSettings from "./pages/settings/InvoiceSettings";

const msalInstance = new PublicClientApplication(msalConfig);

const router = createBrowserRouter([
  {
    path: '/', element: <Login />
  },
  {
    path: 'signupscreen', element: <SignUpScreen /> 
  },
  {
    path: '/navi', element: <PrivateRoute element={<App />} />,
    children: [
      // Main pages
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'invoiceLogs', element: <InvoiceLogs /> },
      { path: 'submitInvoice', element: <SubmitInvoice /> },
      { path: 'reports', element: <Reports /> },
      { path: 'settings', element: <Settings /> },
      { path: 'pac', element: <PAC /> },
      { path: 'account', element: <Account /> },
      { path: '*', element: <h1>404 - Page Not Found</h1> },

      // Settings sub-pages
      { path: 'settings/user-management', element: <UserManagement />},
      { path: 'settings/store-management', element: <StoreManagement />},
      { path: 'settings/notifications', element: <Notifications />},
      { path: 'settings/invoice-settings', element: <InvoiceSettings />},
    ]
  },
  {
    path: '*', element: <h1>404 - Page Not Found</h1>
  }
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <RouterProvider router = {router}>
        <App />
      </RouterProvider>
    </MsalProvider>
  </React.StrictMode>
);


// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

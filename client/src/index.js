import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from './pages/login/login';
import SignUpScreen from './pages/login/signupscreen';
import Dashboard from './pages/dashboard/dashboard';
import InvoiceLogs from './pages/invoiceLogs/invoiceLogs';
import SubmitInvoice from './pages/submitInvoice/submitInvoice';
import Reports from './pages/reports/reports';
import Settings from './pages/settings/settings';
import PAC from './pages/pac/pac';
import Account from './pages/account/account';
import PrivateRoute from './routes/PrivateRoute';

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
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'invoiceLogs', element: <InvoiceLogs /> },
      { path: 'submitInvoice', element: <SubmitInvoice /> },
      { path: 'reports', element: <Reports /> },
      { path: 'settings', element: <Settings /> },
      { path: 'pac', element: <PAC /> },
      { path: 'account', element: <Account /> },
      { path: '*', element: <h1>404 - Page Not Found</h1> },
    ]
  },
  {
    path: '*', element: <h1>404 - Page Not Found</h1>
  }
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router = {router}>
      <App />
    </RouterProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

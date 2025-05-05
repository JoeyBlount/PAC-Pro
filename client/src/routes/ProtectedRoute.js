import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

// Component to protect routes based on role
// allowedRoles is an array of roles that can access the route
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { userRole, currentUser, loading } = useAuth();
    const location = useLocation();

    // Show loading state while auth is being checked
    if (loading) {
        return <div>Loading...</div>;
    }

    // If not logged in, redirect to login
    if (!currentUser) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // If no roles specified, allow access
    if (!allowedRoles || !Array.isArray(allowedRoles) || allowedRoles.length === 0) {
        return children;
    }

    // Check if user's role is allowed
    if (!allowedRoles.includes(userRole)) {
        // Redirect to dashboard if role not allowed
        return <Navigate to="/navi/dashboard" replace />;
    }

    // User is logged in and has an allowed role
    return children;
};


// Specific components for readability in Routes
export const AdminRoute = ({ children }) => (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>{children}</ProtectedRoute>
);

export const AdminOrOmRoute = ({ children }) => (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OFFICE_MANAGER]}>{children}</ProtectedRoute>
);

export const SettingsViewRoute = ({ children }) => (
    // Example: Who can VIEW settings pages like InvoiceSettings
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OFFICE_MANAGER, ROLES.ACCOUNTANT]}>{children}</ProtectedRoute>
);

export const StoreManagementRoute = ({ children }) => (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OFFICE_MANAGER]}>{children}</ProtectedRoute>
);

export const UserManagementRoute = ({ children }) => (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OFFICE_MANAGER]}>{children}</ProtectedRoute>
);

export const ViewOnlyRoute = ({ children }) => (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OFFICE_MANAGER, ROLES.ACCOUNTANT, ROLES.GENERAL_MANAGER, ROLES.SUPERVISOR]}>{children}</ProtectedRoute>
);

export const AllAuthenticatedUsersRoute = ({ children }) => (
    <ProtectedRoute allowedRoles={Object.values(ROLES)}>{children}</ProtectedRoute>
);


export default ProtectedRoute; // Export the base component too if needed elsewhere
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

// Component to protect routes based on role
// allowedRoles is an array of roles that can access the route
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { userRole, currentUser, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        // Optional: Show a loading indicator while auth state is resolving
        return <div>Loading...</div>;
    }

    if (!currentUser) {
        // Not logged in, redirect to login page, saving the current location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!allowedRoles || !Array.isArray(allowedRoles) || allowedRoles.length === 0) {
        // If no roles are specified for the route, maybe allow all logged-in users?
        // Or deny all? Let's assume allow all logged-in users for this case.
        console.warn("ProtectedRoute used without specific allowedRoles. Allowing access for logged-in user.");
    } else if (!allowedRoles.includes(userRole)) {
        // Role not allowed, redirect to an unauthorized page or dashboard
        console.log(`Access Denied: Role "${userRole}" not in allowed roles [${allowedRoles.join(', ')}] for path ${location.pathname}`);
        // You might want a dedicated '/unauthorized' page
        return <Navigate to="/navi/dashboard" state={{ from: location }} replace />; // Or redirect to '/unauthorized'
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

export const AllAuthenticatedUsersRoute = ({ children }) => (
    <ProtectedRoute allowedRoles={Object.values(ROLES)}>{children}</ProtectedRoute> // Allow any defined role
    // Or simply check if currentUser exists without checking role array:
    // const { currentUser, loading } = useAuth();
    // if (loading) return <div>Loading...</div>;
    // if (!currentUser) return <Navigate to="/login" state={{ from: location }} replace />;
    // return children;
);


export default ProtectedRoute; // Export the base component too if needed elsewhere
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Private route component to check authentication
function PrivateRoute({ children }) {
    const { currentUser, loading } = useAuth();
  
    if (loading) {
        return <div>Loading...</div>;
    }
  
    return currentUser ? children : <Navigate to="/" replace />;
}

export default PrivateRoute;
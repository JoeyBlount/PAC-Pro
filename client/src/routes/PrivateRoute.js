import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../config/firebase"; // Adjust path if needed
import { onAuthStateChanged } from "firebase/auth";

// Private route component to check authentication
function PrivateRoute({ element }) {
    const [user, setUser] = useState(undefined);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
      });
  
      return () => unsubscribe(); // Cleanup on unmount
    }, []);
  
    if (loading) return <div>Loading...</div>;
  
    return user ? element : <Navigate to="/" replace />;
  }

  export default PrivateRoute;
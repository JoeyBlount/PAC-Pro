import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth } from '../config/firebase-config'; // Adjust path if needed
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const db = getFirestore();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    setCurrentUser(user);
                    // User is signed in, fetch their role from Firestore
                    const userRef = doc(db, 'users', user.email);
                    const userDoc = await getDoc(userRef);
                    
                    if (userDoc.exists()) {
                        const role = userDoc.data().role;
                        setUserRole(role);
                        console.log('User Role:', role);
                    } else {
                        console.log('User document not found in Firestore');
                        setUserRole(null);
                    }
                } else {
                    setCurrentUser(null);
                    setUserRole(null);
                }
            } catch (error) {
                console.error('Error in auth state change:', error);
                setCurrentUser(null);
                setUserRole(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [db]);

    const value = {
        currentUser,
        userRole,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
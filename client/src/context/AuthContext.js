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
            setCurrentUser(user);
            if (user) {
                // User is signed in, fetch their role from Firestore
                const userRef = doc(db, 'users', user.email); // Using email as doc ID based on your code
                try {
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        setUserRole(userDoc.data().role); // Assuming 'role' field exists
                        console.log('User Role:', userDoc.data().role);
                    } else {
                        console.log('User document not found in Firestore, role unknown.');
                        setUserRole(null); // Or handle as appropriate
                        // Maybe sign out the user if they MUST have a Firestore entry?
                        // auth.signOut();
                    }
                } catch (error) {
                    console.error('Error fetching user role:', error);
                    setUserRole(null);
                }
            } else {
                // User is signed out
                setUserRole(null);
            }
            setLoading(false);
        });

        return unsubscribe; // Cleanup subscription on unmount
    }, [db]);

    const value = {
        currentUser,
        userRole,
        loading, // You can use this to show a loading spinner while auth state is resolving
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
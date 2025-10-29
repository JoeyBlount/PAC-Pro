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
                    const userRef = doc(db, 'users', user.email);
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        const role = userDoc.data().role;
                        setUserRole(role);
                    } else {
                        setUserRole(null);
                    }
                } else {
                    // Not signed in via Firebase; try backend session
                    try {
                        const res = await fetch('http://localhost:8000/api/auth/me', {
                            credentials: 'include'
                        });
                        if (res.ok) {
                            const me = await res.json();
                            const pseudoUser = { email: me.email, displayName: me.name };
                            setCurrentUser(pseudoUser);
                            // Fetch role from Firestore by email
                            const userRef = doc(db, 'users', me.email);
                            const userDoc = await getDoc(userRef);
                            if (userDoc.exists()) {
                                const role = userDoc.data().role;
                                setUserRole(role);
                            } else {
                                setUserRole(null);
                            }
                        } else {
                            setCurrentUser(null);
                            setUserRole(null);
                        }
                    } catch (e) {
                        setCurrentUser(null);
                        setUserRole(null);
                    }
                }
            } catch (error) {
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
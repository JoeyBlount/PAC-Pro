import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiUrl } from '../utils/api';
import { auth } from '../config/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authMethod, setAuthMethod] = useState(null); // 'firebase' or 'microsoft'


    const fetchUserInfo = async (email) => {
    const url = apiUrl(`/api/auth/user-info?email=${encodeURIComponent(email)}`);
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch user info');
    return res.json(); // { email, firstName, lastName, name, role }
  };

  const validateMicrosoftSession = async () => {
    try {
      const url = apiUrl('/api/auth/validate-session');
      const res = await fetch(url, {
        credentials: 'include',
        method: 'GET'
      });

      if (!res.ok) {
        return null;
      }

      const sessionData = await res.json();
      return sessionData; // { valid: boolean, user: { email, name, role } }
    } catch (error) {
      console.error('Error validating Microsoft session:', error);
      return null;
    }
  };

  const composeName = (info) => {
    if (info?.name) return info.name;
    const first = (info?.firstName || '').trim();
    const last = (info?.lastName || '').trim();
    return [first, last].filter(Boolean).join(' ') || null;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        // First check for Microsoft authentication
        const microsoftSession = await validateMicrosoftSession();

        if (microsoftSession && microsoftSession.valid && microsoftSession.user) {
          // Microsoft user is authenticated
          const microsoftUser = {
            email: microsoftSession.user.email,
            displayName: microsoftSession.user.name || microsoftSession.user.email,
            authMethod: 'microsoft'
          };

          setCurrentUser(microsoftUser);
          setUserRole(microsoftSession.user.role || null);
          setAuthMethod('microsoft');
          setLoading(false);
          return;
        }

        // If no Microsoft session, check Firebase
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (firebaseUser && firebaseUser.email) {
              setCurrentUser({ ...firebaseUser, authMethod: 'firebase' });

              const info = await fetchUserInfo(firebaseUser.email);
              setUserRole(info?.role ?? null);
              setAuthMethod('firebase');

              const fullName = composeName(info);
              if ((!firebaseUser.displayName || firebaseUser.displayName.trim() === '') && fullName) {
                setCurrentUser({ ...firebaseUser, displayName: fullName, authMethod: 'firebase' });
              }
            } else {
              // No authenticated user
              setCurrentUser(null);
              setUserRole(null);
              setAuthMethod(null);
            }
          } catch {
            setCurrentUser(null);
            setUserRole(null);
            setAuthMethod(null);
          } finally {
            setLoading(false);
          }
        });

        return () => unsubscribe();
      } catch {
        setCurrentUser(null);
        setUserRole(null);
        setAuthMethod(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const value = { currentUser, userRole, loading, authMethod };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
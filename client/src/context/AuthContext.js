import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiUrl } from '../utils/api';
import { auth } from '../config/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [authMethod, setAuthMethod] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserInfo = async (email) => {
    const url = apiUrl(`/api/auth/user-info?email=${encodeURIComponent(email)}`);
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch user info');
    return res.json();
  };

  const validateMicrosoftSession = async () => {
    try {
      const url = apiUrl('/api/auth/validate-session');
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  };

  const composeName = (info) => {
    if (info?.name) return info.name;
    const first = info?.firstName?.trim() ?? '';
    const last = info?.lastName?.trim() ?? '';
    return [first, last].filter(Boolean).join(' ') || null;
  };

  useEffect(() => {
    let unsubscribe = () => {};

    const init = async () => {
      setLoading(true);

      // ----- 1) Check Microsoft session -----
      const msSession = await validateMicrosoftSession();
      if (msSession?.valid && msSession.user) {
        const msUser = {
          email: msSession.user.email,
          displayName: msSession.user.name || msSession.user.email,
          authMethod: 'microsoft',
        };

        setCurrentUser(msUser);
        setUserRole(msSession.user.role ?? null);
        setAuthMethod('microsoft');
        setLoading(false);
        return;
      }

      // ----- 2) Fallback: listen for Firebase user -----
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          setCurrentUser(null);
          setUserRole(null);
          setAuthMethod(null);
          setLoading(false);
          return;
        }

        try {
          setAuthMethod('firebase');
          const info = await fetchUserInfo(firebaseUser.email);

          let displayName = firebaseUser.displayName;
          const fullName = composeName(info);
          if (!displayName?.trim() && fullName) {
            displayName = fullName;
          }

          setCurrentUser(firebaseUser);
          setUserRole(info?.role ?? null);
          setAuthMethod('firebase');
        } catch {
          setCurrentUser(null);
          setUserRole(null);
          setAuthMethod(null);
        } finally {
          setLoading(false);
        }
      });
    };

    init();

    return () => unsubscribe();
  }, []);


  // -----------------------------
  // getToken: works for both Firebase and Microsoft
  // -----------------------------
  const getToken = async () => {
    if (authMethod === 'firebase' && currentUser?.getIdToken) {
      return currentUser.getIdToken();
    }
    // Microsoft token logic can be added here if needed
    return null;
  };

  const value = {
    currentUser,
    userRole,
    authMethod,
    loading,
    getToken, // <--- safe token getter
  };

  return (
    <AuthContext.Provider value={{ currentUser, userRole, loading, authMethod, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};
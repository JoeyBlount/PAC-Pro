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


    const fetchUserInfo = async (email) => {
    const url = apiUrl(`/api/auth/user-info?email=${encodeURIComponent(email)}`);
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch user info');
    return res.json(); // { email, firstName, lastName, name, role }
  };

  const composeName = (info) => {
    if (info?.name) return info.name;
    const first = (info?.firstName || '').trim();
    const last = (info?.lastName || '').trim();
    return [first, last].filter(Boolean).join(' ') || null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      try {
        if (user && user.email) {
          setCurrentUser(user);

          const info = await fetchUserInfo(user.email);
          setUserRole(info?.role ?? null);

          const fullName = composeName(info);
          if ((!user.displayName || user.displayName.trim() === '') && fullName) {
            setCurrentUser({ ...user, displayName: fullName });
          }
        } else {
          // No Firebase user; no session lookups
          setCurrentUser(null);
          setUserRole(null);
        }
      } catch {
        setCurrentUser(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = { currentUser, userRole, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
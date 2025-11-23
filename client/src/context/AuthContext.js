import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiUrl } from '../utils/api';
import { auth } from '../config/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMethod, setAuthMethod] = useState(null); // 'firebase' or 'microsoft'


  const fetchUserInfo = async () => {
    const u = auth.currentUser;
    const token = u ? await u.getIdToken() : null;

    // include email param to satisfy a required query arg on the backend
    const url = apiUrl(`/api/auth/user-info${u?.email ? `?email=${encodeURIComponent(u.email)}` : ''}`);

    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('user-info failed', res.status, text);
      throw new Error('Failed to fetch user info');
    }
    return res.json();
  };


  const validateMicrosoftSession = async () => {
    try {
      const url = apiUrl('/api/auth/validate-session');
      const res = await fetch(url, { credentials: 'include', method: 'GET' });
      if (!res.ok) return null;
      return await res.json(); // { valid, user: { email, name, role } }
    } catch (e) {
      console.error('Error validating Microsoft session:', e);
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
    let isMounted = true;
    let unsub = null;

    (async () => {
      setLoading(true);

      // 1) Try Microsoft cookie session first
      const microsoftSession = await validateMicrosoftSession();
      if (isMounted && microsoftSession?.valid && microsoftSession.user) {
        const microsoftUser = {
          email: microsoftSession.user.email,
          displayName: microsoftSession.user.name || microsoftSession.user.email,
          authMethod: "microsoft",
        };
        setCurrentUser(microsoftUser);
        setUserRole(microsoftSession.user.role || null);
        setAuthMethod("microsoft");
        setLoading(false); // ✅ done; no Firebase listener needed
        return;
      }

      // 2) Fall back to Firebase client auth
      unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return;
        try {
          if (firebaseUser?.email) {
            // set provisional user so UI can render immediately
            setCurrentUser({ ...firebaseUser, authMethod: "firebase" });
            setAuthMethod("firebase");

            // fetch role/profile with Bearer token
            const info = await fetchUserInfo().catch((e) => {
              console.warn("fetchUserInfo failed:", e);
              return null;
            });
            setUserRole(info?.role ?? null);

            // fill displayName if missing
            const fullName = composeName(info);
            if ((!firebaseUser.displayName || firebaseUser.displayName.trim() === "") && fullName) {
              setCurrentUser({ ...firebaseUser, displayName: fullName, authMethod: "firebase" });
            }
          } else {
            setCurrentUser(null);
            setUserRole(null);
            setAuthMethod(null);
          }
        } finally {
          setLoading(false);
        }
      });
    })();

    return () => {
      isMounted = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const value = { currentUser, userRole, loading, authMethod };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
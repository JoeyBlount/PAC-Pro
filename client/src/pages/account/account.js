// PAC-Pro/client/src/pages/account.js
import React, { useState, useEffect } from "react";
import {
  Container, Typography, Button, Box, Table, TableBody, TableCell,
  TableContainer, TableRow, Paper, Menu, MenuItem, Snackbar, Alert, Divider
} from "@mui/material";
import { auth } from "../../config/firebase-config";
import { signOut, onAuthStateChanged } from "firebase/auth";
const BASE_URL = "http://localhost:5140";

// Auth-aware fetch helper
async function api(path, { method = "GET", body } = {}) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : { "X-Dev-Email": "dev@example.com" }), // mock mode fallback
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const Account = () => {
  const [userData, setUserData] = useState(null);
  const [stores, setStores] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  useEffect(() => {
    document.title = "PAC Pro - Account";
  }, []);

  // Wait for Firebase Auth to settle before calling API
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async () => {
      try {
        const [me, allStores] = await Promise.all([
          api("/api/account/me"),
          api("/api/account/stores"),
        ]);
        setUserData(me);
        setStores(allStores);
      } catch (err) {
        console.error("Initial load error:", err);
        setUserData(null);
        setStores([]);
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      // Sign out of Firebase if logged in via Google
      try { await signOut(auth); } catch {}
      // Clear backend Microsoft session cookie
      await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      window.location.href = '/';
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  const handleClose = () => setAnchorEl(null);
  const handleSnackbarClose = () => setSnackbar((s) => ({ ...s, open: false }));

  const isStoreAssigned = (storeId) =>
    userData?.assignedStores?.some((store) => store.id === storeId);

  const handleAssignStore = async (store) => {
    if (!store) return;
    try {
      const updatedMe = await api("/api/account/me/assigned-stores", {
        method: "POST",
        body: { storeId: store.id },
      });
      setUserData(updatedMe);
      setSnackbar({ open: true, message: `Assigned store: ${store.name}` });
      setAnchorEl(null);
    } catch (err) {
      console.error("Error assigning store:", err);
    }
  };

  const handleRemoveStore = async (storeId) => {
    try {
      const updatedMe = await api(`/api/account/me/assigned-stores/${storeId}`, {
        method: "DELETE",
      });
      setUserData(updatedMe);
      setSnackbar({ open: true, message: "Store unassigned successfully" });
    } catch (err) {
      console.error("Error removing store:", err);
    }
  };

  const headerTypographyStyle = {
    variant: "h5",
    fontWeight: "bold",
    padding: 2,
    textAlign: "center",
    textTransform: "uppercase",
  };

  return (
    <Container sx={{ textAlign: "center", marginTop: 5, position: "relative", minHeight: "80vh" }}>
      {/* ACCOUNT INFORMATION TABLE */}
      {userData && (
        <TableContainer component={Paper} sx={{ maxWidth: 500, margin: "auto", marginBottom: 4 }}>
          <Typography sx={headerTypographyStyle}>Account Information</Typography>
          <Divider />
          <Table>
            <TableBody>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell>{userData.firstName} {userData.lastName}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell>{userData.email}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell>{userData.role}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Store Dropdown Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {stores
          .filter(store => !isStoreAssigned(store.id))
          .map((store) => (
            <MenuItem key={store.id} onClick={() => handleAssignStore(store)}>
              {store.name} — {store.address}
            </MenuItem>
          ))}
      </Menu>

      {/* ASSIGNED STORES TABLE */}
      <TableContainer component={Paper} sx={{ maxWidth: 500, margin: "auto" }}>
        <Divider />
        <Table>
          <TableBody>
            {userData?.assignedStores && userData.assignedStores.length > 0 ? (
              userData.assignedStores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>{store.name}</TableCell>
                  <TableCell>{store.address}</TableCell>
                  <TableCell>
                    <Button
                      variant="text"
                      color="error"
                      onClick={() => handleRemoveStore(store.id)}
                      sx={{ minWidth: "auto", padding: "0 8px" }}
                    >
                      ❌
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align="center">No stores assigned</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Log Out Button */}
      <Box sx={{ position: "absolute", bottom: 20, right: 20 }}>
        <Button variant="contained" color="primary" onClick={handleLogout}>
          Log Out
        </Button>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Account;

// PAC-Pro/client/src/pages/account.js
import React, { useState, useEffect } from "react";
import {
  Container, Typography, Button, Box, Table, TableBody, TableCell, CircularProgress,
  TableContainer, TableRow, Paper, Snackbar, Alert, Divider, Switch, Stack
} from "@mui/material";
import { auth } from "../../config/firebase-config";
import { signOut, onAuthStateChanged } from "firebase/auth";
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useThemeMode } from '../../context/ThemeContext';
const BASE_URL = (process.env.REACT_APP_BACKEND_URL || "https://pac-pro-506342087804.us-west2.run.app").replace(/\/+$/, "");

const headerTypographyStyle = {
  variant: "h5",
  fontWeight: "bold",
  padding: 2,
  textAlign: "center",
  textTransform: "uppercase",
};

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

const UserInfomation = () => {
  const [userData, setUserData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [fetching, setFetching] = useState(false);

  const fetchUserInfo = async () => {
    setLoadingData(true);
    onAuthStateChanged(auth, async () => {
      try {
        const [me] = await Promise.all([
          api("/api/account/me"),
        ]);
        setUserData(me);
      } catch (err) {
        console.error("Initial load error:", err);
        setUserData(null);
      } finally {
        setLoadingData(false);
      }
    });
    setFetching(false);
  }

  useEffect(() => {
    if (fetching) return;

    fetchUserInfo();
    setFetching(true);

    const timer = setTimeout(() => {
      setFetching(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    loadingData
      ? <Box sx={{display: "flex", justifyContent: "center", alignItems: "center", height: "45vh"}}>
          <Stack spacing={2}>
            <Box><CircularProgress size={"75px"}/></Box>
            <Box><Typography sx={{fontSize:"24px"}}>Loading Account Information</Typography></Box>
          </Stack>
        </Box>
      : userData && (
          <TableContainer sx={{ maxWidth: 500, margin: "auto", marginBottom: 4 }}>
            <Stack spacing={2}>
              
              {/* ACCOUNT INFORMATION TABLE */}
              <Paper elevation={0}>
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
              </Paper>

              {/* ASSIGNED STORES TABLE */}
              <Paper elevation={0}>
                <Typography sx={headerTypographyStyle}>Stores</Typography>
                <Divider />
                <Table>
                  <TableBody>
                    {userData?.assignedStores && userData.assignedStores.length > 0 ? (
                      userData.assignedStores.map((store) => (
                        <TableRow key={store.id}>
                          <TableCell>{store.name}</TableCell>
                          <TableCell>{store.address}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No stores assigned</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Stack>
          </TableContainer>
        )
  );
}

const Account = () => {
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const { mode, toggleMode } = useThemeMode();
  
  useEffect(() => {
    document.title = "PAC Pro - Account";
  }, []);

  const handleLogout = async () => {
    try {
      // Sign out of Firebase if logged in via Google
      try { await signOut(auth); } catch {}

      // Clear backend Microsoft session cookie
      await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });

      // Force redirect to login page
      window.location.href = '/';
    } catch (err) {
      console.error("Logout Error:", err);
      // Force redirect even on error
      window.location.href = '/';
    }
  };

  const handleSnackbarClose = () => setSnackbar((s) => ({ ...s, open: false }));

  return (
    <Container sx={{ textAlign: "center", marginTop: 5, position: "relative", minHeight: "80vh" }}>
      {/* DARK MODE TOGGLE CARD */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          backgroundColor: mode === "dark" ? "#1e1e1e" : "#f5f5f5",
          borderRadius: "30px",
          padding: "8px 16px",
          boxShadow:
            mode === "dark"
              ? "0 0 10px rgba(255,255,255,0.1)"
              : "0 2px 6px rgba(0,0,0,0.1)",
          width: "fit-content",
          margin: "0 auto 24px auto",
          transition: "all 0.3s ease-in-out",
        }}
      >
        <DarkModeIcon
          sx={{
            color: mode === "dark" ? "#ffb300" : "#333",
            fontSize: 26,
            transition: "color 0.3s ease",
          }}
        />
        <Typography
          sx={{
            fontWeight: 600,
            color: mode === "dark" ? "#fff" : "#000",
            fontSize: "1rem",
            userSelect: "none",
            transition: "color 0.3s ease",
          }}
        >
          {mode === "dark" ? "Dark Mode" : "Light Mode"}
        </Typography>
        <Switch
          checked={mode === "dark"}
          onChange={toggleMode}
          color="default"
          sx={{
            "& .MuiSwitch-switchBase.Mui-checked": {
              color: "#ffb300",
            },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
              backgroundColor: "#ffb300",
            },
          }}
        />
      </Box>

      {/* User Information Box */}
      <UserInfomation />

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

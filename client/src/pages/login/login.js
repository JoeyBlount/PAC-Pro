import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Button, Box, Typography } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import EmailIcon from '@mui/icons-material/Email';
import MicrosoftIcon from "@mui/icons-material/Microsoft";
//import { auth } from "../../config/firebaseConfigEmail";
import { auth, googleAuthProvider } from "../../config/firebase-config";
import { signInWithPopup } from "firebase/auth";
import backgroundImage from "./bg.webp";
import logo from "./logo.png";

const Login = () => {
  React.useEffect(() => {
    document.title = "PAC Pro - Login";

  }, []); // Used to change the title.

  const navigate = useNavigate(); // Hook for navigation

  // Function to handle Microsoft login
  const handleMicrosoftLogin = async () => {
    const BACKEND_BASE = "http://localhost:8000";
    const redirect = encodeURIComponent(`${window.location.origin}/navi/dashboard`);
    window.location.href = `${BACKEND_BASE}/api/auth/microsoft/login?redirect=${redirect}`;
  };

  // Function to handle Google login
  const handleGoogleLogin = async () => {
    try {
      console.log("Attempting to sign in with Google...");
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();

      const resp = await fetch("http://localhost:5140/api/auth/google/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({}),
      });

      if (!resp.ok) throw new Error("Auth backend error");
      const data = await resp.json();

      if (data.allowed) {
        // Optional if you still use it elsewhere:
        localStorage.setItem("user", JSON.stringify(result.user));
        navigate("/navi/dashboard");
      } else {
        navigate("/not-allowed");
      }
    } catch (error) {
      console.error("Google Login Error:", error);
    }
  };

  const handleLoginEmail = () => {
    navigate("/signupscreen")
  };

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100vh',
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: "#1976d2"
      }}
    >
      {/*Login box*/}
      <Container
        maxWidth="xs"
        sx={{
          backgroundColor: "white",
          padding: 4,
          borderRadius: 2,
          boxShadow: 3,
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            maxWidth: "100%",
          }}
        >
          <img src={logo}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </Box>

        <Box sx={{ padding: '10px' }} />

        <Typography variant="h4" fontWeight="bold">
          Sign In
        </Typography>

        <Box sx={{ padding: '10px' }} />

        <Button
          variant="contained"
          fullWidth
          startIcon={<GoogleIcon />}
          sx={{
            backgroundColor: "#000",
            color: "white",
            fontSize: "1.2rem",
            padding: "12px",
            "&:hover": { backgroundColor: "#333" },
          }}
          onClick={handleGoogleLogin} // Calls the function for Google login
        >
          Login with Google
        </Button>

        <Box sx={{ padding: '10px' }} />

        <Button
          variant="contained"
          fullWidth
          startIcon={<MicrosoftIcon />}
          sx={{
            backgroundColor: "#000",
            color: "white",
            fontSize: "1.2rem",
            padding: "12px",
            "&:hover": { backgroundColor: "#333" },
          }}
          onClick={handleMicrosoftLogin} // ✅ Same function for Microsoft login
        >
          Login with Microsoft
        </Button>
      </Container>
    </Box>
  );
};

export default Login;

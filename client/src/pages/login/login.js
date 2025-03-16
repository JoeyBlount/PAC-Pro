import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Button, Box, Typography } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import EmailIcon from '@mui/icons-material/Email';
import MicrosoftIcon from "@mui/icons-material/Microsoft";
import { auth } from "../../config/firebaseConfigEmail";
const Login = () => {
  const navigate = useNavigate(); // Hook for navigation
  const user = auth.currentUser;
  //for debugging to see if user is actually logged out or not
  if (user) {
    console.log(user.displayName)
  }else {
    console.log("No one logged in looks like sign out works")
  }
  
  // Function to handle login
  const handleLogin = () => {
    localStorage.setItem("user", "true"); // ✅ Store user session
    navigate("/navi/dashboard"); // ✅ Navigate to dashboard
  };

  const handleLoginEmail = () => {
    navigate("/signupscreen")
  }

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1976d2", // Blue background
      }}
    >
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
        <Typography variant="h4" fontWeight="bold" mb={3}>
          Sign in
        </Typography>

        <Button
          variant="contained"
          fullWidth
          startIcon={<EmailIcon />}
          sx={{
            backgroundColor: "#000",
            color: "white",
            fontSize: "1.2rem",
            padding: "12px",
            "&:hover": { backgroundColor: "#333" },
            marginBottom: 2,
          }}
          onClick={handleLoginEmail} // ✅ Calls the function to store user & navigate
        >
          Login/Sign Up with Email
        </Button>

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
            marginBottom: 2,
          }}
          onClick={handleLogin} // ✅ Calls the function to store user & navigate
        >
          Login with Google
        </Button>

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
          onClick={handleLogin} // ✅ Same function for Microsoft login
        >
          Login with Microsoft
        </Button>
      </Container>
    </Box>
  );
};

export default Login;

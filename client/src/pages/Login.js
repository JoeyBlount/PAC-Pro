import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Button, Box, Typography } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import MicrosoftIcon from "@mui/icons-material/Microsoft";

const Login = () => {
  const navigate = useNavigate(); // Hook for navigation

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
          startIcon={<GoogleIcon />}
          sx={{
            backgroundColor: "#000",
            color: "white",
            fontSize: "1.2rem",
            padding: "12px",
            "&:hover": { backgroundColor: "#333" },
            marginBottom: 2,
          }}
          onClick={() => navigate("/dashboard")}
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
          onClick={() => navigate("/dashboard")}
        >
          Login with Microsoft
        </Button>
      </Container>
    </Box>
  );
};

export default Login;

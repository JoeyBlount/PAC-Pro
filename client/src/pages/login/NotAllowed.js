import React from "react";
import { Container, Typography, Box, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

const NotAllowed = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          backgroundColor: 'white',
          padding: 4,
          borderRadius: 2,
          boxShadow: 3,
          textAlign: 'center'
        }}
      >
        <Typography variant="h4" fontWeight="bold" color="error" gutterBottom>
          Access Denied
        </Typography>

        <Typography variant="body1" color="textSecondary" paragraph>
          Your account is not authorized to access PAC Pro. Please contact your administrator if you believe this is an error.
        </Typography>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/")}
            sx={{ mr: 2 }}
          >
            Back to Login
          </Button>

          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default NotAllowed;
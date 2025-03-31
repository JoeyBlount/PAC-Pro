import React from 'react';
import { Container, Box, Typography } from '@mui/material';

const NotAllowed = () => {
  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
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
        <Typography variant="h4" color="error" fontWeight="bold">
          Not Allowed
        </Typography>
        <Typography variant="body1" color="textSecondary" mt={2}>
          Your email is not authorized to access this page.
        </Typography>
      </Container>
    </Box>
  );
};

export default NotAllowed;

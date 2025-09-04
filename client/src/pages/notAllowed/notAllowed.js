import React from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';

const NotAllowed = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const getMessage = () => {
    switch (userRole) {
      case ROLES.GENERAL_MANAGER:
        return "As a General Manager, you do not have access to settings. Please focus on your managerial tasks.";
      case ROLES.SUPERVISOR:
        return "As a Supervisor, you do not have access to settings. Please focus on your supervisory duties.";
      case ROLES.OFFICE_MANAGER:
        return "As an Office Manager, you do not have access to settings. Please focus on your office management duties.";
      default:
        return "You do not have permission to access this page.";
    }
  };

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        backgroundColor: '#f5f5f5',
        p: 3
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          backgroundColor: 'white',
          p: 3,
          borderRadius: 2,
          boxShadow: 3
        }}
      >
        <Typography variant="h4" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {getMessage()}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/navi/dashboard')}
          fullWidth
        >
          Return to Dashboard
        </Button>
      </Container>
    </Box>
  );
};

export default NotAllowed;

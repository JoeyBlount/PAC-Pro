import React, { useEffect } from 'react';
import { Outlet } from "react-router-dom";
import { NavBar } from './pages/navBar/navBar';
import { Box, CssBaseline } from '@mui/material';
import { useTheme } from '@mui/material/styles';

function App() {
  const theme = useTheme();

   useEffect(() => {
    document.body.setAttribute('data-theme', theme.palette.mode);
  }, [theme.palette.mode]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      {/* Applies global baseline styles (syncs <body> with the theme) */}
      <CssBaseline />
      
      {/* Navbar stays visible on top */}
      <NavBar />

      {/* Main content area */}
      <Box sx={{ top: '40px', marginLeft: '80px', marginTop: '80px' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

export default App;
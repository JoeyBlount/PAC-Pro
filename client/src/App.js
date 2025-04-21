import React from 'react';
import { Outlet } from "react-router-dom";
import { NavBar } from './pages/navBar/navBar';
import { Box } from '@mui/material';

function App() {
  return (
    <div>
      <NavBar />
      <Box sx={{top: '40px', marginLeft: '80px'}}>
        <Outlet />
      </Box>
    </div>
  );
}

export default App;

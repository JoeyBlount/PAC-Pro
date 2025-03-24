import React from "react";
import { Container, Box } from "@mui/material";
import Grid from '@mui/material/Grid2';
import './dashboard.css';
import { auth } from "../../config/firebaseConfigEmail";

const Dashboard = () => {
   const user = auth.currentUser;

   if (user) {
    console.log("User is logged in: ", user.displayName);
   }
   else {
    console.log("Error no user logged in")
   }
  return (
    <Container sx={{bgcolor: '#c0c0c0', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '90vh'}}>
      <Box sc={{width: '100%'}}>
        <Grid container rowSpacing={1} columnSpacing={{xs: 1, sm: 2, md: 3}}>
          <Grid size={6}>
            Test 1
          </Grid>
          <Grid size={6}>
            Test 2
          </Grid>
          <Grid size={6}>
            Test 3
          </Grid>
          <Grid size={6}>
            Test 4
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;
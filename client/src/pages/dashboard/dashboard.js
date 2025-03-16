import React from "react";
import { Container } from "@mui/material";
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
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
       <h1 className="Header">Dashboard</h1>
    </Container>



  );
};

export default Dashboard;
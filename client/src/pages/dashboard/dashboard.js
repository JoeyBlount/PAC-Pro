import React from "react";
import { Container } from "@mui/material";
import './dashboard.css';
import { auth } from "../../config/firebase";

const Dashboard = () => {
  React.useEffect(() => {
    document.title = "PAC Pro - Home";
  }, []); // Used to change the title.

   const user = auth.currentUser;

   if (user) {
    console.log("User is logged in: ", user.displayName);
   }
   else {
    console.log("Error no user logged in")
   }
  return (
    <Container sx={{ textAlign: "center", backgroundColor: '#c0c0c0' }}>
       <h1 className="Header">Dashboard</h1>
    </Container>



  );
};

export default Dashboard;
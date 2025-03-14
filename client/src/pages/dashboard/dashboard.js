import React from "react";
import { Container } from "@mui/material";
import './dashboard.css';

const Dashboard = () => {
   
  return (
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
       <h1 className="Header">Dashboard</h1>
    </Container>
  );
};

export default Dashboard;
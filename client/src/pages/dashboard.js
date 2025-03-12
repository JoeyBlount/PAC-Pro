import React from "react";
import { Container, Typography } from "@mui/material";

const Dashboard = () => {
  return (
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
      <Typography variant="h3">Welcome to the dashboard!</Typography>
    </Container>
  );
};

export default Dashboard;
import React from "react";
import { Container } from "@mui/material";
import './reports.css';

const Reports = () => {
  React.useEffect(() => {
    document.title = "PAC Pro - Reports";
  }, []); // Used to change the title.
   
  return (
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
       <h1 className="Header">Reports</h1>
    </Container>
  );
};

export default Reports;
import React from "react";
import { Container } from "@mui/material";
import './invoiceLogs.css';

const InvoiceLogs = () => {
   
  return (
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
       <h1 className="Header">Invoice Logs</h1>
    </Container>
  );
};

export default InvoiceLogs;
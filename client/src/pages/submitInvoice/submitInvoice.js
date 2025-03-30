import React from "react";
import { Container } from "@mui/material";
import './submitInvoice.css';

const SubmitInvoice = () => {
  React.useEffect(() => {
    document.title = "PAC Pro - Submit Invoice";
  }, []); // Used to change the title.
   
  return (
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
       <h1 className="Header">Submit Invoice</h1>
    </Container>
  );
};

export default SubmitInvoice;
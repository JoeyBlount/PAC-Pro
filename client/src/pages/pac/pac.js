import React from "react";
import { Container } from "@mui/material";
import './pac.css';

const PAC = () => {
  React.useEffect(() => {
    document.title = "PAC Pro - PAC";
  }, []); // Used to change the title.
   
  return (
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
       <h1 className="Header">PAC</h1>
    </Container>
  );
};

export default PAC;
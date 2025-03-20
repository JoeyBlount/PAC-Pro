import React from "react";
import { Container, Grid, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();

  const tiles = [
    { title: "User Management", path: "/navi/settings/user-management" },
    { title: "Store Management", path: "/navi/settings/store-management" },
    { title: "Notifications", path: "/navi/settings/notifications" },
    { title: "Invoice Settings", path: "/navi/settings/invoice-settings" },
  ];

  return (
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
      <h1 className="Header">Settings</h1>

      <Grid container spacing={3} justifyContent="center">
        {tiles.map((tile, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ minWidth: 200 }}>
              <CardActionArea onClick={() => navigate(tile.path)}>
                <CardContent>
                  <Typography variant="h6">{tile.title}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Settings;

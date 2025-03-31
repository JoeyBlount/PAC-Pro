import React, { useState, useEffect } from "react";
import { Container, Typography, Button, TextField, Box } from "@mui/material";
import { db, auth } from "../../config/firebase-config";
import { getDocs, collection, query, where } from 'firebase/firestore';
import { signOut, updatePassword } from "firebase/auth";

const Account = () => {
  React.useEffect(() => {
    document.title = "PAC Pro - Account";
  }, []); // Used to change the title.

  const [currentUser, setCurrentUser] = useState(null);
  const [storeAssignments, setStoreAssignments] = useState([]);
  const [newPassword, setNewPassword] = useState("");
  const storesCollectionRef = collection(db, "stores");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User logged out");
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  const handleChangePassword = async () => {
    try {
      const user = auth.currentUser;
      await updatePassword(user, newPassword);
      console.log("Password updated successfully");
    } catch (err) {
      console.error("Password Change Error:", err);
    }
  };

  return (
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
      <h1 className="Header">Account info</h1>
      {currentUser && (
        <div>
          <p>Account: {currentUser.displayName}</p>
          <p>Email: {currentUser.email}</p>
        </div>
      )}
      <Box mt={4}>
        <Button variant="contained" color="primary" onClick={handleLogout}>
          Log Out
        </Button>
      </Box>
      <Box mt={4}>
        <Typography variant="h6">Change Password</Typography>
        <TextField
          label="New Password"
          type="password"
          fullWidth
          variant="outlined"
          margin="normal"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button variant="contained" color="secondary" onClick={handleChangePassword}>
          Change Password
        </Button>
      </Box>
      <Box mt={4}>
        <Typography variant="h6">Store Assignments</Typography>
        {storeAssignments.map((store) => (
          <div key={store.id}>
            <p>Store Name: {store.name}</p>
            <p>Store Location: {store.location}</p>
          </div>
        ))}
      </Box>
    </Container>
  );
};

export default Account;
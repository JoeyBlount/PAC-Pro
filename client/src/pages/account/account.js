import React, { useState, useEffect } from "react";
import { Container, Typography, Button, TextField, Box } from "@mui/material";
import { db, auth } from "../../config/firebaseConfigEmail";
import { getDocs, collection, query, where } from 'firebase/firestore';
import { signOut, updatePassword } from "firebase/auth";

const Account = () => {
  const [userList, setUserList] = useState([]);
  const [storeAssignments, setStoreAssignments] = useState([]);
  const [newPassword, setNewPassword] = useState("");
  const usersCollectionRef = collection(db, "users");
  const storesCollectionRef = collection(db, "stores");

  useEffect(() => {
    const getUserList = async () => {
      try {
        const data = await getDocs(usersCollectionRef);
        const filteredData = data.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setUserList(filteredData);
      } catch (err) {
        console.error(err);
      }
    };

    const getStoreAssignments = async () => {
      try {
        const q = query(storesCollectionRef, where("userId", "==", auth.currentUser.uid));
        const data = await getDocs(q);
        const filteredData = data.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setStoreAssignments(filteredData);
      } catch (err) {
        console.error(err);
      }
    };

    getUserList();
    getStoreAssignments();
  }, []);

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
      <div>
        {userList.map((user) => (
          <div key={user.id}>
            <p>Account: {user.fname} {user.lname}</p>
            <p>Email: {user.email}</p>
            <p>Role: {user.role}</p>
          </div>
        ))}
      </div>
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
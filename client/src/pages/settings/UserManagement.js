import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../config/firebase";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", role: "" });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersCollection = collection(db, "users");
      const userSnapshot = await getDocs(usersCollection);
      const userList = userSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedUser) {
      try {
        await deleteDoc(doc(db, "users", selectedUser.id));
        setUsers(users.filter((user) => user.id !== selectedUser.id));
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const handleAddUserClick = () => {
    setAddDialogOpen(true);
  };

  const handleAddUserSubmit = async () => {
    if (newUser.firstName && newUser.lastName && newUser.email && newUser.role) {
      try {
        const newUserRef = await addDoc(collection(db, "users"), {
          ...newUser,
          createdAt: new Date().toISOString(),
          acceptState: false,
        });
        setUsers([...users, { id: newUserRef.id, ...newUser, acceptState: false, createdAt: new Date().toISOString() }]);
      } catch (error) {
        console.error("Error adding user:", error);
      }
    }
    setAddDialogOpen(false);
    setNewUser({ firstName: "", lastName: "", email: "", role: "" });
  };

  return (
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
      {/* Header with Add User Button */}
      <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
        <Typography variant="h4">User Management</Typography>
      </Box>

      <Box display="flex" justifyContent="right" alignItems="right" mb={2}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddUserClick}>
          Add User
        </Button>
      </Box>

      {/* User List */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {users.map((user) => (
          <Paper
            key={user.id}
            elevation={3}
            sx={{
              padding: 2,
              marginBottom: 2,
              width: "80%",
              textAlign: "left",
              backgroundColor: "#f5f5f5",
              borderLeft: user.acceptState ? "5px solid green" : "5px solid red",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="h6">
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="body2">Email: {user.email}</Typography>
              <Typography variant="body2">Role: {user.role}</Typography>
              <Typography variant="body2">
                Accepted: {user.acceptState ? "Yes ✅" : "No ❌"}
              </Typography>
              <Typography variant="body2">
                Created At: {new Date(user.createdAt).toLocaleString()}
              </Typography>
            </Box>
            <IconButton onClick={() => handleDeleteClick(user)} sx={{ color: "red" }}>
              <CloseIcon />
            </IconButton>
          </Paper>
        ))}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove <b>{selectedUser?.firstName} {selectedUser?.lastName}</b>?  
            This action cannot be undone, and they will lose access.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Remove User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="First Name"
            variant="outlined"
            value={newUser.firstName}
            onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Last Name"
            variant="outlined"
            value={newUser.lastName}
            onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Email"
            variant="outlined"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <MenuItem value="Manager">Manager</MenuItem>
              <MenuItem value="Supervisor">Supervisor</MenuItem>
              <MenuItem value="Accountant">Accountant</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleAddUserSubmit} color="success">
            Add User
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagement;

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
import { collection, getDocs, addDoc, deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase-config";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from '@mui/icons-material/Edit'; // For editing role
import { useAuth } from '../../context/AuthContext'; // Adjust path
import { ROLES } from '../../constants/roles'; // Adjust path

const UserManagement = () => {
  const { userRole, currentUser } = useAuth(); // Get current user's role and info
  const [users, setUsers] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", role: "" });
  const [editingUser, setEditingUser] = useState({ id: null, role: "" });

  // Permissions check based on role hierarchy
  const canManageUsers = userRole === ROLES.ADMIN || userRole === ROLES.OFFICE_MANAGER;
  const isAdmin = userRole === ROLES.ADMIN;
  const canViewUsers = userRole === ROLES.ADMIN || userRole === ROLES.OFFICE_MANAGER || userRole === ROLES.ACCOUNTANT;

  useEffect(() => {
    if (canViewUsers) {
      fetchUsers();
    }
  }, [canViewUsers]);

  const fetchUsers = async () => {
    // ... (fetchUsers logic remains the same)
  };

  // --- Delete Handlers ---
  const handleDeleteClick = (user) => {
    // Prevent deleting oneself or Admins deleting other Admins (optional rule)
    if (user.email === currentUser?.email) {
      alert("You cannot remove yourself.");
      return;
    }
    // if (user.role === ROLES.ADMIN && !isAdmin) { // Only admins can delete admins
    //   alert("Only Admins can remove other Admins.");
    //    return;
    // }
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    // ... (handleDeleteConfirm logic remains the same)
  };

  // --- Add Handlers ---
  const handleAddUserClick = () => {
    setAddDialogOpen(true);
  };

  const handleAddUserSubmit = async () => {
    // Prevent non-Admins from creating Admins
    if (newUser.role === ROLES.ADMIN && !isAdmin) {
      alert("Only Admins can create other Admin users.");
      return;
    }

    // Check if email already exists
    const emailExists = users.some(user => user.email === newUser.email);
    if (emailExists) {
      alert("A user with this email already exists.");
      return;
    }

    if (newUser.firstName && newUser.lastName && newUser.email && newUser.role) {
      try {
        const userRef = doc(db, "users", newUser.email);
        await setDoc(userRef, {
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          createdAt: new Date().toISOString(),
          acceptState: false,
        });
        fetchUsers();
        setAddDialogOpen(false);
        setNewUser({ firstName: "", lastName: "", email: "", role: "" });
      } catch (error) {
        console.error("Error adding user:", error);
        alert("Error adding user.");
      }
    } else {
      alert("Please fill in all fields.");
    }
  };

  // --- Edit Role Handlers (Admin Only) ---
  const handleEditClick = (user) => {
    if (user.email === currentUser?.email) {
      alert("You cannot change your own role.");
      return;
    }
    setSelectedUser(user); // Keep track of the full user object if needed
    setEditingUser({ id: user.id, email: user.email, role: user.role }); // Set user ID (or email) and current role
    setEditDialogOpen(true);
  };

  const handleEditRoleChange = (event) => {
    setEditingUser({ ...editingUser, role: event.target.value });
  };

  const handleEditSubmit = async () => {
    if (!editingUser.id || !editingUser.role) return;

    // Ensure Admins can't demote the last Admin (more complex logic needed)
    // Ensure Admins can't change their own role via this UI easily
    if (editingUser.email === currentUser?.email) {
      alert("You cannot change your own role through this interface.");
      setEditDialogOpen(false);
      return;
    }

    try {
      const userRef = doc(db, "users", editingUser.email); // Use email as ID
      await updateDoc(userRef, {
        role: editingUser.role
      });
      // Update local state
      setUsers(users.map(user =>
        user.id === editingUser.id ? { ...user, role: editingUser.role } : user
      ));
      fetchUsers(); // Or refetch for consistency
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update role.");
    }
    setEditDialogOpen(false);
    setEditingUser({ id: null, email: null, role: "" });
    setSelectedUser(null);
  };


  // --- Render Logic ---
  if (!canViewUsers) {
    return (
      <Container sx={{ textAlign: "center", marginTop: 10 }}>
        <Typography variant="h4">User Management</Typography>
        <Typography variant="body1" color="error" sx={{ mt: 2 }}>
          You do not have permission to access this page.
        </Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">User Management</Typography>
        {canManageUsers && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddUserClick}>
            Add User
          </Button>
        )}
      </Box>

      {/* User List */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {users.map((user) => (
          <Paper
            key={user.id}
            elevation={3}
            sx={{ width: "100%", p: 2, mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <Box>
              <Typography variant="h6">{user.firstName} {user.lastName}</Typography>
              <Typography variant="body2">Email: {user.email}</Typography>
              <Typography variant="body2">Role: {user.role || 'Not Assigned'}</Typography>
            </Box>
            <Box>
              {isAdmin && user.email !== currentUser?.email && (
                <IconButton onClick={() => handleEditClick(user)} sx={{ color: "blue" }} size="small">
                  <EditIcon />
                </IconButton>
              )}
              {canManageUsers && user.email !== currentUser?.email && (
                <IconButton onClick={() => handleDeleteClick(user)} sx={{ color: "red" }} size="small">
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="First Name"
            fullWidth
            value={newUser.firstName}
            onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Last Name"
            fullWidth
            value={newUser.lastName}
            onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <MenuItem value="" disabled>Select Role</MenuItem>
              {isAdmin && <MenuItem value={ROLES.ADMIN}>Admin</MenuItem>}
              <MenuItem value={ROLES.GENERAL_MANAGER}>General Manager</MenuItem>
              <MenuItem value={ROLES.OFFICE_MANAGER}>Office Manager</MenuItem>
              <MenuItem value={ROLES.SUPERVISOR}>Supervisor</MenuItem>
              <MenuItem value={ROLES.ACCOUNTANT}>Accountant</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddUserSubmit} color="primary">Add User</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Role for {selectedUser?.firstName} {selectedUser?.lastName}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Select the new role for {selectedUser?.email}.
          </DialogContentText>
          <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={editingUser.role}
              onChange={handleEditRoleChange}
            >
              {isAdmin && <MenuItem value={ROLES.ADMIN}>Admin</MenuItem>}
              <MenuItem value={ROLES.GENERAL_MANAGER}>General Manager</MenuItem>
              <MenuItem value={ROLES.OFFICE_MANAGER}>Office Manager</MenuItem>
              <MenuItem value={ROLES.SUPERVISOR}>Supervisor</MenuItem>
              <MenuItem value={ROLES.ACCOUNTANT}>Accountant</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} color="primary">Save Role</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {selectedUser?.firstName} {selectedUser?.lastName}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagement;

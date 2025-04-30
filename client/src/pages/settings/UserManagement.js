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
  const userRole = ROLES.ADMIN; // This line makes all user who access the invoice settings a admin regardless of their actual role. Delete this line when bugs are fixed.
  const currentUser = ""; // This line along with the line above is for temp bypass. Delete this line and uncomment the line below when bugs are fixed
  //const { userRole, currentUser } = useAuth(); // Get current user's role and info
  const [users, setUsers] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false); // State for edit dialog
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", role: "" });
  const [editingUser, setEditingUser] = useState({ id: null, role: "" }); // State for user being edited

  // Permissions check
  const canManageUsers = userRole === ROLES.ADMIN || userRole === ROLES.OFFICE_MANAGER;
  const isAdmin = userRole === ROLES.ADMIN;

  useEffect(() => {
    if (canManageUsers) { // Only fetch if user has permission
      fetchUsers();
    }
  }, [canManageUsers]); // Re-run if permission changes (e.g., on login)

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

    // Check if email already exists (client-side check, add Firestore rule too)
    const emailExists = users.some(user => user.email === newUser.email);
    if (emailExists) {
      alert("A user with this email already exists.");
      return;
    }


    if (newUser.firstName && newUser.lastName && newUser.email && newUser.role) {
      try {
        // Use email as doc ID for consistency with invite.js and login.js
        const userRef = doc(db, "users", newUser.email);
        await setDoc(userRef, {
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          createdAt: new Date().toISOString(),
          acceptState: false, // Or set based on requirements
        });
        // Re-fetch users to include the new one
        fetchUsers();
      } catch (error) {
        console.error("Error adding user:", error);
        alert("Error adding user.");
      }
    }
    setAddDialogOpen(false);
    setNewUser({ firstName: "", lastName: "", email: "", role: "" });
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
  if (!canManageUsers) {
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
        {/* Add User Button - Conditionally Rendered */}
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
            key={user.id} // Use Firestore document ID if available and unique
            elevation={3}
            sx={{ /* ... existing styles ... */ }}
          >
            <Box>
              {/* ... user details ... */}
              <Typography variant="body2">Role: {user.role || 'Not Assigned'}</Typography> {/* Display Role */}
              {/* ... other details ... */}
            </Box>
            <Box> {/* Container for buttons */}
              {/* Edit Button (Admin Only) */}
              {isAdmin && user.email !== currentUser?.email && ( // Show edit button if Admin and not editing self
                <IconButton onClick={() => handleEditClick(user)} sx={{ color: "blue" }} size="small">
                  <EditIcon />
                </IconButton>
              )}
              {/* Delete Button (Admin/OM, with checks) */}
              {canManageUsers && user.email !== currentUser?.email && ( // Don't show delete for self
                <IconButton onClick={() => handleDeleteClick(user)} sx={{ color: "red" }} size="small">
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Delete Confirmation Dialog (keep as is) */}
      {/* ... Delete Dialog ... */}

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          {/* ... TextFields for firstName, lastName, email ... */}
          <TextField /* ... firstName ... */ />
          <TextField /* ... lastName ... */ />
          <TextField /* ... email ... */ />

          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select
              name="role" // Add name attribute
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <MenuItem value="" disabled>Select Role</MenuItem>
              {/* Use ROLES constants and add conditional Admin role */}
              {isAdmin && <MenuItem value={ROLES.ADMIN}>Admin</MenuItem>}
              <MenuItem value={ROLES.GENERAL_MANAGER}>General Manager</MenuItem>
              <MenuItem value={ROLES.OFFICE_MANAGER}>Office Manager</MenuItem>
              <MenuItem value={ROLES.SUPERVISOR}>Supervisor</MenuItem>
              <MenuItem value={ROLES.ACCOUNTANT}>Accountant</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          {/* ... cancel/add buttons ... */}
        </DialogActions>
      </Dialog>

      {/* Edit Role Dialog (Admin Only) */}
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
              {/* Ensure all roles are available for Admin to assign */}
              <MenuItem value={ROLES.ADMIN}>Admin</MenuItem>
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

    </Container>
  );
};

export default UserManagement;

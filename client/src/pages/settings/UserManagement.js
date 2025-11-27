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
  Menu,
} from "@mui/material";
// Firebase imports removed - now using backend API
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from '@mui/icons-material/Edit'; // For editing role
import { useAuth } from '../../context/AuthContext'; // Adjust path
import { ROLES } from '../../constants/roles'; // Adjust path
import { apiUrl } from '../../utils/api';

const UserManagement = () => {
  const { userRole, currentUser, getToken } = useAuth(); // Get current user's role and info
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [storeFilter, setStoreFilter] = useState("ALL");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", role: "" });
  const [editingUser, setEditingUser] = useState({ id: null, role: "" });
  const [allStores, setAllStores] = useState([]);
  const [newUserAssignedStores, setNewUserAssignedStores] = useState([]);
  const [assignAnchorEl, setAssignAnchorEl] = useState(null);
  const [editAssignedStores, setEditAssignedStores] = useState([]);
  const [editAssignAnchorEl, setEditAssignAnchorEl] = useState(null);

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
    try {
      const response = await fetch(apiUrl('/api/pac/userManagement/fetch'));
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      console.log("Fetched users data:", data.users); // Debug log
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert(`Failed to fetch users: ${error.message}`);
    }
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
    if (!selectedUser) return;

    try {
      const response = await fetch(apiUrl(`/api/pac/userManagement/delete?user_email=${encodeURIComponent(selectedUser.email)}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("User deleted successfully:", result);
      
      fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(`Failed to delete user: ${error.message}`);
    }
    
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  // --- Add Handlers ---
  const handleAddUserClick = () => {
    setAddDialogOpen(true);
    setNewUserAssignedStores([]);
    fetchAllStores();
  };

  const fetchAllStores = async () => {
  try {
    // use the shared helper
    const token = await getToken();

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      // Firebase-authenticated request
      headers.Authorization = `Bearer ${token}`;
    } else if (currentUser?.email) {
      // Microsoft or dev fallback
      headers['X-Dev-Email'] = currentUser.email;
    } else {
      // last-resort fallback
      headers['X-Dev-Email'] = 'dev@example.com';
    }

    const response = await fetch(apiUrl('/api/account/stores'), {
      method: 'GET',
      headers,
      credentials: 'include', // optional, if backend uses cookies too
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    setAllStores(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Error fetching stores for assignment:', error);
    setAllStores([]);
  }
};


  const handleAssignMenuOpen = (event) => setAssignAnchorEl(event.currentTarget);
  const handleAssignMenuClose = () => setAssignAnchorEl(null);

  const handleAddAssignedStore = (store) => {
    if (!store) return;
    if (newUserAssignedStores.some((s) => s.id === store.id)) return;
    setNewUserAssignedStores((prev) => [...prev, store]);
    handleAssignMenuClose();
  };

  const handleRemoveAssignedStore = (storeId) => {
    setNewUserAssignedStores((prev) => prev.filter((s) => s.id !== storeId));
  };

  const handleAddUserSubmit = async () => {
    // Prevent non-Admins from creating Admins
    if (newUser.role === ROLES.ADMIN && !isAdmin) {
      alert("Only Admins can create other Admin users.");
      return;
    }

    // Require at least one store for non-admin roles
    if (newUser.role && newUser.role !== ROLES.ADMIN) {
      if (newUserAssignedStores.length === 0) {
        alert("Please assign at least one store for non-Admin users.");
        return;
      }
    }

    if (newUser.firstName && newUser.lastName && newUser.email && newUser.role) {
      try {
        const response = await fetch(apiUrl('/api/pac/userManagement/add'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            role: newUser.role,
            // Include assignedStores for non-admins; admins imply access to all stores
            ...(newUser.role === ROLES.ADMIN
              ? { assignedStores: [] }
              : { assignedStores: newUserAssignedStores.map((s) => ({ id: s.id, name: s.name, address: s.address })) }),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("User added successfully:", result);
                // After the "User added successfully" line:
       // Replace the invite email section in handleAddUserSubmit (around line 197)

// After user is added successfully:
try {
  console.log("📧 Triggering invite email...");
  
  const inviteResponse = await fetch(
    "https://us-central1-pacpro-ef499.cloudfunctions.net/sendUserInvite",
    {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        email: newUser.email,
        firstName: newUser.firstName,
        role: newUser.role
      }),
    }
  );

  if (inviteResponse.ok) {
    const inviteData = await inviteResponse.json();
    console.log("✅ Invite email sent:", inviteData);
    alert(`User added successfully! Invitation email sent to ${newUser.email}`);
  } else {
    const errorData = await inviteResponse.json();
    console.error("⚠️ Invite email failed:", errorData);
    alert(`User added, but failed to send invite email: ${errorData.error || 'Unknown error'}`);
  }
} catch (inviteErr) {
  console.error("⚠️ Failed to send invite:", inviteErr);
  alert(`User added, but failed to send invite email: ${inviteErr.message}`);
}
        
        fetchUsers(); // Refresh the user list
        setAddDialogOpen(false);
        setNewUser({ firstName: "", lastName: "", email: "", role: "" });
        setNewUserAssignedStores([]);
      } catch (error) {
        console.error("Error adding user:", error);
        alert(`Failed to add user: ${error.message}`);
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
    setEditAssignedStores(user.assignedStores || []);
    setEditDialogOpen(true);
    fetchAllStores();
  };

  const handleEditRoleChange = (event) => {
    setEditingUser({ ...editingUser, role: event.target.value });
  };

  const handleEditAssignMenuOpen = (event) => setEditAssignAnchorEl(event.currentTarget);
  const handleEditAssignMenuClose = () => setEditAssignAnchorEl(null);

  const handleEditAddAssignedStore = (store) => {
    if (!store) return;
    if (editAssignedStores.some((s) => s.id === store.id)) return;
    setEditAssignedStores((prev) => [...prev, store]);
    handleEditAssignMenuClose();
  };

  const handleEditRemoveAssignedStore = (storeId) => {
    setEditAssignedStores((prev) => prev.filter((s) => s.id !== storeId));
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
      // Build body according to role rules
      let body = { role: editingUser.role };
      if (editingUser.role === ROLES.ADMIN) {
        body.assignedStores = [];
      } else {
        // Non-admin must have at least one store
        if (!editAssignedStores || editAssignedStores.length === 0) {
          alert("Please assign at least one store for non-Admin users.");
          return;
        }
        body.assignedStores = editAssignedStores.map((s) => ({ id: s.id, name: s.name, address: s.address }));
      }

      const response = await fetch(apiUrl(`/api/pac/userManagement/edit?user_email=${encodeURIComponent(editingUser.email)}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("User role updated successfully:", result);
      
      fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error("Error updating user role:", error);
      alert(`Failed to update role: ${error.message}`);
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

  // --- Seach & Filter --
  const filteredUsers = users.filter((u) => {
    // --- search filter ---
    const matchesSearch =
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    // --- role filter ---
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

    // --- store filter ---
    const matchesStore =
      storeFilter === "ALL" ||
      (u.assignedStores || []).some((s) => s.id === storeFilter);

    return matchesSearch && matchesRole && matchesStore;
  });

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

      {/* Search + Filters Row */}
      <Box 
        display="flex" 
        gap={2} 
        flexWrap="wrap"
        mb={3}
        p={2} 
        sx={{ width: "100%", maxWidth: 800, margin: "0 auto" }}
      >
        {/* Search */}
        <TextField
          label="Search Users"
          variant="outlined"
          width="30%"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1, minWidth: 220 }}
        />

        {/* Role Filter */}
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Role Filter</InputLabel>
          <Select
            value={roleFilter}
            label="Role Filter"
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <MenuItem value="ALL">All Roles</MenuItem>
            {Object.values(ROLES).map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Store Filter */}
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Store Filter</InputLabel>
          <Select
            value={storeFilter}
            label="Store Filter"
            onChange={(e) => setStoreFilter(e.target.value)}
          >
            <MenuItem value="ALL">All Stores</MenuItem>

            {/* Dynamically pull stores from all users */}
            {[
              ...new Map(
                users
                  .flatMap((u) => u.assignedStores || [])
                  .map((s) => [s.id, s])
              ).values(),
            ].map((store) => (
              <MenuItem key={store.id} value={store.id}>
                {store.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Clear Filters Button */}
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            setSearchQuery("");
            setRoleFilter("ALL");
            setStoreFilter("ALL");
          }}
          sx={{ whiteSpace: "nowrap", minWidth: 130 }}
        >
          Clear Filters
        </Button>
      </Box>

      {/* User List */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {filteredUsers.map((user, index) => (
          <Paper
            key={user.email || `user-${index}`}
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

          {/* Assigned Stores Section */}
          {newUser.role === ROLES.ADMIN ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Assigned Stores</Typography>
              <Typography variant="body2" color="text.secondary">All</Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">Assigned Stores</Typography>
                <Button size="small" variant="outlined" onClick={handleAssignMenuOpen} disabled={!allStores.length}>
                  Assign Store
                </Button>
              </Box>
              <Menu anchorEl={assignAnchorEl} open={Boolean(assignAnchorEl)} onClose={handleAssignMenuClose}>
                {allStores
                  .filter((store) => !newUserAssignedStores.some((s) => s.id === store.id))
                  .map((store) => (
                    <MenuItem key={store.id} onClick={() => handleAddAssignedStore(store)}>
                      {store.name} — {store.address}
                    </MenuItem>
                  ))}
                {!allStores.length && (
                  <MenuItem disabled>No stores available</MenuItem>
                )}
              </Menu>

              <Box sx={{ mt: 1 }}>
                {newUserAssignedStores.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No stores assigned</Typography>
                ) : (
                  newUserAssignedStores.map((store) => (
                    <Paper key={store.id} variant="outlined" sx={{ p: 1, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2">{store.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{store.address}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => handleRemoveAssignedStore(store.id)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  ))
                )}
              </Box>
            </Box>
          )}
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

          {/* Edit Assigned Stores (role-dependent) */}
          {editingUser.role === ROLES.ADMIN ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Assigned Stores</Typography>
              <Typography variant="body2" color="text.secondary">All</Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">Assigned Stores</Typography>
                <Button size="small" variant="outlined" onClick={handleEditAssignMenuOpen} disabled={!allStores.length}>
                  Assign Store
                </Button>
              </Box>
              <Menu anchorEl={editAssignAnchorEl} open={Boolean(editAssignAnchorEl)} onClose={handleEditAssignMenuClose}>
                {allStores
                  .filter((store) => !editAssignedStores.some((s) => s.id === store.id))
                  .map((store) => (
                    <MenuItem key={store.id} onClick={() => handleEditAddAssignedStore(store)}>
                      {store.name} — {store.address}
                    </MenuItem>
                  ))}
                {!allStores.length && (
                  <MenuItem disabled>No stores available</MenuItem>
                )}
              </Menu>

              <Box sx={{ mt: 1 }}>
                {editAssignedStores.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No stores assigned</Typography>
                ) : (
                  editAssignedStores.map((store) => (
                    <Paper key={store.id} variant="outlined" sx={{ p: 1, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2">{store.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{store.address}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => handleEditRemoveAssignedStore(store.id)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  ))
                )}
              </Box>
            </Box>
          )}
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

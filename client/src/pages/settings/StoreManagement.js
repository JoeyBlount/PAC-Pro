import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography as MuiTypography,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../constants/roles";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentMonth = months[new Date().getMonth()];

const StoreManagement = () => {
  const { userRole } = useAuth();
  const isAccountant = userRole === ROLES.ACCOUNTANT;

  const [rows, setRows] = useState([]);
  const [prevRows, setPrevRows] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [open, setOpen] = useState(false);
  const [newStore, setNewStore] = useState({
    subName: "",
    address: "",
    storeID: "",
    entity: "",
    startMonth: currentMonth,
  });

  const [modifyMode, setModifyMode] = useState(false);
  const [editingCell, setEditingCell] = useState({ row: null, field: null });
  const [confirmChangesDialog, setConfirmChangesDialog] = useState(false);
  const [deletedRows, setDeletedRows] = useState([]);

  const [loadingStores, setLoadingStores] = useState(false);

  // Fetch active stores
  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const res = await fetch(`http://localhost:5140/api/pac/settings/storemanagement/getactive/`);
      const data = await res.json();
      setRows(data);
    } catch (err) {
      console.error("Error loading active stores:", err);
    } finally {
      setLoadingStores(false);
    }
  };

  // Fetch deleted stores that haven't expired
  const fetchDeletedStores = async () => {
    try {
      const res = await fetch(`http://localhost:5140/api/pac/settings/storemanagement/getdeleted/`);
      const data = await res.json();
      setDeletedRows(data);
    } catch (err) {
      console.error("Error loading deleted stores:", err);
    } finally {
      
    }
  };

  // Initial load
  useEffect(() => {
    fetchStores();
    fetchDeletedStores();
  }, []);

  const handleOpen = () => {
    if (isAccountant) return;
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setNewStore({
      subName: "",
      address: "",
      storeID: "",
      entity: "",
      startMonth: currentMonth,
    });
  };

  const handleChange = (e) => {
    if (isAccountant) return;
    setNewStore({ ...newStore, [e.target.name]: e.target.value });
  };

  // Add new store
  const handleSave = async () => {
    if (isAccountant) return;
    const { subName, address, storeID, entity, startMonth } = newStore;
    if (subName && address && storeID && entity && startMonth) {
      const res = await fetch(`http://localhost:5140/api/pac/settings/storemanagement/add`, {
        method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newStore)
      });
      if (!res.ok) throw new Error("Failed to add store");
      handleClose();
      fetchStores();
    }
  };

  // Move store to "deletedStores" with expiration time.
  const handleDelete = async (index) => {
    if (isAccountant) return;
    const store = rows[index];

    const res = await fetch(`http://localhost:5140/api/pac/settings/storemanagement/del/${store.id}?deletedByRole=${encodeURIComponent(userRole || "User")}`, {
        method: "DELETE"
      });
    if (!res.ok) throw new Error("Failed to delete store");

    const updated = [...rows];
    updated.splice(index, 1);
    setRows(updated);
    await fetchDeletedStores();
    setHasChanges(true);
  };

  // Restore store from deletedStores
  const handleRestore = async (row) => {
    if (isAccountant) return;
    const res = await fetch(`http://localhost:5140/api/pac/settings/storemanagement/restore/${row.deletedRefId}`, {
        method: "POST"
      });
    if (!res.ok) throw new Error("Failed to restore store");

    await fetchStores();
    await fetchDeletedStores();
    setHasChanges(true);
  };

  const handleModifyToggle = async () => {
    if (isAccountant) return;
    if (modifyMode) {
      if (hasChanges) {
        setConfirmChangesDialog(true);
      } else {
        setModifyMode(false);
      }
    } else {
      setPrevRows(JSON.parse(JSON.stringify(rows)));
      setModifyMode(true);
      await fetchDeletedStores();
    }
  };

  const handleCellClick = (rowIndex, field) => {
    if (isAccountant || !modifyMode) return;
    if (["storeID", "startMonth"].includes(field)) return;
    setEditingCell({ row: rowIndex, field });
  };

  const handleEditChange = (e, rowIndex) => {
    if (isAccountant) return;
    const updated = [...rows];
    updated[rowIndex][editingCell.field] = e.target.value;
    setRows(updated);
  };

  const handleEditBlur = () => {
    setEditingCell({ row: null, field: null });
  };

  const handleConfirmSave = async () => {
    if (isAccountant) return;
    const res = await fetch(`http://localhost:5140/api/pac/settings/storemanagement/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error("Failed to update stores");
    setModifyMode(false);
    setEditingCell({ row: null, field: null });
    setHasChanges(false);
    fetchStores();
    setConfirmChangesDialog(false);
  };

  const handleCancelSave = () => {
    if (isAccountant) return;
    setRows(prevRows);
    setModifyMode(false);
    setEditingCell({ row: null, field: null });
    setHasChanges(false);
    setConfirmChangesDialog(false);
  };

  useEffect(() => {
    if (!modifyMode) {
      setHasChanges(false);
      return;
    }
    const isEqual = JSON.stringify(rows) === JSON.stringify(prevRows);
    setHasChanges(!isEqual);
  }, [rows, prevRows, modifyMode]);

  const visibleRows = rows;

  return (
    <Container sx={{ marginTop: 10 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
          padding: 2,
          borderRadius: 2,
          boxShadow: 1,
          marginBottom: 3,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: "bold", textTransform: "uppercase" }} data-testid="store-mgmt-heading">
          Store Management
          {isAccountant && (
            <VisibilityIcon sx={{ ml: 1, color: "text.secondary", fontSize: 24 }} />
          )}
        </Typography>
        {!isAccountant && (
          <Box>
            <Button
              data-testid="modify-toggle-btn"
              variant="contained"
              sx={{
                backgroundColor: modifyMode
                  ? hasChanges
                    ? "green"
                    : "#d3d3d3"
                  : "green",
                color: "white",
                marginRight: 2,
                "&:hover": {
                  backgroundColor: modifyMode
                    ? hasChanges
                      ? "#007f00"
                      : "#c0c0c0"
                    : "#007f00",
                },
              }}
              onClick={handleModifyToggle}
            >
              {modifyMode ? "Save" : "Modify"}
            </Button>
            <Tooltip title="Add Store">
              <IconButton color="primary" onClick={handleOpen} data-testid="add-store-btn">
                <AddCircleOutlineIcon fontSize="large" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {isAccountant && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You are in view-only mode. You can view all store information but cannot make changes.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Address</strong></TableCell>
              <TableCell><strong>Store ID</strong></TableCell>
              <TableCell><strong>Entity</strong></TableCell>
              <TableCell><strong>Start Month</strong></TableCell>
              {modifyMode && !isAccountant && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingStores ? (
              <TableRow>
                <TableCell colSpan={modifyMode && !isAccountant ? 6 : 5} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row, rowIndex) => (
                <TableRow key={row.id || rowIndex}>
                  {["subName", "address", "storeID", "entity", "startMonth"].map((field) => (
                    <TableCell
                      key={field}
                      onClick={() => handleCellClick(rowIndex, field)}
                      sx={{
                        cursor:
                          !isAccountant &&
                          modifyMode &&
                          !["storeID", "startMonth"].includes(field)
                            ? "pointer"
                            : "default",
                        color:
                          !isAccountant &&
                          modifyMode &&
                          ["storeID", "startMonth"].includes(field)
                            ? "text.disabled"
                            : "text.primary",
                      }}
                    >
                      {editingCell.row === rowIndex && editingCell.field === field ? (
                        <TextField
                          value={row[field]}
                          onChange={(e) => handleEditChange(e, rowIndex)}
                          onBlur={handleEditBlur}
                          size="small"
                          autoFocus
                          disabled={isAccountant}
                        />
                      ) : (
                        row[field]
                      )}
                    </TableCell>
                  ))}
                  {modifyMode && !isAccountant && (
                    <TableCell>
                      <IconButton onClick={() => handleDelete(rowIndex)}>
                        <CancelIcon sx={{ color: "red" }} />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {modifyMode && !isAccountant && deletedRows.length > 0 && (
        <Box mt={4}>
          <Typography variant="h6">Recently Deleted (auto-removes after 1 day)</Typography>
          <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Address</strong></TableCell>
                  <TableCell><strong>Store ID</strong></TableCell>
                  <TableCell><strong>Entity</strong></TableCell>
                  <TableCell><strong>Start Month</strong></TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {deletedRows.map((row, index) => (
                  <TableRow key={row.deletedRefId || index}>
                    <TableCell>{row.subName}</TableCell>
                    <TableCell>{row.address}</TableCell>
                    <TableCell>{row.storeID}</TableCell>
                    <TableCell>{row.entity}</TableCell>
                    <TableCell>{row.startMonth}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => handleRestore(row)}
                      >
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Dialog open={open} onClose={handleClose} data-testid="add-store-dialog">
        <DialogTitle>Add New Store</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
        >
          <TextField label="Name" name="subName" value={newStore.subName} onChange={handleChange} fullWidth />
          <TextField label="Address" name="address" value={newStore.address} onChange={handleChange} fullWidth />
          <TextField label="Store ID" name="storeID" value={newStore.storeID} onChange={handleChange} fullWidth />
          <TextField label="Entity" name="entity" value={newStore.entity} onChange={handleChange} fullWidth />
          <Select label="Start Month" name="startMonth" value={newStore.startMonth} onChange={handleChange} fullWidth>
            {months.map((month, index) => (
              <MenuItem key={index} value={month}>{month}</MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">Cancel</Button>
          <Button onClick={handleSave} color="primary">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmChangesDialog} onClose={() => setConfirmChangesDialog(false)}>
        <DialogTitle>Confirm Save Changes</DialogTitle>
        <DialogContent>
          <MuiTypography variant="body1">
            You have unsaved changes. Do you want to save them before exiting?
          </MuiTypography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSave} style={{ backgroundColor: "red", color: "white" }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSave} style={{ backgroundColor: "green", color: "white" }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StoreManagement;

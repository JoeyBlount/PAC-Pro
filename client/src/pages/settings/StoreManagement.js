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
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../constants/roles";

import { db } from "../../config/firebase-config";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
  query,
  where,
} from "firebase/firestore";

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

  // Firestore collections
  const storeCollection = collection(db, "stores");
  const deletedStoreCollection = collection(db, "deletedStores");

  // Fetch active stores
  const fetchStores = async () => {
    const snapshot = await getDocs(storeCollection);
    const data = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    setRows(data);
  };

  // Fetch deleted stores that haven't expired
  const fetchDeletedStores = async () => {
    const q = query(deletedStoreCollection, where("expireAt", ">", new Date()));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => {
      const payload = d.data();
      return {
        ...payload,
        id: payload.originalId || null,
        deletedRefId: d.id,
      };
    });
    setDeletedRows(data);
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
      await addDoc(storeCollection, newStore);
      handleClose();
      fetchStores();
    }
  };

  // Move store to "deletedStores" with expiration time.
  const handleDelete = async (index) => {
    if (isAccountant) return;
    const store = rows[index];

    const expireAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)); // 1 day

    const deletedPayload = {
      originalId: store.id,
      subName: store.subName,
      address: store.address,
      entity: store.entity,
      storeID: store.storeID,
      startMonth: store.startMonth,
      deletedAt: serverTimestamp(),
      expireAt, 
      deletedByRole: userRole || null,
    };

    const deletedRef = await addDoc(deletedStoreCollection, deletedPayload);
    await deleteDoc(doc(db, "stores", store.id));

    const updatedRows = [...rows];
    updatedRows.splice(index, 1);
    setRows(updatedRows);

    setDeletedRows((prev) => [
      ...prev,
      { ...deletedPayload, id: store.id, deletedRefId: deletedRef.id },
    ]);

    setHasChanges(true);
  };

  // Restore store from deletedStores
  const handleRestore = async (row) => {
    if (isAccountant) return;
    const targetId = row.originalId || row.id;

    await setDoc(doc(db, "stores", targetId), {
      subName: row.subName,
      address: row.address,
      entity: row.entity,
      storeID: row.storeID,
      startMonth: row.startMonth,
    });

    if (row.deletedRefId) {
      await deleteDoc(doc(db, "deletedStores", row.deletedRefId));
    }

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
    for (const row of rows) {
      await updateDoc(doc(db, "stores", row.id), {
        subName: row.subName,
        address: row.address,
        entity: row.entity,
        storeID: row.storeID,
        startMonth: row.startMonth,
      });
    }
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
          // backgroundColor: "#f5f5f5",
          padding: 2,
          borderRadius: 2,
          boxShadow: 1,
          marginBottom: 3,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: "bold", textTransform: "uppercase" }}>
          Store Management
          {isAccountant && (
            <VisibilityIcon sx={{ ml: 1, color: "text.secondary", fontSize: 24 }} />
          )}
        </Typography>
        {!isAccountant && (
          <Box>
            <Button
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
              <IconButton color="primary" onClick={handleOpen}>
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
            {visibleRows.map((row, rowIndex) => (
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
            ))}
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

      <Dialog open={open} onClose={handleClose}>
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

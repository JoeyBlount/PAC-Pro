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
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CancelIcon from "@mui/icons-material/Cancel";

import { db } from "../../config/firebase-config";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentMonth = months[new Date().getMonth()];

const StoreManagement = () => {
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

  const storeCollection = collection(db, "stores");
  
  //Stores from firebase.
  const fetchStores = async () => {
    const snapshot = await getDocs(storeCollection);
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setRows(data);
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setNewStore({ subName: "", address: "", storeID: "", entity: "", startMonth: currentMonth });
  };

  //Change store data.
  const handleChange = (e) => {
    setNewStore({ ...newStore, [e.target.name]: e.target.value });
  };

  //Save changes my by user in edit/modify mode.
  const handleSave = async () => {
    const { subName, address, storeID, entity, startMonth } = newStore;
    if (subName && address && storeID && entity && startMonth) {
      await addDoc(storeCollection, newStore);
      handleClose();
      fetchStores();
    }
  };

  //Deletes store and its data, able to restore in a set amount of time in edit mode.
  const handleDelete = (index) => {
    const store = rows[index];
    const updatedRows = [...rows];
    updatedRows.splice(index, 1);
    setRows(updatedRows);

    const timerId = setTimeout(async () => {
      await deleteDoc(doc(db, "stores", store.id));
      setDeletedRows((prev) => prev.filter((item) => item.id !== store.id));
    }, 86400000); // 1 day to restore, change if needed!

    setDeletedRows((prev) => [...prev, { ...store, timerId }]);
    setHasChanges(true);
  };

  //Restores deleted table. 
  const handleRestore = (row) => {
    setRows((prev) => [...prev, row]);
    clearTimeout(row.timerId);
    setDeletedRows((prev) => prev.filter((item) => item.id !== row.id));
    setHasChanges(true);
  };

  //Eneter Editing or Modify mode.
  const handleModifyToggle = () => {
    if (modifyMode) {
      if (hasChanges) {
        setConfirmChangesDialog(true);
      } else {
        setModifyMode(false);
      }
    } else {
      setPrevRows(JSON.parse(JSON.stringify(rows)));
      setModifyMode(true);
    }
  };

  //Only able to modify when in editing mode.
  const handleCellClick = (rowIndex, field) => {
    if (!modifyMode) return;
    if (["storeID", "startMonth"].includes(field)) return;
    setEditingCell({ row: rowIndex, field });
  };

  const handleEditChange = (e, rowIndex) => {
    const updated = [...rows];
    updated[rowIndex][editingCell.field] = e.target.value;
    setRows(updated);
  };

  const handleEditBlur = () => {
    setEditingCell({ row: null, field: null });
  };

  //Confirm data changes made by user.
  const handleConfirmSave = async () => {
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

  //Avoid changes made by user in editing mode, restore prior data.
  const handleCancelSave = () => {
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

  // Filter rows to not include any that are currently in deletedRows
  const visibleRows = rows.filter(row => !deletedRows.some(d => d.id === row.id));

  return (
    <Container sx={{ marginTop: 10 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f5f5f5", padding: 2, borderRadius: 2, boxShadow: 1, marginBottom: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", textTransform: "uppercase" }}>
          Store Management
        </Typography>
        <Box>
          <Button
            variant="contained"
            sx={{
              backgroundColor: modifyMode ? hasChanges ? "green" : "#d3d3d3" : "green",
              color: "white",
              marginRight: 2,
              "&:hover": {
                backgroundColor: modifyMode ? hasChanges ? "#007f00" : "#c0c0c0" : "#007f00",
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
      </Box>

      {/* Main store data table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Address</strong></TableCell>
              <TableCell><strong>Store ID</strong></TableCell>
              <TableCell><strong>Entity</strong></TableCell>
              <TableCell><strong>Start Month</strong></TableCell>
              {modifyMode && <TableCell />}
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
                      cursor: modifyMode && !["storeID", "startMonth"].includes(field) ? "pointer" : "default",
                      color: modifyMode && ["storeID", "startMonth"].includes(field) ? "text.disabled" : "text.primary",
                    }}
                  >
                    {editingCell.row === rowIndex && editingCell.field === field ? (
                      <TextField
                        value={row[field]}
                        onChange={(e) => handleEditChange(e, rowIndex)}
                        onBlur={handleEditBlur}
                        size="small"
                        autoFocus
                      />
                    ) : (
                      row[field]
                    )}
                  </TableCell>
                ))}
                {modifyMode && (
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

      {/*Table showing user recently deleted stores (only viewable when in editing mode.) */}
      {modifyMode && deletedRows.length > 0 && (
        <Box mt={4}>
          <Typography variant="h6">Recently Deleted (Restorable within 1 day)</Typography>
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
                  <TableRow key={index}>
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

      {/* Pop up asking user to enter data in field texts to add a new store. Start month uses set months . */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Add New Store</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
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

      {/* Pop up that Asks user to confirm changes made to data. */}
      <Dialog open={confirmChangesDialog} onClose={() => setConfirmChangesDialog(false)}>
        <DialogTitle>Confirm Save Changes</DialogTitle>
        <DialogContent>
          <MuiTypography variant="body1">You have unsaved changes. Do you want to save them before exiting?</MuiTypography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSave} style={{ backgroundColor: 'red', color: 'white' }}>Cancel</Button>
          <Button onClick={handleConfirmSave} style={{ backgroundColor: 'green', color: 'white' }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StoreManagement;

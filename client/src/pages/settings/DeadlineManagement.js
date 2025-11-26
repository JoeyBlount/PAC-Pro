import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { apiUrl } from '../../utils/api';

const DeadlineManagement = () => {
  const { userRole, currentUser, getToken } = useAuth();
  const [deadlines, setDeadlines] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    type: 'pac', // pac, invoice, report
    recurring: false,
    dayOfMonth: '',
  });

  const isAdmin = userRole === ROLES.ADMIN;
  const isReadOnly = !isAdmin;

  useEffect(() => {
    fetchDeadlines();
  }, [currentUser]);

 const fetchDeadlines = async () => {
  try {
    const token = await getToken();

    const response = await fetch(apiUrl('/api/pac/deadlines'), {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': userRole || '',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    setDeadlines(data);
  } catch (error) {
    console.error('Error fetching deadlines:', error);
    showAlert('Error loading deadlines', 'error');
  } finally {
    setLoading(false);
  }
};


  const showAlert = (message, severity = 'success') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => {
      setAlert({ show: false, message: '', severity: 'success' });
    }, 5000);
  };

  const handleOpenDialog = (deadline = null) => {
    if (deadline) {
      setEditingDeadline(deadline);
      setFormData({
        title: deadline.title || '',
        description: deadline.description || '',
        dueDate: deadline.dueDate || '',
        type: deadline.type || 'pac',
        recurring: deadline.recurring || false,
        dayOfMonth: deadline.dayOfMonth || '',
      });
    } else {
      setEditingDeadline(null);
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        type: 'pac',
        recurring: false,
        dayOfMonth: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDeadline(null);
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      type: 'pac',
      recurring: false,
      dayOfMonth: '',
    });
  };

  const handleSaveDeadline = async () => {
    if (!formData.title || !formData.dueDate) {
      showAlert('Please fill in all required fields', 'error');
      return;
    }

    try {
      const deadlineData = {
        title: formData.title,
        description: formData.description || '',
        dueDate: formData.dueDate,
        type: formData.type,
        recurring: formData.recurring === true || formData.recurring === 'true',
        dayOfMonth: (formData.recurring === true || formData.recurring === 'true') ? parseInt(formData.dayOfMonth) : null,
      };

      const token = await getToken();

      const url = editingDeadline 
        ? apiUrl(`/api/pac/deadlines/${editingDeadline.id}`)
        : apiUrl('/api/pac/deadlines');
      const method = editingDeadline ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole || '',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(deadlineData)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${response.status}`);
      }

      showAlert(editingDeadline ? 'Deadline updated successfully' : 'Deadline added successfully');
      handleCloseDialog();
      fetchDeadlines();
    } catch (error) {
      console.error('Error saving deadline:', error);
      showAlert('Error saving deadline', 'error');
    }
  };

  const handleDeleteDeadline = async (deadlineId) => {
    if (!window.confirm('Are you sure you want to delete this deadline?')) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(apiUrl(`/api/pac/deadlines/${deadlineId}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole || '',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${response.status}`);
      }

      showAlert('Deadline deleted successfully');
      fetchDeadlines();
    } catch (error) {
      console.error('Error deleting deadline:', error);
      showAlert('Error deleting deadline', 'error');
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'pac':
        return 'primary';
      case 'invoice':
        return 'success';
      case 'report':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getDaysUntil = (dateString) => {
    if (!dateString) return null;
    const deadline = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineStatus = (dateString) => {
    const days = getDaysUntil(dateString);
    if (days === null) return { label: 'Unknown', color: 'default' };
    if (days < 0) return { label: 'Overdue', color: 'error' };
    if (days === 0) return { label: 'Today', color: 'error' };
    if (days <= 3) return { label: `${days} days`, color: 'warning' };
    if (days <= 7) return { label: `${days} days`, color: 'info' };
    return { label: `${days} days`, color: 'success' };
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {alert.show && (
        <Alert severity={alert.severity} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Deadline Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isReadOnly ? 'View submission deadlines' : 'Manage end-of-month submission deadlines'}
          </Typography>
        </Box>
        {!isReadOnly && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            size="large"
          >
            Add Deadline
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Title</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Due Date</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Recurring</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              {!isReadOnly && <TableCell align="right"><strong>Actions</strong></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isReadOnly ? 6 : 7} align="center">
                  Loading deadlines...
                </TableCell>
              </TableRow>
            ) : deadlines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isReadOnly ? 6 : 7} align="center">
                  <Box sx={{ py: 4 }}>
                    <EventIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      No deadlines configured yet
                    </Typography>
                    {!isReadOnly && (
                      <Typography variant="body2" color="text.secondary">
                        Click "Add Deadline" to create your first deadline
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              deadlines.map((deadline) => {
                const status = getDeadlineStatus(deadline.dueDate);
                return (
                  <TableRow key={deadline.id}>
                    <TableCell>
                      <Typography variant="body1" fontWeight={500}>
                        {deadline.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={deadline.type?.toUpperCase()}
                        color={getTypeColor(deadline.type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(deadline.dueDate)}</TableCell>
                    <TableCell>
                      <Chip
                        label={status.label}
                        color={status.color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {deadline.recurring ? (
                        <Chip
                          label={`Day ${deadline.dayOfMonth}`}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          One-time
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {deadline.description || '—'}
                      </Typography>
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(deadline)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteDeadline(deadline.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDeadline ? 'Edit Deadline' : 'Add New Deadline'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Title"
              required
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., PAC Submission Deadline"
            />

            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                label="Type"
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <MenuItem value="pac">PAC</MenuItem>
                <MenuItem value="invoice">Invoice</MenuItem>
                <MenuItem value="report">Report</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Due Date"
              type="date"
              required
              fullWidth
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about this deadline..."
            />

            <FormControl fullWidth>
              <InputLabel>Recurring</InputLabel>
              <Select
                value={formData.recurring}
                label="Recurring"
                onChange={(e) => setFormData({ ...formData, recurring: e.target.value })}
              >
                <MenuItem value={false}>One-time</MenuItem>
                <MenuItem value={true}>Monthly (Recurring)</MenuItem>
              </Select>
            </FormControl>

            {formData.recurring && (
              <TextField
                label="Day of Month"
                type="number"
                fullWidth
                value={formData.dayOfMonth}
                onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                inputProps={{ min: 1, max: 31 }}
                helperText="Enter the day of the month (1-31) when this deadline recurs"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveDeadline} variant="contained">
            {editingDeadline ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DeadlineManagement;


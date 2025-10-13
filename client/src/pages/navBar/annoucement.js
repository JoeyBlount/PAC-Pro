import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Typography, IconButton, List, ListItem, ListItemText, TextField, MenuItem } from '@mui/material';
import { Delete, ManageAccounts } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { ROLES } from '../../constants/roles';
import { useAuth } from "../../context/AuthContext";

const ManageAnnouncementsDialog = ({ open, onClose, refresh }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newRole, setNewRole] = useState("All");

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5140/api/pac/announcements/all/");
      const data = await res.json();
      setAnnouncements(data);
    } catch (err) {
      console.error("Error loading announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newMessage.trim()) return;

    const payload = {
      title: newTitle,
      message: newMessage,
      visible_to: newRole,
    };

    try {
      await fetch("http://localhost:5140/api/pac/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setNewTitle("");
      setNewMessage("");
      setNewRole("All");
      fetchAnnouncements();
      refresh(); // reload viewer
    } catch (err) {
      console.error("Failed to add announcement:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`http://localhost:5140/api/pac/announcements/${id}`, {
        method: "DELETE",
      });
      fetchAnnouncements();
      refresh();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  useEffect(() => {
    if (open) fetchAnnouncements();
  }, [open]);

  const roles = Object.values(ROLES);
  roles.unshift("All");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manage Announcements</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <CircularProgress />
        ) : (
          <List dense>
            {announcements.map((a) => (
              <ListItem
                key={a.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleDelete(a.id)}>
                    <Delete />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={`${a.title} (${a.visible_to})`}
                  secondary={a.message}
                />
              </ListItem>
            ))}
          </List>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Add New Announcement
          </Typography>
          <TextField
            label="Title"
            fullWidth
            size="small"
            sx={{ mb: 1 }}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <TextField
            label="Message"
            fullWidth
            multiline
            rows={2}
            size="small"
            sx={{ mb: 2 }}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <TextField
            label="Visible To"
            select
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          >
            {roles.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={handleAdd}>
            Add
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const AnnouncementDialog = ({ open, onClose, uRole }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [manageOpen, setManageOpen] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5140/api/pac/announcements?role=${uRole}`);
      const data = await res.json();
      setAnnouncements(data);
      setCurrentIndex(0);
    } catch (err) {
      console.error("Error fetching announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
   if (open) fetchAnnouncements();
  }, [open, uRole]);

  const handleNext = () => {
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const { userRole } = useAuth();
  const isAdmin = (userRole || "").toLowerCase() === "admin";

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="30%" fullWidth>
        <DialogTitle sx={{ display: "flex", fontWeight: "bold", textAlign: "center", justifyContent: "space-between",
            alignItems: "center",}}>

          {isAdmin && (
            <Button
              size="small"
              startIcon={<ManageAccounts />}
              onClick={() => setManageOpen(true)}
            >
              Manage
            </Button>
          )}
          
          {loading
            ? "Loading announcements..."
            : announcements.length > 0
            ? `Announcement ${currentIndex + 1} of ${announcements.length}`
            : "No annoucements"
          }
          <Box sx={{ width: 70 }} /> {/* spacer for layout balance */}
        </DialogTitle>

        <DialogContent>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : announcements.length > 0 ? (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" gutterBottom>
                {announcements[currentIndex].title}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {announcements[currentIndex].message}
              </Typography>
            </Box>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", py: 4 }}
            >
              No announcements.
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          <Box>
            <Button
            onClick={handlePrev}
            disabled={currentIndex === 0 || loading || announcements.length === 0}
            variant="outlined"
            sx={{ mr: 2 }}
          >
            Previous
          </Button>
          <Button
              onClick={handleNext}
              disabled={
                loading || currentIndex === announcements.length - 1 || announcements.length === 0
              }
              variant="contained"
            >
              Next
            </Button>
          </Box>
          <Box>
            <Button onClick={onClose} color="error" sx={{ mr: 1 }}>
              Close
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Separate Management Dialog */}
      <ManageAnnouncementsDialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        refresh={fetchAnnouncements}
      />
    </>
  );
};

export default AnnouncementDialog;
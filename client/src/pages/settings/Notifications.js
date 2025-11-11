import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  OutlinedInput,
  Chip,
  Button,
  Snackbar,
  Alert,
  Paper,
  Stack,
} from "@mui/material";

const rolesList = ["Admin", "Supervisor", "Office Manager", "General Manager", "Accountant"];

const notificationTypes = [
  "Generate Submission",
  "Invoice Submission",
  "Invoice Deletion",
  "Invoice Edit",
  "Projections Submission",
  "Locking Month",
];

export default function Notifications() {
  const [settings, setSettings] = useState([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`http://localhost:5140/api/pac/settings/notifications/`);
        const data = await res.json();
        setSettings(data);
      } catch (err) {
        console.error("Error loading notification settings:", err);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchSettings();
  }, []);

  // Handle toggle and role updates
  const handleToggle = (index) => {
    const updated = [...settings];
    updated[index].enabled = !updated[index].enabled;
    setSettings(updated);
  };

  const handleRoleChange = (index, event) => {
    const {
      target: { value },
    } = event;
    const updated = [...settings];
    updated[index].roles = typeof value === "string" ? value.split(",") : value;
    setSettings(updated);
  };

  // Save to Firestore
  const handleUpdate = async () => {
    try {
      const formattedData = {};
      settings.forEach((s) => {
        formattedData[s.type] = {
          enabled: s.enabled,
          roles: s.roles
        };
      });

      const res = await fetch(`http://localhost:5140/api/pac/settings/notifications/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData)
      });
      
      if (!res.ok) throw new Error("Failed to save settings");
      setSuccess(true);
    } catch (err) {
      console.error("Error saving notification settings:", err);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Notification Settings
      </Typography>

      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <Stack spacing={2}>
            {settings.map((setting, index) => (
              <Stack
                key={setting.type}
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{ p: 1, border: "1px solid #e0e0e0", borderRadius: 2 }}
              >
                <Typography sx={{ width: "30%" }}>{setting.type}</Typography>

                <FormControl sx={{ width: "50%" }}>
                  <InputLabel>Roles</InputLabel>
                  <Select
                    multiple
                    value={setting.roles}
                    onChange={(e) => handleRoleChange(index, e)}
                    input={<OutlinedInput label="Roles" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((role) => (
                          <Chip key={role} label={role} />
                        ))}
                      </Box>
                    )}
                  >
                    {rolesList.map((role) => (
                      <MenuItem key={role} value={role}>
                        {role}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Switch
                  checked={setting.enabled}
                  onChange={() => handleToggle(index)}
                />
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>

      <Box mt={3}>
        <Button variant="contained" color="primary" onClick={handleUpdate}>
          Update Settings
        </Button>
      </Box>

      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Settings updated successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
}

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
  Grid,
} from "@mui/material";
import { db } from "../../config/firebase-config";
import { doc, getDoc, setDoc } from "firebase/firestore";

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
        const ref = doc(db, "settings", "notifications");
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          const formatted = notificationTypes.map((type) => ({
            type,
            enabled: data[type]?.enabled ?? true,
            roles: data[type]?.roles ?? ["Admin"],
          }));
          setSettings(formatted);
        } else {
          // No doc yet — initialize with defaults
          setSettings(
            notificationTypes.map((type) => ({
              type,
              enabled: true,
              roles: ["Admin"],
            }))
          );
        }
      } catch (err) {
        console.error("Error loading notification settings:", err);
      } finally {
        setLoading(false);
      }
    };

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
      const ref = doc(db, "settings", "notifications");
      const formattedData = {};
      settings.forEach((s) => {
        formattedData[s.type] = {
          enabled: s.enabled,
          roles: s.roles,
        };
      });
      await setDoc(ref, formattedData);
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
          <Grid container spacing={2}>
            {settings.map((setting, index) => (
              <Grid
                key={setting.type}
                container
                item
                xs={12}
                alignItems="center"
                spacing={2}
                sx={{ mb: 2 }}
              >
                <Grid item xs={4}>
                  <Typography>{setting.type}</Typography>
                </Grid>

                <Grid item xs={5}>
                  <FormControl fullWidth>
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
                </Grid>

                <Grid item xs={3}>
                  <Switch
                    checked={setting.enabled}
                    onChange={() => handleToggle(index)}
                  />
                </Grid>
              </Grid>
            ))}
          </Grid>
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

import React from 'react';
import { Container, Typography, Box, Grid, Card, CardContent, CardActionArea } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import PeopleIcon from '@mui/icons-material/People';
import StoreIcon from '@mui/icons-material/Store';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ReceiptIcon from '@mui/icons-material/Receipt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EventIcon from '@mui/icons-material/Event';
import { useThemeMode } from '../../context/ThemeContext';

const Settings = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  useThemeMode();

  const settingsItems = [
    {
      title: 'User Management',
      description: 'Manage users and their roles',
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      path: '/navi/settings/user-management',
      allowedRoles: [ROLES.ADMIN]
    },
    {
      title: 'Store Management',
      description: 'Manage store locations and settings',
      icon: <StoreIcon sx={{ fontSize: 40 }} />,
      path: '/navi/settings/store-management',
      allowedRoles: [ROLES.ADMIN]
    },
    {
      title: 'Deadline Management',
      description: 'Manage submission deadlines and due dates',
      icon: <EventIcon sx={{ fontSize: 40 }} />,
      path: '/navi/settings/deadline-management',
      allowedRoles: [ROLES.ADMIN]
    },
    {
      title: 'Notifications',
      description: 'Configure system notifications',
      icon: <NotificationsIcon sx={{ fontSize: 40 }} />,
      path: '/navi/settings/notifications',
      allowedRoles: [ROLES.ADMIN]
    },
    {
      title: 'Invoice Settings',
      description: 'Configure invoice categories and settings',
      icon: <ReceiptIcon sx={{ fontSize: 40 }} />,
      path: '/navi/settings/invoice-settings',
      allowedRoles: [ROLES.ADMIN, ROLES.ACCOUNTANT],
      readOnlyRoles: [ROLES.ACCOUNTANT]
    },
  ];

  const handleClick = (item) => {
    if (item.allowedRoles.includes(userRole)) {
      navigate(item.path);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {settingsItems.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.title}>
  <Card
    sx={{
      height: '100%',
      opacity: item.allowedRoles.includes(userRole) ? 1 : 0.5,
      cursor: item.allowedRoles.includes(userRole)
        ? 'pointer'
        : 'not-allowed',
    }}
  >
    {/* If it's a clickable card (has path), wrap with CardActionArea */}
    {item.path ? (
      <CardActionArea
        onClick={() => handleClick(item)}
        disabled={!item.allowedRoles.includes(userRole)}
        sx={{ height: '100%' }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {item.icon}
            <Typography variant="h6" sx={{ ml: 2 }}>
              {item.title}
            </Typography>
            {item.readOnlyRoles?.includes(userRole) && (
              <VisibilityIcon
                sx={{
                  ml: 1,
                  color: 'text.secondary',
                  fontSize: 20,
                }}
              />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary">
            {item.description}
          </Typography>

          {!item.allowedRoles.includes(userRole) && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              Access denied
            </Typography>
          )}
          {item.readOnlyRoles?.includes(userRole) && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              View only
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    ) : (
      // Handle non-clickable items (like Dark Mode)
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {item.icon}
          <Typography variant="h6" sx={{ ml: 2 }}>
            {item.title}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {item.description}
        </Typography>

        {/* ✅ Action (Dark Mode Switch) */}
        {item.action && (
          <Box sx={{ mt: 1 }}>
            {item.action}
          </Box>
        )}
      </CardContent>
    )}
  </Card>
</Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Settings;

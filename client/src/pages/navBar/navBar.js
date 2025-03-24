import React from 'react';
import { useNavigate } from 'react-router-dom';
import './navBar.css';
import { auth } from "../../config/firebaseConfigEmail";
import { signOut } from "firebase/auth";
import { Button, Drawer, ListItemText, Box, List, ListItemButton, ListItemIcon, IconButton, ButtonGroup, Tooltip, Menu, MenuItem } from '@mui/material';
import { Home, Logout, Settings, Analytics, UploadFile, ReceiptLong, Summarize, MenuOpen, AccountCircleRounded } from '@mui/icons-material'

export function NavBar() {
    const navigate = useNavigate();

    function handleNav(path) {
        navigate('/navi/' + path);
    }

    async function handleSignOut() {
        try {
            await signOut(auth);
            localStorage.removeItem("user");
            navigate('/');
        } catch (e) {
            console.error("An error has occured while signing out: ", e);
        }
    }

    const [open, setOpen] = React.useState(false);

    const toggleDrawer = (newOpen) => () => {
        setOpen(newOpen);
    }

    const [anchorEl, setAnchorE1] = React.useState(null);

    const openMenu = Boolean(anchorEl);

    const handleMenuClick = (event) => { setAnchorE1(event.currentTarget); };
    const handleMenuClose = () => { setAnchorE1(null); };

    return (
        <>
        <div className = "topNavBar">
            <span className = "menuButton">
                <Button variant = "text" startIcon={<MenuOpen />} onClick={toggleDrawer(true)}>
                Menu
                </Button>
            </span>

            <span className = "softwareName">
                PAC Pro
            </span>

            <span className = "logoutButton">
                <IconButton aria-label= 'Logout' color="primary" onClick={() => handleSignOut()}>
                    <Logout />
                </IconButton>
            </span>

            <span className ="accountButton">
                <IconButton aria-label='Account' color="primary" onClick={handleMenuClick}>
                    <AccountCircleRounded />
                </IconButton>
                <Menu id="avatar-menu" anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose} anchorOrigin={{vertical: 'bottom',  horizontal: 'center'}} transformOrigin={{vertical: 'top', horizontal: 'right'}}>
                    <MenuItem onClick={() => {handleMenuClose(); handleNav("account")}}>Account Infomation</MenuItem>
                    <MenuItem onClick={() => {handleMenuClose(); handleNav("settings")}}>Settings</MenuItem>
                    <MenuItem onClick={() => {handleMenuClose(); handleSignOut()}}>Logout</MenuItem>
                </Menu>
            </span>
        </div>

        <div className = "leftNavBar">
            {/* Save for Future */}
            <ButtonGroup orientation='vertical' aria-label="Quick navigation buttons" variant='text'>
                <Tooltip title='Home' placement='right'>
                    <IconButton aria-label='Home' color='primary' onClick={() => handleNav("dashboard")}>
                        <Home />
                    </IconButton>
                </Tooltip>
                <Tooltip title='Invoice Logs' placement='right'>
                    <IconButton aria-label='Invoice Logs' color='primary' onClick={() => handleNav("invoiceLogs")}>
                        <ReceiptLong />
                    </IconButton>
                </Tooltip>
                <Tooltip title='Submit New Invoice' placement='right'>
                    <IconButton aria-label='Submit New Invoice' color='primary' onClick={() => handleNav("submitInvoice")}>
                        <UploadFile />
                    </IconButton>
                </Tooltip>
                <Tooltip title='Reports' placement='right'>
                    <IconButton aria-label='Reports' color='primary' onClick={() => handleNav("reports")}>
                        <Summarize />
                    </IconButton>
                </Tooltip>
                <Tooltip title='PAC' placement='right'>
                    <IconButton aria-label='PAC' color='primary' onClick={() => handleNav("pac")}>
                        <Analytics />
                    </IconButton>
                </Tooltip>
            </ButtonGroup>
        </div>

        <Drawer open = {open} onClose={toggleDrawer(false)}>
            <Box sx={{width: 250}} role="navigation" onClick={toggleDrawer(false)}>
                <List component='nav'>
                    <ListItemButton button onClick={() => handleNav('dashboard')}>
                        <ListItemIcon> <Home /> </ListItemIcon>
                        <ListItemText primary="Home" />
                    </ListItemButton>

                    <ListItemButton button onClick={() => handleNav('invoiceLogs')}>
                        <ListItemIcon> <ReceiptLong /> </ListItemIcon>
                        <ListItemText primary="Invoice Logs" />
                    </ListItemButton>

                    <ListItemButton button onClick={() => handleNav('submitInvoice')}>
                        <ListItemIcon> <UploadFile /> </ListItemIcon>
                        <ListItemText primary="Submit New Invoice" />
                    </ListItemButton>

                    <ListItemButton button onClick={() => handleNav('reports')}>
                        <ListItemIcon> <Summarize /> </ListItemIcon>
                        <ListItemText primary="Reports" />
                    </ListItemButton>

                    <ListItemButton button onClick={() => handleNav('pac')}>
                        <ListItemIcon> <Analytics /> </ListItemIcon>
                        <ListItemText primary="PAC" />
                    </ListItemButton>

                    <ListItemButton button onClick={() => handleNav('settings')}>
                        <ListItemIcon> <Settings /> </ListItemIcon>
                        <ListItemText primary="Settings" />
                    </ListItemButton>

                    <ListItemButton button onClick={() => handleSignOut()}>
                        <ListItemIcon> <Logout /> </ListItemIcon>
                        <ListItemText primary="Logout" />
                    </ListItemButton>
                </List>
            </Box>
        </Drawer>
        </>
    );
}
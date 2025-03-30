import React from "react";
import { useNavigate } from "react-router-dom";
import "./navBar.css";
import { auth } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Button,
  Tooltip,
  Menu,
  MenuItem as MenuOption,
} from "@mui/material";
import {
  Home,
  ReceiptLong,
  UploadFile,
  Summarize,
  Analytics,
  Settings,
  Logout,
  AccountCircle,
  Storefront,
  Menu as MenuIcon,
  Close as CloseIcon,
  Dashboard,
} from "@mui/icons-material";

export function NavBar() {
  const navigate = useNavigate();

  // Collapsible side nav state
  const [sideNavOpen, setSideNavOpen] = React.useState(false);

  // Add ref for the side nav
  const sideNavRef = React.useRef(null);

  // Add click outside handler
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (
        sideNavRef.current &&
        !sideNavRef.current.contains(event.target) &&
        !event.target.closest(".hamburgerButton")
      ) {
        setSideNavOpen(false);
      }
    }

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Account menu anchor
  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);

  const handleAccountMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleAccountMenuClose = () => setAnchorEl(null);

  // Demo user info
  const firstName = "John";

  // Store selection state and sample data
  const [store, setStore] = React.useState("");
  const stores = [
    { id: "store1", number: "001", subName: "Sunrise" },
    { id: "store2", number: "002", subName: "Douglas Mcdonalds" },
  ];

  const handleStoreChange = (event) => {
    setStore(event.target.value);
    // TODO: Refresh data accordingly
  };

  const getSelectedStoreText = () => {
    const selectedStore = stores.find((s) => s.id === store);
    return selectedStore
      ? `${selectedStore.number} - ${selectedStore.subName}`
      : "Select Store";
  };

  // Navigate helper
  function handleNav(path) {
    navigate("/navi/" + path);
  }

  // Sign out logic
  async function handleSignOut() {
    try {
      await signOut(auth);
      localStorage.removeItem("user");
      navigate("/");
    } catch (e) {
      console.error("An error has occurred while signing out: ", e);
    }
  }

  return (
    <>
      {/* TOP NAV BAR */}
      <div className="topNavBar">
        {/* Left side: Hamburger icon & store selector */}
        <div className="topNavLeft">
          {/* Hamburger icon: toggles side nav open/close */}
          <IconButton
            className="hamburgerButton"
            onClick={() => setSideNavOpen(!sideNavOpen)}
          >
            {sideNavOpen ? (
              <CloseIcon sx={{ fontSize: 28 }} />
            ) : (
              <MenuIcon sx={{ fontSize: 28 }} />
            )}
          </IconButton>

          {/* Extra spacing is now added by the hamburgerButton margin-right */}

          {/* Store Selector */}
          <div className="storeSelectorWrapper">
            <FormControl variant="outlined" size="small">
              <InputLabel id="store-select-label">
                <Storefront />
              </InputLabel>
              <Select
                labelId="store-select-label"
                id="store-select"
                value={store}
                onChange={handleStoreChange}
                label="Store"
                style={{ minWidth: 180 }}
                renderValue={() => getSelectedStoreText()}
              >
                {stores.map((storeItem) => (
                  <MenuItem key={storeItem.id} value={storeItem.id}>
                    {storeItem.number} - {storeItem.subName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Spacer pushes account button to far right */}
        <div className="spacer" />

        {/* Account Button */}
        <div className="accountButton">
          <Button
            className="accountBtn"
            onClick={handleAccountMenuClick}
            startIcon={<AccountCircle sx={{ fontSize: 22 }} />}
          >
            {firstName}
          </Button>
          <Menu
            id="avatar-menu"
            anchorEl={anchorEl}
            open={openMenu}
            onClose={handleAccountMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuOption
              onClick={() => {
                handleAccountMenuClose();
                handleNav("account");
              }}
            >
              Account Information
            </MenuOption>
          </Menu>
        </div>
      </div>

      {/* COLLAPSIBLE LEFT NAV BAR */}
      <div
        ref={sideNavRef}
        className={`leftNavBar ${sideNavOpen ? "open" : ""}`}
      >
        <div className="sideNavContent">
          {/* Top section (main icons) */}
          <div className="sideNavMain">
            <Tooltip title="Dashboard" placement="left">
              <Button
                className="navItem"
                onClick={() => handleNav("dashboard")}
                startIcon={<Dashboard />}
              >
                {sideNavOpen && "Home"}
              </Button>
            </Tooltip>
            <Tooltip title="Invoice Logs" placement="left">
              <Button
                className="navItem"
                onClick={() => handleNav("invoiceLogs")}
                startIcon={<ReceiptLong />}
              >
                {sideNavOpen && "Invoice Logs"}
              </Button>
            </Tooltip>
            <Tooltip title="Submit Invoice" placement="left">
              <Button
                className="navItem"
                onClick={() => handleNav("submitInvoice")}
                startIcon={<UploadFile />}
              >
                {sideNavOpen && "Submit Invoice"}
              </Button>
            </Tooltip>
            <Tooltip title="Reports" placement="left">
              <Button
                className="navItem"
                onClick={() => handleNav("reports")}
                startIcon={<Summarize />}
              >
                {sideNavOpen && "Reports"}
              </Button>
            </Tooltip>
            <Tooltip title="PAC" placement="left">
              <Button
                className="navItem"
                onClick={() => handleNav("pac")}
                startIcon={<Analytics />}
              >
                {sideNavOpen && "PAC"}
              </Button>
            </Tooltip>
          </div>

          {/* Bottom section (Settings & Logout) */}
          <div className="sideNavBottom">
            <Tooltip title="Settings" placement="left">
              <Button
                className="navItem"
                onClick={() => handleNav("settings")}
                startIcon={<Settings />}
              >
                {sideNavOpen && "Settings"}
              </Button>
            </Tooltip>
            <Tooltip title="Logout" placement="left">
              <Button
                className="navItem"
                onClick={handleSignOut}
                startIcon={<Logout />}
              >
                {sideNavOpen && "Logout"}
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </>
  );
}

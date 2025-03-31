import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { TiThMenu } from "react-icons/ti";
import './navBar.css';
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
import { StoreContext } from "../../context/storeContext"; // Import StoreContext

export function NavBar() {
  const navigate = useNavigate();
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const sideNavRef = React.useRef(null);

  // Replace hardcoded data with state
  const [userData, setUserData] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get global selected store from context
  const { selectedStore, setSelectedStore } = useContext(StoreContext);

  // Fetch data from JSON file
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/navBarTest.json");
        const data = await response.json();
        setUserData(data.userData);
        setStores(data.stores);
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update store change handler
  const handleStoreChange = (event) => {
    const newStore = event.target.value;
    setSelectedStore(newStore);
    // Optionally, trigger refresh of data in other components here
  };

  // Update store text getter
  const getSelectedStoreText = () => {
    const selected = stores.find((s) => s.storeNum === selectedStore);
    return selected
      ? `${selected.storeNum} - ${selected.subName}`
      : "Select Store";
  };

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        sideNavRef.current &&
        !sideNavRef.current.contains(event.target) &&
        !event.target.closest(".hamburgerButton")
      ) {
        setSideNavOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
        <div className="topNavLeft">
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

          <div className="storeSelectorWrapper">
            <FormControl variant="outlined" size="small">
              <InputLabel id="store-select-label">
                <Storefront />
              </InputLabel>
              <Select
                labelId="store-select-label"
                id="store-select"
                value={selectedStore}
                onChange={handleStoreChange}
                label="Store"
                style={{ minWidth: 180 }}
                renderValue={() => getSelectedStoreText()}
              >
                {stores.map((store) => (
                  <MenuItem key={store.storeNum} value={store.storeNum}>
                    {store.storeNum} - {store.subName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>

        <div className="spacer" />

        <div className="accountButton">
          <Button
            className="accountBtn"
            onClick={() => handleNav("account")}
            startIcon={<AccountCircle sx={{ fontSize: 22 }} />}
          >
            {loading ? "Loading..." : userData?.firstName || "User"}
          </Button>
        </div>
      </div>

      <div
        ref={sideNavRef}
        className={`leftNavBar ${sideNavOpen ? "open" : ""}`}
      >
        <div className="sideNavContent">
          <div className="sideNavMain">
            <Tooltip title="Dashboard" placement="left">
              <Button
                className="navItem"
                onClick={() => handleNav("dashboard")}
                startIcon={<Dashboard />}
              >
                {sideNavOpen && "Dashboard"}
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

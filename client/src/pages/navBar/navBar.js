import React, { useState, useContext, useEffect } from "react";
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
  Print,
  Assessment,
  TrendingUp,
  BarChart,
} from "@mui/icons-material";
import { StoreContext } from "../../context/storeContext"; // Import StoreContext
// Import Firestore functions
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase-config";

export function NavBar() {
  const navigate = useNavigate();
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false);
  const [reportsHoverTimeout, setReportsHoverTimeout] = useState(null);
  const sideNavRef = React.useRef(null);
  const reportsRef = React.useRef(null);

  // Replace hardcoded data with state
  const [userData, setUserData] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // reports config for dropdown - PAC Actual report and Invoice Log
  const reportsList = [
    {
      id: 'pac-actual-report',
      name: 'PAC Actual Report',
      icon: <Analytics />,
      path: '/navi/pac',
      description: 'View and print PAC Actual report'
    },
    {
      id: 'invoice-log-report',
      name: 'Invoice Log',
      icon: <ReceiptLong />,
      path: '/navi/invoiceLogs',
      description: 'View and print invoice log report'
    }
  ];

  // Get global selected store from context
  const { selectedStore, setSelectedStore } = useContext(StoreContext);

  // Fetch user and stores data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get the current user from Firebase Auth
        const user = auth.currentUser;
        if (user) {
          // Query the "users" collection for the current user's data
          const userQuery = query(
            collection(db, "users"),
            where("uid", "==", user.uid)
          );
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            setUserData(userSnapshot.docs[0].data());
          }
        }
        // Get all stores from Firestore
        const storesSnapshot = await getDocs(collection(db, "stores"));
        const storesData = storesSnapshot.docs.map((doc) => doc.data());
        setStores(storesData);
        
        // Set default store if none selected and stores are available
        if (!selectedStore && storesData.length > 0) {
          setSelectedStore(storesData[0].id);
        }
      } catch (error) {
        console.error("Error loading data from Firestore:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedStore, setSelectedStore]);

  // Update store change handler
  const handleStoreChange = (event) => {
    const newStore = event.target.value;
    setSelectedStore(newStore);
    // Optionally, trigger refresh of data in other components here
  };

  // Update store text getter to use storeId
  const getSelectedStoreText = () => {
    if (!selectedStore || stores.length === 0) {
      return "Select Store";
    }
    const selected = stores.find((s) => s.id === selectedStore);
    if (!selected) {
      return "Select Store";
    }
    return `${selected.storeID} - ${selected.subName}`;
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
      
      // Handle reports dropdown click outside
      if (
        reportsRef.current &&
        !reportsRef.current.contains(event.target) &&
        !event.target.closest(".reports-button")
      ) {
        setReportsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      // Clean up timeout on unmount
      if (reportsHoverTimeout) {
        clearTimeout(reportsHoverTimeout);
      }
    };
  }, [reportsHoverTimeout]);

  // Navigate helper
  function handleNav(path) {
    navigate("/navi/" + path);
  }

  // Handle report navigation with auto-print
  function handleReportNavigation(report) {
    console.log('Navigating to report:', report.name, 'at path:', report.path);
    navigate(report.path);
    setReportsDropdownOpen(false);
    
    // Auto-trigger print/export after a delay to allow page load
    setTimeout(() => {
      console.log('Attempting to auto-trigger print/export for:', report.name);
      if (report.id === 'pac-actual-report') {
        const tabButtons = document.querySelectorAll('[role="tab"], .MuiTab-root, button[data-tab]');
        const actualTab = Array.from(tabButtons).find(btn => 
          btn.textContent.toLowerCase().includes('actual') ||
          btn.getAttribute('data-tab') === '2'
        );
        if (actualTab) {
          console.log('Switching to Actual tab...');
          actualTab.click();
        }
        
        
        setTimeout(() => {
          const buttons = document.querySelectorAll('button');
          const printBtn = Array.from(buttons).find(btn => 
            btn.textContent.toLowerCase().includes('print report') ||
            btn.textContent.toLowerCase().includes('print')
          );
          if (printBtn) {
            console.log('Found print button, clicking...');
            printBtn.click();
          } else {
            console.log('No print button found');
          }
        }, 1000); // Wait 1 second for tab to load
      } else if (report.id === 'invoice-log-report') {
        // For Invoice Log, just open the export dialog
        const buttons = document.querySelectorAll('button');
        const exportBtn = Array.from(buttons).find(btn => 
          btn.textContent.toLowerCase().includes('export')
        );
        if (exportBtn) {
          console.log('Found export button, opening dialog...');
          exportBtn.click();
        } else {
          console.log('No export button found');
        }
      }
    }, 1500); 
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
                  <MenuItem key={store.id} value={store.id}>
                    {store.storeID} - {store.subName}
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
            <div 
              className="reports-container" 
              ref={reportsRef}
              onMouseEnter={() => {
                if (reportsHoverTimeout) {
                  clearTimeout(reportsHoverTimeout);
                  setReportsHoverTimeout(null);
                }
                setReportsDropdownOpen(true);
              }}
              onMouseLeave={() => {
                const timeout = setTimeout(() => {
                  setReportsDropdownOpen(false);
                }, 300); // 300ms delay before closing
                setReportsHoverTimeout(timeout);
              }}
            >
              <Tooltip title="Reports" placement="left">
                <Button
                  className="navItem reports-button"
                  onClick={() => handleNav("reports")}
                  startIcon={<Summarize />}
                >
                  {sideNavOpen && "Reports"}
                </Button>
              </Tooltip>
              
              {/* Reports Dropdown */}
              {reportsDropdownOpen && (
                <div 
                  className="reports-dropdown"
                  onMouseEnter={() => {
                    if (reportsHoverTimeout) {
                      clearTimeout(reportsHoverTimeout);
                      setReportsHoverTimeout(null);
                    }
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => {
                      setReportsDropdownOpen(false);
                    }, 300);
                    setReportsHoverTimeout(timeout);
                  }}
                >
                  {reportsList.map((report) => (
                    <div
                      key={report.id}
                      className="report-item"
                      onClick={() => handleReportNavigation(report)}
                    >
                      <div className="report-icon">
                        {report.icon}
                      </div>
                      <div className="report-content">
                        <div className="report-name">{report.name}</div>
                        <div className="report-description">{report.description}</div>
                      </div>
                      <div className="report-print-icon">
                        <Print />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

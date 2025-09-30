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
  Badge,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
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
  Notifications,
  Delete,
  PersonAdd,
  DoneAll,

} from "@mui/icons-material";
import { StoreContext } from "../../context/storeContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../config/firebase-config";

// Helper to format timestamps into "x minutes ago"
function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const date =
    timestamp.toDate ? timestamp.toDate() : new Date(timestamp); // Firestore Timestamp -> Date
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

export function NavBar() {
  const navigate = useNavigate();
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false);
  const sideNavRef = React.useRef(null);
  const reportsRef = React.useRef(null);

  const [userData, setUserData] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
    // Notifications state (from main)
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  // Reports configuration (from scrum304,305,307)
  const reportsList = [
    {
      id: 'sales-report',
      name: 'Sales Report',
      icon: <TrendingUp />,
      path: '/navi/reports/sales',
      description: ''
    },
    {
      id: 'inventory-report',
      name: 'Inventory Report',
      icon: <Assessment />,
      path: '/navi/reports/inventory',
      description: ''
    },
    {
      id: 'financial-report',
      name: 'Financial Report',
      icon: <BarChart />,
      path: '/navi/reports/financial',
      description: ''
    },
    {
      id: 'pac-report',
      name: 'PAC Report',
      icon: <Analytics />,
      path: '/navi/reports/pac',
      description: ''
    }
  ];

  const { selectedStore, setSelectedStore } = useContext(StoreContext);

  // Fetch user + stores
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (user) {
          const userQuery = query(
            collection(db, "users"),
            where("uid", "==", user.uid)
          );
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            setUserData(userSnapshot.docs[0].data());
          }
        }

        const storesSnapshot = await getDocs(collection(db, "stores"));
        const storesData = storesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStores(storesData);

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
  }, []);

  // Notifications listener
  useEffect(() => {
    if (!auth.currentUser) return;
    console.log("Current user email:", auth.currentUser?.email);

    const q = query(
      collection(db, "notifications"),
      where("toEmail", "==", auth.currentUser.email),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(notifs);
    });

    return () => unsub();
  }, []);

  // Helpers
  const handleStoreChange = (event) => {
    setSelectedStore(event.target.value);
  };

  const getSelectedStoreText = () => {
    if (!selectedStore || stores.length === 0) return "Select Store";
    const selected = stores.find((s) => s.id === selectedStore);
    return selected ? `${selected.storeID} - ${selected.subName}` : "Select Store";
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
    };
  }, []);
  // Navigate helper
  function handleNav(path) {
    navigate("/navi/" + path);
  }


  // Handle report navigation with auto-print
  function handleReportNavigation(report) {
    navigate(report.path);
    setReportsDropdownOpen(false);
    
    // Auto-trigger print after a short delay to allow page load
    setTimeout(() => {
      const printButton = document.querySelector('.print-button, [data-print="true"], button[aria-label*="print"], button[aria-label*="Print"]');
      if (printButton) {
        printButton.click();
      } else {
        // Fallback: try to find any button with print-related text
        const buttons = document.querySelectorAll('button');
        const printBtn = Array.from(buttons).find(btn => 
          btn.textContent.toLowerCase().includes('print') || 
          btn.textContent.toLowerCase().includes('export')
        );
        if (printBtn) {
          printBtn.click();
        }
      }
    }, 1000); // 1 second delay to allow page to load
  }

  // Sign out logic

  async function handleSignOut() {
    try {
      await signOut(auth);
      localStorage.removeItem("user");
      navigate("/");
    } catch (e) {
      console.error("Error signing out: ", e);
    }
  }

  // Mark single notification as read
  async function markAsRead(notifId) {
    try {
      const notifRef = doc(db, "notifications", notifId);
      await updateDoc(notifRef, { read: true, readAt: new Date() });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }

  // Mark all notifications as read
  async function markAllAsRead() {
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        if (!n.read) {
          const notifRef = doc(db, "notifications", n.id);
          batch.update(notifRef, { read: true, readAt: new Date() });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  }

  // Notification dropdown
  const open = Boolean(anchorEl);
  const handleNotifClick = (event) => setAnchorEl(event.currentTarget);
  const handleNotifClose = () => setAnchorEl(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const typeToIcon = {
    invoice_submitted: <ReceiptLong fontSize="small" color="primary" />,
    invoice_deleted: <Delete fontSize="small" color="error" />,
    projection_generated: <Analytics fontSize="small" color="success" />,
    welcome: <PersonAdd fontSize="small" color="secondary" />,
  };

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

        <div
          className="accountSection"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          {/* Notifications Bell */}
          <IconButton
            className="notificationBtn"
            onClick={handleNotifClick}
          >
            <Badge badgeContent={unreadCount} color="error">
              <Notifications sx={{ fontSize: 24 }} />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleNotifClose}
            PaperProps={{
              style: { maxHeight: 400, width: "340px" },
            }}
          >
            {notifications.length === 0 && (
              <MenuItem disabled>No notifications</MenuItem>
            )}

            {notifications.length > 0 && (
              <>
                <MenuItem
                  onClick={async () => {
                    await markAllAsRead();
                    handleNotifClose();
                  }}
                  style={{ fontWeight: 600 }}
                >
                  <ListItemIcon>
                    <DoneAll fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Mark all as read" />
                </MenuItem>
                <Divider />
              </>
            )}

            {notifications.map((notif) => (
              <div key={notif.id}>
                <MenuItem
                  onClick={async () => {
                    await markAsRead(notif.id);
                    handleNotifClose();
                    if (notif.invoiceId) {
                      navigate(`/invoice/${notif.invoiceId}`);
                    }
                  }}
                  style={{
                    whiteSpace: "normal",
                    maxWidth: "300px",
                    opacity: notif.read ? 0.6 : 1, // gray out read
                  }}
                >
                  <ListItemIcon>
                    {typeToIcon[notif.type] || <Notifications fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{
                      style: {
                        fontWeight: notif.read ? 400 : 600,
                        fontStyle: notif.read ? "italic" : "normal",
                      },
                    }}
                    secondaryTypographyProps={{
                      style: { whiteSpace: "normal" },
                    }}
                    primary={notif.title}
                    secondary={
                      <>
                        {notif.message}
                        <br />
                        <span style={{ fontSize: "0.75rem", color: "#666" }}>
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </>
                    }
                  />
                </MenuItem>
                <Divider />
              </div>
            ))}
          </Menu>

          {/* Account Button */}
          <Button
            className="accountBtn"
            onClick={() => handleNav("account")}
            startIcon={<AccountCircle sx={{ fontSize: 22 }} />}
          >
            {loading ? "Loading..." : userData?.firstName || "User"}
          </Button>
        </div>
      </div>

      {/* SIDE NAV */}
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
              onMouseEnter={() => setReportsDropdownOpen(true)}
              onMouseLeave={() => setReportsDropdownOpen(false)}
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
                <div className="reports-dropdown">
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

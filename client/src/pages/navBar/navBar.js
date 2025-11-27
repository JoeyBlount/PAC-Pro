import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./navBar.css";
import { auth } from "../../config/firebase-config";
import { signOut } from "firebase/auth";
import { useAuth } from "../../context/AuthContext";
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
  useTheme,
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
  Notifications,
  Delete,
  PersonAdd,
  DoneAll,
  Campaign,
} from "@mui/icons-material";
import { StoreContext } from "../../context/storeContext";
import AnnoucementDialog from "./announcement";
import { apiUrl } from "../../utils/api";

// Helper to format timestamps into "x minutes ago"
function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp); // Firestore Timestamp -> Date
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
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false);
  const [reportsHoverTimeout, setReportsHoverTimeout] = useState(null);
  const sideNavRef = React.useRef(null);
  const reportsRef = React.useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [userData, setUserData] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // reports config for dropdown - PAC Actual report and Invoice Log
  const reportsList = [
    {
      id: "pac-actual-report",
      name: "PAC Actual Report",
      icon: <Analytics />,
      path: "/navi/pac",
      description: "View and print PAC Actual report",
    },
    {
      id: "invoice-log-report",
      name: "Invoice Log",
      icon: <ReceiptLong />,
      path: "/navi/invoiceLogs",
      description: "View and print invoice log report",
    },
  ];

  const { selectedStore, setSelectedStore } = useContext(StoreContext);

  // Fetch allowed stores from backend and basic user info
  useEffect(() => {
    const fetchData = async () => {
      if (authLoading || !currentUser) {
        return;
      }

      setLoading(true);
      try {
        let headers = {
          "Content-Type": "application/json",
        };

        // Handle authentication for both Firebase and Microsoft users
        if (currentUser.authMethod === "microsoft") {
          // For Microsoft users, use credentials with session cookies
          headers["X-Auth-Method"] = "microsoft";
        } else if (auth.currentUser) {
          // For Firebase users, use ID token
          const token = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } else {
          // Fallback for dev mode
          headers["X-Dev-Email"] = "dev@example.com";
        }

        // Load allowed stores from backend
        const res = await fetch(apiUrl("/api/pac/nav/allowed-stores"), {
          method: "GET",
          headers: headers,
          credentials: "include",
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Failed to load stores: ${res.status} - ${errText}`);
        }
        const data = await res.json();
        const storesData = data.stores || [];
        setStores(storesData);

        // Set default selected store if not set
        if (!selectedStore && storesData.length > 0) {
          setSelectedStore(storesData[0].id);
        }

        // Set user data for display - use currentUser from AuthContext
        setUserData({
          firstName: currentUser.displayName?.split(" ")[0] || "User",
          email: currentUser.email,
        });
      } catch (error) {
        console.error("Error loading allowed stores:", error);
        setStores([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, currentUser, selectedStore, setSelectedStore]);

  // Helpers
  const handleStoreChange = (event) => {
    setSelectedStore(event.target.value);
  };

  const getSelectedStoreText = () => {
    if (!selectedStore || stores.length === 0) return "Select Store";
    const selected = stores.find((s) => s.id === selectedStore);
    return selected
      ? `${selected.storeID} - ${selected.subName}`
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
    //console.log('Navigating to report:', report.name, 'at path:', report.path);
    navigate(report.path);
    setReportsDropdownOpen(false);

    // Auto-trigger print/export after a delay to allow page load
    setTimeout(() => {
      //console.log('Attempting to auto-trigger print/export for:', report.name);
      if (report.id === 'pac-actual-report') {
        const tabButtons = document.querySelectorAll('[role="tab"], .MuiTab-root, button[data-tab]');
        const actualTab = Array.from(tabButtons).find(btn => 
          btn.textContent.toLowerCase().includes('actual') ||
          btn.getAttribute('data-tab') === '2'
        );
        if (actualTab) {
          //console.log('Switching to Actual tab...');
          actualTab.click();
        }

        setTimeout(() => {
          const buttons = document.querySelectorAll("button");
          const printBtn = Array.from(buttons).find(
            (btn) =>
              btn.textContent.toLowerCase().includes("print report") ||
              btn.textContent.toLowerCase().includes("print")
          );
          if (printBtn) {
            //console.log('Found print button, clicking...');
            printBtn.click();
          } else {
            //console.log('No print button found');
          }
        }, 1000); // Wait 1 second for tab to load
      } else if (report.id === "invoice-log-report") {
        // For Invoice Log, just open the export dialog
        const buttons = document.querySelectorAll("button");
        const exportBtn = Array.from(buttons).find((btn) =>
          btn.textContent.toLowerCase().includes("export")
        );
        if (exportBtn) {
          //console.log('Found export button, opening dialog...');
          exportBtn.click();
        } else {
          //console.log('No export button found');
        }
      }
    }, 1500);
  }

  // Sign out logic
  async function handleSignOut() {
    try {
      // Sign out of Firebase if logged in
      try {
        await signOut(auth);
      } catch {}

      // Clear backend Microsoft session cookie
      const BASE_URL = (
        process.env.REACT_APP_BACKEND_URL || "http://localhost:5140"
      ).replace(/\/+$/, "");
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      // Clear local storage and redirect
      localStorage.removeItem("user");
      navigate("/");
    } catch (e) {
      console.error("Error signing out: ", e);
      // Force redirect even on error
      localStorage.removeItem("user");
      navigate("/");
    }
  }

  // Notifications Related
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loadingNotifications, setLoadingNotificaitons] = useState([]);

  // Notifications listener
  useEffect(() => {
    if (!auth.currentUser) return;
    // console.log("Current user email:", auth.currentUser?.email);
    setLoadingNotificaitons(true);

    const fetchNotifications = async () => {
      try {
        const res = await fetch(
          apiUrl(
            `/api/pac/notifications?toEmail=${encodeURIComponent(
              auth.currentUser.email
            )}`
          )
        );
        const data = await res.json();
        // Ensure data is an array before setting
        setNotifications(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading notification settings:", err);
        setNotifications([]);
      } finally {
        setLoadingNotificaitons(false);
      }
    };

    fetchNotifications();
  }, []);

  // Mark single notification as read
  const markAsRead = async (notifId) => {
    try {
      const res = await fetch(
        apiUrl(`/api/pac/notifications/${notifId}/read`),
        { method: "POST" }
      );
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const res = await fetch(
        apiUrl(
          `/api/pac/notifications/mark_all_read?toEmail=${encodeURIComponent(
            auth.currentUser.email
          )}`
        ),
        { method: "POST" }
      );
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  // Notification dropdown
  const open = Boolean(anchorEl);
  const handleNotifClick = (event) => setAnchorEl(event.currentTarget);
  const handleNotifClose = () => setAnchorEl(null);

  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n) => !n.read).length
    : 0;

  const typeToIcon = {
    invoice_submitted: <ReceiptLong fontSize="small" color="primary" />,
    invoice_deleted: <Delete fontSize="small" color="error" />,
    projection_generated: <Analytics fontSize="small" color="success" />,
    welcome: <PersonAdd fontSize="small" color="secondary" />,
  };

  // Annoucement things
  const [openAnn, setOpenAnn] = useState(false);

  return (
    <>
      {/* TOP NAV BAR */}
      <div
        className="topNavBar"
        style={{
          background: isDark
            ? theme.palette.background.paper // dark mode color
            : "linear-gradient(to right, #2196f3, #0d47a1)", // light mode gradient
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
          transition: "background-color 0.3s ease, color 0.3s ease",
        }}
      >
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
          {/* Annoucements */}
          <IconButton
            className="announcementBtn"
            onClick={() => setOpenAnn(true)}
          >
            <Campaign />
          </IconButton>
          <AnnoucementDialog open={openAnn} onClose={() => setOpenAnn(false)} />

          {/* Notifications Bell */}
          <IconButton className="notificationBtn" onClick={handleNotifClick}>
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
            {loadingNotifications && (
              <MenuItem disabled>Loading Notifications</MenuItem>
            )}

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
                    {typeToIcon[notif.type] || (
                      <Notifications fontSize="small" />
                    )}
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
        style={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderRight: `1px solid ${theme.palette.divider}`,
          transition: "background-color 0.3s ease, color 0.3s ease",
        }}
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
                      <div className="report-icon">{report.icon}</div>
                      <div className="report-content">
                        <div className="report-name">{report.name}</div>
                        <div className="report-description">
                          {report.description}
                        </div>
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

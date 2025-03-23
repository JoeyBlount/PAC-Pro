import React, { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { TiThMenu } from "react-icons/ti";
import './navBar.css';
import { auth } from "../../config/firebase";
import { signOut } from "firebase/auth";
import { Button } from '@mui/material';

export function NavBar() {
    const navigate = useNavigate();
    const [barVisible, setBarVisible] = useState(true);

    function handleNavigation(path) {
        navigate(`/navi/${path}`);
    }    

    function handleBar() {
        setBarVisible(!barVisible);
    }

    async function handleSignOut() {
        try{
            await signOut(auth);
            localStorage.removeItem("user");
            navigate('/')
        }catch(error){
            console.log("There was an error signing out ", error)
        }
    }

    return (
        <>
            <Outlet />
            {/* Top navigation bar */}
            <div className="top-nav">
                <div className="hamburger">
                    <Button
                        className="NaviMenu"
                        onClick={handleBar}
                        variant="outlined"
                    >
                        <TiThMenu />
                    </Button>
                </div>
                <div className="account-section">
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleNavigation("account")}
                    >
                        Account
                    </Button>
                </div>
            </div>

            {/* Only show navigation when bar is visible */}
            {barVisible && (
                <div className="left-nav">
                    <button onClick={() => handleNavigation("dashboard")}>Dashboard</button>
                    <button onClick={() => handleNavigation("invoiceLogs")}>Invoice Logs</button>
                    <button onClick={() => handleNavigation("submitInvoice")}>Submit Invoice</button>
                    <button onClick={() => handleNavigation("reports")}>Reports</button>
                    <button onClick={() => handleNavigation("settings")}>Settings</button>
                    <button onClick={() => handleNavigation("pac")}>PAC</button>
                    <button className='signoutButton' onClick={handleSignOut}>Sign Out</button>
                </div>
               
            )}
        </>
    );
}

import React from 'react';
import { signOut } from "firebase/auth";
import { auth } from '../../config/firebaseConfigEmail';

async function signOutNormal() {
  try {
    await signOut(auth);
    localStorage.removeItem("user");
    navigate('/');
  } catch (e) {
    console.log("An error has occured signing out: ", e);
  }
}

const LogOutButton = () => {
  const handleClick = () => {
    // Determin account and sign out
    
    // If firebase account
    signOutNormal();
  };

  return (<button onClick={handleClick}>Sign Out</button>);
};

export default LogOutButton;
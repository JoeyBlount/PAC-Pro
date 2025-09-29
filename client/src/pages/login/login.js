import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Button, Box, Typography } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import EmailIcon from '@mui/icons-material/Email';
import MicrosoftIcon from "@mui/icons-material/Microsoft";
//import { auth } from "../../config/firebaseConfigEmail";
import { useMsal } from "@azure/msal-react"; // Import useMsal hook
import { loginRequest } from "../../authconfig";
import { auth, googleAuthProvider } from "../../config/firebase-config";
import { signInWithPopup } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore"; // Firebase Firestore functions
import backgroundImage from "./bg.webp";
import logo from "./logo.png";

const Login = () => {
  React.useEffect(() => {
    document.title = "PAC Pro - Login";

  }, []); // Used to change the title.

  const navigate = useNavigate(); // Hook for navigation
  const user = auth.currentUser;
  const { instance } = useMsal(); // MSAL instance
  const db = getFirestore(); // Initialize Firestore

  const handleMicrosoftLogin = async () => {
    try {
      const response = await instance.loginPopup(loginRequest);
      console.log(response)
      const userEmail = response.account.username; // Get the email from Google sign-in result
      console.log(userEmail)

      // Check if the email exists in the database (Firestore in this case)

      const userRef = doc(db, "users", userEmail); // Assuming 'users' collection where emails are stored
      const userDoc = await getDoc(userRef); // Get the document
      console.log("hi")

      try {
        const userRef = doc(db, "users", userEmail);
        const userDoc = await getDoc(userRef);
        console.log("User document:", userDoc.exists());
        if (userDoc.exists()) {
          navigate("/navi/dashboard");
        } else {
          navigate("/not-allowed");
        }
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
      }
      localStorage.setItem("user", JSON.stringify(response.account.username));
    } catch (error) {
      console.error("Microsoft login error:", error);
    }
  };

  // For debugging to see if user is actually logged out or not

  // For debugging to see if the user is logged out or not
  if (user) {
    console.log(user.displayName);
  } else {
    console.log("No one logged in, looks like sign out works");
  }

  // Function to handle Google login
  const handleGoogleLogin = async () => {
    try {
      console.log("Attempting to sign in with Google...");
      const result = await signInWithPopup(auth, googleAuthProvider);
      const userEmail = result.user.email; // Get the email from Google sign-in result

      // Check if the email exists in the database (Firestore in this case)
      const db = getFirestore(); // Initialize Firestore
      const userRef = doc(db, "users", userEmail); // Assuming 'users' collection where emails are stored
      const userDoc = await getDoc(userRef); // Get the document

      if (userDoc.exists()) {
        console.log("User exists in the database:", userEmail);
        navigate("/navi/dashboard"); // Navigate to dashboard if email is in DB
      } else {
        console.log("Email not found in the database:", userEmail);
        navigate("/not-allowed"); // Navigate to 'not allowed' page if email is not in DB
      }
      console.log("Google login result: ", result);
      localStorage.setItem("user", JSON.stringify(result.user));
    } catch (error) {
      console.error("Google Login Error:", error);
    }
  };

  const handleLoginEmail = () => {
    navigate("/signupscreen")
  };

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100vh',
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: "#1976d2"
      }}
    >      
      {/*Login box*/}
      <Container
        maxWidth="xs"
        sx={{
          backgroundColor: "white",
          padding: 4,
          borderRadius: 2,
          boxShadow: 3,
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            maxWidth: "100%",
          }}
        >
          <img src={logo} 
            style={{ maxWidth: '100%', height: 'auto' }}  
          />
        </Box>

        <Box sx={{padding: '10px'}}/>
        
        <Typography variant="h4" fontWeight="bold">
          Sign In
        </Typography>

        <Box sx={{padding: '10px'}}/>

        <Button
          variant="contained"
          fullWidth
          startIcon={<GoogleIcon />}
          sx={{
            backgroundColor: "#000",
            color: "white",
            fontSize: "1.2rem",
            padding: "12px",
            "&:hover": { backgroundColor: "#333" },
          }}
          onClick={handleGoogleLogin} // Calls the function for Google login
        >
          Login with Google
        </Button>

        <Box sx={{padding: '10px'}}/>

        <Button
          variant="contained"
          fullWidth
          startIcon={<MicrosoftIcon />}
          sx={{
            backgroundColor: "#000",
            color: "white",
            fontSize: "1.2rem",
            padding: "12px",
            "&:hover": { backgroundColor: "#333" },
          }}
          onClick={handleMicrosoftLogin} // ✅ Same function for Microsoft login
        >
          Login with Microsoft
        </Button>
      </Container>
    </Box>
  );
};

export default Login;

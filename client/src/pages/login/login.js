import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Button, Box, Typography } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { auth, googleAuthProvider } from "../../config/firebase";
import { signInWithPopup } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore"; // Firebase Firestore functions

const Login = () => {
  const navigate = useNavigate(); // Hook for navigation
  const user = auth.currentUser;

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
    } catch (error) {
      console.error("Google Login Error:", error);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1976d2", // Blue background
      }}
    >
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
        <Typography variant="h4" fontWeight="bold" mb={3}>
          Sign in
        </Typography>

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
      </Container>
    </Box>
  );
};

export default Login;

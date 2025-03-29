import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Button, Box, Typography, TextField } from "@mui/material";
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, db } from "../../config/firebase-config";
import { doc, setDoc } from "firebase/firestore";
const SignUpScreen = () => {
  React.useEffect(() => {
    document.title = "PAC Pro - Sign Up";
  }, []); // Used to change the title.

  const navigate = useNavigate();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Function to handle Sign Up & Login
  const handleAuth = async () => {
    setError(""); // Clear previous errors

    try {
      if (isSigningUp) {
        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Store the name in Firebase Auth
        await updateProfile(user, { displayName: name });

        console.log("User Signed Up:", user);
        await setDoc(doc (db, "users", user.uid), {
            name: name, 
            email: user.email,
            createdAt: new Date(),
        });
        navigate("/"); // Redirect after successful login/signup
      } else {
        // Log In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User Logged In:", userCredential.user);
        localStorage.setItem("user", JSON.stringify(userCredential.user));
        navigate("/navi/dashboard");
      }

      
    } catch (err) {
      setError(err.message); // Display error messages
      console.error("Authentication Error:", err);
    }
    


  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1976d2",
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
          {isSigningUp ? "Create Account" : "Sign In"}
        </Typography>

        {error && <Typography color="error">{error}</Typography>}

        {isSigningUp && (
          <TextField
            label="Full Name"
            type="text"
            fullWidth
            variant="outlined"
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <TextField
          label="Email"
          type="email"
          fullWidth
          variant="outlined"
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          label="Password"
          type="password"
          fullWidth
          variant="outlined"
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          variant="contained"
          fullWidth
          sx={{
            backgroundColor: "#000",
            color: "white",
            fontSize: "1rem",
            padding: "10px",
            "&:hover": { backgroundColor: "#333" },
            marginBottom: 2,
          }}
          onClick={handleAuth}
        >
          {isSigningUp ? "Create Account" : "Login"}
        </Button>

        <Typography
          variant="body2"
          sx={{ marginTop: 2, cursor: "pointer", color: "#1976d2" }}
          onClick={() => setIsSigningUp(!isSigningUp)}
        >
          {isSigningUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
        </Typography>
      </Container>
    </Box>
  );
};

export default SignUpScreen;

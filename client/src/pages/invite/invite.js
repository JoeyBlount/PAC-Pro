import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import { collection, getDocs, addDoc, setDoc, doc, query, where } from "firebase/firestore"; // Import required Firestore methods
import { ROLES } from '../../constants/roles';
import { useAuth } from '../../context/AuthContext';

const Invite = () => {
  const { userRole } = useAuth(); // Get user role from context
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: ""
  });

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ✅ Function to check if "users" collection exists
  const checkUsersCollection = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));

      if (querySnapshot.empty) {
        console.log("⚠️ No documents found in the 'users' collection.");
      } else {
        console.log("✅ Documents found in 'users':");
        querySnapshot.forEach((doc) => {
          console.log(doc.id, " => ", doc.data());
        });
      }
    } catch (error) {
      console.error("❌ Error checking collection:", error);
    }
  };

  useEffect(() => {
    checkUsersCollection(); // Run on page load
  }, []);

  // ✅ Handle form input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // --- Role Validation ---
    if (!formData.role) {
      setError("Please select a role for the user.");
      return;
    }
    // Prevent non-Admins from creating other Admins (optional security)
    // if (formData.role === ROLES.ADMIN && userRole !== ROLES.ADMIN) {
    //   setError("You do not have permission to create Admin users.");
    //   return;
    // }
    // --- End Role Validation ---

    try {
      // Check if the email already exists in the "users" collection
      const usersRef = collection(db, "users");
      const emailQuery = query(usersRef, where("email", "==", formData.email));
      const querySnapshot = await getDocs(emailQuery);

      if (!querySnapshot.empty) {
        // Email already exists
        setError("This email has already been invited.");
        return; // Exit the function if the email already exists
      }

      // If email doesn't exist, add the new user
      const docRef = doc(collection(db, "users"), formData.email); // Using email as the doc ID
      await setDoc(docRef, {
        firstName: formData.firstName || "N/A",
        lastName: formData.lastName || "N/A",
        email: formData.email || "N/A",
        acceptState: false,
        createdAt: new Date().toISOString()
      });

      console.log("✅ User added successfully!");
      setSuccessMessage("User added successfully!");
    } catch (error) {
      console.error("❌ Error adding user:", error);
      setError("Failed to add user. Check console for details.");
    }
  };

  return (
    <div>
      <h2>Invite User</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <button type="submit">Invite</button>
      </form>
    </div>
  );
};

export default Invite;

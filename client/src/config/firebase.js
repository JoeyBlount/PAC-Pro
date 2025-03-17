import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, } from "firebase/auth"; // Import GoogleAuthProvider
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDavRQ2gT3tkyTP4Ll6PBEIq09HLFoIx08",
  authDomain: "pacpro-ef499.firebaseapp.com",
  projectId: "pacpro-ef499",
  storageBucket: "pacpro-ef499.firebasestorage.app",
  messagingSenderId: "506342087804",
  appId: "1:506342087804:web:68f04302f9ceee6df83df9",
  measurementId: "G-T1L1NSJ92T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const googleAuthProvider = new GoogleAuthProvider(); // Initialize GoogleAuthProvider


export { auth, db, googleAuthProvider}; // Export googleAuthProvider along with auth and db

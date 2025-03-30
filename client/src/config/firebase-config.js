import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDavRQ2gT3tkyTP4Ll6PBEIq09HLFoIx08",
  authDomain: "pacpro-ef499.firebaseapp.com",
  projectId: "pacpro-ef499",
  storageBucket: "pacpro-ef499.firebasestorage.app",
  messagingSenderId: "506342087804",
  appId: "1:506342087804:web:b5b88d3661f63a66f83df9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleAuthProvider = new GoogleAuthProvider();
const storage = getStorage(app)

export { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, db, googleAuthProvider, storage };


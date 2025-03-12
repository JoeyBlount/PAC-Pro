import{ initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDavRQ2gT3tkyTP4Ll6PBEIq09HLFoIx08",
  authDomain: "pacpro-ef499.firebaseapp.com",
  projectId: "pacpro-ef499",
  storageBucket: "pacpro-ef499.firebasestorage.app",
  messagingSenderId: "506342087804",
  appId: "1:506342087804:web:b5b88d3661f63a66f83df9"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBFCr6525bDcuDmtOtL018oOGAw9IMJlN0",
  authDomain: "tikcetsupport.firebaseapp.com",
  projectId: "tikcetsupport",
  storageBucket: "tikcetsupport.firebasestorage.app",
  messagingSenderId: "57635599670",
  appId: "1:57635599670:web:d247a3bd5ca1a140f0ef97",
  measurementId: "G-MV37L2ZYC5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize analytics only on client side (will be undefined on server)
const analytics = typeof window !== 'undefined' 
  ? (() => {
      try {
        const { getAnalytics } = require("firebase/analytics");
        return getAnalytics(app);
      } catch (e) {
        return null;
      }
    })()
  : null;

export { app, auth, db };
export { analytics }; // May be null in server environment
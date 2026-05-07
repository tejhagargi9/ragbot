// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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
const analytics = getAnalytics(app);
const auth = getAuth(app);

export { app, analytics, auth };
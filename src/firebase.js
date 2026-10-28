import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // ADDED THIS

const firebaseConfig = {
  apiKey: "AIzaSyBM9I_tGyjb4ZvH4li05hKpSR0urzlup5M",
  authDomain: "smart-log-attendance.firebaseapp.com",
  projectId: "smart-log-attendance",
  storageBucket: "smart-log-attendance.firebasestorage.app",
  messagingSenderId: "616941814990",
  appId: "1:616941814990:web:77de207454bf5ed3713c9f",
  measurementId: "G-103K2BF8CE"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app); // ADDED THIS
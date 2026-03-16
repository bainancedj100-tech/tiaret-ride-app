import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

// TODO: Replace with actual Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForNow",
  authDomain: "tiaret-ride-app.firebaseapp.com",
  projectId: "tiaret-ride-app",
  storageBucket: "tiaret-ride-app.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = typeof window !== 'undefined' && 'serviceWorker' in navigator ? getMessaging(app) : null;

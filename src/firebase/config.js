import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";
import { getStorage } from "firebase/storage";

// TODO: Replace with actual Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyD0i9nDzGoCFc8qm7Z2u9GJ8pk9t1GmZFA",
  authDomain: "tiaret-ride-app.firebaseapp.com",
  projectId: "tiaret-ride-app",
  storageBucket: "tiaret-ride-app.appspot.com",
  messagingSenderId: "774444004936",
  appId: "1:774444004936:web:551d5af910e7413ad68a7d",
  measurementId: "G-375ZT46NT1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' && 'serviceWorker' in navigator ? getMessaging(app) : null;

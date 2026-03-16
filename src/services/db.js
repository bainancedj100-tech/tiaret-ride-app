import { collection, doc, setDoc, getDoc, updateDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

// ----- USERS -----
export const createUserProfile = async (userId, data) => {
  await setDoc(doc(db, "users", userId), {
    ...data,
    createdAt: new Date().toISOString(),
  });
};

export const getUserProfile = async (userId) => {
  const docSnap = await getDoc(doc(db, "users", userId));
  return docSnap.exists() ? docSnap.data() : null;
};

// ----- DRIVERS -----
export const updateDriverLocation = async (driverId, location) => {
  await updateDoc(doc(db, "drivers", driverId), {
    location,
    updatedAt: new Date().toISOString(),
  });
};

// Listen to all available drivers in real-time
export const listenToAvailableDrivers = (callback) => {
  const q = query(collection(db, "drivers"), where("status", "==", "available"));
  return onSnapshot(q, (snapshot) => {
    const drivers = [];
    snapshot.forEach((doc) => {
      drivers.push({ id: doc.id, ...doc.data() });
    });
    callback(drivers);
  });
};

// ----- ORDERS (RIDES/DELIVERIES) -----
export const createOrder = async (orderData) => {
  const newOrderRef = doc(collection(db, "orders"));
  await setDoc(newOrderRef, {
    ...orderData,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
  return newOrderRef.id;
};

// Listen to a specific order status
export const listenToOrder = (orderId, callback) => {
  return onSnapshot(doc(db, "orders", orderId), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
};

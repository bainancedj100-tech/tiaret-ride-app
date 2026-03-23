import {
  collection, doc, setDoc, getDoc, updateDoc,
  onSnapshot, query, where, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";

// ═══════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════
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

// ═══════════════════════════════════════════════
// DRIVERS  (single collection, phone = doc ID)
// status: 'pending' | 'active' | 'banned'
// ═══════════════════════════════════════════════

/** Create new driver application — status defaults to 'pending' */
export const createDriverApplication = async (phone, data) => {
  await setDoc(doc(db, "drivers", phone), {
    ...data,
    phone,
    status: "pending",
    freeTrips: 3,
    balance: 0,
    location: null,
    notifiedAdmin: false,
    createdAt: new Date().toISOString(),
  });
};

export const getDriverProfile = async (phone) => {
  const snap = await getDoc(doc(db, "drivers", phone));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/** Admin: activate or ban */
export const updateDriverStatus = async (phone, status) => {
  await updateDoc(doc(db, "drivers", phone), { status });
};

/** Admin: set balance */
export const updateDriverBalance = async (phone, balance) => {
  await updateDoc(doc(db, "drivers", phone), { balance });
};

/** Admin: set free trips */
export const updateDriverFreeTrips = async (phone, freeTrips) => {
  await updateDoc(doc(db, "drivers", phone), { freeTrips });
};

/** Driver: push live location */
export const updateDriverLocation = async (uid, location, extraData = {}) => {
  // Use setDoc to the dedicated drivers_location collection
  await setDoc(doc(db, "drivers_location", uid), {
    location,
    updatedAt: new Date().toISOString(),
    ...extraData
  }, { merge: true });
};

/** Listen to a specific driver's profile — real-time */
export const listenToDriver = (uid, callback) => {
  return onSnapshot(doc(db, "drivers", uid), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
};

/** Listen to ALL drivers — admin only */
export const listenToAllDrivers = (callback) => {
  return onSnapshot(collection(db, "drivers"), (snapshot) => {
    const drivers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(drivers);
  });
};

/** Listen to available drivers for map — riders */
export const listenToAvailableDrivers = (callback) => {
  // Listen directly to drivers_location collection for real-time tracking
  return onSnapshot(collection(db, "drivers_location"), (snapshot) => {
    const drivers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(drivers);
  });
};

// ═══════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════
export const createOrder = async (orderData) => {
  const newOrderRef = doc(collection(db, "orders"));
  await setDoc(newOrderRef, {
    ...orderData,
    status: "finding",
    createdAt: new Date().toISOString(),
  });
  return newOrderRef.id;
};

export const listenToOrder = (orderId, callback) => {
  return onSnapshot(doc(db, "orders", orderId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
};

export const updateOrderStatus = async (orderId, status, extra = {}) => {
  await updateDoc(doc(db, "orders", orderId), { status, ...extra });
};

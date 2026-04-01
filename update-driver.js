import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD0i9nDzGoCFc8qm7Z2u9GJ8pk9t1GmZFA",
  authDomain: "tiaret-ride-app.firebaseapp.com",
  projectId: "tiaret-ride-app",
  storageBucket: "tiaret-ride-app.appspot.com",
  messagingSenderId: "774444004936",
  appId: "1:774444004936:web:551d5af910e7413ad68a7d",
  measurementId: "G-375ZT46NT1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function activateDriver() {
  const phone = '06585592909';
  console.log(`Searching for driver with phone: ${phone}...`);
  const q = query(collection(db, 'drivers'), where('phone', '==', phone));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log(`Driver not found.`);
  } else {
    const docData = snap.docs[0];
    console.log(`Found driver document ID: ${docData.id}`);
    await updateDoc(doc(db, 'drivers', docData.id), { status: 'active' });
    console.log(`Updated driver status to 'active' successfully.`);
  }
  process.exit(0);
}

activateDriver().catch(console.error);

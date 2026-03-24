importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyD0i9nDzGoCFc8qm7Z2u9GJ8pk9t1GmZFA",
  authDomain: "tiaret-ride-app.firebaseapp.com",
  projectId: "tiaret-ride-app",
  storageBucket: "tiaret-ride-app.firebasestorage.app",
  messagingSenderId: "774444004936",
  appId: "1:774444004936:web:551d5af910e7413ad68a7d",
  measurementId: "G-375ZT46NT1"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload?.notification?.title || 'إشعار جديد';
    const notificationOptions = {
      body: payload?.notification?.body || 'لديك طلب جديد في تيارت رايد',
      icon: '/icons/icon-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error('Firebase Service Worker Error:', error);
}

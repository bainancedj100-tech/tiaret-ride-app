importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForNow",
  authDomain: "tiaret-ride-app.firebaseapp.com",
  projectId: "tiaret-ride-app",
  storageBucket: "tiaret-ride-app.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
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

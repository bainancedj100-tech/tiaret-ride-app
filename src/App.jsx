import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import Home from './components/Home';
import DriverRegistration from './components/DriverRegistration';
import AdminDashboard from './components/AdminDashboard';
import DriverDashboard from './components/DriverDashboard';
import AuthGate from './components/AuthGate';
import AdminGuard from './components/AdminGuard';

function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const registerPush = async () => {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') return;
        
        await PushNotifications.register();
        
        PushNotifications.addListener('registration', (token) => {
          console.log('Push registration success, token: ' + token.value);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received: ', notification);
        });
      };
      registerPush().catch(console.error);
    }
  }, []);

  return (
    <Router>
      <div className="w-full h-[100dvh] relative overflow-hidden" style={{ background: '#0a0f1e' }}>
        <Routes>
          {/* Admin — PIN protected, no user auth needed */}
          <Route path="/admin" element={
            <AdminGuard><AdminDashboard /></AdminGuard>
          } />

          {/* Driver routes */}
          <Route path="/driver/register" element={<DriverRegistration />} />
          <Route path="/driver/dashboard" element={<DriverDashboard />} />

          {/* All other routes → AuthGate → Rider Home */}
          <Route path="/*" element={
            <AuthGate>
              <Home />
            </AuthGate>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

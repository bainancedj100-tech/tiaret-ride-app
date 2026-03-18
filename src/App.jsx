import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import DriverRegistration from './components/DriverRegistration';
import AdminDashboard from './components/AdminDashboard';
import DriverDashboard from './components/DriverDashboard';
import AuthGate from './components/AuthGate';
import AdminGuard from './components/AdminGuard';

function App() {
  return (
    <Router>
      <div className="w-full h-screen relative overflow-hidden" style={{ background: '#0a0f1e' }}>
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

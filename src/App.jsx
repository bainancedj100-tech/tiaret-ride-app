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
      <AuthGate>
        <div className="w-full h-screen relative bg-gray-100 font-sans">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/driver/register" element={<DriverRegistration />} />
            <Route path="/driver/dashboard" element={<DriverDashboard />} />
            <Route path="/admin" element={
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            } />
          </Routes>
        </div>
      </AuthGate>
    </Router>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Car, AlertTriangle, LogIn, CheckCircle2, Navigation } from 'lucide-react';

const DriverDashboard = () => {
  const [driverPhone, setDriverPhone] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    let unsub;
    if (isLoggedIn && driverPhone) {
      unsub = onSnapshot(doc(db, 'drivers', driverPhone), (docSnap) => {
        if (docSnap.exists()) {
          setDriverData(docSnap.data());
        } else {
          setDriverData(null);
          setIsLoggedIn(false);
        }
      });
    }
    return () => {
      if (unsub) unsub();
    };
  }, [isLoggedIn, driverPhone]);

  // Live Location Tracking Effect
  useEffect(() => {
    let watchId;
    if (isAvailable && isLoggedIn && driverPhone) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              await updateDoc(doc(db, 'drivers', driverPhone), {
                location: { lat: latitude, lng: longitude }
              });
            } catch (err) {
              console.error("Error updating location:", err);
            }
          },
          (error) => {
            console.warn("Location error:", error);
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
      }
    } else if (!isAvailable && isLoggedIn && driverPhone) {
      // Optional: clear location when offline
      updateDoc(doc(db, 'drivers', driverPhone), { location: null }).catch(console.error);
    }
    
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isAvailable, isLoggedIn, driverPhone]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (driverPhone.trim().length > 6) {
      setIsLoggedIn(true);
    }
  };

  const isBlocked = driverData && driverData.freeTrips === 0 && driverData.balance <= 0;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center font-sans">
        <div className="max-w-md w-full glass p-8 rounded-3xl border border-white shadow-xl">
          <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mb-6 mx-auto">
            <Car className="w-8 h-8 text-brand" />
          </div>
          <h2 className="text-2xl font-black text-center text-gray-900 mb-2">Driver Login</h2>
          <p className="text-gray-500 text-center font-medium mb-8">Enter your registered phone number</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="text" 
              placeholder="0550 00 00 00" 
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl outline-none focus:border-brand transition-colors font-semibold"
            />
            <button 
              type="submit"
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              Sign In <LogIn className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!driverData) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center font-sans">
        <div className="text-center text-gray-500 font-bold">Loading driver profile... (If it takes too long, ensure your account is verified by Admin)</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans max-w-md mx-auto relative pt-8">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Hello, {driverData.firstName}</h1>
          <p className="text-gray-500 font-medium font-bold text-sm">Tiaret Professional Partner</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center text-gray-600 font-bold">
          {driverData.firstName?.charAt(0)}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-brand/10 p-5 rounded-2xl border border-brand/20">
          <p className="text-xs font-bold text-brand uppercase tracking-wider mb-1">Free Trips</p>
          <h3 className="text-2xl font-black text-brand-dark">{driverData.freeTrips}</h3>
        </div>
        <div className="bg-white/60 p-5 rounded-2xl border border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Balance</p>
          <h3 className="text-2xl font-black text-gray-900">{driverData.balance || 0} DA</h3>
        </div>
      </div>

      <div className="glass p-6 rounded-[32px] border border-white min-h-[400px] flex flex-col items-center justify-center text-center relative overflow-hidden shadow-lg">
        {isBlocked ? (
          // Blocking Mechanism
          <div className="z-10 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Account Restricted</h2>
            <p className="text-gray-600 font-medium mb-8 px-4 leading-relaxed">
              You have used all your free trips and your balance is below the required limit. 
              Please recharge your account to continue receiving ride requests.
            </p>
            <button className="bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30 w-full text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95">
              Recharge Account
            </button>
          </div>
        ) : (
          // Normal Working Mode
          <div className="w-full z-10 animate-in fade-in duration-500">
            {isAvailable ? (
              <div className="flex flex-col items-center">
                 <div className="relative w-32 h-32 mb-8">
                    <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping"></div>
                    <div className="absolute inset-2 bg-brand/40 rounded-full animate-ping" style={{ animationDelay: '0.2s'}}></div>
                    <div className="absolute inset-4 bg-brand text-white rounded-full flex items-center justify-center shadow-xl z-20">
                       <Navigation className="w-10 h-10" />
                    </div>
                 </div>
                 <h2 className="text-2xl font-black text-gray-900 mb-2">Finding Rides...</h2>
                 <p className="text-gray-500 font-medium mb-8">You are online and visible to passengers.</p>
                 
                 <button 
                  onClick={() => setIsAvailable(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 px-8 rounded-xl transition-colors"
                >
                  Go Offline
                </button>
              </div>
            ) : (
               <div className="flex flex-col items-center">
                 <div className="w-24 h-24 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center mb-6">
                    <Car className="w-12 h-12" />
                 </div>
                 <h2 className="text-xl font-bold text-gray-800 mb-8">You are currently offline</h2>
                 
                 <button 
                  onClick={() => setIsAvailable(true)}
                  className="w-full bg-brand hover:bg-brand-dark text-white font-black text-lg py-5 rounded-2xl shadow-xl transition-all hover:shadow-brand/30 active:scale-95 flex items-center justify-center gap-3 border-b-4 border-black/20"
                >
                  <CheckCircle2 className="w-6 h-6" /> Go Online & Accept Rides
                </button>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;

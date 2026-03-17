import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Loader2, Phone, User, CheckCircle2 } from 'lucide-react';

const AuthGate = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user has a profile in Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setIsAuthenticated(true);
            setShowRegistration(false);
          } else {
            // Logged in anonymously but no profile yet
            setIsAuthenticated(false);
            setShowRegistration(true);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          // Fallback check to local storage for demo purposes
          if (localStorage.getItem('tiaret_user')) {
             setIsAuthenticated(true);
             setShowRegistration(false);
          } else {
             setShowRegistration(true);
          }
        }
      } else {
        // Not logged in at all
        setIsAuthenticated(false);
        setShowRegistration(true);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Sign in anonymously to get a UID
      let currentUser = auth.currentUser;
      if (!currentUser) {
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
      }

      // 2. Save profile to Firestore
      await setDoc(doc(db, 'users', currentUser.uid), {
        ...formData,
        role: 'rider',
        createdAt: new Date().toISOString()
      });

      // 3. Fallback persistence for demo
      localStorage.setItem('tiaret_user', JSON.stringify(formData));

      setIsAuthenticated(true);
      setShowRegistration(false);
    } catch (err) {
      console.error("Registration error:", err);
      // If Firebase Auth fails (e.g., dummy keys), rely on LocalStorage
      localStorage.setItem('tiaret_user', JSON.stringify(formData));
      setIsAuthenticated(true);
      setShowRegistration(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Loading Tiaret Ride...</h2>
      </div>
    );
  }

  // If authenticated and has profile, render the protected children (Home, Map, etc.)
  if (isAuthenticated && !showRegistration) {
    return <>{children}</>;
  }

  // Otherwise, show the Registration UI
  return (
    <div className="min-h-screen relative w-full overflow-hidden bg-gray-100 font-sans flex items-center justify-center p-4">
      {/* Background Graphic */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gray-900 rounded-b-[40px] shadow-xl"></div>
      
      <div className="glass max-w-md w-full p-8 rounded-[32px] border border-white shadow-2xl relative z-10 mt-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
        
        <div className="w-20 h-20 bg-brand/10 border-2 border-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md absolute -top-10 left-1/2 -translate-x-1/2">
          <User className="w-10 h-10 text-brand" />
        </div>

        <div className="text-center mt-10 mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Welcome</h1>
          <p className="text-gray-500 font-medium">Please enter your details to continue.</p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded-xl mb-6 text-sm font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">First Name</label>
            <input 
              type="text" 
              placeholder="e.g. Samir" 
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl outline-none focus:border-brand transition-colors font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Last Name</label>
            <input 
              type="text" 
              placeholder="e.g. Belaid" 
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl outline-none focus:border-brand transition-colors font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="tel" 
                placeholder="0550 00 00 00" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl outline-none focus:border-brand transition-colors font-medium"
              />
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gray-900 hover:bg-black text-white font-bold py-4 text-lg rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Get Started'} <CheckCircle2 className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthGate;

import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

const AdminGuard = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  // In a real app, this would be a secure backend check.
  // For this beta, a simple frontend PIN is used as requested.
  const CORRECT_PIN = '1234';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === CORRECT_PIN) {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPin('');
    }
  };

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans">
      <div className="max-w-sm w-full bg-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-brand"></div>
        
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-10 h-10 text-gray-800" />
        </div>
        
        <h2 className="text-2xl font-black text-center text-gray-900 mb-2">Admin Access</h2>
        <p className="text-gray-500 text-center font-medium mb-8">Enter the security PIN to access the dashboard.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="password" 
              placeholder="Enter PIN" 
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              className={`w-full pl-12 pr-4 py-4 bg-gray-50 border ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-brand'} rounded-xl outline-none transition-colors font-bold text-lg tracking-widest text-center`}
              autoFocus
              maxLength={4}
            />
          </div>
          
          {error && <p className="text-red-500 text-sm font-bold text-center">Incorrect PIN. Try again.</p>}
          
          <button 
            type="submit"
            className="w-full bg-brand hover:bg-brand-dark text-white font-black py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
          >
            Unlock Dashboard
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminGuard;

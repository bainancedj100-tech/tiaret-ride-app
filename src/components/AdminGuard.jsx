import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

const AdminGuard = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

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

  if (isAuthenticated) return children;

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4 font-sans" dir="rtl">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
      <div className="glass-card w-full max-w-sm p-8 rounded-3xl relative z-10">
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-10 h-10 text-brand" />
        </div>
        <h2 className="text-2xl font-black text-center text-white mb-1">لوحة الإدارة</h2>
        <p className="text-white/50 text-center text-sm mb-8">أدخل رمز الدخول السري للمتابعة</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="password"
              placeholder="رمز الدخول"
              value={pin}
              onChange={e => { setPin(e.target.value); setError(false); }}
              className={`input-ar pl-12 text-center tracking-widest text-xl ${error ? 'border-red-500/60' : ''}`}
              autoFocus
              maxLength={4}
            />
          </div>
          {error && <p className="text-red-400 text-sm font-bold text-center">رمز غير صحيح. حاول مجدداً.</p>}
          <button type="submit" className="btn-primary w-full">دخول</button>
        </form>
      </div>
    </div>
  );
};

export default AdminGuard;

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Loader2, Car, User, ArrowRight, MapPin } from 'lucide-react';

/* ============================================================
   SCREENS:
   'loading'       → spinner while Firebase checks auth
   'welcome'       → landing page (Google Sign In)
   'profile_setup' → new user enters name and selects role
   'driver_pending'→ driver waiting for admin approval
   'authed'        → render app content
============================================================ */

const AuthGate = ({ children }) => {
  const [screen, setScreen] = useState('loading');
  const [userRole, setUserRole] = useState(null);
  const [driverStatus, setDriverStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');

  /* ── Firebase Auth Check on Mount ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        checkUserInFirestore(user.uid, user.email);
      } else {
        setScreen('welcome');
      }
    });

    return () => unsub();
  }, []);

  const checkUserInFirestore = async (uid, email) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        setUserRole(data.role);

        if (data.role === 'driver') {
          // Check driver application status
          const driverSnap = await getDoc(doc(db, 'drivers', uid));
          if (driverSnap.exists()) {
            setDriverStatus(driverSnap.data().status);
            setScreen('authed');
          } else {
            setDriverStatus('pending');
            setScreen('driver_pending');
          }
        } else {
          setScreen('authed');
        }
      } else {
        // User authenticated but no profile yet -> ask for name & role
        // Pre-fill name if Google provided it
        if (auth.currentUser?.displayName) {
          const parts = auth.currentUser.displayName.split(' ');
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }
        setScreen('profile_setup');
      }
    } catch (e) {
      console.error(e);
      setScreen('welcome');
    }
  };

  /* ── Google Sign In ── */
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the auth state update automatically
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تسجيل الدخول بحساب قوقل.');
      setLoading(false);
    }
  };

  /* ── Save Profile ── */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!firstName || !role) {
      setError('يرجى تعبئة الاسم الأول على الأقل واختيار دورك');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      const uid = user.uid;
      const email = user.email;

      await setDoc(doc(db, 'users', uid), {
        firstName,
        lastName,
        email,
        role,
        createdAt: new Date().toISOString()
      });

      setUserRole(role);
      
      if (role === 'driver') {
        window.location.hash = '#/driver/register';
        setScreen('authed');
      } else {
        setScreen('authed');
      }
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ البيانات');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setScreen('welcome');
  };

  /* ══════════════════ SCREENS ══════════════════ */

  if (screen === 'loading') {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center" dir="rtl">
        <div className="w-20 h-20 rounded-full bg-brand/20 flex items-center justify-center mb-6 animate-pulse">
          <MapPin className="w-10 h-10 text-brand" />
        </div>
        <Loader2 className="w-8 h-8 text-brand animate-spin mb-4" />
        <p className="text-white/60 font-medium">جارٍ التحميل...</p>
      </div>
    );
  }

  if (screen === 'authed') {
    return <>{children}</>;
  }

  if (screen === 'driver_pending') {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6" dir="rtl">
        <div className="glass-card max-w-sm w-full p-8 rounded-3xl text-center z-10">
          <div className="w-20 h-20 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">قيد المراجعة أو التسجيل</h2>
          <p className="text-white/60 leading-relaxed mb-8">
            يرجى إكمال تسجيل بيانات السائق (رفع الوثائق) إن لم تفعل ذلك بعد، أو انتظر موافقة الإدارة.
          </p>
          <div className="space-y-3">
             <button onClick={() => { window.location.hash='#/driver/register'; setScreen('authed'); }} className="btn-primary w-full">إكمال التسجيل</button>
             <button onClick={handleLogout} className="btn-ghost w-full">تسجيل الخروج</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark relative overflow-hidden flex flex-col items-center justify-center px-6" dir="rtl">
      {/* Background Decorative Circles */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
      
      {screen === 'welcome' && (
        <div className="text-center z-10 w-full max-w-sm">
          <div className="w-24 h-24 bg-brand rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand/40">
            <Car className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">تيارت رايد</h1>
          <p className="text-white/50 text-lg mb-10">خدمة توصيل ذكية وآمنة في تيارت</p>
          
          {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-xl mb-6 text-sm font-bold text-center">{error}</div>}

          <button 
            onClick={handleGoogleLogin} 
            disabled={loading}
            className="w-full bg-white text-gray-900 font-bold py-4 rounded-2xl flex justify-center items-center gap-3 transition-transform active:scale-95 shadow-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-brand" /> : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  <path d="M1 1h22v22H1z" fill="none"/>
                </svg>
                بدء باستخدام Google
              </>
            )}
          </button>
        </div>
      )}

      {screen === 'profile_setup' && (
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl z-10 mt-12">
          <h2 className="text-2xl font-black text-white mb-2 text-center">أهلاً بك في تيارت رايد!</h2>
          <p className="text-white/50 text-sm mb-6 text-center">يبدو أنك مستخدم جديد، أكمل ملفك الشخصي</p>
          {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-xl mb-4 text-sm font-bold text-center">{error}</div>}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="label-ar">الاسم الأول</label>
              <input type="text" placeholder="مثال: سامي" value={firstName}
                onChange={e => setFirstName(e.target.value)} className="input-ar" />
            </div>
            <div>
              <label className="label-ar">اللقب</label>
              <input type="text" placeholder="مثال: بلعيد" value={lastName}
                onChange={e => setLastName(e.target.value)} className="input-ar" />
            </div>
            
            <label className="label-ar pt-2">اختر نوع حسابك</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole('rider')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${role === 'rider' ? 'border-brand bg-brand/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <User className={`w-8 h-8 mb-2 ${role === 'rider' ? 'text-brand' : 'text-white/50'}`} />
                <span className={`font-bold ${role === 'rider' ? 'text-brand' : 'text-white'}`}>راكب</span>
              </button>
              <button type="button" onClick={() => setRole('driver')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${role === 'driver' ? 'border-green-400 bg-green-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <Car className={`w-8 h-8 mb-2 ${role === 'driver' ? 'text-green-400' : 'text-white/50'}`} />
                <span className={`font-bold ${role === 'driver' ? 'text-green-400' : 'text-white'}`}>سائق</span>
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-6 flex justify-center items-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إنهاء وإكمال التسجيل'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AuthGate;

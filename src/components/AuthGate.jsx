import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithCredential,
  setPersistence,
  indexedDBLocalPersistence
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Loader2, Car, User, MapPin, Mail, Lock } from 'lucide-react';

/* ============================================================
   SCREENS:
   'loading'       → spinner while Firebase checks auth
   'welcome'       → landing page (Email/Password Login)
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

  // Auth Form State
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Profile Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');

  /* ── Firebase Auth Check on Mount ── */
  useEffect(() => {
    // Ensure persistence is set to LOCAL
    setPersistence(auth, indexedDBLocalPersistence).catch(console.error);

    // Initialize Native Google Auth
    if (Capacitor.isNativePlatform()) {
      try {
        GoogleAuth.initialize();
      } catch (e) {
        console.error("Failed to initialize Google Auth", e);
      }
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        checkUserInFirestore(user.uid, user.email);
      } else {
        setScreen('welcome');
      }
    });
    return () => unsub();
  }, []);

  const checkUserInFirestore = async (uid, userEmail) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        setUserRole(data.role);

        if (data.role === 'driver') {
          // Listen in real-time so they don't have to restart the app
          const unsubDriver = onSnapshot(doc(db, 'drivers', uid), (driverSnap) => {
            if (driverSnap.exists()) {
              const status = driverSnap.data().status;
              setDriverStatus(status);
              if (status === 'active') {
                window.location.hash = '#/driver/dashboard';
                setScreen('authed'); 
                unsubDriver(); // Cleanup once active
              } else {
                setScreen('driver_pending');
              }
            } else {
              setDriverStatus('pending');
              setScreen('driver_pending');
            }
          });
        } else {
          setScreen('authed');
        }
      } else {
        setScreen('profile_setup');
      }
    } catch (e) {
      console.error(e);
      setScreen('welcome');
    }
  };

  /* ── Email / Password Auth ── */
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error('Auth error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('هذا الحساب موجود مسبقاً، يرجى تسجيل الدخول.');
        setIsLogin(true);
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة جداً (يجب أن تكون 6 أحرف على الأقل).');
      } else {
        setError('حدث خطأ أثناء المصادقة، تأكد من اتصالك بالإنترنت.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Social Login ── */
  const handleSocialLogin = async (providerName) => {
    setLoading(true);
    setError('');
    try {
      if (providerName === 'google') {
        if (Capacitor.isNativePlatform()) {
          const googleUser = await GoogleAuth.signIn();
          const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
          await signInWithCredential(auth, credential);
        } else {
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
        }
      } else if (providerName === 'facebook') {
        const provider = new FacebookAuthProvider();
        await signInWithPopup(auth, provider);
      }

      // The onAuthStateChanged listener will handle the checkUserInFirestore call
    } catch (err) {
      console.error('Social auth error:', err);
      // Log more detailed error for native plugin
      if (err.message) {
        console.error('Native error message:', err.message);
      }
      setError('تعذر تسجيل الدخول بالشبكات الاجتماعية. الرجاء المحاولة مرة أخرى.');
    } finally {
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
      const userEmail = user.email;

      await setDoc(doc(db, 'users', uid), {
        firstName,
        lastName,
        email: userEmail,
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

  if (screen === 'authed') return <>{children}</>;

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
             <button onClick={() => {
                // Force check again
                if (auth.currentUser) checkUserInFirestore(auth.currentUser.uid, auth.currentUser.email);
             }} className="btn-primary w-full flex items-center justify-center gap-2">
               تحديث الحالة 🔄
             </button>
             <button onClick={() => { window.location.hash='#/driver/register'; setScreen('authed'); }} className="btn-ghost w-full">إكمال التسجيل</button>
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
        <div className="w-full max-w-sm z-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand/20">
              <Car className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">تيارت رايد</h1>
            <p className="text-white/50 mt-1">خدمة توصيل ذكية وآمنة في تيارت</p>
          </div>

          <div className="glass-card p-6 rounded-3xl">
            <div className="flex bg-white/5 rounded-xl p-1 mb-6">
              <button 
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-brand text-white shadow-md' : 'text-white/50 hover:text-white'}`}>
                دخول
              </button>
              <button 
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-brand text-white shadow-md' : 'text-white/50 hover:text-white'}`}>
                حساب جديد
              </button>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold text-center animate-fade-in">{error}</div>}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white/50 mb-1 block">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand/50 focus:bg-white/10 transition-all font-sans"
                    placeholder="example@mail.com"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white/50 mb-1 block">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand/50 focus:bg-white/10 transition-all font-sans"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary w-full py-4 mt-2 flex justify-center items-center shadow-lg shadow-brand/20 font-bold"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد')}
              </button>
            </form>

            <div className="mt-8">
              <div className="relative flex items-center mb-6">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-white/40 text-sm font-bold">أو عن طريق</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => handleSocialLogin('google')} 
                  disabled={loading}
                  className="flex-1 flex justify-center items-center py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                >
                  <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-white font-bold text-sm">جوجل</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => handleSocialLogin('facebook')} 
                  disabled={loading}
                  className="flex-1 flex justify-center items-center py-3 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 rounded-xl transition-all"
                >
                  <svg className="w-6 h-6 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-[#1877F2] font-bold text-sm">فيسبوك</span>
                </button>
              </div>
            </div>
          </div>
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

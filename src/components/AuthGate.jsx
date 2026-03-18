import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Loader2, Car, User, Phone, ArrowRight, MapPin } from 'lucide-react';

/* ============================================================
   SCREENS:
   'loading'       → spinner while Firebase checks auth
   'welcome'       → landing page: "إنشاء حساب" / "تسجيل الدخول"
   'register'      → new account form (name + phone)
   'login'         → returning user phone entry
   'role_select'   → choose Rider or Driver after auth
   'driver_pending'→ driver waiting for admin approval
   'authed'        → render children (app content)
============================================================ */

const AuthGate = ({ children }) => {
  const [screen, setScreen] = useState('loading');
  const [userRole, setUserRole] = useState(null);
  const [driverStatus, setDriverStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });

  /* ── Firebase Auth Check on Mount ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            setUserRole(data.role);

            if (data.role === 'driver') {
              // Check driver application status
              const driverSnap = await getDoc(doc(db, 'drivers', data.phone || user.uid));
              if (driverSnap.exists()) {
                setDriverStatus(driverSnap.data().status);
                setScreen('authed');
              } else {
                // Check driver_applications
                setDriverStatus('pending');
                setScreen('driver_pending');
              }
            } else {
              setScreen('authed');
            }
          } else {
            setScreen('welcome');
          }
        } catch {
          const cached = localStorage.getItem('tiaret_user');
          if (cached) {
            const u = JSON.parse(cached);
            setUserRole(u.role || 'rider');
            setScreen(u.role === 'driver' && !u.driverApproved ? 'driver_pending' : 'authed');
          } else {
            setScreen('welcome');
          }
        }
      } else {
        const cached = localStorage.getItem('tiaret_user');
        if (cached) {
          const u = JSON.parse(cached);
          setUserRole(u.role || 'rider');
          setScreen(u.role === 'driver' && !u.driverApproved ? 'driver_pending' : 'authed');
        } else {
          setScreen('welcome');
        }
      }
    });
    return () => unsub();
  }, []);

  /* ── Register New User ── */
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.phone) {
      setError('يرجى ملء جميع الحقول');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let uid = auth.currentUser?.uid;
      if (!uid) {
        const cred = await signInAnonymously(auth);
        uid = cred.user.uid;
      }
      await setDoc(doc(db, 'users', uid), { ...form, createdAt: new Date().toISOString() });
    } catch {/* Firebase may not be configured — offline fallback */}
    localStorage.setItem('tiaret_user', JSON.stringify({ ...form }));
    setLoading(false);
    setScreen('role_select');
  };

  /* ── Login Existing User ── */
  const handleLogin = (e) => {
    e.preventDefault();
    if (!form.phone) { setError('أدخل رقم هاتفك'); return; }
    const cached = localStorage.getItem('tiaret_user');
    if (cached) {
      const u = JSON.parse(cached);
      setUserRole(u.role || 'rider');
      setScreen(u.role === 'driver' && !u.driverApproved ? 'driver_pending' : 'authed');
    } else {
      setError('لم يتم العثور على حساب. أنشئ حساباً جديداً.');
    }
  };

  /* ── Select Role ── */
  const handleSelectRole = async (role) => {
    setUserRole(role);
    const cached = JSON.parse(localStorage.getItem('tiaret_user') || '{}');
    const updated = { ...cached, role };
    localStorage.setItem('tiaret_user', JSON.stringify(updated));
    try {
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), { role }, { merge: true });
      }
    } catch {/* offline ok */}

    if (role === 'driver') {
      // Redirect to driver registration
      window.location.hash = '#/driver/register';
      setScreen('authed');
    } else {
      setScreen('authed');
    }
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
        <div className="glass-card max-w-sm w-full p-8 rounded-3xl text-center">
          <div className="w-20 h-20 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">طلبك قيد المراجعة</h2>
          <p className="text-white/60 leading-relaxed mb-8">
            شكراً على تسجيلك كسائق. سيقوم فريقنا بمراجعة مستنداتك وتفعيل حسابك في أقرب وقت ممكن.
          </p>
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4">
            <p className="text-yellow-300 text-sm font-bold">📍 يمكنك متابعتنا على تيارت لمعرفة حالة طلبك</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Common card wrapper ── */
  const commonBg = (
    <div className="min-h-screen bg-dark relative overflow-hidden flex flex-col" dir="rtl">
      {/* decorative circles */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );

  /* ─── WELCOME ─── */
  if (screen === 'welcome') {
    return (
      <div className="min-h-screen bg-dark relative overflow-hidden flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-brand/5 rounded-full blur-3xl" />

        {/* Logo / Hero */}
        <div className="text-center mb-12 z-10">
          <div className="w-24 h-24 bg-brand rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand/40">
            <Car className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">تيارت رايد</h1>
          <p className="text-white/50 text-lg">خدمة توصيل ذكية في مدينة تيارت</p>
        </div>

        {/* Buttons */}
        <div className="w-full max-w-sm space-y-4 z-10">
          <button
            onClick={() => { setForm({ firstName: '', lastName: '', phone: '' }); setScreen('register'); }}
            className="btn-primary w-full"
          >
            إنشاء حساب جديد
          </button>
          <button
            onClick={() => { setForm({ firstName: '', lastName: '', phone: '' }); setScreen('login'); }}
            className="btn-ghost w-full"
          >
            تسجيل الدخول
          </button>
        </div>

        <p className="text-white/30 text-sm mt-10 z-10 text-center">نسخة تجريبية — تيارت، الجزائر</p>
      </div>
    );
  }

  /* ─── REGISTER ─── */
  if (screen === 'register') {
    return (
      <div className="min-h-screen bg-dark flex flex-col" dir="rtl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />

        {/* Header */}
        <div className="p-6 pt-12 text-center">
          <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand/30">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white mb-1">إنشاء حساب</h2>
          <p className="text-white/50">أدخل بياناتك للبدء</p>
        </div>

        {/* Form Card */}
        <div className="flex-1 px-6 pb-8">
          <div className="glass-card rounded-3xl p-6 mt-4">
            {error && <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded-xl mb-4 text-sm font-bold text-center">{error}</div>}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label-ar">الاسم الأول</label>
                <input type="text" placeholder="مثال: سامي" value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  className="input-ar" />
              </div>
              <div>
                <label className="label-ar">اللقب</label>
                <input type="text" placeholder="مثال: بلعيد" value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className="input-ar" />
              </div>
              <div>
                <label className="label-ar">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input type="tel" placeholder="05XX XX XX XX" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="input-ar pl-12 text-left" dir="ltr" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>متابعة <ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>

            <button onClick={() => setScreen('welcome')} className="btn-ghost w-full mt-3">
              رجوع
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── LOGIN ─── */
  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl">
          <div className="w-16 h-16 bg-brand/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Phone className="w-8 h-8 text-brand" />
          </div>
          <h2 className="text-2xl font-black text-white text-center mb-1">تسجيل الدخول</h2>
          <p className="text-white/50 text-center mb-6 text-sm">أدخل رقم هاتفك المسجل</p>

          {error && <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded-xl mb-4 text-sm font-bold text-center">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="tel" placeholder="05XX XX XX XX" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="input-ar pl-12 text-left" dir="ltr" />
            </div>
            <button type="submit" className="btn-primary w-full">دخول</button>
          </form>
          <button onClick={() => setScreen('welcome')} className="btn-ghost w-full mt-3">رجوع</button>
        </div>
      </div>
    );
  }

  /* ─── ROLE SELECTION ─── */
  if (screen === 'role_select') {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />

        <div className="text-center mb-10 z-10">
          <h2 className="text-3xl font-black text-white mb-2">من أنت؟</h2>
          <p className="text-white/50">اختر دورك في التطبيق</p>
        </div>

        <div className="w-full max-w-sm space-y-4 z-10">
          {/* Rider Card */}
          <button onClick={() => handleSelectRole('rider')}
            className="w-full glass-card rounded-3xl p-6 flex items-center gap-5 hover:border-brand/60 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-white/10 text-right">
            <div className="w-16 h-16 bg-brand/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-brand" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-white">راكب</h3>
              <p className="text-white/50 text-sm mt-0.5">اطلب رحلة أو خدمة توصيل</p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/30 rotate-180" />
          </button>

          {/* Driver Card */}
          <button onClick={() => handleSelectRole('driver')}
            className="w-full glass-card rounded-3xl p-6 flex items-center gap-5 hover:border-brand/60 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-white/10 text-right">
            <div className="w-16 h-16 bg-green-400/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Car className="w-8 h-8 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-white">سائق</h3>
              <p className="text-white/50 text-sm mt-0.5">انضم كشريك سائق في تيارت</p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/30 rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthGate;

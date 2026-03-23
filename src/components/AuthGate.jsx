import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Loader2, Car, User, Phone, ArrowRight, MapPin, KeyRound } from 'lucide-react';

/* ============================================================
   SCREENS:
   'loading'       → spinner while Firebase checks auth
   'welcome'       → landing page
   'phone_entry'   → enter phone number (+213)
   'otp_entry'     → enter 6-digit OTP
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');

  // OTP Firebase Result
  const [confirmationResult, setConfirmationResult] = useState(null);

  /* ── Firebase Auth Check on Mount ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        checkUserInFirestore(user.uid, user.phoneNumber);
      } else {
        setScreen('welcome');
      }
    });

    // Setup Invisible Recaptcha
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }

    return () => unsub();
  }, []);

  const checkUserInFirestore = async (uid, phone) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        setUserRole(data.role);

        if (data.role === 'driver') {
          // Check driver application status (drivers collection uses uid or phone)
          const driverSnap = await getDoc(doc(db, 'drivers', uid));
          if (driverSnap.exists()) {
            setDriverStatus(driverSnap.data().status);
            setScreen('authed');
          } else {
            setDriverStatus('pending');
            setScreen('authed'); // DriverDashboard will handle pending state if needed, or we show driver_pending
            // Let's forward them to driver_pending if they don't have driver profile yet or pending
            setScreen('driver_pending');
          }
        } else {
          setScreen('authed');
        }
      } else {
        // User authenticated but no profile yet -> ask for name & role
        setScreen('profile_setup');
      }
    } catch (e) {
      console.error(e);
      setScreen('welcome');
    }
  };

  /* ── Send OTP ── */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    
    // Format to Algeria +213 if starting with 0
    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+213' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+213' + formattedPhone;
    }

    if (formattedPhone.length < 10) {
      setError('يرجى إدخال رقم هاتف صحيح');
      return;
    }

    setLoading(true);
    try {
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setScreen('otp_entry');
    } catch (err) {
      console.error(err);
      setError('فشل إرسال رمز التحقق. تأكد من الرقم والمحاولة مرة أخرى.');
    }
    setLoading(false);
  };

  /* ── Verify OTP ── */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setError('أدخل الرمز المكون من 6 أرقام');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await confirmationResult.confirm(otpCode);
      // Let onAuthStateChanged handle the redirect
      checkUserInFirestore(result.user.uid, result.user.phoneNumber);
    } catch (err) {
      console.error(err);
      setError('الرمز غير صحيح، حاول مرة أخرى');
      setLoading(false);
    }
  };

  /* ── Save Profile ── */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !role) {
      setError('يرجى تعبئة جميع الحقول واختيار دورك');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      const uid = user.uid;
      const phone = user.phoneNumber;

      await setDoc(doc(db, 'users', uid), {
        firstName,
        lastName,
        phone,
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
        <div className="glass-card max-w-sm w-full p-8 rounded-3xl text-center">
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
          <button onClick={() => setScreen('phone_entry')} className="btn-primary w-full flex justify-center items-center gap-2">
            الدخول برقم الهاتف <Phone className="w-5 h-5" />
          </button>
        </div>
      )}

      {screen === 'phone_entry' && (
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl z-10">
          <button onClick={() => setScreen('welcome')} className="text-white/50 hover:text-white mb-6">← رجوع</button>
          <h2 className="text-2xl font-black text-white mb-2">تسجيل الدخول / إنشاء حساب</h2>
          <p className="text-white/50 text-sm mb-6">أدخل رقم هاتفك لتسجيل الدخول أو لإنشاء حساب جديد.</p>
          {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-xl mb-4 text-sm font-bold text-center">{error}</div>}
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="tel" placeholder="05XX XX XX XX" value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                className="input-ar pl-12 text-left" dir="ltr" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center items-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'المتابعة'}
            </button>
          </form>
        </div>
      )}

      {screen === 'otp_entry' && (
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl z-10 text-center">
          <button onClick={() => setScreen('phone_entry')} className="text-white/50 hover:text-white mb-6 block text-right w-full">← تعديل الرقم</button>
          <div className="w-16 h-16 bg-brand/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-brand" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">تأكيد الرقم</h2>
          <p className="text-white/50 text-sm mb-6">أدخل رمز التحقق الذي وصلك في رسالة نصية</p>
          {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-xl mb-4 text-sm font-bold text-center">{error}</div>}
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="relative">
              <input type="number" placeholder="123456" value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                className="input-ar text-center text-2xl tracking-[0.5em]" dir="ltr" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center items-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد الرمز'}
            </button>
          </form>
        </div>
      )}

      {screen === 'profile_setup' && (
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl z-10 mt-12">
          <h2 className="text-2xl font-black text-white mb-2 text-center">أهلاً بك في تيارت رايد!</h2>
          <p className="text-white/50 text-sm mb-6 text-center">دعنا نتعرف عليك ونقوم بإكمال ملفك الشخصي</p>
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

import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Car, Navigation, CheckCircle2, WifiOff, AlertTriangle, LogIn, Loader2, Phone } from 'lucide-react';

/* ═══════════════════════════════════════════════════
   Driver Dashboard:
   - Login with phone
   - Paywall (3-free-trip rule)
   - Online/offline toggle
   - Live location push to Firebase
   - Floating incoming order notification
═══════════════════════════════════════════════════ */
const DriverDashboard = () => {
  const [phone, setPhone] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driverData, setDriverData] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const watchRef = useRef(null);

  /* ── Auto-login from localStorage ── */
  useEffect(() => {
    const cached = localStorage.getItem('tiaret_user');
    if (cached) {
      const u = JSON.parse(cached);
      if (u.role === 'driver' && u.phone) {
        setPhone(u.phone);
        setIsLoggedIn(true);
      }
    }
  }, []);

  /* ── Listen to driver profile ── */
  useEffect(() => {
    if (!isLoggedIn || !phone) return;
    const unsub = onSnapshot(doc(db, 'drivers', phone), snap => {
      if (snap.exists()) setDriverData(snap.data());
      else setDriverData(null);
    });
    return () => unsub();
  }, [isLoggedIn, phone]);

  /* ── Watch for new 'finding' orders ── */
  useEffect(() => {
    if (!isOnline) return;
    const q = query(collection(db, 'orders'), where('status', '==', 'finding'));
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty && !activeOrder) {
        const doc = snap.docs[0];
        setIncomingOrder({ id: doc.id, ...doc.data() });
      }
    });
    return () => unsub();
  }, [isOnline, activeOrder]);

  /* ── Live location tracking ── */
  useEffect(() => {
    if (isOnline && phone && navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        async pos => {
          try {
            await updateDoc(doc(db, 'drivers', phone), {
              location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
              status: 'available'
            });
          } catch { /* offline ok */ }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    } else {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
      if (phone && !isOnline) {
        updateDoc(doc(db, 'drivers', phone), { status: 'offline', location: null }).catch(() => {});
      }
    }
    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [isOnline, phone]);

  /* ── Accept order ── */
  const handleAccept = async () => {
    if (!incomingOrder) return;
    try {
      await updateDoc(doc(db, 'orders', incomingOrder.id), {
        status: 'active',
        driverId: phone
      });
      // Deduct a free trip (or balance)
      if (driverData) {
        if (driverData.freeTrips > 0) {
          await updateDoc(doc(db, 'drivers', phone), { freeTrips: driverData.freeTrips - 1 });
        } else if (driverData.balance > 0) {
          await updateDoc(doc(db, 'drivers', phone), { balance: driverData.balance - 50 });
        }
      }
    } catch { /* offline fallback */ }
    setActiveOrder(incomingOrder);
    setIncomingOrder(null);
  };

  const handleDecline = () => setIncomingOrder(null);

  const handleCompleteOrder = async () => {
    if (!activeOrder) return;
    try {
      await updateDoc(doc(db, 'orders', activeOrder.id), { status: 'completed' });
    } catch { /* offline */ }
    setActiveOrder(null);
  };

  /* ── LOGIN SCREEN ── */
  const isBlocked = driverData && driverData.freeTrips === 0 && (driverData.balance || 0) <= 0;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6" dir="rtl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl z-10">
          <div className="w-16 h-16 bg-brand/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Car className="w-8 h-8 text-brand" />
          </div>
          <h2 className="text-2xl font-black text-white text-center mb-1">دخول السائق</h2>
          <p className="text-white/50 text-center mb-6 text-sm">أدخل رقم هاتفك المسجل</p>
          <div className="relative mb-4">
            <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="tel" placeholder="05XX XX XX XX" dir="ltr"
              value={phone} onChange={e => setPhone(e.target.value)}
              className="input-ar pl-12 text-left" />
          </div>
          <button
            onClick={() => { if (phone.length > 6) setIsLoggedIn(true); }}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            دخول <LogIn className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  /* ── LOADING driver data ── */
  if (driverData === null) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand animate-spin mx-auto mb-4" />
          <p className="text-white/60 font-bold">جارٍ تحميل ملفك الشخصي...</p>
          <p className="text-white/30 text-sm mt-2">تأكد من اعتماد حسابك من طرف الإدارة</p>
        </div>
      </div>
    );
  }

  /* ── PAYWALL SCREEN ── */
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl text-center z-10">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">تم استنفاد الرحلات المجانية</h2>
          <p className="text-white/60 leading-relaxed mb-6">
            لقد استخدمت رحلاتك الـ 3 المجانية. لمواصلة العمل وقبول الطلبات، يرجى تعبئة رصيدك.
          </p>
          <div className="bg-brand/10 border border-brand/30 rounded-2xl p-5 text-right">
            <p className="text-brand font-black text-sm mb-1">📍 كيفية تعبئة الرصيد:</p>
            <p className="text-white/60 text-sm leading-relaxed">
              يرجى التقرب من مقرنا في تيارت بالمستندات اللازمة لتعبئة رصيدك ومواصلة العمل بشكل طبيعي.
            </p>
          </div>
          <div className="mt-4 bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/40 text-xs">رصيدك الحالي</p>
            <p className="text-2xl font-black text-white">{driverData.balance || 0} دج</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── MAIN DRIVER DASHBOARD ── */
  const freeLeft = driverData.freeTrips || 0;

  return (
    <div className="min-h-screen bg-dark flex flex-col p-5 pt-12 max-w-md mx-auto relative" dir="rtl">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 z-10">
        <div>
          <h1 className="text-2xl font-black text-white">مرحباً، {driverData.firstName}</h1>
          <p className="text-white/50 text-sm">شريك تيارت رايد</p>
        </div>
        <div className="w-12 h-12 bg-brand/20 rounded-2xl flex items-center justify-center">
          <span className="text-xl font-black text-brand">{driverData.firstName?.charAt(0)}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 z-10">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">رحلات مجانية</p>
          <p className="text-3xl font-black text-brand">{freeLeft}</p>
          <p className="text-white/30 text-xs mt-1">من 3 رحلات</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">الرصيد</p>
          <p className="text-3xl font-black text-white">{driverData.balance || 0}</p>
          <p className="text-white/30 text-xs mt-1">دينار جزائري</p>
        </div>
      </div>

      {/* Online/Offline Card */}
      <div className="glass-card rounded-[28px] p-6 flex-1 flex flex-col items-center justify-center text-center z-10 min-h-[300px]">
        {/* Active order view */}
        {activeOrder ? (
          <div className="w-full animate-fade-in">
            <div className="w-16 h-16 bg-green-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Navigation className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-black text-white mb-1">رحلة نشطة</h2>
            <p className="text-white/50 text-sm mb-4">أنت في طريقك للزبون</p>
            <div className="bg-white/5 rounded-2xl p-4 mb-6 text-right">
              <p className="text-white/50 text-xs mb-1">السعر</p>
              <p className="text-2xl font-black text-white">{activeOrder.price} دج</p>
            </div>
            <button onClick={handleCompleteOrder}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl transition-all active:scale-95">
              تأكيد إتمام الرحلة ✓
            </button>
          </div>
        ) : isOnline ? (
          <div className="animate-fade-in flex flex-col items-center">
            <div className="relative w-32 h-32 mb-6">
              <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping" />
              <div className="absolute inset-3 bg-brand/40 rounded-full animate-ping" style={{ animationDelay: '0.25s' }} />
              <div className="absolute inset-7 bg-brand rounded-full flex items-center justify-center shadow-xl">
                <Navigation className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-black text-white mb-1">أنت متصل</h2>
            <p className="text-white/50 mb-8">تبحث عن الطلبات في تيارت...</p>
            <button onClick={() => setIsOnline(false)}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all flex items-center gap-2">
              <WifiOff className="w-5 h-5" /> قطع الاتصال
            </button>
          </div>
        ) : (
          <div className="animate-fade-in flex flex-col items-center">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <Car className="w-12 h-12 text-white/40" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">أنت غير متصل</h2>
            <p className="text-white/40 mb-8">شغّل الاتصال لتبدأ قبول الطلبات</p>
            <button onClick={() => setIsOnline(true)}
              className="w-full btn-primary flex items-center justify-center gap-3 py-5 text-lg">
              <CheckCircle2 className="w-6 h-6" /> تشغيل والبدء بالعمل
            </button>
          </div>
        )}
      </div>

      {/* ── INCOMING ORDER POPUP ── */}
      {incomingOrder && !activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end" dir="rtl">
          <div className="glass-card w-full rounded-t-[32px] p-6 pb-10 animate-slide-up border-t border-brand/30">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-brand/20 rounded-2xl flex items-center justify-center">
                <Navigation className="w-7 h-7 text-brand" />
              </div>
              <div>
                <p className="text-brand font-black text-sm uppercase tracking-wider">طلب جديد!</p>
                <h3 className="text-xl font-black text-white">
                  {incomingOrder.serviceType === 'delivery' ? 'طلب توصيل' : 'طلب رحلة'}
                </h3>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 mb-5 flex items-center justify-between">
              <div>
                <p className="text-white/50 text-xs mb-1">السعر</p>
                <p className="text-2xl font-black text-white">{incomingOrder.price} دج</p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-xs mb-1">الرحلات المجانية المتبقية</p>
                <p className="text-brand font-black">{freeLeft} رحلة</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleDecline}
                className="py-4 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-black transition-all active:scale-95">
                رفض ✕
              </button>
              <button onClick={handleAccept}
                className="py-4 rounded-2xl bg-brand hover:bg-brand-dark text-white font-black transition-all active:scale-95 shadow-lg shadow-brand/30">
                قبول ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;

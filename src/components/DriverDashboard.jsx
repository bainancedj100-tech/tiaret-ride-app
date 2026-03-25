import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { updateDriverLocation } from '../services/db';
import Map from './Map';
import {
  Car, Navigation, CheckCircle2, WifiOff, AlertTriangle,
  LogIn, Loader2, Phone, Clock, Ban, ShieldCheck
} from 'lucide-react';

/* ═══════════════════════════════════════════════════
   Driver Dashboard:
   - Login with phone
   - Status gate: pending / banned / active
   - Paywall (freeTrips + balance)
   - Online/offline toggle
   - Live GPS → Firebase
   - Incoming order popup
═══════════════════════════════════════════════════ */
const DriverDashboard = () => {
  const [phone, setPhone] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driverData, setDriverData] = useState(undefined); // undefined = loading
  const [isOnline, setIsOnline] = useState(false);
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [radius, setRadius] = useState(0.5);
  const watchRef = useRef(null);
  
  // Circle expansion when online and no active order
  useEffect(() => {
    let interval;
    if (isOnline && !activeOrder) {
      interval = setInterval(() => {
        setRadius(r => r >= 5 ? 0.5 : r + 0.5);
      }, 10000);
    } else {
      setRadius(0.5);
    }
    return () => clearInterval(interval);
  }, [isOnline, activeOrder]);

  /* ── Auto-login from localStorage ── */
  useEffect(() => {
    const cached = localStorage.getItem('tiaret_driver_phone');
    if (cached) {
      setPhone(cached);
      setIsLoggedIn(true);
    }
  }, []);

  /* ── Listen to driver profile from Firestore ── */
  useEffect(() => {
    if (!isLoggedIn || !phone) return;
    const unsub = onSnapshot(doc(db, 'drivers', phone), snap => {
      setDriverData(snap.exists() ? snap.data() : null);
    });
    return () => unsub();
  }, [isLoggedIn, phone]);

  /* ── Listen for new orders (only when online & active) ── */
  useEffect(() => {
    if (!isOnline || driverData?.status !== 'active') return;
    const q = query(collection(db, 'orders'), where('status', '==', 'finding'));
    const unsub = onSnapshot(q, snap => {
      const ords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAvailableOrders(ords);
      if (ords.length > 0 && !activeOrder && !incomingOrder) {
        setIncomingOrder(ords[0]);
      }
    });
    return () => unsub();
  }, [isOnline, activeOrder, driverData?.status, incomingOrder]);

  /* ── Live GPS tracking ── */
  useEffect(() => {
    if (isOnline && driverData?.status === 'active' && phone && navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        async pos => {
          try {
            await updateDriverLocation(phone, { lat: pos.coords.latitude, lng: pos.coords.longitude }, {
              name: driverData.firstName,
              vehicle: driverData.vehicle || 'سيارة عادية'
            });
          } catch { /* offline ok */ }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    } else {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
      if (phone && !isOnline) {
        updateDriverLocation(phone, null).catch(() => {});
      }
    }
    return () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); };
  }, [isOnline, phone, driverData?.status]);

  /* ── Accept order ── */
  const handleAccept = async () => {
    if (!incomingOrder) return;
    try {
      await updateDoc(doc(db, 'orders', incomingOrder.id), { status: 'active', driverId: phone });
      // Deduct
      if (driverData?.freeTrips > 0) {
        await updateDoc(doc(db, 'drivers', phone), { freeTrips: driverData.freeTrips - 1 });
      } else if ((driverData?.balance || 0) > 0) {
        await updateDoc(doc(db, 'drivers', phone), { balance: driverData.balance - 50 });
      }
    } catch { /* offline */ }
    setActiveOrder(incomingOrder);
    setIncomingOrder(null);
  };

  const handleCompleteOrder = async () => {
    if (!activeOrder) return;
    try { await updateDoc(doc(db, 'orders', activeOrder.id), { status: 'completed' }); } catch { }
    setActiveOrder(null);
  };

  /* ════════════════════════════════════
     SCREENS
  ════════════════════════════════════ */

  /* ── 1. LOGIN ── */
  if (!isLoggedIn) {
    return (
      <div className="h-[100dvh] bg-dark overflow-y-auto flex items-center justify-center p-6" dir="rtl">
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
            onClick={() => {
              if (phone.length > 6) {
                localStorage.setItem('tiaret_driver_phone', phone);
                setIsLoggedIn(true);
              }
            }}
            className="btn-primary w-full flex items-center justify-center gap-2">
            دخول <LogIn className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  /* ── 2. LOADING ── */
  if (driverData === undefined) {
    return (
      <div className="h-[100dvh] bg-dark overflow-y-auto flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand animate-spin mx-auto mb-4" />
          <p className="text-white/60 font-bold">جارٍ تحميل ملفك الشخصي...</p>
        </div>
      </div>
    );
  }

  /* ── 3. NOT FOUND ── */
  if (driverData === null) {
    return (
      <div className="h-[100dvh] bg-dark overflow-y-auto flex items-center justify-center p-6" dir="rtl">
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-2">الحساب غير موجود</h2>
          <p className="text-white/50 mb-6">رقم هاتفك غير مسجل في النظام. يرجى التسجيل أولاً.</p>
          <button onClick={() => { localStorage.removeItem('tiaret_driver_phone'); setIsLoggedIn(false); setPhone(''); }}
            className="btn-ghost w-full">تسجيل جديد</button>
        </div>
      </div>
    );
  }

  /* ── 4. PENDING ── */
  if (driverData.status === 'pending') {
    return (
      <div className="h-[100dvh] bg-dark overflow-y-auto flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl text-center z-10">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">حسابك قيد المراجعة</h2>
          <p className="text-white/60 leading-relaxed mb-6">
            تم استلام طلبك بنجاح. سيتواصل معك فريق تيارت رايد بعد مراجعة ملفك.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6">
            <p className="text-amber-300 text-sm font-bold">⏳ الحالة: في انتظار الاعتماد</p>
            <p className="text-white/40 text-xs mt-1">لا يمكنك استقبال الطلبات حتى تفعيل حسابك</p>
          </div>
          <button onClick={() => { localStorage.removeItem('tiaret_driver_phone'); setIsLoggedIn(false); setPhone(''); setDriverData(undefined); }}
            className="btn-ghost w-full text-sm">تسجيل خروج</button>
        </div>
      </div>
    );
  }

  /* ── 5. BANNED ── */
  if (driverData.status === 'banned') {
    return (
      <div className="h-[100dvh] bg-dark overflow-y-auto flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl text-center z-10">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <Ban className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">تم تعليق حسابك</h2>
          <p className="text-white/60 leading-relaxed mb-6">
            حسابك محظور من قِبل الإدارة. يرجى التواصل مع فريق تيارت رايد لمزيد من المعلومات.
          </p>
          <button onClick={() => { localStorage.removeItem('tiaret_driver_phone'); setIsLoggedIn(false); setPhone(''); setDriverData(undefined); }}
            className="btn-ghost w-full text-sm">تسجيل خروج</button>
        </div>
      </div>
    );
  }

  /* ── 6. PAYWALL ── */
  const isBlocked = (driverData.freeTrips ?? 0) <= 0 && (driverData.balance || 0) <= 0;
  if (isBlocked) {
    return (
      <div className="h-[100dvh] bg-dark overflow-y-auto flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl text-center z-10">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">تم استنفاد الرحلات المجانية</h2>
          <p className="text-white/60 leading-relaxed mb-6">
            لقد استخدمت رحلاتك الـ 3 المجانية. لمواصلة العمل يرجى تعبئة رصيدك.
          </p>
          <div className="bg-brand/10 border border-brand/30 rounded-2xl p-5 text-right">
            <p className="text-brand font-black text-sm mb-1">📍 كيفية تعبئة الرصيد:</p>
            <p className="text-white/60 text-sm leading-relaxed">
              يرجى التقرب من مقرنا في تيارت بالمستندات اللازمة لتعبئة رصيدك.
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

  /* ── 7. MAIN ACTIVE DASHBOARD ── */
  const freeLeft = driverData.freeTrips ?? 0;

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-gray-50" dir="rtl">
      {/* Background Map Overlay */}
      <Map 
        onMapClick={() => {}} 
        destination={null} 
        radius={isOnline && !activeOrder ? radius : 0}
        showOrders={isOnline && !activeOrder}
        orders={availableOrders}
        showCircle={isOnline && !activeOrder}
      />
      
      {/* Overlay UI */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none flex flex-col p-5 pb-10 max-w-md mx-auto h-full justify-between">
        
        {/* Header (Top) */}
        <div className="flex items-center justify-between z-10 pointer-events-auto bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm mt-4">
          <div>
            <h1 className="text-xl font-black text-gray-900">مرحباً، {driverData.firstName}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-green-600 text-xs font-bold">حساب معتمد</span>
            </div>
          </div>
          <div className="relative w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-brand/20">
            {driverData?.profilePicUrl ? (
              <img src={driverData.profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-black text-brand">{driverData?.firstName?.charAt(0)}</span>
            )}
            <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
          </div>
        </div>

        {/* Bottom Cards Area */}
        <div className="pointer-events-auto mt-auto flex flex-col gap-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-light rounded-2xl p-4 shadow-sm">
              <p className="text-gray-500 text-xs font-bold uppercase mb-1">رحلات مجانية</p>
              <p className="text-2xl font-black text-brand">{freeLeft}</p>
            </div>
            <div className="glass-light rounded-2xl p-4 shadow-sm">
              <p className="text-gray-500 text-xs font-bold uppercase mb-1">الرصيد</p>
              <p className="text-2xl font-black text-gray-900">{driverData.balance || 0} دج</p>
            </div>
          </div>

          {/* Active / Offline Card */}
          <div className="glass-light rounded-[28px] p-5 shadow-lg w-full">
            {activeOrder ? (
              <div className="w-full animate-fade-in text-gray-900 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-200">
                  <Navigation className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-black mb-1">رحلة نشطة</h2>
                <p className="text-gray-500 text-sm mb-4">أنت في طريقك للزبون</p>
                <div className="bg-gray-100 rounded-2xl p-4 mb-4 flex justify-between items-center text-right">
                  <p className="text-gray-500 text-xs font-bold">المبلغ المستحق</p>
                  <p className="text-2xl font-black text-brand">{activeOrder.price} دج</p>
                </div>
                <button onClick={handleCompleteOrder}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl transition-all shadow-md active:scale-95">
                  تأكيد إتمام الرحلة ✓
                </button>
              </div>
            ) : isOnline ? (
              <div className="animate-fade-in flex flex-col items-center">
                <div className="relative w-24 h-24 mb-4">
                  <div className="absolute inset-0 bg-brand/10 rounded-full animate-ping" />
                  <div className="absolute inset-3 bg-brand/20 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
                  <div className="absolute inset-5 bg-brand rounded-full flex items-center justify-center shadow-lg">
                    <Navigation className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h2 className="text-lg font-black text-gray-900 mb-1">أنت متصل بالإنترنت</h2>
                <p className="text-gray-500 text-sm mb-5">دائرة البحث تتسع للعثور على زبائن (قطر {radius} كم)...</p>
                <button onClick={() => setIsOnline(false)}
                  className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-2xl transition-all flex justify-center items-center gap-2 border border-red-100 hover:bg-red-100">
                  <WifiOff className="w-5 h-5" /> التوقف مؤقتاً
                </button>
              </div>
            ) : (
              <div className="animate-fade-in flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Car className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">التطبيق متوقف</h2>
                <p className="text-gray-500 text-sm mb-5">شغّل الاتصال لتبدأ مسح الخريطة وقبول الطلبات</p>
                <button onClick={() => setIsOnline(true)}
                  className="w-full bg-gray-900 text-white flex items-center justify-center gap-3 py-4 rounded-2xl font-black shadow-lg">
                  <CheckCircle2 className="w-6 h-6" /> تشغيل النظام والبدء
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => { localStorage.removeItem('tiaret_driver_phone'); setIsLoggedIn(false); setPhone(''); setDriverData(undefined); }}
          className="mt-6 mb-2 pointer-events-auto text-gray-400 text-xs text-center font-bold hover:text-gray-600 transition-colors bg-white/50 py-2 rounded-full mx-auto px-6">
          تسجيل خروج
        </button>
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
              <button onClick={() => setIncomingOrder(null)}
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

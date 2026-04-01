import React, { useState, useEffect, useRef } from 'react';
import { Car, Package, MapPin, Navigation, Loader2, Star, X, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Map from './Map';
import { calculatePrice, calculateDistanceKm, TIARET_CENTER } from '../utils/pricing';
import { collection, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

/* ── Flow states ─────────────────────────────
   idle → finding → active → invoice
─────────────────────────────────────────────── */
const RiderHome = () => {
  const navigate = useNavigate();
  const [serviceType, setServiceType] = useState('ride');
  const [destination, setDestination] = useState(null);
  const [price, setPrice] = useState(0);
  const [distance, setDistance] = useState(0);
  const [flow, setFlow] = useState('idle');
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [rating, setRating] = useState(0);
  const [radius, setRadius] = useState(0.5); // Starts at 0.5 km
  const [assignedDriverLoc, setAssignedDriverLoc] = useState(null);
  const [initialDriverLoc, setInitialDriverLoc] = useState(null);
  const [rideState, setRideState] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const driverUnsubRef = useRef(null);

  const [errorMsg, setErrorMsg] = useState(null);

  /* ── Expanding Radius Logic ── */
  useEffect(() => {
    let interval;
    if (flow === 'finding') {
      interval = setInterval(() => {
        setRadius(r => {
          if (r >= 5) {
            // Reached out of bounds (approx 5km for the municipality)
            clearInterval(interval);
            setErrorMsg('لم نتمكن من العثور على سائق ضمن النطاق المتاح حالياً. حاول مرة أخرى.');
            if (currentOrderId) {
               import('firebase/firestore').then(({ updateDoc, doc }) => {
                 updateDoc(doc(db, 'orders', currentOrderId), { status: 'cancelled' }).catch(()=>{});
               });
            }
            return 0.5;
          }
          return r + 0.5;
        });
      }, 10000);
    } else {
      setRadius(0.5);
    }
    return () => clearInterval(interval);
  }, [flow, currentOrderId]);

  /* Tap on map → set destination */
  const handleMapClick = React.useCallback((latlng) => {
    if (flow !== 'idle') return;
    setDestination(latlng);
    const dist = calculateDistanceKm(
      TIARET_CENTER.lat, TIARET_CENTER.lng,
      latlng.lat, latlng.lng
    );
    setDistance(dist.toFixed(1));
    setPrice(calculatePrice(latlng));
  }, [flow]);

  /* Request ride → write to Firebase */
  const handleRequest = async () => {
    if (!destination) return;
    setFlow('finding');
    setErrorMsg(null);
    
    let orderOrigin = TIARET_CENTER;
    try {
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
        });
        orderOrigin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
    } catch (e) {
      console.warn("Could not get exact GPS origin, using default.");
    }

    try {
      const ref = await addDoc(collection(db, 'orders'), {
        serviceType,
        origin: orderOrigin,
        destination,
        price,
        status: 'finding',
        createdAt: new Date().toISOString(),
      });
      setCurrentOrderId(ref.id);

      const unsub = onSnapshot(doc(db, 'orders', ref.id), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.status === 'active') { 
          setFlow('active');
          setOrderData(data);
          setRideState(data.rideState);
          if (data.driverId && !driverUnsubRef.current) {
            driverUnsubRef.current = onSnapshot(doc(db, 'drivers_location', data.driverId), dSnap => {
              if (dSnap.exists() && dSnap.data().location) {
                const loc = dSnap.data().location;
                setAssignedDriverLoc(loc);
                setInitialDriverLoc(prev => prev ? prev : loc); // Track driver initial location
              }
            });
          }
        }
        if (data.status === 'completed') { setFlow('invoice'); unsub(); clearDriverUnsub(); }
        if (data.status === 'cancelled') { setFlow('idle'); setCurrentOrderId(null); unsub(); clearDriverUnsub(); }
      });
    } catch {
      setTimeout(() => setFlow('active'), 3000);
    }
  };

  const clearDriverUnsub = () => {
    if (driverUnsubRef.current) { driverUnsubRef.current(); driverUnsubRef.current = null; }
  };

  const handleDone = () => {
    setFlow('idle');
    setDestination(null);
    setPrice(0);
    setDistance(0);
    setCurrentOrderId(null);
    setRating(0);
    setAssignedDriverLoc(null);
    setInitialDriverLoc(null);
    clearDriverUnsub();
  };

  const handleCancelRequest = async () => {
    if (currentOrderId) {
      try {
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'orders', currentOrderId), { status: 'cancelled' });
        setInitialDriverLoc(null);
      } catch (err) {
         console.error(err);
      }
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-50" dir="rtl">
      {/* Map (always underneath) */}
      <Map 
        onMapClick={handleMapClick} 
        destination={destination} 
        radius={radius}
        assignedDriverLoc={assignedDriverLoc}
        showCircle={flow === 'finding'}
        routeOrigin={flow === 'active' && orderData ? (rideState === 'going_to_customer' && initialDriverLoc ? initialDriverLoc : orderData.origin) : null}
        routeDestination={flow === 'active' && orderData ? (rideState === 'going_to_customer' ? orderData.origin : orderData.destination) : null}
      />

      {errorMsg && flow === 'idle' && (
        <div className="absolute top-20 left-4 right-4 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between" dir="rtl">
          <p className="text-sm font-bold">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 font-bold p-2 hover:bg-red-100 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── TOP NAV (idle only) ── */}
      {flow === 'idle' && (
        <div className="absolute top-4 right-4 left-4 z-20 flex items-center justify-between">
          {destination ? (
            <button
              onClick={() => { setDestination(null); setPrice(0); }}
              className="glass-light px-5 py-2.5 rounded-full text-gray-700 font-bold text-sm shadow-xl flex items-center gap-2 transition-all hover:bg-white active:scale-95 border border-gray-100"
            >
              <X className="w-5 h-5 text-gray-400" /> الرجوع
            </button>
          ) : (
            <button
              onClick={() => navigate('/profile')}
              className="glass-light w-12 h-12 rounded-full flex items-center justify-center text-gray-700 shadow-xl transition-all hover:bg-white active:scale-95 border border-gray-100"
            >
              <User className="w-6 h-6" />
            </button>
          )}
          
          <button
            onClick={() => navigate('/driver/dashboard')}
            className="glass-light px-5 py-2.5 rounded-full text-gray-700 font-bold text-sm shadow-xl flex items-center gap-2 transition-all hover:bg-white active:scale-95 border border-gray-100"
          >
            دخول كسائق <Car className="w-5 h-5 text-brand" />
          </button>
        </div>
      )}

      {/* ── BOTTOM SHEET: IDLE ── */}
      {flow === 'idle' && (
        <div className="absolute bottom-0 left-0 right-0 z-10 animate-slide-up">
          <div className="glass-light rounded-t-[32px] px-5 pt-4 pb-8">
            {/* Handle */}
            <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mb-5" />

            {/* Title */}
            <h2 className="text-xl font-black text-gray-900 mb-4">
              {destination ? 'تفاصيل الرحلة' : 'إلى أين تريد الذهاب؟'}
            </h2>

            {/* Destination hint */}
            {!destination && (
              <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3 mb-4">
                <MapPin className="w-5 h-5 text-brand flex-shrink-0" />
                <p className="text-gray-500 text-sm font-medium">اضغط على الخريطة لتحديد وجهتك</p>
              </div>
            )}

            {/* Destination + price */}
            {destination && (
              <>
                {/* Price Card */}
                <div className="bg-brand/10 border border-brand/20 rounded-2xl p-4 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">السعر المقدر</p>
                    <p className="text-3xl font-black text-gray-900">{price} <span className="text-lg text-gray-500">دج</span></p>
                    <p className="text-xs text-gray-400 mt-1 font-bold">المسافة: {distance} كم</p>
                  </div>
                </div>

                {/* Service toggle */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button onClick={() => setServiceType('ride')}
                    className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all ${serviceType === 'ride' ? 'border-brand bg-brand/10' : 'border-gray-200 bg-white'}`}>
                    <Car className={`w-5 h-5 ${serviceType === 'ride' ? 'text-brand' : 'text-gray-500'}`} />
                    <span className={`font-bold text-sm ${serviceType === 'ride' ? 'text-brand' : 'text-gray-700'}`}>رحلة</span>
                  </button>
                  <button onClick={() => setServiceType('delivery')}
                    className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all ${serviceType === 'delivery' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'}`}>
                    <Package className={`w-5 h-5 ${serviceType === 'delivery' ? 'text-orange-500' : 'text-gray-500'}`} />
                    <span className={`font-bold text-sm ${serviceType === 'delivery' ? 'text-orange-600' : 'text-gray-700'}`}>توصيل</span>
                  </button>
                </div>
              </>
            )}

            {/* Request button */}
            <button
              onClick={destination ? handleRequest : null}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all duration-300 flex items-center justify-center gap-2
                ${destination
                  ? 'bg-gray-900 text-white shadow-xl hover:bg-black active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              {destination
                ? <>{serviceType === 'ride' ? 'طلب رحلة' : 'طلب توصيل'} <Navigation className="w-5 h-5" /></>
                : 'حدد وجهتك أولاً'}
            </button>
          </div>
        </div>
      )}

      {/* ── FINDING DRIVER ── */}
      {flow === 'finding' && (
        <div className="absolute inset-0 z-30 bg-black/50 flex items-end" dir="rtl">
          <div className="glass-light w-full rounded-t-[32px] px-6 pt-6 pb-12 flex flex-col items-center text-center animate-slide-up">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping" />
              <div className="absolute inset-3 bg-brand/40 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
              <div className="absolute inset-6 bg-brand rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">جارٍ البحث عن سائق...</h2>
            <p className="text-gray-500 font-medium mb-6">نتصل بأقرب السائقين في تيارت</p>
            <button onClick={handleCancelRequest} className="w-full py-4 bg-red-50 text-red-600 font-black rounded-2xl border border-red-100 hover:bg-red-100 transition-all active:scale-95">
              إلغاء الطلب ✕
            </button>
          </div>
        </div>
      )}

      {/* ── ACTIVE RIDE ── */}
      {flow === 'active' && (
        <div className="absolute bottom-0 left-0 right-0 z-20 animate-slide-up" dir="rtl">
          <div className="glass-light rounded-t-[32px] px-5 pt-4 pb-8">
            <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center">
                <Car className="w-7 h-7 text-brand" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-lg">سامي بلعيد</h3>
                <p className="text-gray-500 text-sm">رونو سيمبول — أبيض • 16 تيارت 1234</p>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-5 flex items-center justify-between">
              <span className="text-green-700 font-bold text-sm">
                {rideState === 'going_to_customer' ? '🕐 السائق في الطريق إليك' : '📍 السائق متوجه بك إلى الوجهة'}
              </span>
              <span className="text-green-600 font-black">{price} دج</span>
            </div>
            <button onClick={handleCancelRequest}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-2xl shadow-sm transition-all active:scale-95 border border-red-200 flex items-center justify-center gap-2">
              إلغاء الرحلة <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ── INVOICE / FEEDBACK ── */}
      {flow === 'invoice' && (
        <div className="absolute inset-0 z-40 bg-black/60 flex items-center justify-center px-5" dir="rtl">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in">
            {/* Green header */}
            <div className="bg-gradient-to-br from-green-400 to-green-600 p-8 flex flex-col items-center text-white">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">✓</span>
              </div>
              <h2 className="text-2xl font-black">وصلت بسلام!</h2>
              <p className="text-green-100 text-sm mt-1">شكراً لاستخدامك تيارت رايد</p>
            </div>

            <div className="p-6">
              {/* Amount */}
              <p className="text-center text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">المبلغ الإجمالي</p>
              <div className="flex items-end justify-center gap-2 mb-6">
                <span className="text-5xl font-black text-gray-900">{price}</span>
                <span className="text-xl font-bold text-gray-500 mb-1">دج</span>
              </div>

              {/* Rating */}
              <p className="text-center text-sm font-bold text-gray-700 mb-3">قيّم تجربتك</p>
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)}
                    className="transition-transform hover:scale-110 active:scale-90">
                    <Star className={`w-9 h-9 ${rating >= s ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>

              <button onClick={handleDone}
                className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-md transition-all active:scale-95">
                تم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderHome;

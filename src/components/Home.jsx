import React, { useState } from 'react';
import { Car, Package, MapPin, Search, Navigation, Loader2, ShieldAlert, BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Map from './Map';
import { calculatePrice } from '../utils/pricing';
import ActiveRide from './ActiveRide';
import Invoice from './Invoice';
import { collection, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

const Home = () => {
  const navigate = useNavigate();
  const [serviceType, setServiceType] = useState('ride'); // 'ride' or 'delivery'
  const [destination, setDestination] = useState(null);
  const [price, setPrice] = useState(0);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  
  // flow: 'idle' -> 'finding' -> 'active' -> 'invoice'
  const [orderStatus, setOrderStatus] = useState('idle'); 

  const handleMapClick = (latlng) => {
    if (orderStatus !== 'idle') return; // Don't allow changing destination during ride
    setDestination(latlng);
    const calculated = calculatePrice(latlng);
    setPrice(calculated);
  };

  const handleRequest = async () => {
    if (!destination || price === 0) return;
    setOrderStatus('finding');
    
    try {
      // 1. Create order in Firebase
      const docRef = await addDoc(collection(db, 'orders'), {
        serviceType,
        destination,
        price,
        status: 'finding',
        createdAt: new Date().toISOString(),
        customerInfo: 'Guest User' // Placeholder since we don't have customer auth yet
      });
      setCurrentOrderId(docRef.id);

      // 2. Listen to this specific order for driver acceptance
      const unsub = onSnapshot(doc(db, 'orders', docRef.id), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.status === 'active') {
            setOrderStatus('active');
            unsub(); // Stop listening once active to avoid multiple triggers, handle completion differently or keep listening
          } else if (data.status === 'completed') {
            setOrderStatus('invoice');
            unsub();
          } else if (data.status === 'cancelled') {
            setOrderStatus('idle');
            setCurrentOrderId(null);
            alert("Ride was cancelled.");
            unsub();
          }
        }
      });
    } catch (error) {
      console.error("Error creating order: ", error);
      alert("Failed to request ride. Please try again.");
      setOrderStatus('idle');
    }
  };

  const handleCompleteRide = async () => {
    // Note: In a real app, the driver app would trigger this completion.
    // We are simulating it here for the UI flow of the passenger.
    if (currentOrderId) {
      // We don't necessarily update Firebase here if the driver is supposed to do it,
      // but for simulation, we'll just move to invoice state visually.
      setOrderStatus('invoice');
    } else {
      setOrderStatus('invoice');
    }
  };

  const handleCloseInvoice = () => {
    setOrderStatus('idle');
    setDestination(null);
    setPrice(0);
    setCurrentOrderId(null);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background Interactive Map */}
      <Map onMapClick={handleMapClick} destination={destination} />

      {/* Floating Action Buttons */}
      {orderStatus === 'idle' && (
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-3 items-end">
          <button 
            onClick={() => navigate('/driver/register')}
            className="glass px-4 py-2 rounded-full shadow-lg border border-white flex items-center gap-2 hover:bg-white/80 transition-colors text-gray-800 font-bold text-sm"
          >
            سجل كشريك سائق <BadgeCheck className="w-4 h-4 text-brand" />
          </button>
          <button 
            onClick={() => navigate('/admin')}
            className="glass px-4 py-2 rounded-full shadow-lg border border-white flex items-center gap-2 hover:bg-white/80 transition-colors text-gray-800 font-bold text-sm"
          >
            لوحة الإدارة <ShieldAlert className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Top Search Bar Array (Hidden during active ride/invoice) */}
      {orderStatus === 'idle' && (
        <div className="absolute top-20 left-4 right-4 z-10 flex flex-col gap-3">
          {/* Glassmorphism User Current Location */}
          <div className="glass rounded-full px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
              <MapPin className="text-brand w-5 h-5" />
            </div>
            <input 
              type="text" 
              placeholder="Current Location..." 
              className="bg-transparent border-none outline-none flex-1 font-medium text-gray-800 placeholder-gray-500"
              defaultValue="Center Ville, Tiaret"
              readOnly
            />
          </div>

          {/* Glassmorphism Destination Input */}
          <div className="glass rounded-full px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <Search className="text-red-500 w-5 h-5" />
            </div>
            <input 
              type="text" 
              placeholder={destination ? "تم تحديد الوجهة على الخريطة" : "أين وجهتك؟"}
              className="bg-transparent border-none outline-none flex-1 font-medium text-gray-800 placeholder-gray-500 text-sm"
              readOnly
            />
          </div>
        </div>
      )}

      {/* Bottom Service Selection Sheet (Only in Idle state) */}
      {orderStatus === 'idle' && (
        <div className="absolute bottom-0 left-0 right-0 z-10 pb-6 pt-4 px-4 glass rounded-t-[32px] border-b-0 border-x-0">
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
        
        <h2 className="text-xl font-bold text-gray-800 mb-4 px-2">What do you need?</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Ride Option */}
          <button 
            onClick={() => setServiceType('ride')}
            className={`flex flex-col items-center justify-center p-4 rounded-3xl transition-all duration-300 border-2 ${
              serviceType === 'ride' 
                ? 'bg-brand/10 border-brand/50 shadow-md transform scale-105' 
                : 'bg-white/50 border-white/50 hover:bg-white/80'
            }`}
          >
            <div className={`p-4 rounded-full mb-3 ${serviceType === 'ride' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600'}`}>
              <Car className="w-8 h-8" />
            </div>
            <span className={`font-semibold ${serviceType === 'ride' ? 'text-brand' : 'text-gray-700'}`}>
              طلب رحلة
            </span>
          </button>

          {/* Delivery Option */}
          <button 
            onClick={() => setServiceType('delivery')}
            className={`flex flex-col items-center justify-center p-4 rounded-3xl transition-all duration-300 border-2 ${
              serviceType === 'delivery' 
                ? 'bg-orange-500/10 border-orange-500/50 shadow-md transform scale-105' 
                : 'bg-white/50 border-white/50 hover:bg-white/80'
            }`}
          >
            <div className={`p-4 rounded-full mb-3 ${serviceType === 'delivery' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <Package className="w-8 h-8" />
            </div>
            <span className={`font-semibold ${serviceType === 'delivery' ? 'text-orange-600' : 'text-gray-700'}`}>
              خدمة توصيل
            </span>
          </button>
        </div>

        {/* Pricing & Estimation Section */}
        {destination && (
          <div className="mt-5 p-4 bg-brand/5 border border-brand/20 rounded-2xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Estimated Fare</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-gray-900">{price}</span>
                <span className="text-sm font-bold text-gray-500">DA</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Status</span>
               <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Available</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-5">
          <button 
            onClick={() => navigate('/driver/register')}
            className="w-full bg-brand-light hover:bg-brand text-white font-bold py-3 text-lg rounded-2xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            سجل كشريك سائق <BadgeCheck className="w-5 h-5" />
          </button>
          <button 
            onClick={handleRequest}
            className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2"
            disabled={!destination}
          >
            {serviceType === 'ride' ? 'طلب رحلة' : 'تأكيد خدمة التوصيل'}
            {destination && <Navigation className="w-5 h-5 ml-1" />}
          </button>
        </div>
      </div>
      )}

      {/* Finding Driver State */}
      {orderStatus === 'finding' && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-10 pt-8 px-6 glass rounded-t-[32px] border-b-0 border-x-0 flex flex-col items-center justify-center text-center animate-in slide-in-from-bottom">
          <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Finding a driver...</h2>
          <p className="text-gray-500 font-medium">Contacting nearby drivers in Tiaret.</p>
        </div>
      )}

      {/* Active Ride State */}
      {orderStatus === 'active' && (
        <ActiveRide 
          driver={{ name: 'Samir', vehicle: 'Renault Symbol - White' }} 
          eta={4} 
          onComplete={handleCompleteRide} 
        />
      )}

      {/* Invoice State */}
      {orderStatus === 'invoice' && (
        <Invoice 
          price={price} 
          serviceType={serviceType} 
          destination={destination} 
          onClose={handleCloseInvoice} 
        />
      )}

    </div>
  );
};

export default Home;

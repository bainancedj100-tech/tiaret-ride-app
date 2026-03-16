import React from 'react';
import { BadgeCheck, MapPin, Navigation } from 'lucide-react';

const Invoice = ({ price, serviceType, destination, onClose }) => {
  return (
    <div className="absolute inset-0 z-50 glass-dark flex flex-col items-center justify-center px-6 animate-in fade-in duration-300">
      
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="bg-green-500 p-6 flex flex-col items-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
          <BadgeCheck className="w-16 h-16 mb-4 z-10" />
          <h2 className="text-2xl font-bold z-10">Ride Completed</h2>
          <p className="text-green-100 mt-1 z-10">Hope you enjoyed your {serviceType}!</p>
        </div>

        <div className="p-6">
          <p className="text-center text-gray-500 text-sm font-bold uppercase tracking-widest mb-2">Total Amount</p>
          <div className="flex items-end justify-center gap-2 mb-8">
            <span className="text-5xl font-black text-gray-900">{price}</span>
            <span className="text-xl font-bold text-gray-500 mb-1">DA</span>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="mt-1 bg-blue-100 p-2 rounded-full">
                <Navigation className="w-4 h-4 text-brand" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">From</p>
                <p className="text-sm font-semibold text-gray-800">Tiaret City Center</p>
              </div>
            </div>
            <div className="ml-4 border-l-2 border-dashed border-gray-200 h-6"></div>
            <div className="flex items-start gap-3">
              <div className="mt-1 bg-red-100 p-2 rounded-full">
                <MapPin className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">To</p>
                <p className="text-sm font-semibold text-gray-800">
                  {destination ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}` : 'Selected Destination'}
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default Invoice;

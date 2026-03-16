import React from 'react';
import { User, ShieldCheck, Phone, CheckCircle2 } from 'lucide-react';

const ActiveRide = ({ driver, eta, onComplete }) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 pt-4 px-4 glass-dark text-white rounded-t-[32px] border-b-0 border-x-0 animate-in slide-in-from-bottom duration-500">
      <div className="w-12 h-1.5 bg-gray-500 rounded-full mx-auto mb-6"></div>
      
      <div className="flex items-center justify-between px-2 mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            Driver is on the way <CheckCircle2 className="w-5 h-5 text-green-400" />
          </h2>
          <p className="text-gray-300 text-sm mt-1">Arriving in <span className="font-bold text-brand-light">{eta} mins</span></p>
        </div>
        <div className="p-3 bg-brand/20 rounded-full border border-brand/30">
          <User className="w-8 h-8 text-brand-light" />
        </div>
      </div>

      <div className="bg-white/10 rounded-2xl p-4 mb-6 backdrop-blur-md border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Driver Name</p>
            <p className="font-semibold text-lg">{driver?.name || "Samir"}</p>
          </div>
          <div className="text-right">
             <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Rating</p>
             <p className="font-semibold text-lg flex items-center gap-1 justify-end">4.9 ⭐️</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
           <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Vehicle</p>
            <p className="font-semibold text-md">{driver?.vehicle || "Renault Symbol - White"}</p>
          </div>
          <div className="text-right">
             <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Plate</p>
             <p className="font-semibold text-md bg-yellow-400/20 text-yellow-500 px-2 py-0.5 rounded-sm border border-yellow-500/30">00192 114 14</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
          <Phone className="w-5 h-5" /> Call Driver
        </button>
        <button 
          onClick={onComplete}
          className="flex-1 bg-brand hover:bg-brand-dark text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-5 h-5" /> Finish Demo
        </button>
      </div>
    </div>
  );
};

export default ActiveRide;

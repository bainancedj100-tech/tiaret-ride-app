import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadDriverDocument } from '../services/storage';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const DriverRegistration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nin: '',
    phone: '',
  });

  const [documents, setDocuments] = useState({
    idFront: null,
    idBack: null,
  });
  
  const [agreed, setAgreed] = useState(false);

  // File handling
  const handleFileChange = (e, type) => {
    if (e.target.files && e.target.files[0]) {
      setDocuments(prev => ({ ...prev, [type]: e.target.files[0] }));
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.nin || !formData.phone) {
        setError("All fields are required.");
        return;
      }
      
      // Basic phone check logic
      const q = query(collection(db, "driver_applications"), where("phone", "==", formData.phone));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setError("A registration with this phone number already exists.");
        return;
      }

      setError('');
      setStep(2);
    } else if (step === 2) {
      if (!documents.idFront || !documents.idBack) {
        setError("Please upload both front and back of your ID.");
        return;
      }
      setError('');
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!agreed) {
      setError("You must agree to the terms to proceed.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Upload documents tied strictly to phone number
      const phoneSanitized = formData.phone.replace(/[^0-9]/g, '');
      const frontUrl = await uploadDriverDocument(documents.idFront, phoneSanitized, 'id_front');
      const backUrl = await uploadDriverDocument(documents.idBack, phoneSanitized, 'id_back');

      if (!frontUrl || !backUrl) {
        throw new Error("Failed to upload documents. Please try again.");
      }

      // 2. Save application to Firestore
      await addDoc(collection(db, "driver_applications"), {
        ...formData,
        idFrontUrl: frontUrl,
        idBackUrl: backUrl,
        status: 'pending',
        freeTrips: 3,
        balance: 0,
        createdAt: new Date().toISOString()
      });

      setStep(4); // Success screen
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans pb-20">
      <div className="max-w-md mx-auto pt-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Driver Onboarding</h1>
        <p className="text-gray-500 font-medium mb-8">Join the professional fleet of Tiaret.</p>

        {/* Progress Bar */}
        {step < 4 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-2 rounded-full flex-1 ${step >= i ? 'bg-brand' : 'bg-gray-300'}`} />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-3 font-semibold text-sm">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="glass shadow-lg rounded-[32px] p-6 border border-white">
          {/* STEP 1: Personal Info */}
          {step === 1 && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <h2 className="text-xl font-bold mb-6 text-gray-800">Personal Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">First Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-medium"
                    placeholder="e.g. Samir"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Last Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-medium"
                    placeholder="e.g. ബെലാജ്"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">National ID (NIN)</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-medium"
                    placeholder="18-digit identity number"
                    value={formData.nin}
                    onChange={(e) => setFormData({...formData, nin: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-medium"
                    placeholder="0550 00 00 00"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <button 
                onClick={handleNext}
                className="w-full mt-8 bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                Continue Setup <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* STEP 2: Document Upload */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => setStep(1)}>
                <ChevronLeft className="w-5 h-5 text-gray-500" />
                <h2 className="text-xl font-bold text-gray-800">Identity Verification</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">ID Card (Front)</label>
                  <label className="border-2 border-dashed border-gray-300 bg-white/50 hover:bg-white/80 transition-colors rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden">
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'idFront')} />
                    {documents.idFront ? (
                      <span className="font-semibold text-green-600 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Image Selected</span>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-brand mb-2" />
                        <span className="font-medium text-gray-600 text-sm">Tap to upload front side</span>
                      </>
                    )}
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">ID Card (Back)</label>
                  <label className="border-2 border-dashed border-gray-300 bg-white/50 hover:bg-white/80 transition-colors rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden">
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'idBack')} />
                    {documents.idBack ? (
                      <span className="font-semibold text-green-600 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Image Selected</span>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-brand mb-2" />
                        <span className="font-medium text-gray-600 text-sm">Tap to upload back side</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <button 
                onClick={handleNext}
                className="w-full mt-8 bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                Review Agreement <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* STEP 3: Digital Agreement */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => setStep(2)}>
                <ChevronLeft className="w-5 h-5 text-gray-500" />
                <h2 className="text-xl font-bold text-gray-800">Digital Agreement</h2>
              </div>
              
              <div className="h-48 overflow-y-auto bg-white/60 rounded-xl p-4 border border-gray-200 text-sm text-gray-600 font-medium mb-6 leading-relaxed custom-scrollbar">
                <p className="mb-4">By signing up as a driver for Tiaret Ride App, you agree to the following terms and conditions:</p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li>You must maintain a valid driver's license and vehicle insurance.</li>
                  <li>You agree to provide safe and reliable transportation to passengers.</li>
                  <li>You are responsible for maintaining a minimum account balance to receive ride requests.</li>
                  <li>Any fraudulent activity will result in immediate termination of an account.</li>
                </ul>
                <p>New drivers are granted 3 free trips before requiring an account recharge.</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-brand focus:ring-brand"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className="text-sm font-semibold text-gray-700">I have read and agree to the Terms of Service.</span>
              </label>

              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="w-full mt-8 bg-brand hover:bg-brand-dark disabled:bg-gray-400 text-white font-bold py-4 rounded-xl shadow-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Submitting...' : 'I Agree & Sign'}
              </button>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (
            <div className="text-center py-8 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Received!</h2>
              <p className="text-gray-600 font-medium px-4 mb-8">
                Your application is currently under review. Our admins will verify your ID shortly.
              </p>
              <button 
                onClick={() => navigate('/')}
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center"
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverRegistration;

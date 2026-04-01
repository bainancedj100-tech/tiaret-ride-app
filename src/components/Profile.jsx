import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User, Phone, Moon, Sun, ArrowRight, Loader2, Camera } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    photoURL: ''
  });

  useEffect(() => {
    // Check current theme
    const isLight = document.body.classList.contains('theme-light');
    setIsDarkMode(!isLight);

    const loadUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/');
          return;
        }
        
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
            photoURL: data.photoURL || ''
          });
        }
      } catch (err) {
        console.error(err);
        setError('تعذر تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [navigate]);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.body.classList.add('theme-light');
      // Adding global overrides to body directly for simplicity without breaking the whole CSS
      document.body.style.background = '#f8f9fa';
      document.body.style.color = '#111827';
    } else {
      document.body.classList.remove('theme-light');
      document.body.style.background = '#0a0f1e';
      document.body.style.color = 'white';
    }
    setIsDarkMode(!isDarkMode);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        photoURL: formData.photoURL
      });
      
      setSuccess('تم تحديث البيانات بنجاح');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  const containerClass = isDarkMode ? "bg-dark" : "bg-gray-50 text-gray-900";
  const cardClass = isDarkMode ? "glass-card text-white" : "bg-white shadow-xl text-gray-900";
  const inputClass = isDarkMode ? "input-ar" : "w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:border-brand outline-none transition-all";

  return (
    <div className={`min-h-[100dvh] w-full overflow-y-auto px-4 py-6 pb-24 ${containerClass}`} dir="rtl">
      <div className="max-w-md mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className={`w-10 h-10 flex items-center justify-center rounded-full ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'}`}>
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black">الملف الشخصي</h1>
          <div className="w-10"></div> {/* spacer */}
        </div>

        <div className={`${cardClass} rounded-3xl p-6 mb-6 relative`}>
          {/* Profile Picture Placeholder */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2">
            <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center overflow-hidden ${isDarkMode ? 'border-[#0a0f1e] bg-brand/20' : 'border-gray-50 bg-blue-100'}`}>
              {formData.photoURL ? (
                <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-brand" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-brand rounded-full flex items-center justify-center border-2 border-white shadow-lg text-white">
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-14 pb-2 border-b border-gray-200/20 mb-6">
            <div className="flex items-center justify-between">
              <span className="font-bold">المظهر</span>
              <button onClick={toggleTheme} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-800 text-white'}`}>
                {isDarkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4" />}
                {isDarkMode ? 'وضع النهار' : 'وضع الليل'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-500/10 text-red-500 font-bold p-3 rounded-xl text-center text-sm">{error}</div>}
            {success && <div className="bg-green-500/10 text-green-500 font-bold p-3 rounded-xl text-center text-sm">{success}</div>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold opacity-70 mb-1 block">الاسم الأول</label>
                <input 
                  type="text" 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={inputClass} 
                  required
                />
              </div>
              <div>
                <label className="text-sm font-bold opacity-70 mb-1 block">اللقب</label>
                <input 
                  type="text" 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={inputClass} 
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold opacity-70 mb-1 block">رقم الهاتف</label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`${inputClass} pr-10`} 
                  placeholder="05 12 34 56 78"
                  dir="ltr"
                />
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-full mt-4 flex items-center justify-center">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ التغييرات'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;

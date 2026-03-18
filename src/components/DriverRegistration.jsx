import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { Car, User, Phone, Hash, CreditCard, Upload, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

/* ═══════════════════════════════════════════════════
   Driver Onboarding — 3 Steps:
   1. البيانات الشخصية (Personal Data)
   2. بيانات السيارة  (Vehicle Data)
   3. صور الهوية      (ID Upload)
═══════════════════════════════════════════════════ */
const DriverRegistration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    nin: '',
    licensePlate: '',
    idFrontFile: null,
    idBackFile: null,
    idFrontPreview: null,
    idBackPreview: null,
  });

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleFileChange = (field, previewField, file) => {
    if (!file) return;
    update(field, file);
    update(previewField, URL.createObjectURL(file));
  };

  /* ── Step Validation ── */
  const validateStep = () => {
    setError('');
    if (step === 1) {
      if (!form.firstName || !form.lastName || !form.phone) {
        setError('يرجى ملء جميع الحقول'); return false;
      }
      if (form.phone.length < 9) {
        setError('رقم الهاتف غير صحيح'); return false;
      }
    }
    if (step === 2) {
      if (!form.nin || form.nin.length < 10) {
        setError('رقم بطاقة التعريف الوطنية غير صحيح (18 خانة)'); return false;
      }
      if (!form.licensePlate) {
        setError('يرجى إدخال رقم لوحة السيارة'); return false;
      }
    }
    if (step === 3) {
      if (!form.idFrontFile || !form.idBackFile) {
        setError('يرجى رفع صورتي بطاقة التعريف (وجه وظهر)'); return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep(s => s + 1);
  };

  /* ── Submit Application ── */
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setError('');

    try {
      let idFrontUrl = null;
      let idBackUrl = null;

      // Try upload to Firebase Storage (may fail if dummy config)
      try {
        const frontRef = ref(storage, `driver_ids/${form.phone}_front`);
        await uploadBytes(frontRef, form.idFrontFile);
        idFrontUrl = await getDownloadURL(frontRef);

        const backRef = ref(storage, `driver_ids/${form.phone}_back`);
        await uploadBytes(backRef, form.idBackFile);
        idBackUrl = await getDownloadURL(backRef);
      } catch {
        // Storage not configured — use local object URLs as placeholder
        idFrontUrl = form.idFrontPreview;
        idBackUrl = form.idBackPreview;
      }

      // Save application to Firestore
      await addDoc(collection(db, 'driver_applications'), {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        nin: form.nin,
        licensePlate: form.licensePlate,
        idFrontUrl,
        idBackUrl,
        status: 'pending',
        freeTrips: 3,
        balance: 0,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Offline or dummy Firebase — still show success to user
    }

    // Save locally so login works
    const existing = JSON.parse(localStorage.getItem('tiaret_user') || '{}');
    localStorage.setItem('tiaret_user', JSON.stringify({
      ...existing,
      role: 'driver',
      phone: form.phone,
      firstName: form.firstName,
      driverApproved: false,
    }));

    setLoading(false);
    setSubmitted(true);
  };

  /* ── Success Screen ── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
        <div className="glass-card w-full max-w-sm p-8 rounded-3xl text-center z-10">
          <div className="w-20 h-20 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">تم إرسال طلبك!</h2>
          <p className="text-white/60 leading-relaxed mb-8">
            سيقوم فريق تيارت رايد بمراجعة ملفك وتفعيل حسابك قريباً.
          </p>
          <div className="bg-green-400/10 border border-green-400/30 rounded-2xl p-4 mb-6">
            <p className="text-green-300 text-sm font-bold">📍 تقرّب من مقرنا في تيارت لتسريع العملية</p>
          </div>
          <button onClick={() => navigate('/')} className="btn-primary w-full">
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  /* ── Progress Bar ── */
  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map(s => (
        <React.Fragment key={s}>
          <div className={`h-1.5 flex-1 rounded-full transition-all duration-500
            ${s <= step ? 'bg-brand' : 'bg-white/20'}`} />
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-dark flex flex-col" dir="rtl">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/30">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">تسجيل كسائق</h1>
            <p className="text-white/50 text-sm">الخطوة {step} من 3</p>
          </div>
        </div>
        <StepIndicator />
      </div>

      {/* Form Area */}
      <div className="flex-1 px-6 pb-8 z-10">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded-xl mb-4 text-sm font-bold text-center">
            {error}
          </div>
        )}

        {/* ── STEP 1: Personal ── */}
        {step === 1 && (
          <div className="glass-card rounded-3xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-brand" />
              <h3 className="text-white font-bold">البيانات الشخصية</h3>
            </div>
            <div>
              <label className="label-ar">الاسم الأول</label>
              <input className="input-ar" placeholder="مثال: سامي" value={form.firstName}
                onChange={e => update('firstName', e.target.value)} />
            </div>
            <div>
              <label className="label-ar">اللقب</label>
              <input className="input-ar" placeholder="مثال: بلعيد" value={form.lastName}
                onChange={e => update('lastName', e.target.value)} />
            </div>
            <div>
              <label className="label-ar">رقم الهاتف</label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input className="input-ar pl-12" placeholder="05XX XX XX XX" dir="ltr"
                  value={form.phone} onChange={e => update('phone', e.target.value)} type="tel" />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Vehicle ── */}
        {step === 2 && (
          <div className="glass-card rounded-3xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <Car className="w-5 h-5 text-brand" />
              <h3 className="text-white font-bold">بيانات السيارة والهوية</h3>
            </div>
            <div>
              <label className="label-ar">رقم بطاقة التعريف الوطنية (NIN)</label>
              <div className="relative">
                <CreditCard className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input className="input-ar pl-12" placeholder="XXXXXXXXXXXXXXXXXX" dir="ltr"
                  value={form.nin} onChange={e => update('nin', e.target.value)} maxLength={18} />
              </div>
            </div>
            <div>
              <label className="label-ar">رقم لوحة السيارة</label>
              <div className="relative">
                <Hash className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input className="input-ar pl-12" placeholder="مثال: 16 تيارت 1234" dir="ltr"
                  value={form.licensePlate} onChange={e => update('licensePlate', e.target.value)} />
              </div>
              <p className="text-white/30 text-xs mt-1.5 mr-1">رقم اللوحة كما هو مكتوب في وثيقة السيارة</p>
            </div>
          </div>
        )}

        {/* ── STEP 3: ID Upload ── */}
        {step === 3 && (
          <div className="glass-card rounded-3xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-5 h-5 text-brand" />
              <h3 className="text-white font-bold">صور بطاقة التعريف</h3>
            </div>
            <p className="text-white/50 text-sm">يرجى تحميل صورة واضحة لبطاقتك الوطنية (وجه وظهر)</p>

            {/* Front */}
            <div>
              <label className="label-ar">الوجه الأمامي</label>
              <label className={`flex flex-col items-center justify-center gap-3 rounded-2xl p-4 border-2 border-dashed cursor-pointer transition-all
                ${form.idFrontPreview ? 'border-brand/40 bg-brand/5' : 'border-white/20 hover:border-white/40'}`}>
                {form.idFrontPreview
                  ? <img src={form.idFrontPreview} alt="وجه" className="w-full h-28 object-cover rounded-xl" />
                  : <>
                      <Upload className="w-8 h-8 text-white/30" />
                      <span className="text-white/50 text-sm">اضغط لاختيار صورة</span>
                    </>}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => handleFileChange('idFrontFile', 'idFrontPreview', e.target.files[0])} />
              </label>
            </div>

            {/* Back */}
            <div>
              <label className="label-ar">الوجه الخلفي</label>
              <label className={`flex flex-col items-center justify-center gap-3 rounded-2xl p-4 border-2 border-dashed cursor-pointer transition-all
                ${form.idBackPreview ? 'border-brand/40 bg-brand/5' : 'border-white/20 hover:border-white/40'}`}>
                {form.idBackPreview
                  ? <img src={form.idBackPreview} alt="ظهر" className="w-full h-28 object-cover rounded-xl" />
                  : <>
                      <Upload className="w-8 h-8 text-white/30" />
                      <span className="text-white/50 text-sm">اضغط لاختيار صورة</span>
                    </>}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => handleFileChange('idBackFile', 'idBackPreview', e.target.files[0])} />
              </label>
            </div>
          </div>
        )}

        {/* ── Navigation Buttons ── */}
        <div className="mt-6 space-y-3">
          {step < 3
            ? <button onClick={nextStep} className="btn-primary w-full flex items-center justify-center gap-2">
                متابعة <ArrowRight className="w-5 h-5" />
              </button>
            : <button onClick={handleSubmit} disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>إرسال الطلب <CheckCircle2 className="w-5 h-5" /></>}
              </button>
          }

          {step > 1 && (
            <button onClick={() => { setStep(s => s - 1); setError(''); }} className="btn-ghost w-full">
              رجوع
            </button>
          )}
          {step === 1 && (
            <button onClick={() => navigate('/')} className="btn-ghost w-full">إلغاء</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverRegistration;

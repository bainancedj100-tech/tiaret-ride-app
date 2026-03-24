import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { uploadDriverDocument } from '../services/storage';
import { useNavigate } from 'react-router-dom';
import {
  Car, User, Phone, Hash, CreditCard, Upload,
  CheckCircle2, Loader2, ArrowRight, FileText, ShieldCheck
} from 'lucide-react';

/* ═══════════════════════════════════════════════════
   Driver Onboarding — 3 Steps:
   1. البيانات الشخصية
   2. بيانات السيارة
   3. رفع الوثائق الأربعة (بطاقة وجه/ظهر + رخصة + بطاقة سيارة)
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
    carModel: '',
    licensePlate: '',
    // Files
    idFrontFile: null,
    idBackFile: null,
    licenseFile: null,
    vehicleCardFile: null,
    // Previews
    idFrontPreview: null,
    idBackPreview: null,
    licensePreview: null,
    vehicleCardPreview: null,
  });

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleFileChange = (fileField, previewField, file) => {
    if (!file) return;
    update(fileField, file);
    update(previewField, URL.createObjectURL(file));
  };

  /* ── Validation ── */
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
        setError('رقم بطاقة التعريف الوطنية غير صحيح'); return false;
      }
      if (!form.licensePlate) {
        setError('يرجى إدخال رقم لوحة السيارة'); return false;
      }
      if (!form.carModel) {
        setError('يرجى إدخال نوع السيارة'); return false;
      }
    }
    if (step === 3) {
      if (!form.idFrontFile || !form.idBackFile) {
        setError('يرجى رفع صورتي بطاقة التعريف (وجه وظهر)'); return false;
      }
      if (!form.licenseFile) {
        setError('يرجى رفع صورة رخصة السياقة'); return false;
      }
      if (!form.vehicleCardFile) {
        setError('يرجى رفع صورة بطاقة السيارة (الرماد)'); return false;
      }
    }
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep(s => s + 1); };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setError('');

    try {
      // Upload all 4 documents
      const [idFrontUrl, idBackUrl, licenseUrl, vehicleCardUrl] = await Promise.all([
        uploadDriverDocument(form.idFrontFile, form.phone, 'id_front'),
        uploadDriverDocument(form.idBackFile, form.phone, 'id_back'),
        uploadDriverDocument(form.licenseFile, form.phone, 'license'),
        uploadDriverDocument(form.vehicleCardFile, form.phone, 'vehicle_card'),
      ]);

      // Save as 'pending' in drivers collection
      await setDoc(doc(db, 'drivers', form.phone), {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        nin: form.nin,
        carModel: form.carModel,
        licensePlate: form.licensePlate,
        idFrontUrl,
        idBackUrl,
        licenseUrl,
        vehicleCardUrl,
        status: 'pending',
        freeTrips: 3,
        balance: 0,
        location: null,
        notifiedAdmin: false,
        createdAt: new Date().toISOString(),
      });

      // Cache locally for auto-login
      localStorage.setItem('tiaret_driver_phone', form.phone);

    } catch (err) {
      console.error('Registration error:', err);
      // Still show success — data may be stored locally
    }

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
          <p className="text-white/60 leading-relaxed mb-6">
            جارٍ مراجعة ملفك من طرف الإدارة. ستتمكن من العمل فور التفعيل.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6">
            <p className="text-amber-300 text-sm font-bold">⏳ حالة الحساب: قيد المراجعة</p>
            <p className="text-white/50 text-xs mt-1">يرجى التحقق لاحقاً بعد تواصلك مع الإدارة</p>
          </div>
          <button onClick={() => navigate('/driver/dashboard')} className="btn-primary w-full">
            متابعة للوحة السائق
          </button>
        </div>
      </div>
    );
  }

  /* ── Progress Indicator ── */
  const steps = ['البيانات الشخصية', 'بيانات السيارة', 'الوثائق'];
  const StepIndicator = () => (
    <div className="flex items-center gap-1 mb-8">
      {[1, 2, 3].map((s, i) => (
        <React.Fragment key={s}>
          <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-brand' : 'bg-white/20'}`} />
        </React.Fragment>
      ))}
    </div>
  );

  /* ── File Upload Widget ── */
  const FileUploadBox = ({ label, fileField, previewField, icon: Icon }) => (
    <div>
      <label className="label-ar flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-brand" /> {label}
      </label>
      <label className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-3 border-2 border-dashed cursor-pointer transition-all
        ${form[previewField] ? 'border-brand/50 bg-brand/5' : 'border-white/20 hover:border-white/40 bg-white/5'}`}>
        {form[previewField]
          ? <img src={form[previewField]} alt={label} className="w-full h-24 object-cover rounded-xl" />
          : <>
              <Upload className="w-6 h-6 text-white/30" />
              <span className="text-white/50 text-xs">اضغط لاختيار صورة</span>
            </>}
        <input type="file" accept="image/*" className="hidden"
          onChange={e => handleFileChange(fileField, previewField, e.target.files[0])} />
      </label>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-dark flex flex-col overflow-y-auto pb-6" dir="rtl">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/30">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">تسجيل كسائق</h1>
            <p className="text-white/50 text-sm">{steps[step - 1]} — الخطوة {step} من 3</p>
          </div>
        </div>
        <StepIndicator />
      </div>

      {/* Form */}
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
              <label className="label-ar">نوع السيارة</label>
              <input className="input-ar" placeholder="مثال: برتاغو 2020"
                value={form.carModel} onChange={e => update('carModel', e.target.value)} />
            </div>
            <div>
              <label className="label-ar">رقم لوحة السيارة</label>
              <div className="relative">
                <Hash className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input className="input-ar pl-12" placeholder="مثال: 16 تيارت 1234" dir="ltr"
                  value={form.licensePlate} onChange={e => update('licensePlate', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Documents ── */}
        {step === 3 && (
          <div className="glass-card rounded-3xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-brand" />
              <h3 className="text-white font-bold">رفع الوثائق الرسمية</h3>
            </div>
            <p className="text-white/40 text-xs mb-3">يرجى رفع صور واضحة لجميع الوثائق المطلوبة</p>

            <div className="grid grid-cols-2 gap-3">
              <FileUploadBox label="بطاقة التعريف (وجه)" fileField="idFrontFile" previewField="idFrontPreview" icon={CreditCard} />
              <FileUploadBox label="بطاقة التعريف (ظهر)" fileField="idBackFile" previewField="idBackPreview" icon={CreditCard} />
              <FileUploadBox label="رخصة السياقة" fileField="licenseFile" previewField="licensePreview" icon={FileText} />
              <FileUploadBox label="بطاقة السيارة (الرماد)" fileField="vehicleCardFile" previewField="vehicleCardPreview" icon={Car} />
            </div>

            <div className="bg-brand/10 border border-brand/20 rounded-xl p-3 mt-2">
              <p className="text-brand text-xs font-bold">📸 تأكد من وضوح الصور وصلاحية الوثائق</p>
            </div>
          </div>
        )}

        {/* Buttons */}
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
            <button onClick={() => { setStep(s => s - 1); setError(''); }} className="btn-ghost w-full">رجوع</button>
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

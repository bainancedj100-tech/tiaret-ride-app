import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Car, CreditCard, CheckCircle2, XCircle, Bell,
  DollarSign, Navigation, Shield, Edit3, Save, Ban,
  ChevronDown, ChevronUp, Eye, Loader2, AlertTriangle,
  UserCheck, UserX, TrendingUp, Clock
} from 'lucide-react';
import {
  collection, onSnapshot, doc, updateDoc, query, where, orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';

/* ═══════════════════════════════════════
   Admin Dashboard — Full Control Panel
   Tabs: Pending | All Drivers | Live Orders
═══════════════════════════════════════ */
const AdminDashboard = () => {
  const [tab, setTab] = useState('pending');
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [docModal, setDocModal] = useState(null); // driver data for doc viewer
  const [editState, setEditState] = useState({}); // {phone: {balance, freeTrips}}
  const [saving, setSaving] = useState({});
  const [notifications, setNotifications] = useState([]);
  const prevPendingCount = useRef(0);
  const prevOrderCount = useRef(0);

  // ── Real-time listeners ──
  useEffect(() => {
    const driversUnsub = onSnapshot(collection(db, 'drivers'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setDrivers(all);

      // Notification: new pending driver
      const pendingNow = all.filter(d => d.status === 'pending').length;
      if (prevPendingCount.current > 0 && pendingNow > prevPendingCount.current) {
        pushNotification('🧑‍✈️ سائق جديد في انتظار المراجعة!', 'warning');
      }
      prevPendingCount.current = pendingNow;
    });

    const ordersUnsub = onSnapshot(collection(db, 'orders'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(all);

      // Notification: new finding order
      const findingNow = all.filter(o => o.status === 'finding').length;
      if (prevOrderCount.current > 0 && findingNow > prevOrderCount.current) {
        pushNotification('🚗 طلب رحلة جديد!', 'info');
      }
      prevOrderCount.current = findingNow;
    });

    return () => { driversUnsub(); ordersUnsub(); };
  }, []);

  const pushNotification = (msg, type) => {
    const id = Date.now();
    setNotifications(prev => [{ id, msg, type }, ...prev.slice(0, 4)]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);

    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('تيارت رايد — إدارة', { body: msg, icon: '/favicon.ico' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  };

  // ── Driver Actions ──
  const setDriverStatus = async (phone, status) => {
    await updateDoc(doc(db, 'drivers', phone), { status });
  };

  const startEdit = (driver) => {
    setEditState(prev => ({
      ...prev,
      [driver.phone]: { balance: driver.balance || 0, freeTrips: driver.freeTrips ?? 3 }
    }));
  };

  const saveEdit = async (phone) => {
    const ed = editState[phone];
    if (!ed) return;
    setSaving(prev => ({ ...prev, [phone]: true }));
    await updateDoc(doc(db, 'drivers', phone), {
      balance: Number(ed.balance),
      freeTrips: Number(ed.freeTrips),
    });
    setSaving(prev => ({ ...prev, [phone]: false }));
    setEditState(prev => { const n = { ...prev }; delete n[phone]; return n; });
  };

  // ── Computed ──
  const pending = drivers.filter(d => d.status === 'pending');
  const activeDrivers = drivers.filter(d => d.status === 'active');
  const bannedDrivers = drivers.filter(d => d.status === 'banned');
  const activeOrders = orders.filter(o => o.status === 'finding' || o.status === 'active');
  const totalRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.price || 0), 0);

  // ── Status Badge ──
  const StatusBadge = ({ status }) => {
    const cfg = {
      active:  { bg: 'bg-green-500/20', text: 'text-green-400', label: 'نشط' },
      pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'معلق' },
      banned:  { bg: 'bg-red-500/20',   text: 'text-red-400',   label: 'محظور' },
    }[status] || { bg: 'bg-white/10', text: 'text-white/50', label: status };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="h-[100dvh] bg-gray-50 overflow-y-auto font-sans pb-10" dir="rtl">
      {/* ── Toast Notifications ── */}
      <div className="fixed top-4 left-4 z-50 space-y-2">
        {notifications.map(n => (
          <div key={n.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-bold animate-slide-up
              ${n.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
            <Bell className="w-4 h-4 flex-shrink-0" />
            {n.msg}
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="bg-gray-900 text-white px-6 py-5 flex items-center justify-between shadow-xl">
        <div>
          <h1 className="text-2xl font-black tracking-tight">🛡️ لوحة الإدارة</h1>
          <p className="text-gray-400 text-sm mt-0.5">تيارت رايد — نظام المراقبة الكامل</p>
        </div>
        <div className="flex items-center gap-3">
          {pending.length > 0 && (
            <div className="relative">
              <Bell className="w-6 h-6 text-amber-400" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-black">
                {pending.length}
              </span>
            </div>
          )}
          {activeOrders.length > 0 && (
            <div className="relative">
              <Navigation className="w-6 h-6 text-blue-400" />
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-black">
                {activeOrders.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="px-6 pt-6 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, label: 'الإيرادات الكلية', value: `${totalRevenue} دج`, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Car, label: 'طلبات نشطة', value: activeOrders.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: UserCheck, label: 'سائقون نشطون', value: activeDrivers.length, color: 'text-brand', bg: 'bg-brand/5' },
          { icon: Clock, label: 'قيد المراجعة', value: pending.length, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 flex items-center gap-3 border border-white shadow-sm`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-xl font-black ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="px-6 mb-6">
        <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
          {[
            { key: 'pending', label: 'طلبات معلقة', count: pending.length, icon: Clock },
            { key: 'drivers', label: 'جميع السائقين', count: drivers.length, icon: Users },
            { key: 'orders',  label: 'الطلبات الحية', count: activeOrders.length, icon: Navigation },
          ].map(({ key, label, count, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-bold transition-all
                ${tab === key ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              {count > 0 && (
                <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center font-black
                  ${tab === key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-6 pb-12">

        {/* ┌─────────────────────────────────┐
            │   TAB: PENDING APPLICATIONS     │
            └─────────────────────────────────┘ */}
        {tab === 'pending' && (
          <div className="space-y-4">
            {pending.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold text-lg">لا توجد طلبات معلقة</p>
                <p className="text-gray-400 text-sm">جميع السائقين تمت مراجعتهم</p>
              </div>
            ) : pending.map(driver => (
              <div key={driver.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Info Row */}
                <div className="p-5 flex flex-wrap gap-4 items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-black text-gray-900">{driver.firstName} {driver.lastName}</h3>
                      <StatusBadge status={driver.status} />
                    </div>
                    <p className="text-sm text-gray-500">📞 {driver.phone}</p>
                    <p className="text-sm text-gray-500">🪪 {driver.nin}</p>
                    <p className="text-sm text-gray-500">🚗 {driver.carModel} — {driver.licensePlate}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {driver.createdAt ? new Date(driver.createdAt).toLocaleString('ar-DZ') : ''}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 min-w-[130px]">
                    <button onClick={() => setDriverStatus(driver.phone, 'active')}
                      className="flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm">
                      <UserCheck className="w-4 h-4" /> تفعيل
                    </button>
                    <button onClick={() => setDriverStatus(driver.phone, 'banned')}
                      className="flex items-center justify-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl font-bold text-sm transition-all">
                      <Ban className="w-4 h-4" /> رفض
                    </button>
                  </div>
                </div>

                {/* Documents */}
                <div className="px-5 pb-5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">📄 الوثائق المرفقة</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { url: driver.idFrontUrl, label: 'بطاقة التعريف (وجه)' },
                      { url: driver.idBackUrl,  label: 'بطاقة التعريف (ظهر)' },
                      { url: driver.licenseUrl, label: 'رخصة السياقة' },
                      { url: driver.vehicleCardUrl, label: 'بطاقة السيارة' },
                    ].map(({ url, label }) => (
                      <div key={label} className="flex flex-col items-center gap-1">
                        <p className="text-xs text-gray-500 font-bold text-center">{label}</p>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt={label}
                              className="w-full h-16 object-cover rounded-lg border border-gray-200 hover:scale-105 transition-transform cursor-zoom-in shadow-sm" />
                          </a>
                        ) : (
                          <div className="w-full h-16 bg-gray-100 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                            <span className="text-gray-400 text-xs">غير متوفر</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ┌─────────────────────────────────┐
            │      TAB: ALL DRIVERS           │
            └─────────────────────────────────┘ */}
        {tab === 'drivers' && (
          <div className="space-y-3">
            {drivers.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">لا يوجد سائقون مسجلون</p>
              </div>
            ) : drivers.map(driver => {
              const isEditing = !!editState[driver.phone];
              const ed = editState[driver.phone] || {};
              const isSaving = saving[driver.phone];

              return (
                <div key={driver.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="p-4 flex flex-wrap gap-4 items-center justify-between">
                    {/* Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-700 flex-shrink-0">
                        {driver.firstName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{driver.firstName} {driver.lastName}</p>
                        <p className="text-xs text-gray-500">{driver.phone}</p>
                      </div>
                    </div>

                    {/* Status + Balance + FreeTrips */}
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={driver.status} />

                      {isEditing ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500 font-bold">رصيد:</span>
                            <input type="number" value={ed.balance}
                              onChange={e => setEditState(prev => ({ ...prev, [driver.phone]: { ...prev[driver.phone], balance: e.target.value }}))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm font-bold outline-none focus:border-brand" />
                            <span className="text-xs text-gray-400">دج</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500 font-bold">مجانية:</span>
                            <input type="number" value={ed.freeTrips} min={0} max={99}
                              onChange={e => setEditState(prev => ({ ...prev, [driver.phone]: { ...prev[driver.phone], freeTrips: e.target.value }}))}
                              className="w-14 px-2 py-1 border border-gray-300 rounded-lg text-sm font-bold outline-none focus:border-brand" />
                          </div>
                          <button onClick={() => saveEdit(driver.phone)} disabled={isSaving}
                            className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-xl text-sm font-bold transition-all">
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            حفظ
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-black text-gray-700 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                            💰 {driver.balance ?? 0} دج
                          </span>
                          <span className="text-sm font-black text-gray-700 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                            🎫 {driver.freeTrips ?? 0} رحلة
                          </span>
                          <button onClick={() => startEdit(driver)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl text-sm font-bold transition-all">
                            <Edit3 className="w-3 h-3" /> تعديل
                          </button>
                        </>
                      )}

                      {/* Activate / Ban toggle */}
                      {driver.status !== 'pending' && (
                        driver.status === 'active'
                          ? <button onClick={() => setDriverStatus(driver.phone, 'banned')}
                              className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-xl text-sm font-bold transition-all">
                              <Ban className="w-3 h-3" /> حظر
                            </button>
                          : <button onClick={() => setDriverStatus(driver.phone, 'active')}
                              className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-sm font-bold transition-all">
                              <UserCheck className="w-3 h-3" /> تفعيل
                            </button>
                      )}

                      {/* Activate from pending */}
                      {driver.status === 'pending' && (
                        <button onClick={() => setDriverStatus(driver.phone, 'active')}
                          className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-sm font-bold transition-all">
                          <UserCheck className="w-3 h-3" /> اعتماد
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Docs thumbnail row */}
                  {(driver.idFrontUrl || driver.licenseUrl) && (
                    <div className="px-4 pb-4 flex gap-2">
                      {[
                        { url: driver.idFrontUrl,    label: 'ID' },
                        { url: driver.idBackUrl,     label: 'IDظ' },
                        { url: driver.licenseUrl,    label: 'رخصة' },
                        { url: driver.vehicleCardUrl,label: 'رماد' },
                      ].map(({ url, label }) => url && (
                        <a key={label} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt={label}
                            className="w-14 h-10 object-cover rounded-lg border border-gray-200 hover:scale-110 transition-transform cursor-zoom-in" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ┌─────────────────────────────────┐
            │      TAB: LIVE ORDERS           │
            └─────────────────────────────────┘ */}
        {tab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
                <Navigation className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">لا توجد طلبات</p>
              </div>
            ) : orders.map(order => {
              const statusCfg = {
                finding:   { bg: 'bg-orange-100', text: 'text-orange-700', label: 'يبحث عن سائق' },
                active:    { bg: 'bg-green-100',  text: 'text-green-700',  label: 'جارٍ' },
                completed: { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'مكتمل' },
              }[order.status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: order.status };

              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                          {statusCfg.label}
                        </span>
                        <span className="text-xs text-gray-500 font-bold">
                          {order.serviceType === 'delivery' ? '📦 توصيل' : '🚗 رحلة'}
                        </span>
                      </div>
                      <p className="font-black text-gray-900 text-lg">{order.price ?? 0} دج</p>
                      {order.driverId && <p className="text-xs text-gray-400">السائق: {order.driverId}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{order.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString('ar-DZ') : ''}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;

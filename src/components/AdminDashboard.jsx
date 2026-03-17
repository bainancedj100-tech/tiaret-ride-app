import React, { useState, useEffect } from 'react';
import { Users, Car, CreditCard, CheckCircle2, XCircle, Search, DollarSign } from 'lucide-react';
import { collection, onSnapshot, doc, deleteDoc, setDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const AdminDashboard = () => {
  const [applications, setApplications] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [stats, setStats] = useState({ revenue: 0, activeRides: 0, totalDrivers: 0 });
  
  // Recharge Tool state
  const [rechargePhone, setRechargePhone] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeStatus, setRechargeStatus] = useState(null);

  useEffect(() => {
    // Listen to pending applications
    const appsUnsub = onSnapshot(collection(db, 'driver_applications'), (snapshot) => {
      const appsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplications(appsData);
    });

    // Listen to drivers
    const driversUnsub = onSnapshot(collection(db, 'drivers'), (snapshot) => {
      setStats(prev => ({ ...prev, totalDrivers: snapshot.size }));
    });

    // Listen to orders for stats and active orders list
    const ordersUnsub = onSnapshot(collection(db, 'orders'), (snapshot) => {
      let active = 0;
      let revenue = 0;
      let currentActiveOrders = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'active' || data.status === 'finding') {
          active++;
          currentActiveOrders.push({ id: doc.id, ...data });
        }
        if (data.status === 'completed' && data.price) revenue += data.price;
      });
      
      setStats(prev => ({ ...prev, activeRides: active, revenue }));
      setActiveOrders(currentActiveOrders);
    });

    return () => {
      appsUnsub();
      driversUnsub();
      ordersUnsub();
    };
  }, []);

  const handleVerify = async (app) => {
    try {
      // Create new driver in 'drivers' using phone as ID, or a distinct ID
      const driverRef = doc(db, 'drivers', app.phone);
      await setDoc(driverRef, {
        firstName: app.firstName,
        lastName: app.lastName,
        nin: app.nin,
        phone: app.phone,
        status: 'available',
        freeTrips: app.freeTrips,
        balance: app.balance,
        createdAt: new Date().toISOString()
      });
      
      // Delete from applications
      await deleteDoc(doc(db, 'driver_applications', app.id));
    } catch (error) {
      console.error("Error verifying driver:", error);
      alert("Failed to verify driver.");
    }
  };

  const handleReject = async (appId) => {
    try {
      await deleteDoc(doc(db, 'driver_applications', appId));
    } catch (error) {
      console.error("Error rejecting driver:", error);
    }
  };

  const handleRecharge = async () => {
    if (!rechargePhone || !rechargeAmount) return;
    try {
      setRechargeStatus('loading');
      const driverRef = doc(db, 'drivers', rechargePhone);
      
      // Get current driver to determine current balance
      const querySnapshot = await getDocs(query(collection(db, 'drivers'), where('phone', '==', rechargePhone)));
      if (querySnapshot.empty) {
        setRechargeStatus('not_found');
        return;
      }
      
      const driverData = querySnapshot.docs[0].data();
      const driverId = querySnapshot.docs[0].id;
      
      const newBalance = (driverData.balance || 0) + parseInt(rechargeAmount);
      
      await updateDoc(doc(db, 'drivers', driverId), {
        balance: newBalance
      });

      setRechargeStatus('success');
      setRechargePhone('');
      setRechargeAmount('');
      setTimeout(() => setRechargeStatus(null), 3000);
    } catch (error) {
      console.error("Error recharging:", error);
      setRechargeStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-gray-900 text-white p-6 rounded-[32px] shadow-lg">
          <div>
            <h1 className="text-3xl font-black">Admin Control Panel</h1>
            <p className="text-gray-400 font-medium">Tiaret Ride App Central</p>
          </div>
          <div className="bg-white/10 p-3 rounded-full hidden md:block">
            <Users className="w-8 h-8 text-brand-light" />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-3xl border border-white flex items-center gap-4">
            <div className="bg-green-100 p-4 rounded-full text-green-600">
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Revenue</p>
              <h2 className="text-3xl font-black text-gray-900">{stats.revenue} DA</h2>
            </div>
          </div>
          <div className="glass p-6 rounded-3xl border border-white flex items-center gap-4">
            <div className="bg-brand/10 p-4 rounded-full text-brand">
              <Car className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Rides</p>
              <h2 className="text-3xl font-black text-gray-900">{stats.activeRides}</h2>
            </div>
          </div>
          <div className="glass p-6 rounded-3xl border border-white flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-full text-blue-600">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Drivers</p>
              <h2 className="text-3xl font-black text-gray-900">{stats.totalDrivers}</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Area: Applications */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass p-6 rounded-3xl border border-white min-h-[500px]">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-brand" /> Pending Approvals
              </h2>
              
              {applications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <CheckCircle2 className="w-16 h-16 mb-4 opacity-50" />
                  <p className="font-semibold text-lg">No pending applications</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map(app => (
                    <div key={app.id} className="bg-white/60 p-5 rounded-2xl border border-gray-200 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <h3 className="text-lg font-bold text-gray-900">{app.firstName} {app.lastName}</h3>
                        <p className="text-sm text-gray-600"><span className="font-bold">NIN:</span> {app.nin}</p>
                        <p className="text-sm text-gray-600"><span className="font-bold">Phone:</span> {app.phone}</p>
                      </div>
                      
                      {/* Photos View */}
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-gray-500 mb-1">ID Front</span>
                          <a href={app.idFrontUrl} target="_blank" rel="noreferrer" className="block relative group">
                            <img src={app.idFrontUrl} alt="ID Front" className="w-20 h-14 object-cover rounded-md border border-gray-300 shadow-sm transition-transform group-hover:scale-105" />
                          </a>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-gray-500 mb-1">ID Back</span>
                          <a href={app.idBackUrl} target="_blank" rel="noreferrer" className="block relative group">
                            <img src={app.idBackUrl} alt="ID Back" className="w-20 h-14 object-cover rounded-md border border-gray-300 shadow-sm transition-transform group-hover:scale-105" />
                          </a>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
                        <button 
                          onClick={() => handleVerify(app)}
                          className="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-xl font-bold shadow-md transition-colors w-full"
                        >
                          Verify
                        </button>
                        <button 
                          onClick={() => handleReject(app.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-6 py-2 rounded-xl font-bold transition-colors w-full"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Orders List */}
            <div className="glass p-6 rounded-3xl border border-white mt-6 min-h-[300px]">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Navigation className="w-6 h-6 text-blue-500" /> Live Orders
              </h2>
              
              {activeOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <p className="font-semibold text-lg">No currently active or finding orders</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOrders.map(order => (
                    <div key={order.id} className="bg-white/60 p-4 rounded-2xl border border-gray-200 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${order.status === 'finding' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {order.status.toUpperCase()}
                          </span>
                          <span className="text-sm font-bold text-gray-600">{order.serviceType === 'delivery' ? 'Delivery' : 'Ride'}</span>
                        </div>
                        <p className="font-semibold text-gray-900">{order.price} DA</p>
                        <p className="text-xs text-gray-500 mt-1">Order ID: {order.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Area: Recharge */}
          <div className="space-y-6">
            <div className="glass p-6 rounded-3xl border border-white">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-brand" /> Recharge Driver
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Driver Phone</label>
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="e.g. 0550123456" 
                      value={rechargePhone}
                      onChange={(e) => setRechargePhone(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl outline-none focus:border-brand transition-colors font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Amount (DA)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 1000" 
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl outline-none focus:border-brand transition-colors font-medium"
                  />
                </div>
                
                <button 
                  onClick={handleRecharge}
                  disabled={!rechargePhone || !rechargeAmount || rechargeStatus === 'loading'}
                  className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  {rechargeStatus === 'loading' ? 'Processing...' : 'Add Balance'}
                </button>

                {rechargeStatus === 'success' && <p className="text-green-600 font-bold text-sm text-center mt-2">Balance Added Successfully!</p>}
                {rechargeStatus === 'not_found' && <p className="text-red-500 font-bold text-sm text-center mt-2">Driver Not Found!</p>}
                {rechargeStatus === 'error' && <p className="text-red-500 font-bold text-sm text-center mt-2">An error occurred.</p>}
              </div>
            </div>
            
            {/* Quick Info */}
            <div className="bg-brand/10 p-6 rounded-3xl border border-brand/20">
               <h3 className="font-bold text-brand-dark mb-2">Notice</h3>
               <p className="text-sm text-gray-700 font-medium">Verify driver documents carefully. Approving an account grants immediate access to the driver application and 3 free trips if they are a new registry.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

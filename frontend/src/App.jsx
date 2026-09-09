import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Audits from './components/Audits';
import SalesLogging from './components/SalesLogging';
import Customers from './components/Customers';
import Reports from './components/Reports';
import Settings from './components/Settings';
import AdminPanel from './components/AdminPanel';
import StoreLogin from './components/StoreLogin';
import { fetchApi, getActiveStoreSlug } from './api';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export default function App() {
  const SESSION_VERSION = 'v2'; // bump this to force all users to re-login

  const [activeTab, setActiveTab] = useState('dashboard');

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const ver = localStorage.getItem('al_muhasib_session_ver');
      if (ver !== SESSION_VERSION) {
        // Old session from before login system — clear it
        localStorage.removeItem('al_muhasib_user');
        localStorage.removeItem('super_admin_token');
        localStorage.removeItem('al_muhasib_session_ver');
        return null;
      }
      const saved = localStorage.getItem('al_muhasib_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [companyName, setCompanyName] = useState('نظام المحاسب الذكي');
  const [isStoreSuspended, setIsStoreSuspended] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      fetchApi('/settings')
        .then(res => {
          if (res.data?.company_name) {
            setCompanyName(res.data.company_name);
          }
          setIsStoreSuspended(false);
        })
        .catch(err => {
          if (err.isSuspended) {
            setIsStoreSuspended(true);
          }
        });
    };

    // Initial check
    checkStatus();

    // Periodic heartbeat every 10 seconds to detect admin suspension/activation in real-time
    const interval = setInterval(checkStatus, 10000);

    // Immediate event listener
    const onSuspended = () => {
      setIsStoreSuspended(true);
    };
    window.addEventListener('store-suspended', onSuspended);

    return () => {
      clearInterval(interval);
      window.removeEventListener('store-suspended', onSuspended);
    };
  }, []);

  const handleRefreshStatus = () => {
    fetchApi('/settings')
      .then(() => {
        setIsStoreSuspended(false);
        window.location.reload();
      })
      .catch(err => {
        if (err.isSuspended) {
          alert('ما زال الحساب موقوفاً من قِبل المشرف العام. يرجى مراجعته للتفعيل.');
        } else {
          alert('خطأ أثناء فحص الحالة: ' + err.message);
        }
      });
  };

  // If not logged in, enforce login screen for EVERYONE — no exceptions
  if (!currentUser) {
    return (
      <StoreLogin 
        storeName={companyName}
        onLoginSuccess={(user, role) => {
          try {
            localStorage.setItem('al_muhasib_user', JSON.stringify(user));
            localStorage.setItem('al_muhasib_session_ver', SESSION_VERSION);
          } catch {}
          setCurrentUser(user);
          if (role === 'admin') {
            setActiveTab('admin');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans" dir="rtl">
      {/* Top Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        companyName={companyName}
        currentUser={currentUser}
        onLogout={() => {
          localStorage.removeItem('al_muhasib_user');
          localStorage.removeItem('al_muhasib_session_ver');
          localStorage.removeItem('super_admin_token');
          setCurrentUser(null);
          setActiveTab('dashboard');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {isStoreSuspended && activeTab !== 'admin' ? (
          <div className="max-w-lg mx-auto my-14 bg-white rounded-3xl p-8 border-2 border-rose-300 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
              <ShieldAlert className="w-10 h-10 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-rose-700">🔒 تم إيقاف وتجميد هذا الحساب</h2>
              <p className="text-sm font-bold text-slate-800">
                صلاحية استخدام النظام متوقفة حالياً بقرار من إدارة النظام.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                لا يمكن للعمال أو المستخدمين تسجيل مبيعات، أو جرد مخزون، أو فتح أي صفحة حتى يقوم المشرف العام بإعادة تفعيل المتجر من لوحة التحكم.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={handleRefreshStatus}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <span>🔄 فحص حالة التفعيل الآن</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
            {activeTab === 'inventory' && <Inventory />}
            {activeTab === 'audits' && <Audits />}
            {activeTab === 'sales' && <SalesLogging />}
            {activeTab === 'customers' && <Customers />}
            {activeTab === 'reports' && <Reports />}
            {activeTab === 'settings' && (
              <Settings 
                onUpdateCompany={(name) => setCompanyName(name)} 
              />
            )}
            {activeTab === 'admin' && (
              <AdminPanel 
                onExitAdmin={() => setActiveTab('dashboard')} 
              />
            )}
          </>
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>نظام المحاسب لإدارة المخزون والجرد والتسعيرات • جميع المعاملات بالريال السعودي (ر.س)</span>
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-700">
              تطوير وبرمجة: <span className="text-emerald-700 font-extrabold">عبد الرحمن كمال</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              v2.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

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
import { fetchApi, getActiveStoreSlug } from './api';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#admin' || new URLSearchParams(window.location.search).get('admin') === 'true') {
        return 'admin';
      }
    }
    return 'dashboard';
  });

  const [companyName, setCompanyName] = useState('نظام المحاسب الذكي');
  const [isStoreSuspended, setIsStoreSuspended] = useState(false);

  useEffect(() => {
    fetchApi('/settings')
      .then(res => {
        if (res.data?.company_name) {
          setCompanyName(res.data.company_name);
        }
      })
      .catch(err => {
        if (err.isSuspended) {
          setIsStoreSuspended(true);
        }
        console.error(err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans" dir="rtl">
      {/* Top Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        companyName={companyName}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {isStoreSuspended ? (
          <div className="max-w-lg mx-auto my-12 bg-white rounded-3xl p-8 border border-rose-200 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">عذراً، هذا المتجر معلق حالياً</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              تم إيقاف صلاحية الوصول لهذا الحساب مؤقتاً من قِبل إدارة النظام. يرجى التواصل مع مالك المنصة لإعادة التفعيل.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('al_muhasib_store');
                window.location.href = '/';
              }}
              className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl transition"
            >
              العودة للمتجر الرئيسي
            </button>
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

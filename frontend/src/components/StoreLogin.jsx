import React, { useState } from 'react';
import { API_BASE, setActiveStoreSlug } from '../api';
import { Lock, User, KeyRound, AlertCircle, Boxes, ShieldCheck } from 'lucide-react';

export default function StoreLogin({ storeName = 'نظام المحاسب الذكي', onLoginSuccess, onOpenAdmin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('يرجى كتابة اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/store/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }

      if (data.role === 'store' && data.user?.slug) {
        setActiveStoreSlug(data.user.slug);
      }

      onLoginSuccess(data.user, data.role);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 text-slate-800" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-700/40 p-8 space-y-6 relative overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Top Accent Line */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>

        {/* Brand & Store Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/20 text-white border border-emerald-400/40">
            <Boxes className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-2">{storeName}</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>بوابة تسجيل الدخول الآمنة للعمال</span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border-2 border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم المستخدم <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم المعتمد"
                className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              كلمة المرور <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'جاري التحقق من الصلاحية...' : 'تسجيل الدخول للنظام'}</span>
          </button>
        </form>

        {/* Clean footer line */}
        <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-400">
          <span>جميع الحقوق محفوظة • نظام المحاسب الذكي</span>
        </div>

      </div>

      {/* Developer Rights in Login Screen */}
      <div className="mt-6 text-xs text-slate-400 flex items-center gap-2">
        <span>تطوير وبرمجة:</span>
        <span className="font-bold text-emerald-400">م. عبد الرحمن كمال</span>
        <span>• v2.0</span>
      </div>
    </div>
  );
}

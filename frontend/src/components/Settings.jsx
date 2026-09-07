import React, { useState, useEffect } from 'react';
import { fetchApi, API_BASE } from '../api';
import { 
  Settings as SettingsIcon, 
  Save, 
  Download, 
  CheckCircle2, 
  ShieldCheck
} from 'lucide-react';

export default function Settings({ onUpdateCompany }) {
  const [settings, setSettings] = useState({
    company_name: '',
    currency: 'ر.س',
    enable_vat: 'true',
    vat_rate: '15',
    address: '',
    phone: ''
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchApi('/settings')
      .then(res => {
        if (res.data) setSettings(prev => ({ ...prev, ...res.data, currency: 'ر.س' }));
      })
      .catch(console.error);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await fetchApi('/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
      setSavedSuccess(true);
      if (onUpdateCompany) onUpdateCompany(settings.company_name);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('خطأ أثناء حفظ الإعدادات: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = `${API_BASE}/backup/download`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">إعدادات النظام والنسخ الاحتياطي</h2>
        <p className="text-slate-500 text-sm mt-0.5">تخصيص بيانات المنشأة، الضريبة، وحفظ النسخ الاحتياطية بأمان</p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>تم حفظ الإعدادات بنجاح</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-slate-700" />
            <span>البيانات الأساسية للمتجر</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنشأة / المتجر</label>
            <input
              type="text"
              required
              placeholder="اكتب اسم متجرك أو مؤسستك"
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">العملة الافتراضية</label>
              <input
                type="text"
                disabled
                value="ريال سعودي (ر.س)"
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">العملة ثابتة بالريال السعودي</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نسبة ضريبة القيمة المضافة %</label>
              <input
                type="number"
                value={settings.vat_rate}
                onChange={(e) => setSettings({ ...settings, vat_rate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={settings.enable_vat === 'true'}
                onChange={(e) => setSettings({ ...settings, enable_vat: e.target.checked ? 'true' : 'false' })}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <span>تفعيل احتساب الضريبة (15%) في الفواتير وحاسبة الأسعار</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الجوال</label>
              <input
                type="text"
                placeholder="05xxxxxxxx"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">العنوان / المدينة</label>
              <input
                type="text"
                placeholder="المدينة / الشارع"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>

        {/* Clean Export Option */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-base text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>تصدير وحفظ البيانات</span>
          </h3>

          <button
            onClick={handleDownloadBackup}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>تصدير نسخة احتياطية (.db)</span>
          </button>
        </div>

        {/* Developer Info Card */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-3 h-fit border border-slate-800">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-bold text-xs text-slate-300">حقوق الملكية والبرمجة</span>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-black text-white">المطور: م. عبد الرحمن كمال</div>
            <p className="text-[11px] text-slate-400">تصميم وتطوير نظام إدارة المخزون والجرد والحسابات</p>
          </div>
          <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-800/40 w-fit">
            الإصدار المعتمد v2.0
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Store, 
  Plus, 
  Copy, 
  Check, 
  Lock, 
  ExternalLink, 
  Trash2, 
  Power, 
  PowerOff, 
  KeyRound, 
  Phone, 
  User, 
  AlertCircle,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers
} from 'lucide-react';
import { API_BASE, setActiveStoreSlug } from '../api';

export default function AdminPanel({ onExitAdmin }) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Stores Data
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);

  // New Store Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [creatingStore, setCreatingStore] = useState(false);
  const [formError, setFormError] = useState('');

  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  // Copied link state
  const [copiedSlug, setCopiedSlug] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('super_admin_token');
    if (savedToken) {
      setIsAdminLoggedIn(true);
      loadStores();
    }
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'بيانات الدخول غير صحيحة');
      }
      localStorage.setItem('super_admin_token', data.token);
      setIsAdminLoggedIn(true);
      loadStores();
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('super_admin_token');
    setIsAdminLoggedIn(false);
    setLoginPassword('');
  };

  const loadStores = async () => {
    setLoadingStores(true);
    try {
      const res = await fetch(`${API_BASE}/admin/stores`);
      const data = await res.json();
      if (data.success) {
        setStores(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStores(false);
    }
  };

  // Auto-generate slug and username from store name
  const handleNameChange = (val) => {
    setFormName(val);
    if (!formSlug) {
      // Suggest clean english slug
      const randomNum = Math.floor(100 + Math.random() * 900);
      setFormSlug(`store-${randomNum}`);
      setFormUsername(`user${randomNum}`);
      setFormPassword('123456');
    }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setFormError('');
    setCreatingStore(true);
    try {
      const res = await fetch(`${API_BASE}/admin/stores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          slug: formSlug,
          owner_name: formOwner,
          phone: formPhone,
          username: formUsername,
          password: formPassword,
          notes: formNotes
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل إنشاء المتجر');
      }
      setShowAddModal(false);
      setFormName('');
      setFormSlug('');
      setFormOwner('');
      setFormPhone('');
      setFormUsername('');
      setFormPassword('');
      setFormNotes('');
      loadStores();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreatingStore(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await fetch(`${API_BASE}/admin/stores/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      loadStores();
    } catch (err) {
      alert('خطأ أثناء تحديث الحالة: ' + err.message);
    }
  };

  const handleDeleteStore = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف متجر "${name}" وجميع بياناته نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      return;
    }
    try {
      await fetch(`${API_BASE}/admin/stores/${id}`, { method: 'DELETE' });
      loadStores();
    } catch (err) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  const handleCopyLink = (slug) => {
    const origin = window.location.origin;
    const url = `${origin}/?store=${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 3000);
  };

  const handleOpenStore = (slug) => {
    setActiveStoreSlug(slug);
    window.location.href = `/?store=${slug}`;
  };

  const handleChangeAdminPassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    try {
      const res = await fetch(`${API_BASE}/admin/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newAdminPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تغيير كلمة المرور');
      }
      setPasswordMsg('تم تغيير كلمة مرور المشرف بنجاح!');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordMsg('');
        setNewAdminPassword('');
      }, 1500);
    } catch (err) {
      alert(err.message);
    }
  };

  // If not logged in as Admin, show Login Screen
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-slate-900 text-emerald-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-slate-700">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">لوحة المشرف العام</h2>
            <p className="text-xs text-slate-500">خاص بإدارة المنصة والمتاجر والعملاء المشتركين</p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم مستخدم المشرف</label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور السرية</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>{loggingIn ? 'جاري التحقق...' : 'دخول لوحة الإدارة'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeCount = stores.filter(s => s.status === 'active').length;
  const suspendedCount = stores.filter(s => s.status === 'suspended').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Admin Header Bar */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg border border-emerald-400/30">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black">لوحة التحكم المركزية (المشرف العام)</h1>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              إنشاء وإدارة حسابات المتاجر المستقلة لجميع المشترين، والتحكم بصلاحياتهم وروابطهم
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة متجر / عميل جديد</span>
          </button>

          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>تغيير كلمة مروري</span>
          </button>

          <button
            onClick={onExitAdmin}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
          >
            <Store className="w-3.5 h-3.5" />
            <span>المتجر الافتراضي</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white rounded-xl text-xs font-semibold transition border border-rose-500/30"
          >
            خروج
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">إجمالي المتاجر المسجلة</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stores.length}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-700">المتاجر النشطة (تعمل)</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Power className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-700">المتاجر المعلقة (موقوفة)</span>
            <div className="text-2xl font-black text-rose-600 mt-1">{suspendedCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <PowerOff className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-900">قائمة حسابات المتاجر والمشتركين</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {stores.length} متجر
          </span>
        </div>

        {stores.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Store className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-600 font-bold">لا يوجد متاجر مضافة حتى الآن</p>
            <p className="text-xs text-slate-400">
              اضغط على زر "إضافة متجر / عميل جديد" بالأعلى لإنشاء أول متجر مستقل وإرسال الرابط لصاحبه!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-4">اسم المتجر / الرمز</th>
                  <th className="p-4">صاحب المتجر</th>
                  <th className="p-4">بيانات الدخول</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">تاريخ الاشتراك</th>
                  <th className="p-4 text-center">رابط المشاركة</th>
                  <th className="p-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores.map((store) => {
                  const isActive = store.status === 'active';
                  const isCopied = copiedSlug === store.slug;

                  return (
                    <tr key={store.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4">
                        <div className="font-black text-sm text-slate-900">{store.name}</div>
                        <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          slug: {store.slug}
                        </span>
                        {store.notes && (
                          <p className="text-[11px] text-slate-400 mt-1">{store.notes}</p>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{store.owner_name || 'غير محدد'}</span>
                        </div>
                        {store.phone && (
                          <div className="text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{store.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-4 font-mono">
                        <div className="text-slate-800 font-bold">المستخدم: {store.username}</div>
                        <div className="text-slate-500">كلمة المرور: {store.password}</div>
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => handleToggleStatus(store.id, store.status)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black shadow-sm transition border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                          }`}
                          title={isActive ? "اضغط لتجميد وإيقاف المتجر عن العمال فوراً" : "اضغط لإلغاء التجميد وتفعيل المتجر للعمال"}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                          <span>{isActive ? '🟢 شغال ومفعل (اضغط للتجميد)' : '🔴 موقوف ومغلق (اضغط للتشغيل)'}</span>
                        </button>
                      </td>

                      <td className="p-4 text-slate-500 font-mono">
                        {store.created_at ? new Date(store.created_at).toLocaleDateString('ar-YE') : '—'}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleCopyLink(store.slug)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 mx-auto ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>تم نسخ الرابط!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>نسخ الرابط للعميل</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenStore(store.slug)}
                            className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
                            title="فتح ومعاينة هذا المتجر كمسؤول"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStore(store.id, store.name)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                            title="حذف المتجر"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create New Store */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-lg text-slate-900">إضافة متجر / عميل جديد</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateStore} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المتجر / المحل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="مثال: مركز النور لزينة السيارات"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رمز الرابط (Slug) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="al-noor"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">بالحروف الإنجليزية فقط</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم صاحب المحل
                  </label>
                  <input
                    type="text"
                    value={formOwner}
                    onChange={(e) => setFormOwner(e.target.value)}
                    placeholder="مثال: وضاح اليافعي"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف (واتساب)
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="770000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المستخدم للدخول <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="alnoor"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كلمة المرور للمتجر <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات المشرف
                </label>
                <textarea
                  rows="2"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="مثال: اشتراك سنوي - عدن الشيخ عثمان"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingStore}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{creatingStore ? 'جاري التجهيز...' : 'إنشاء وتجهيز المتجر فوراً'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Admin Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">تغيير كلمة مرور المشرف</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {passwordMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
                {passwordMsg}
              </div>
            )}

            <form onSubmit={handleChangeAdminPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  required
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  حفظ كلمة المرور
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

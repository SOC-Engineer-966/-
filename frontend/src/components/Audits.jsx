import React, { useState, useEffect } from 'react';
import { fetchApi, formatMoney, formatNumber } from '../api';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Check, 
  ArrowRight, 
  Printer, 
  Percent, 
  DollarSign, 
  HelpCircle,
  FileCheck
} from 'lucide-react';

export default function Audits() {
  const [sessions, setSessions] = useState([]);
  const [activeAudit, setActiveAudit] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // New Audit Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newAuditTitle, setNewAuditTitle] = useState('');
  const [newAuditScope, setNewAuditScope] = useState('all');
  const [newAuditCategory, setNewAuditCategory] = useState('');
  const [newAuditNotes, setNewAuditNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Search in active audit
  const [auditSearch, setAuditSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Count Item Modal (Physical + Regular vs Discounted batch)
  const [countingItem, setCountingItem] = useState(null);
  const [physicalCount, setPhysicalCount] = useState('');
  const [regularCount, setRegularCount] = useState('');
  const [discountedCount, setDiscountedCount] = useState('0');
  const [discountRate, setDiscountRate] = useState('0');
  const [discountReason, setDiscountReason] = useState('');
  const [countNotes, setCountNotes] = useState('');
  const [savingCount, setSavingCount] = useState(false);

  // Reconcile Modal
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconciliationReason, setReconciliationReason] = useState('مطابقة الرصيد الفعلي بعد انتهاء أعمال الجرد');
  const [reconciling, setReconciling] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/audits');
      setSessions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetchApi('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSessions();
    loadCategories();
  }, []);

  // Open specific audit session
  const handleOpenAudit = async (auditId) => {
    setLoadingAudit(true);
    try {
      const res = await fetchApi(`/audits/${auditId}`);
      setActiveAudit(res.data);
    } catch (err) {
      alert('تعذر فتح جلسة الجرد: ' + err.message);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Create new audit session
  const handleCreateAudit = async (e) => {
    e.preventDefault();
    if (!newAuditTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetchApi('/audits', {
        method: 'POST',
        body: JSON.stringify({
          title: newAuditTitle,
          scope: newAuditScope,
          category_id: newAuditCategory || null,
          notes: newAuditNotes
        })
      });

      setShowNewModal(false);
      setNewAuditTitle('');
      loadSessions();
      handleOpenAudit(res.auditId);
    } catch (err) {
      alert('خطأ أثناء إنشاء الجلسة: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Open count input modal for an item
  const handleOpenCountModal = (auditItem) => {
    setCountingItem(auditItem);
    const existingPhys = auditItem.physical_quantity !== null ? auditItem.physical_quantity : auditItem.system_quantity;
    const existingDisc = auditItem.discounted_quantity || 0;
    const existingReg = auditItem.regular_quantity !== null ? auditItem.regular_quantity : (existingPhys - existingDisc);

    setPhysicalCount(String(existingPhys));
    setRegularCount(String(existingReg));
    setDiscountedCount(String(existingDisc));
    setDiscountRate(String(auditItem.discount_rate_percent || 0));
    setDiscountReason(auditItem.discount_reason || '');
    setCountNotes(auditItem.notes || '');
  };

  // Handle auto calculation of regular vs discounted
  const handlePhysicalChange = (val) => {
    setPhysicalCount(val);
    const total = Number(val) || 0;
    const disc = Number(discountedCount) || 0;
    setRegularCount(String(Math.max(0, total - disc)));
  };

  const handleDiscountedChange = (val) => {
    setDiscountedCount(val);
    const disc = Number(val) || 0;
    const total = Number(physicalCount) || 0;
    setRegularCount(String(Math.max(0, total - disc)));
  };

  // Save item count
  const handleSaveCount = async (e) => {
    e.preventDefault();
    if (!countingItem || !activeAudit) return;

    setSavingCount(true);
    try {
      await fetchApi(`/audits/${activeAudit.id}/record-count`, {
        method: 'POST',
        body: JSON.stringify({
          item_id: countingItem.item_id,
          physical_quantity: Number(physicalCount),
          regular_quantity: Number(regularCount),
          discounted_quantity: Number(discountedCount),
          discount_rate_percent: Number(discountRate),
          discount_reason: discountReason,
          notes: countNotes
        })
      });

      setCountingItem(null);
      handleOpenAudit(activeAudit.id);
    } catch (err) {
      alert('خطأ أثناء حفظ الجرد: ' + err.message);
    } finally {
      setSavingCount(false);
    }
  };

  // Reconcile and apply stock changes
  const handleReconcile = async () => {
    if (!activeAudit) return;

    setReconciling(true);
    try {
      const res = await fetchApi(`/audits/${activeAudit.id}/reconcile`, {
        method: 'POST',
        body: JSON.stringify({
          reconciliation_reason: reconciliationReason
        })
      });

      alert(res.message);
      setShowReconcileModal(false);
      handleOpenAudit(activeAudit.id);
      loadSessions();
    } catch (err) {
      alert('خطأ أثناء اعتماد التسوية: ' + err.message);
    } finally {
      setReconciling(false);
    }
  };

  // Filter items in active audit
  const filteredAuditItems = activeAudit?.items?.filter(item => {
    const matchesSearch = !auditSearch || 
      item.item_name.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (item.barcode && item.barcode.includes(auditSearch)) ||
      (item.shelf_location && item.shelf_location.includes(auditSearch));

    if (!matchesSearch) return false;

    if (filterStatus === 'pending') return item.status === 'pending';
    if (filterStatus === 'discrepancy') return item.status === 'deficit' || item.status === 'surplus';
    if (filterStatus === 'discounted') return (item.discounted_quantity || 0) > 0;
    if (filterStatus === 'matched') return item.status === 'matched';
    return true;
  }) || [];

  return (
    <div className="space-y-6 pb-12">
      {/* If viewing a specific audit session */}
      {activeAudit ? (
        <div className="space-y-6">
          {/* Top Bar for Session */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveAudit(null)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                title="الرجوع لقائمة الجلسات"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{activeAudit.title}</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    activeAudit.status === 'reconciled' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {activeAudit.status === 'reconciled' ? 'معتمدة ومسوّاة' : 'قيد الجرد الفعلي'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  كود الجلسة: {activeAudit.session_code} • تاريخ البدء: {activeAudit.start_date}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الكشف</span>
              </button>

              {activeAudit.status !== 'reconciled' && (
                <button
                  onClick={() => setShowReconcileModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>اعتماد التسوية وتحديث المخزون</span>
                </button>
              )}
            </div>
          </div>

          {/* Metrics summary cards of the session */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
              <span className="text-xs text-slate-500 font-bold block">إجمالي الأصناف بالجلسة</span>
              <span className="text-xl font-extrabold text-slate-900 mt-1 block">{activeAudit.total_system_items}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
              <span className="text-xs text-slate-500 font-bold block">الأصناف المجرودة فعلياً</span>
              <span className="text-xl font-extrabold text-blue-600 mt-1 block">{activeAudit.total_counted_items}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
              <span className="text-xs text-slate-500 font-bold block">صافي فرق الكميات (عجز/فائض)</span>
              <span className={`text-xl font-extrabold mt-1 block ${
                activeAudit.total_variance_qty < 0 ? 'text-rose-600' : activeAudit.total_variance_qty > 0 ? 'text-emerald-600' : 'text-slate-900'
              }`}>
                {activeAudit.total_variance_qty > 0 ? `+${activeAudit.total_variance_qty}` : activeAudit.total_variance_qty}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
              <span className="text-xs text-slate-500 font-bold block">القيمة المالية للفرق</span>
              <span className={`text-xl font-extrabold mt-1 block ${
                activeAudit.total_variance_cost < 0 ? 'text-rose-600' : 'text-slate-900'
              }`}>
                {formatMoney(activeAudit.total_variance_cost)}
              </span>
            </div>
          </div>

          {/* Search & Filter within session */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="بحث بالاسم، الباركود أو الرف..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterStatus === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الكل ({activeAudit.items.length})
              </button>
              <button
                onClick={() => setFilterStatus('discrepancy')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterStatus === 'discrepancy' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                فروقات عجز وفائض
              </button>
              <button
                onClick={() => setFilterStatus('discounted')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterStatus === 'discounted' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                كميات مخصومة وتصفية
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterStatus === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                لم تُجرد بعد
              </button>
            </div>
          </div>

          {/* Audit Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase">
                  <tr>
                    <th className="px-4 py-3">الصنف / الرف</th>
                    <th className="px-4 py-3 text-center">الرصيد الدفتري</th>
                    <th className="px-4 py-3 text-center">الفعلي المجرود</th>
                    <th className="px-4 py-3 text-center">كمية سليمة / مخصومة</th>
                    <th className="px-4 py-3 text-center">فرق الكمية</th>
                    <th className="px-4 py-3 text-center">قيمة الفرق</th>
                    <th className="px-4 py-3 text-center">الحالة</th>
                    <th className="px-4 py-3 text-center">إدخال الجرد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditItems.map((item) => {
                    const isCounted = item.physical_quantity !== null;
                    const hasDiscount = (item.discounted_quantity || 0) > 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{item.item_name}</div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>{item.barcode || '—'}</span>
                            {item.shelf_location && <span>• {item.shelf_location}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">
                          {item.system_quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isCounted ? (
                            <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                              {item.physical_quantity} {item.unit}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hasDiscount ? (
                            <div className="text-[11px]">
                              <span className="text-slate-700 font-medium">سليم: {item.regular_quantity}</span>
                              <span className="block font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5">
                                خصم {item.discount_rate_percent}% على {item.discounted_quantity} حبة
                              </span>
                            </div>
                          ) : isCounted ? (
                            <span className="text-slate-500 text-xs">كامل الكمية بدون خصم</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {isCounted ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              item.variance_qty === 0 
                                ? 'bg-slate-100 text-slate-700' 
                                : item.variance_qty < 0 
                                ? 'bg-rose-100 text-rose-800' 
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {item.variance_qty > 0 ? `+${item.variance_qty}` : item.variance_qty}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-xs">
                          {isCounted ? (
                            <span className={item.variance_cost < 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                              {formatMoney(item.variance_cost)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            item.status === 'matched' ? 'bg-emerald-100 text-emerald-800' :
                            item.status === 'deficit' ? 'bg-rose-100 text-rose-800' :
                            item.status === 'surplus' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {item.status === 'matched' ? 'مطابق' :
                             item.status === 'deficit' ? 'عجز' :
                             item.status === 'surplus' ? 'فائض' :
                             'قيد الانتظار'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {activeAudit.status !== 'reconciled' ? (
                            <button
                              onClick={() => handleOpenCountModal(item)}
                              className="px-3 py-1 bg-slate-900 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                            >
                              {isCounted ? 'تعديل العد' : 'إدخال الجرد'}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">معتمد</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Sessions List View */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">جلسات الجرد وتسوية الفروقات</h2>
              <p className="text-slate-500 text-sm mt-0.5">مطابقة الرصيد الدفتري مع الجرد الفعلي ومعالجة العجز والفائض والكميات المخصومة</p>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>بدء جلسة جرد جديدة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => (
              <div 
                key={session.id}
                onClick={() => handleOpenAudit(session.id)}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-sm cursor-pointer transition hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      session.status === 'reconciled' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {session.status === 'reconciled' ? 'تمت التسوية والاعتماد' : 'جلسة نشطة (قيد الجرد)'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{session.start_date}</span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 mt-3">{session.title}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{session.session_code}</p>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>نطاق الجرد:</span>
                      <span className="font-semibold">{session.scope === 'all' ? 'كامل المخزون' : session.category_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إجمالي الأصناف:</span>
                      <span className="font-semibold">{session.total_system_items} صنف</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المجرود فعلياً:</span>
                      <span className="font-semibold text-blue-600">{session.total_counted_items} صنف</span>
                    </div>
                    {session.total_variance_cost !== 0 && (
                      <div className="flex justify-between pt-1 border-t border-slate-100">
                        <span>فرق القيمة المالية:</span>
                        <span className={`font-bold ${session.total_variance_cost < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                          {formatMoney(session.total_variance_cost)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-bold">
                  <span>فتح جدول الجرد والتسوية</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Audit Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">بدء جلسة جرد جديدة</h3>
              <button 
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAudit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الجلسة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: جرد نهاية الربع الأول أو جرد إكسسوارات الجوال"
                  value={newAuditTitle}
                  onChange={(e) => setNewAuditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نطاق الجرد</label>
                <select
                  value={newAuditScope}
                  onChange={(e) => setNewAuditScope(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">جرد شامل لكامل المستودع والمحل</option>
                  <option value="category">جرد مخصص لتصنيف محدد</option>
                </select>
              </div>

              {newAuditScope === 'category' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اختر التصنيف المراد جرده</label>
                  <select
                    required
                    value={newAuditCategory}
                    onChange={(e) => setNewAuditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">اختر التصنيف...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات / أعضاء لجنة الجرد</label>
                <textarea
                  rows="2"
                  placeholder="مثال: قام بالجرد فلان وفلان..."
                  value={newAuditNotes}
                  onChange={(e) => setNewAuditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  {creating ? 'جاري فتح الجلسة...' : 'فتح الجلسة واستدعاء الأرصدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Count Modal (Regular vs Discounted Clearance Batch) */}
      {countingItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">إدخال الجرد الفعلي: {countingItem.item_name}</h3>
                <span className="text-xs text-slate-500 font-mono">الرصيد الدفتري بالسيستم: {countingItem.system_quantity} {countingItem.unit}</span>
              </div>
              <button 
                onClick={() => setCountingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCount} className="space-y-4 mt-4 text-xs sm:text-sm">
              {/* Total Physical Count */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  إجمالي الكمية الفعلية الموجودة على الرف حالياً *
                </label>
                <input
                  type="number"
                  required
                  value={physicalCount}
                  onChange={(e) => handlePhysicalChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-blue-50/50 border border-blue-200 rounded-xl text-base font-extrabold text-blue-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Discounted / Clearance Split Box */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Percent className="w-4 h-4 text-emerald-600" />
                  <span>توزيع الكمية (سليمة vs عليها خصم تصفية / عيوب)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">كمية سليمة (بدون خصم)</label>
                    <input
                      type="number"
                      value={regularCount}
                      onChange={(e) => setRegularCount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-800 mb-1">كمية مخصومة (تصفية)</label>
                    <input
                      type="number"
                      value={discountedCount}
                      onChange={(e) => handleDiscountedChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-bold text-emerald-800"
                    />
                  </div>
                </div>

                {Number(discountedCount) > 0 && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">نسبة الخصم المقترحة %</label>
                      <input
                        type="number"
                        placeholder="مثلاً 30%"
                        value={discountRate}
                        onChange={(e) => setDiscountRate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">سبب الخصم بالجرد</label>
                      <input
                        type="text"
                        placeholder="مثال: كرتون مخدوش / تصفية موديل"
                        value={discountReason}
                        onChange={(e) => setDiscountReason(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Variance Preview */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-600 font-semibold">فرق الجرد المتوقع:</span>
                <span className={`font-bold ${
                  Number(physicalCount) - countingItem.system_quantity === 0
                    ? 'text-slate-700'
                    : Number(physicalCount) - countingItem.system_quantity < 0
                    ? 'text-rose-600'
                    : 'text-emerald-600'
                }`}>
                  {Number(physicalCount) - countingItem.system_quantity > 0 ? '+' : ''}
                  {Number(physicalCount) - countingItem.system_quantity} {countingItem.unit}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCountingItem(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingCount}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  {savingCount ? 'جاري الحفظ...' : 'تثبيت نتيجة الجرد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reconcile Confirmation Modal */}
      {showReconcileModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-lg text-slate-900">اعتماد التسوية الجردية الرسمية</h3>
            </div>

            <div className="py-4 space-y-3 text-sm text-slate-600">
              <p className="leading-relaxed">
                عند الاعتماد، سيقوم النظام تلقائياً بتعديل <strong>أرصدة المستودع الحقيقية</strong> لتتطابق تماماً مع الأرقام الفعلية التي قمت بعدها.
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>صافي فرق الكميات:</span>
                  <span>{activeAudit.total_variance_qty}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>صافي أثر التكلفة المالية:</span>
                  <span>{formatMoney(activeAudit.total_variance_cost)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سبب التسوية / السجل المحاسبي:</label>
                <input
                  type="text"
                  value={reconciliationReason}
                  onChange={(e) => setReconciliationReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReconcileModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={reconciling}
                onClick={handleReconcile}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm"
              >
                {reconciling ? 'جاري الاعتماد...' : 'نعم، اعتمد التسوية وحدّث المخزون'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

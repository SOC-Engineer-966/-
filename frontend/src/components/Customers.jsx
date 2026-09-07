import React, { useState, useEffect } from 'react';
import { fetchApi, formatMoney, formatNumber } from '../api';
import { 
  Users, 
  Plus, 
  Search, 
  DollarSign, 
  FileText, 
  Printer, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Edit3, 
  Trash2, 
  Phone, 
  MapPin, 
  CreditCard,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add/Edit Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    balance: '0',
    notes: ''
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Payment / Installment Modal (سند قبض دفعة تقطيع)
  const [payingCustomer, setPayingCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('دفعة نقدية من الحساب');
  const [savingPayment, setSavingPayment] = useState(false);

  // Statement Modal (كشف حساب العميل التراكمي)
  const [statementCustomer, setStatementCustomer] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      let endpoint = '/customers';
      if (search) endpoint += `?search=${encodeURIComponent(search)}`;
      const res = await fetchApi(endpoint);
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '', balance: '0', notes: '' });
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone || '',
      address: c.address || '',
      balance: c.balance,
      notes: c.notes || ''
    });
    setShowAddModal(true);
  };

  // Submit Customer Form
  const handleSubmitCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSavingCustomer(true);
    try {
      if (editingCustomer) {
        await fetchApi(`/customers/${editingCustomer.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await fetchApi('/customers', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setShowAddModal(false);
      loadCustomers();
    } catch (err) {
      alert('خطأ أثناء حفظ العميل: ' + err.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (c) => {
    if (c.balance > 0) {
      if (!window.confirm(`تنبيه: العميل "${c.name}" عليه دين مستحق بقيمة ${c.balance} ر.س! هل تريد حذفه وتصفير سجله بالتأكيد؟`)) {
        return;
      }
    } else {
      if (!window.confirm(`هل تريد بالتأكيد حذف العميل "${c.name}"؟`)) return;
    }

    try {
      await fetchApi(`/customers/${c.id}`, { method: 'DELETE' });
      loadCustomers();
    } catch (err) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  // Open Payment Modal (سند قبض دفعة تقطيع)
  const handleOpenPayment = (c) => {
    setPayingCustomer(c);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentNotes('دفعة نقدية من الحساب');
  };

  // Submit Payment
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!payingCustomer) return;
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      alert('يرجى كتابة مبلغ صحيح');
      return;
    }

    setSavingPayment(true);
    try {
      const res = await fetchApi(`/customers/${payingCustomer.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          notes: paymentNotes
        })
      });

      alert(res.message);
      setPayingCustomer(null);
      loadCustomers();
    } catch (err) {
      alert('خطأ أثناء تسجيل السند: ' + err.message);
    } finally {
      setSavingPayment(false);
    }
  };

  // View Statement of Account (كشف حساب العميل التراكمي)
  const handleViewStatement = async (c) => {
    setStatementCustomer(c);
    setLoadingStatement(true);
    try {
      const res = await fetchApi(`/customers/${c.id}/statement`);
      setStatementData(res.data);
    } catch (err) {
      alert('خطأ في جلب كشف الحساب: ' + err.message);
    } finally {
      setLoadingStatement(false);
    }
  };

  // Financial Stats
  const totalMarketDebt = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const debtorCount = customers.filter(c => c.balance > 0).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">دفتر حسابات وديون العملاء</h2>
          <p className="text-slate-500 text-sm mt-0.5">متابعة حسابات الآجل، تسجيل سندات القبض بالتقطيع، واستخراج كشوفات الحساب التراكمية</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة حساب عميل جديد</span>
        </button>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase block">إجمالي الديون المعلقة في السوق</span>
          <h3 className="text-2xl font-black text-amber-400 mt-2">{formatMoney(totalMarketDebt)}</h3>
          <p className="text-xs text-slate-300 mt-1">مبالغ مستحقة لك طرف العملاء والمحلات بالريال السعودي</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase block">العملاء المدينين (عليهم رصيد)</span>
          <h3 className="text-2xl font-black text-rose-700 mt-2">{debtorCount} عملاء</h3>
          <p className="text-xs text-slate-500 mt-1">من إجمالي {customers.length} عميل مسجل بالنظام</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase block">طريقة التحصيل والتقطيع</span>
          <h3 className="text-sm font-bold text-emerald-800 mt-2">سداد دفعات مرنة</h3>
          <p className="text-xs text-slate-500 mt-1">كل دفعة تخصم من الرصيد التراكمي وتوثق فوراً بسند قبض</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث باسم العميل، المحل، أو رقم الجوال..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase">
              <tr>
                <th className="px-4 py-3">اسم العميل / المحل</th>
                <th className="px-4 py-3">الجوال / العنوان</th>
                <th className="px-4 py-3 text-center">عدد العمليات</th>
                <th className="px-4 py-3 text-center">آخر حركة</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">الرصيد المتبقي (الدين)</th>
                <th className="px-4 py-3 text-center">سند قبض (تقطيع)</th>
                <th className="px-4 py-3 text-center">كشف الحساب</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-8 text-slate-400">جاري تحميل العملاء...</td></tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-16 text-slate-400">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-base text-slate-700">دفتر العملاء فارغ</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                      أضف العملاء والمحلات التي تسحب منك بضاعة بالآجل لتسجيل ديونهم ودفعاتهم.
                    </p>
                    <button
                      onClick={handleOpenAdd}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة أول عميل</span>
                    </button>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const hasDebt = c.balance > 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block text-sm">{c.name}</span>
                        {c.notes && <span className="text-[11px] text-slate-400 block">{c.notes}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-700 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone || 'بدون هاتف'}</span>
                        </div>
                        {c.address && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{c.address}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-600">
                        <span>{c.sales_count || 0} فاتورة</span>
                        <span className="block text-[10px] text-slate-400">{c.payments_count || 0} سند قبض</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500 font-mono">
                        {c.last_activity || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black ${
                          hasDebt 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {formatMoney(c.balance)}
                        </span>
                        {hasDebt ? (
                          <span className="block text-[10px] text-rose-600 font-bold mt-0.5">مستحق عليه</span>
                        ) : (
                          <span className="block text-[10px] text-emerald-700 font-bold mt-0.5">حسابه مصفّر</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenPayment(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>قبض دفعة</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleViewStatement(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span>كشف الحساب</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="تعديل العميل"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                            title="حذف العميل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة حساب عميل جديد'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل أو اسم المحل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محل البركة أو فلان الفلاني"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الجوال</label>
                <input
                  type="text"
                  placeholder="00967xxxxxxxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان / المنطقة</label>
                <input
                  type="text"
                  placeholder="مثال: عدن - الشيخ عثمان أو المنصورة"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {!editingCustomer && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرصيد الافتتاحي السابق (إن وجد عليه دين سابق)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00 ر.س"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">لو كان عليه حساب قديم من قبل سجله هنا</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
                <input
                  type="text"
                  placeholder="أي ملاحظات حول طريقة سداده..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  {savingCustomer ? 'جاري الحفظ...' : editingCustomer ? 'تحديث البيانات' : 'إضافة العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment / Installment Modal (سند قبض دفعة تقطيع) */}
      {payingCustomer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">تسجيل سند قبض دفعة بالتقطيع</h3>
                <span className="text-xs text-slate-500 font-semibold">{payingCustomer.name}</span>
              </div>
              <button 
                onClick={() => setPayingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Customer Current Balance Box */}
            <div className="my-4 p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-900 font-semibold block">إجمالي الدين الحالي المستحق عليه:</span>
                <span className="text-2xl font-black text-amber-950 mt-1 block">{formatMoney(payingCustomer.balance)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">المبلغ المسدد الآن (ر.س) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="مثال: 100 أو 200 أو 300..."
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-emerald-50/50 border border-emerald-300 rounded-xl text-lg font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {Number(paymentAmount) > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold">المتبقي على حسابه بعد هذا السند:</span>
                  <span className="font-black text-slate-900">
                    {formatMoney(Math.max(0, payingCustomer.balance - Number(paymentAmount)))}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ السداد</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة القبض</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="cash">نقدي (كاش باليد)</option>
                    <option value="transfer">حوالة / إيداع بنكي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البيان / الملاحظة</label>
                <input
                  type="text"
                  placeholder="مثال: دفعة تحت الحساب أو تصفية فاتورة سابقة"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayingCustomer(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingPayment || !paymentAmount}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  {savingPayment ? 'جاري الحفظ...' : 'حفظ سند القبض وخصم الدين'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statement of Account Modal (كشف حساب العميل التراكمي) */}
      {statementCustomer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">كشف حساب العميل: {statementCustomer.name}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {statementCustomer.phone && `هاتف: ${statementCustomer.phone}`}
                  {statementCustomer.address && ` • ${statementCustomer.address}`}
                </p>
              </div>
              <button 
                onClick={() => { setStatementCustomer(null); setStatementData(null); }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {loadingStatement ? (
              <div className="py-12 text-center text-slate-400 text-sm">جاري جلب سجل المعاملات والسندات...</div>
            ) : statementData ? (
              <div className="space-y-4 my-4">
                {/* Financial Summary Header */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-center">
                  <div>
                    <span className="text-slate-500 block">إجمالي مسحوبات البضاعة</span>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                      {formatMoney(statementData.summary.totalPurchases)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">إجمالي الدفعات المسددة</span>
                    <span className="text-base font-extrabold text-emerald-700 mt-0.5 block">
                      {formatMoney(statementData.summary.totalPaid)}
                    </span>
                  </div>
                  <div className="bg-amber-100/70 p-2 rounded-xl border border-amber-300">
                    <span className="text-amber-900 font-bold block">الرصيد المتبقي المستحق</span>
                    <span className="text-lg font-black text-amber-950 mt-0.5 block">
                      {formatMoney(statementData.summary.currentDebt)}
                    </span>
                  </div>
                </div>

                {/* Detailed Ledger Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase">
                      <tr>
                        <th className="p-2.5">التاريخ</th>
                        <th className="p-2.5">رقم المرجع / العملية</th>
                        <th className="p-2.5">البيان والتفاصيل</th>
                        <th className="p-2.5 text-center text-slate-900">مسحوبات (مدين عليه)</th>
                        <th className="p-2.5 text-center text-emerald-700">دفعات مسددة (دائن له)</th>
                        <th className="p-2.5 text-center font-black">الرصيد التراكمي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statementData.ledger.length === 0 ? (
                        <tr><td colSpan="6" className="text-center py-6 text-slate-400">لا توجد حركات سابقة لهذا الحساب</td></tr>
                      ) : (
                        statementData.ledger.map((t, idx) => {
                          const isInvoice = t.type === 'invoice';
                          return (
                            <tr key={idx} className={isInvoice ? 'hover:bg-slate-50' : 'bg-emerald-50/30 hover:bg-emerald-50/60'}>
                              <td className="p-2.5 font-mono text-slate-500">{t.trans_date}</td>
                              <td className="p-2.5 font-mono font-bold text-slate-800">{t.ref_no}</td>
                              <td className="p-2.5 text-slate-700">
                                {isInvoice ? 'فاتورة سحب بضاعة بالآجل' : 'سند قبض دفعة نقدية'}
                                {t.notes && <span className="block text-[11px] text-slate-400 font-normal">{t.notes}</span>}
                              </td>
                              <td className="p-2.5 text-center font-bold text-slate-900">
                                {t.debit > 0 ? formatMoney(t.debit) : '—'}
                              </td>
                              <td className="p-2.5 text-center font-bold text-emerald-700">
                                {t.credit > 0 ? formatMoney(t.credit) : '—'}
                              </td>
                              <td className="p-2.5 text-center font-black text-slate-950">
                                {formatMoney(t.running_balance)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة كشف الحساب</span>
              </button>
              <button
                onClick={() => { setStatementCustomer(null); setStatementData(null); }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

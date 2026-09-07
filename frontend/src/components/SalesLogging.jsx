import React, { useState, useEffect } from 'react';
import { fetchApi, formatMoney, formatNumber } from '../api';
import { 
  Receipt, 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  Printer, 
  CheckCircle2, 
  TrendingUp, 
  Calendar,
  CreditCard,
  Percent,
  X,
  UserCheck,
  UserPlus
} from 'lucide-react';

export default function SalesLogging() {
  const [sales, setSales] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // New Sale Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('عميل نقدي');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmountInput, setPaidAmountInput] = useState('0');
  const [saleNotes, setSaleNotes] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [savingSale, setSavingSale] = useState(false);
  const [saleError, setSaleError] = useState('');

  // Invoice Details Modal
  const [viewingSale, setViewingSale] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadSales = async () => {
    setLoading(true);
    try {
      let endpoint = `/sales?payment_method=${paymentFilter}`;
      if (search) endpoint += `&search=${encodeURIComponent(search)}`;
      const res = await fetchApi(endpoint);
      setSales(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const res = await fetchApi('/items');
      setItemsList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await fetchApi('/customers');
      setCustomersList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSales();
    loadItems();
    loadCustomers();
  }, [paymentFilter]);

  // When selecting a customer from dropdown
  const handleCustomerSelect = (id) => {
    setSelectedCustomerId(id);
    if (!id) {
      setCustomerName('عميل نقدي');
      return;
    }
    const c = customersList.find(item => String(item.id) === String(id));
    if (c) {
      setCustomerName(c.name);
    }
  };

  // Add Item to Sale Cart
  const handleAddItemToCart = () => {
    if (!selectedItemId) return;
    const dbItem = itemsList.find(i => String(i.id) === String(selectedItemId));
    if (!dbItem) return;

    const existing = cartItems.find(i => i.item_id === dbItem.id);
    if (existing) {
      setCartItems(cartItems.map(i => {
        if (i.item_id === dbItem.id) {
          const newQty = i.quantity + 1;
          let discPct = i.discount_percent;
          if (dbItem.discount_min_qty > 0 && newQty >= dbItem.discount_min_qty) {
            discPct = dbItem.discount_percent;
          }
          return { ...i, quantity: newQty, discount_percent: discPct };
        }
        return i;
      }));
    } else {
      let initialDisc = 0;
      if (dbItem.discount_min_qty > 0 && 1 >= dbItem.discount_min_qty) {
        initialDisc = dbItem.discount_percent;
      }
      setCartItems([
        ...cartItems,
        {
          item_id: dbItem.id,
          name: dbItem.name,
          unit: dbItem.unit,
          cost_price: dbItem.cost_price,
          unit_price: dbItem.retail_price,
          quantity: 1,
          discount_percent: initialDisc,
          stock: dbItem.stock_quantity
        }
      ]);
    }
    setSelectedItemId('');
  };

  const updateCartQty = (itemId, newQty) => {
    const qty = Math.max(1, Number(newQty) || 1);
    setCartItems(cartItems.map(i => {
      if (i.item_id === itemId) {
        const dbItem = itemsList.find(d => d.id === itemId);
        let discPct = i.discount_percent;
        if (dbItem && dbItem.discount_min_qty > 0) {
          if (qty >= dbItem.discount_min_qty) {
            discPct = dbItem.discount_percent;
          }
        }
        return { ...i, quantity: qty, discount_percent: discPct };
      }
      return i;
    }));
  };

  const updateCartPrice = (itemId, newPrice) => {
    setCartItems(cartItems.map(i => i.item_id === itemId ? { ...i, unit_price: Number(newPrice) || 0 } : i));
  };

  const updateCartDiscount = (itemId, discPct) => {
    setCartItems(cartItems.map(i => i.item_id === itemId ? { ...i, discount_percent: Number(discPct) || 0 } : i));
  };

  const removeCartItem = (itemId) => {
    setCartItems(cartItems.filter(i => i.item_id !== itemId));
  };

  // Cart totals calculation
  const cartSubtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const cartTotalDiscount = cartItems.reduce((sum, item) => {
    const gross = item.quantity * item.unit_price;
    return sum + (gross * (item.discount_percent / 100));
  }, 0);
  const cartNetTotal = cartSubtotal - cartTotalDiscount;
  const cartTotalCost = cartItems.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);
  const cartExpectedProfit = cartNetTotal - cartTotalCost;

  const currentPaid = Number(paidAmountInput) || 0;
  const creditRemaining = Math.max(0, cartNetTotal - currentPaid);
  const selectedCustomerObj = customersList.find(c => String(c.id) === String(selectedCustomerId));

  // Submit Sale
  const handleSubmitSale = async (e) => {
    e.preventDefault();
    setSaleError('');
    if (!cartItems.length) {
      setSaleError('يجب اختيار صنف واحد على الأقل في الفاتورة');
      return;
    }

    if (paymentMethod === 'credit' && !selectedCustomerId && (!customerName || customerName === 'عميل نقدي')) {
      setSaleError('في البيع بالآجل، يرجى اختيار عميل من القائمة أو كتابة اسمه لربطه بحسابه');
      return;
    }

    setSavingSale(true);
    try {
      await fetchApi('/sales', {
        method: 'POST',
        body: JSON.stringify({
          sale_date: saleDate,
          customer_id: selectedCustomerId || null,
          customer_name: customerName,
          payment_method: paymentMethod,
          paid_amount: paymentMethod === 'credit' ? currentPaid : cartNetTotal,
          remaining_amount: paymentMethod === 'credit' ? creditRemaining : 0,
          notes: saleNotes,
          items: cartItems.map(i => ({
            item_id: i.item_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            discount_percent: i.discount_percent
          }))
        })
      });

      setShowNewModal(false);
      setCartItems([]);
      setSaleNotes('');
      setPaidAmountInput('0');
      setSelectedCustomerId('');
      loadSales();
      loadItems();
      loadCustomers();
    } catch (err) {
      setSaleError(err.message);
    } finally {
      setSavingSale(false);
    }
  };

  // View sale details
  const handleViewSale = async (saleId) => {
    setLoadingDetails(true);
    try {
      const res = await fetchApi(`/sales/${saleId}`);
      setViewingSale(res.data);
    } catch (err) {
      alert('خطأ في جلب الفاتورة: ' + err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">سجل المبيعات والمسحوبات</h2>
          <p className="text-slate-500 text-sm mt-0.5">تسجيل مبيعات النقد والآجل، ترحيل الديون للعملاء، وحساب الأرباح اللحظية</p>
        </div>
        <button
          onClick={() => {
            setCartItems([]);
            setSaleError('');
            setSelectedCustomerId('');
            setCustomerName('عميل نقدي');
            setPaymentMethod('cash');
            setPaidAmountInput('0');
            setShowNewModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل مبيعات / فاتورة جديدة</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة أو اسم العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setPaymentFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              paymentFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            جميع العمليات
          </button>
          <button
            onClick={() => setPaymentFilter('cash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              paymentFilter === 'cash' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            نقدي (كاش)
          </button>
          <button
            onClick={() => setPaymentFilter('credit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              paymentFilter === 'credit' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            آجل (ديون على الحساب)
          </button>
        </div>
      </div>

      {/* Sales List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase">
              <tr>
                <th className="px-4 py-3">رقم الفاتورة / التاريخ</th>
                <th className="px-4 py-3">العميل / المحل</th>
                <th className="px-4 py-3">نوع العملية</th>
                <th className="px-4 py-3">إجمالي الفاتورة</th>
                <th className="px-4 py-3">المدفوع نقداً</th>
                <th className="px-4 py-3">المتبقي آجل (دين)</th>
                <th className="px-4 py-3 font-bold text-emerald-700">مجمل الربح</th>
                <th className="px-4 py-3 text-center">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-8 text-slate-400">جاري تحميل سجلات المبيعات...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-12 text-slate-400">لا توجد مبيعات مسجلة حتى الآن</td></tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block font-mono">{s.invoice_number}</span>
                      <span className="text-[11px] text-slate-400">{s.sale_date}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {s.customer_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        s.payment_method === 'credit' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {s.payment_method === 'credit' ? 'آجل (تقطيع)' : 'نقدي'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-black text-slate-900">
                      {formatMoney(s.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">
                      {s.paid_amount > 0 ? formatMoney(s.paid_amount) : '0.00 ر.س'}
                    </td>
                    <td className="px-4 py-3">
                      {s.remaining_amount > 0 ? (
                        <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {formatMoney(s.remaining_amount)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 text-xs font-semibold">مسدد بالكامل</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700">
                      +{formatMoney(s.total_profit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewSale(s.id)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                        title="عرض الفاتورة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sale Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">تسجيل مبيعات جديدة / سحب بضاعة</h3>
                <p className="text-xs text-slate-500">يتم خصم الأصناف من المخزن فورياً وترحيل الرصيد الآجل للعميل</p>
              </div>
              <button 
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {saleError && (
              <div className="p-3 my-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {saleError}
              </div>
            )}

            <form onSubmit={handleSubmitSale} className="space-y-4 mt-4 text-xs sm:text-sm">
              {/* Header Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ المبيعات</label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة السداد</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      if (e.target.value === 'credit' && !selectedCustomerId && customersList.length > 0) {
                        handleCustomerSelect(customersList[0].id);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  >
                    <option value="cash">نقدي (كاش فوري)</option>
                    <option value="credit">آجل (على حساب العميل - تقطيع)</option>
                    <option value="transfer">تحويل بنكي / صرافة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {paymentMethod === 'credit' ? 'اختر حساب العميل (آجل) *' : 'اسم العميل / المستلم'}
                  </label>
                  {paymentMethod === 'credit' && customersList.length > 0 ? (
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-xl text-sm font-bold text-amber-950"
                    >
                      <option value="">-- اختر العميل من دفتر الديون --</option>
                      {customersList.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} (دينه السابق: {c.balance} ر.س)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  )}
                </div>
              </div>

              {/* Installment Split Panel (If Credit) */}
              {paymentMethod === 'credit' && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-950">تفاصيل سداد الآجل والتقطيع:</span>
                    {selectedCustomerObj && (
                      <span className="text-amber-800 font-semibold">
                        رصيد العميل السابق: <strong>{formatMoney(selectedCustomerObj.balance)}</strong>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        المدفوع كاش الآن مقدماً (إن وجد):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00 ر.س"
                        value={paidAmountInput}
                        onChange={(e) => setPaidAmountInput(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold text-emerald-800"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">اكتب 0 إذا لم يدفع شيئاً الآن</span>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        المتبقي الآجل (ينزل في حسابه):
                      </label>
                      <div className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black text-rose-800">
                        {formatMoney(creditRemaining)}
                      </div>
                      {selectedCustomerObj && (
                        <span className="text-[10px] text-amber-900 mt-0.5 block font-semibold">
                          إجمالي دين العميل سيصبح: {formatMoney(selectedCustomerObj.balance + creditRemaining)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Add Item Bar */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-2">
                <div className="w-full sm:flex-1">
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm"
                  >
                    <option value="">-- اختر الصنف لإضافته للفاتورة --</option>
                    {itemsList.map(item => (
                      <option key={item.id} value={item.id} disabled={item.stock_quantity <= 0}>
                        {item.name} (المتوفر: {item.stock_quantity} {item.unit}) - {item.retail_price} ر.س
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddItemToCart}
                  disabled={!selectedItemId}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة الصنف</span>
                </button>
              </div>

              {/* Cart Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">الصنف</th>
                      <th className="p-2.5 w-20 text-center">الكمية</th>
                      <th className="p-2.5 w-28 text-center">سعر الوحدة</th>
                      <th className="p-2.5 w-20 text-center">خصم %</th>
                      <th className="p-2.5 text-center">الإجمالي</th>
                      <th className="p-2.5 w-12 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cartItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-6 text-slate-400">
                          لم يتم إضافة أي صنف بعد. اختر من القائمة أعلاه.
                        </td>
                      </tr>
                    ) : (
                      cartItems.map((item) => {
                        const lineGross = item.quantity * item.unit_price;
                        const lineDisc = lineGross * (item.discount_percent / 100);
                        const lineNet = lineGross - lineDisc;
                        return (
                          <tr key={item.item_id}>
                            <td className="p-2.5 font-bold text-slate-800">
                              {item.name}
                              <span className="block text-[11px] text-slate-400 font-normal">المخزون: {item.stock} {item.unit}</span>
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateCartQty(item.item_id, e.target.value)}
                                className="w-16 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateCartPrice(item.item_id, e.target.value)}
                                className="w-24 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount_percent}
                                onChange={(e) => updateCartDiscount(item.item_id, e.target.value)}
                                className="w-16 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-emerald-800"
                              />
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-900">
                              {lineNet.toFixed(2)} ر.س
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeCartItem(item.item_id)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              {cartItems.length > 0 && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>إجمالي الفاتورة:</span>
                    <span className="font-extrabold text-sm text-slate-900">{formatMoney(cartNetTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>مجمل الربح المحقق منها:</span>
                    <span>+{formatMoney(cartExpectedProfit)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الفاتورة</label>
                <input
                  type="text"
                  placeholder="ملاحظات حول الفاتورة أو شروط السداد..."
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
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
                  disabled={savingSale || cartItems.length === 0}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm"
                >
                  {savingSale ? 'جاري الاعتماد...' : 'حفظ الفاتورة وترحيل الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sale Details Modal */}
      {viewingSale && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">تفاصيل الفاتورة: {viewingSale.invoice_number}</h3>
                <span className="text-xs text-slate-400 font-mono">{viewingSale.sale_date}</span>
              </div>
              <button 
                onClick={() => setViewingSale(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-4 text-xs sm:text-sm">
              <div className="flex justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-xs">العميل:</span>
                  <span className="font-bold text-slate-800">{viewingSale.customer_name}</span>
                </div>
                <div className="text-left">
                  <span className="text-slate-500 block text-xs">طريقة السداد:</span>
                  <span className="font-bold text-slate-800">
                    {viewingSale.payment_method === 'credit' ? 'آجل (على الحساب)' : 'نقدي'}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">الصنف</th>
                      <th className="p-2.5 text-center">الكمية</th>
                      <th className="p-2.5 text-center">السعر</th>
                      <th className="p-2.5 text-center">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingSale.items && viewingSale.items.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2.5 font-semibold text-slate-800">{it.item_name}</td>
                        <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                        <td className="p-2.5 text-center">{it.unit_price} ر.س</td>
                        <td className="p-2.5 text-center font-bold text-slate-900">{it.total_price} ر.س</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Box */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>إجمالي الفاتورة:</span>
                  <span className="font-extrabold text-sm text-slate-900">{formatMoney(viewingSale.total_amount)}</span>
                </div>
                {viewingSale.payment_method === 'credit' && (
                  <>
                    <div className="flex justify-between text-emerald-800">
                      <span>المدفوع نقداً عند الفاتورة:</span>
                      <span>{formatMoney(viewingSale.paid_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-rose-800 font-bold">
                      <span>المتبقي الآجل المرحّل لحسابه:</span>
                      <span>{formatMoney(viewingSale.remaining_amount || 0)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-emerald-200">
                  <span>صافي مجمل الربح:</span>
                  <span>+{formatMoney(viewingSale.total_profit)}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الفاتورة</span>
              </button>
              <button
                onClick={() => setViewingSale(null)}
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

import React, { useState, useEffect } from 'react';
import { fetchApi, formatMoney, formatNumber } from '../api';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  Edit3, 
  Trash2, 
  History, 
  AlertCircle, 
  ArrowUpDown, 
  Sparkles,
  Percent,
  X,
  CheckCircle,
  Tag,
  FolderPlus,
  Layers
} from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [sortBy, setSortBy] = useState('latest');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  const [editingItem, setEditingItem] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form State
  const initialForm = {
    barcode: '',
    name: '',
    category_id: '',
    unit: 'حبة',
    cost_price: '',
    retail_price: '',
    wholesale_price: '',
    min_price: '',
    stock_quantity: '0',
    min_stock_alert: '5',
    shelf_location: '',
    discount_min_qty: '',
    discount_percent: '',
    discount_notes: '',
    notes: '',
    price_change_reason: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Load items
  const loadItems = async () => {
    setLoading(true);
    try {
      let endpoint = `/items?sort_by=${sortBy}`;
      if (search) endpoint += `&search=${encodeURIComponent(search)}`;
      if (selectedCategory) endpoint += `&category_id=${selectedCategory}`;
      if (onlyLowStock) endpoint += `&low_stock=true`;

      const res = await fetchApi(endpoint);
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load categories
  const loadCategories = async () => {
    try {
      const res = await fetchApi('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadItems();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, onlyLowStock, sortBy]);

  // Create category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatSaving(true);
    try {
      const res = await fetchApi('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName, description: newCatDesc })
      });
      setNewCatName('');
      setNewCatDesc('');
      await loadCategories();
      // If adding inside item form, auto-select it
      if (showAddModal) {
        setFormData(prev => ({ ...prev, category_id: res.id }));
      }
    } catch (err) {
      alert('خطأ أثناء إضافة التصنيف: ' + err.message);
    } finally {
      setCatSaving(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('هل تريد بالتأكيد حذف هذا التصنيف؟')) return;
    try {
      await fetchApi(`/categories/${catId}`, { method: 'DELETE' });
      await loadCategories();
      loadItems();
    } catch (err) {
      alert('خطأ أثناء حذف التصنيف: ' + err.message);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData(initialForm);
    setEditingItem(null);
    setFormError('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      barcode: item.barcode || '',
      name: item.name || '',
      category_id: item.category_id || '',
      unit: item.unit || 'حبة',
      cost_price: item.cost_price,
      retail_price: item.retail_price,
      wholesale_price: item.wholesale_price || '',
      min_price: item.min_price || '',
      stock_quantity: item.stock_quantity,
      min_stock_alert: item.min_stock_alert,
      shelf_location: item.shelf_location || '',
      discount_min_qty: item.discount_min_qty || '',
      discount_percent: item.discount_percent || '',
      discount_notes: item.discount_notes || '',
      notes: item.notes || '',
      price_change_reason: ''
    });
    setFormError('');
    setShowAddModal(true);
  };

  // Submit Form (Add or Edit)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name.trim()) {
      setFormError('اسم الصنف مطلوب');
      return;
    }

    setFormSaving(true);
    try {
      if (editingItem) {
        await fetchApi(`/items/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await fetchApi('/items', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setShowAddModal(false);
      loadItems();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSaving(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (item) => {
    if (!window.confirm(`هل أنت متأكد من حذف الصنف "${item.name}"؟ سيتم حذف جميع حركاته.`)) {
      return;
    }
    try {
      await fetchApi(`/items/${item.id}`, { method: 'DELETE' });
      loadItems();
    } catch (err) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  // View Item Movement History (كارت الصنف)
  const handleViewHistory = async (item) => {
    setHistoryItem(item);
    setLoadingHistory(true);
    try {
      const res = await fetchApi(`/items/${item.id}`);
      setHistoryData(res.data);
    } catch (err) {
      alert('خطأ في جلب كارت الصنف: ' + err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCostChange = (newCost) => {
    setFormData(prev => {
      const cost = Number(newCost) || 0;
      let retail = prev.retail_price;
      if (!retail || Number(retail) <= cost) {
        retail = Math.round(cost * 1.30 * 100) / 100;
      }
      return { ...prev, cost_price: newCost, retail_price: retail };
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">سجل المخزون والأصناف</h2>
          <p className="text-slate-500 text-sm mt-0.5">إدارة بطاقات الأصناف، التكاليف، التسعيرات، وشرائح خصم الكميات</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>إدارة الأقسام والتصنيفات</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="بحث بالاسم، الباركود، أو موقع الرف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          {/* Category dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            >
              <option value="">جميع التصنيفات</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            >
              <option value="latest">الأحدث إضافة</option>
              <option value="stock_asc">الكمية من الأقل للأكثر</option>
              <option value="margin_desc">أعلى نسبة ربح %</option>
              <option value="cost_desc">أعلى تكلفة شراء</option>
            </select>
          </div>

          {/* Low Stock Toggle */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full text-xs font-semibold text-slate-700 select-none hover:bg-slate-100 transition">
              <input
                type="checkbox"
                checked={onlyLowStock}
                onChange={(e) => setOnlyLowStock(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span>عرض النواقص فقط (تحت حد الأمان)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase">
              <tr>
                <th className="px-4 py-3">الصنف / الباركود</th>
                <th className="px-4 py-3">التصنيف</th>
                <th className="px-4 py-3">سعر التكلفة</th>
                <th className="px-4 py-3">سعر البيع (قطاعي)</th>
                <th className="px-4 py-3">هامش الربح %</th>
                <th className="px-4 py-3">خصم الكمية</th>
                <th className="px-4 py-3">الرصيد بالمخزن</th>
                <th className="px-4 py-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400">جاري تحميل الأصناف...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-16">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-base text-slate-700">المخزون فارغ وجاهز لإدخال بياناتك</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                      ابدأ الآن بإضافة أول صنف أو إنشاء أقسامك وتصنيفاتك المخصصة.
                    </p>
                    <button
                      onClick={handleOpenAdd}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة أول صنف الآن</span>
                    </button>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isLow = item.stock_quantity <= item.min_stock_alert;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>{item.barcode || 'بدون باركود'}</span>
                          {item.shelf_location && (
                            <>
                              <span>•</span>
                              <span className="font-sans text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                {item.shelf_location}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {item.category_name || 'عام'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {formatMoney(item.cost_price)}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-700">
                        {formatMoney(item.retail_price)}
                        {item.wholesale_price > 0 && item.wholesale_price !== item.retail_price && (
                          <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                            جملة: {formatMoney(item.wholesale_price)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-0.5 font-bold text-xs ${
                          item.margin_percent >= 30 ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {item.margin_percent}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.discount_min_qty > 0 && item.discount_percent > 0 ? (
                          <div className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-lg">
                            <span className="font-bold">خصم {item.discount_percent}%</span>
                            <span className="block text-slate-600">من {item.discount_min_qty} {item.unit}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                            isLow ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {item.stock_quantity} {item.unit}
                          </span>
                        </div>
                        {isLow && (
                          <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                            حد الأمان: {item.min_stock_alert}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewHistory(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="كارت الصنف والحركات السابقة"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="تعديل بيانات الصنف"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="حذف الصنف"
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

      {/* Categories Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-lg text-slate-900">إدارة الأقسام والتصنيفات</h3>
              </div>
              <button 
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Add New Category Form */}
            <form onSubmit={handleCreateCategory} className="py-4 space-y-3 border-b border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم القسم / التصنيف الجديد *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: إلكترونيات، كماليات، قطع، أجهزة..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={catSaving || !newCatName.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{catSaving ? 'جاري الإضافة...' : 'إضافة القسم'}</span>
                </button>
              </div>
            </form>

            {/* Current Categories List */}
            <div className="py-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">الأقسام الحالية:</h4>
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {categories.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">لا توجد أقسام مسجلة. أضف أول قسم أعلاه.</p>
                ) : (
                  categories.map((c) => (
                    <div key={c.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-800">{c.name}</span>
                        <span className="text-[11px] text-slate-400 block">{c.items_count || 0} صنف مرتبط</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="p-1 text-rose-400 hover:text-rose-600 rounded"
                        title="حذف التصنيف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                تم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                {editingItem ? 'تعديل بيانات الصنف وبطاقته' : 'إضافة صنف جديد إلى المخزون'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 my-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4 mt-4">
              {/* Row 1: Name and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الصنف *</label>
                  <input
                    type="text"
                    required
                    placeholder="اسم الصنف أو المنتج"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">التصنيف</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold"
                    >
                      + تصنيف جديد
                    </button>
                  </div>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">بدون تصنيف (عام)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Barcode, Unit, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الباركود</label>
                  <input
                    type="text"
                    placeholder="امسح الباركود أو اكتبه"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وحدة القياس</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="حبة">حبة</option>
                    <option value="طقم">طقم</option>
                    <option value="كرتون">كرتون</option>
                    <option value="متر">متر</option>
                    <option value="علبة">علبة</option>
                    <option value="درزن">درزن</option>
                    <option value="كيلو">كيلو</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">موقع الرف / المستودع</label>
                  <input
                    type="text"
                    placeholder="مثال: رف A-1 أو درج 2"
                    value={formData.shelf_location}
                    onChange={(e) => setFormData({ ...formData, shelf_location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Row 3: Pricing Engine Fields */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span>بيانات التكلفة والتسعير (بالريال السعودي)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">سعر التكلفة (شراء) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.cost_price}
                      onChange={(e) => handleCostChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">سعر البيع (قطاعي) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.retail_price}
                      onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">سعر الجملة</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="اختياري"
                      value={formData.wholesale_price}
                      onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* Margins preview */}
                {Number(formData.cost_price) > 0 && Number(formData.retail_price) > 0 && (
                  <div className="text-xs text-emerald-700 font-semibold flex items-center gap-2 pt-1">
                    <span>
                      هامش الربح: {(Number(formData.retail_price) - Number(formData.cost_price)).toFixed(2)} ر.س 
                      ({Math.round(((formData.retail_price - formData.cost_price) / formData.cost_price) * 100)}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Row 4: Quantity Discount Tier */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Percent className="w-4 h-4 text-emerald-600" />
                  <span>شريحة خصم الكميات (اختياري)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">الكمية المؤهلة للخصم</label>
                    <input
                      type="number"
                      placeholder="مثلاً: عند شراء 5 حبات"
                      value={formData.discount_min_qty}
                      onChange={(e) => setFormData({ ...formData, discount_min_qty: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">نسبة الخصم %</label>
                    <input
                      type="number"
                      placeholder="مثلاً: 15%"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Stock Quantities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {editingItem ? 'الرصيد الحالي بالمخزن' : 'رصيد أول المدة (المخزون الحالي)'}
                  </label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حد التنبيه (عند نقص الكمية)</label>
                  <input
                    type="number"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
                >
                  {formSaving ? 'جاري الحفظ...' : editingItem ? 'تحديث الصنف' : 'إضافة الصنف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Movement History Modal (كارت الصنف) */}
      {historyItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">كارت الصنف: {historyItem.name}</h3>
                <p className="text-xs text-slate-500 font-mono">باركود: {historyItem.barcode || '—'}</p>
              </div>
              <button 
                onClick={() => { setHistoryItem(null); setHistoryData(null); }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-slate-400 text-sm">جاري جلب حركات وسجلات الصنف...</div>
            ) : historyData ? (
              <div className="space-y-4 my-4">
                <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs">
                  <div>
                    <span className="text-emerald-900 block font-bold">الرصيد الفعلي الحالي:</span>
                    <span className="text-2xl font-extrabold text-emerald-700">{historyData.stock_quantity} {historyData.unit}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-slate-600 block">سعر التكلفة: <strong>{formatMoney(historyData.cost_price)}</strong></span>
                    <span className="text-slate-600 block">سعر البيع: <strong>{formatMoney(historyData.retail_price)}</strong></span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-800 mb-2">سجل الحركات المحاسبية والمخزنية:</h4>
                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {historyData.movements && historyData.movements.length > 0 ? (
                      historyData.movements.map((m) => (
                        <div key={m.id} className="p-2.5 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800 block">{m.notes}</span>
                            <span className="text-[11px] text-slate-400">{m.created_at}</span>
                          </div>
                          <div className="text-left">
                            <span className={`font-bold px-2 py-0.5 rounded-full ${
                              m.quantity_change > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                            </span>
                            <span className="block text-[11px] text-slate-400 mt-0.5">
                              الرصيد بعد الحركة: {m.stock_after}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">لا توجد حركات مسجلة بعد لهذا الصنف</div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => { setHistoryItem(null); setHistoryData(null); }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold"
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

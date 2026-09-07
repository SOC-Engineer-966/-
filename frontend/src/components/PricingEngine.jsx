import React, { useState, useEffect } from 'react';
import { fetchApi, formatMoney, formatNumber } from '../api';
import { 
  Tag, 
  Percent, 
  Calculator, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2, 
  RefreshCw,
  Sliders,
  TrendingUp
} from 'lucide-react';

export default function PricingEngine() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Interactive Calculator State
  const [calcCost, setCalcCost] = useState('100');
  const [calcMargin, setCalcMargin] = useState('35');
  const [calcVat, setCalcVat] = useState('15');

  // Batch Update State
  const [batchCategory, setBatchCategory] = useState('all');
  const [batchAction, setBatchAction] = useState('set_target_margin');
  const [batchValue, setBatchValue] = useState('30');
  const [batchReason, setBatchReason] = useState('تحديث هوامش الربح عبر محرك التسعير');
  const [updating, setUpdating] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, catsRes] = await Promise.all([
        fetchApi('/items?sort_by=cost_desc'),
        fetchApi('/categories')
      ]);
      setItems(itemsRes.data);
      setCategories(catsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Inline Price Update
  const handleUpdatePrice = async (item, newRetail) => {
    try {
      await fetchApi(`/items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...item,
          retail_price: Number(newRetail),
          price_change_reason: 'تعديل سريع من محرك التسعيرات'
        })
      });
      loadData();
    } catch (err) {
      alert('خطأ أثناء تحديث السعر: ' + err.message);
    }
  };

  // Run Batch Update
  const handleBatchUpdate = async (e) => {
    e.preventDefault();
    if (!window.confirm('هل أنت متأكد من تطبيق تعديل الأسعار على الأصناف المحددة؟')) {
      return;
    }

    setUpdating(true);
    setBatchSuccess('');
    try {
      const res = await fetchApi('/pricing/batch-update', {
        method: 'POST',
        body: JSON.stringify({
          category_id: batchCategory,
          action: batchAction,
          percentage: batchAction.includes('pct') ? batchValue : null,
          target_margin: batchAction === 'set_target_margin' ? batchValue : null,
          reason: batchReason
        })
      });

      setBatchSuccess(res.message);
      loadData();
    } catch (err) {
      alert('خطأ أثناء التحديث الجماعي: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Interactive Calculator computations
  const numCost = Number(calcCost) || 0;
  const numMargin = Number(calcMargin) || 0;
  const numVat = Number(calcVat) || 0;

  const calculatedRetailPreTax = Math.round(numCost * (1 + numMargin / 100) * 100) / 100;
  const calculatedVatAmount = Math.round((calculatedRetailPreTax * (numVat / 100)) * 100) / 100;
  const calculatedTotalRetail = calculatedRetailPreTax + calculatedVatAmount;
  const calculatedNetProfit = calculatedRetailPreTax - numCost;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">محرك التسعيرات وهوامش الربح</h2>
        <p className="text-slate-500 text-sm mt-0.5">حاسبة نسب الأرباح، تعديل أسعار التجزئة والجملة، والتسعير الجماعي للتصنيفات</p>
      </div>

      {/* Top 2 Cards: Interactive Margin Simulator & Batch Price Updater */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Interactive Margin Simulator */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">حاسبة تسعير الصنف وهامش الربح</h3>
              <span className="text-[11px] text-slate-400">احسب سعر البيع المقترح فورياً بناءً على التكلفة</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-bold mb-1">سعر التكلفة (ر.س)</label>
              <input
                type="number"
                value={calcCost}
                onChange={(e) => setCalcCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">نسبة الربح المستهدفة %</label>
              <input
                type="number"
                value={calcMargin}
                onChange={(e) => setCalcMargin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-emerald-700"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">الضريبة VAT %</label>
              <input
                type="number"
                value={calcVat}
                onChange={(e) => setCalcVat(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Results Display */}
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">سعر البيع المقترح (قبل الضريبة):</span>
              <span className="font-bold text-slate-900 text-sm">{calculatedRetailPreTax.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">مبلغ ضريبة القيمة المضافة ({numVat}%):</span>
              <span className="font-bold text-slate-700">{calculatedVatAmount.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-emerald-200 text-sm font-extrabold text-emerald-950">
              <span>السعر النهائي للمستهلك (شامل الضريبة):</span>
              <span className="text-lg text-emerald-800 font-black">{calculatedTotalRetail.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-emerald-700 pt-1">
              <span>صافي ربح الحبة الواحدة:</span>
              <span>+{calculatedNetProfit.toFixed(2)} ر.س</span>
            </div>
          </div>
        </div>

        {/* Batch Pricing Updater */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">محرك التعديل الجماعي للأسعار</h3>
              <span className="text-[11px] text-slate-400">تطبيق نسبة ربح أو زيادة/تخفيض على قسم كامل بنقرة واحدة</span>
            </div>
          </div>

          {batchSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{batchSuccess}</span>
            </div>
          )}

          <form onSubmit={handleBatchUpdate} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-bold mb-1">القسم المستهدف</label>
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="all">جميع الأصناف بالمستودع</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">نوع العملية</label>
                <select
                  value={batchAction}
                  onChange={(e) => setBatchAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="set_target_margin">تطبيق نسبة هامش ربح محددة %</option>
                  <option value="increase_retail_pct">زيادة أسعار البيع بنسبة %</option>
                  <option value="decrease_retail_pct">تخفيض أسعار البيع بنسبة %</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-bold mb-1">النسبة المئوية %</label>
                <input
                  type="number"
                  required
                  value={batchValue}
                  onChange={(e) => setBatchValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">سبب التعديل (للتوثيق)</label>
                <input
                  type="text"
                  value={batchReason}
                  onChange={(e) => setBatchReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updating}
              className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm transition"
            >
              {updating ? 'جاري تطبيق التعديل...' : 'تطبيق التحديث الجماعي على الأصناف'}
            </button>
          </form>
        </div>

      </div>

      {/* Items Pricing Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">جدول مراقبة الأسعار وهوامش الربح الحالية</h3>
            <p className="text-[11px] text-slate-500">يمكنك تعديل أي سعر بيع بالضغط في الخانة مباشرة</p>
          </div>
          <button
            onClick={loadData}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase">
              <tr>
                <th className="px-4 py-3">الصنف</th>
                <th className="px-4 py-3">التصنيف</th>
                <th className="px-4 py-3">سعر التكلفة</th>
                <th className="px-4 py-3">سعر البيع قطاعي (قابل للتعديل)</th>
                <th className="px-4 py-3">سعر الجملة</th>
                <th className="px-4 py-3">هامش الربح %</th>
                <th className="px-4 py-3">ربح الحبة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const profitPerUnit = item.retail_price - item.cost_price;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{item.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{item.barcode || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.category_name || 'عام'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatMoney(item.cost_price)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={item.retail_price}
                        onBlur={(e) => {
                          if (Number(e.target.value) !== item.retail_price) {
                            handleUpdatePrice(item, e.target.value);
                          }
                        }}
                        className="w-24 px-2.5 py-1 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-bold text-emerald-800"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatMoney(item.wholesale_price || item.retail_price)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                        item.margin_percent >= 30 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.margin_percent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700">
                      +{profitPerUnit.toFixed(2)} ر.س
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

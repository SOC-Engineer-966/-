import React, { useState, useEffect } from 'react';
import { fetchApi, formatMoney, formatNumber } from '../api';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  Clock, 
  Printer, 
  Download,
  AlertCircle
} from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('valuation');
  const [valuationData, setValuationData] = useState([]);
  const [profitLossData, setProfitLossData] = useState({ dailyData: [], overall: {} });
  const [stagnantItems, setStagnantItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [valRes, plRes, stagRes] = await Promise.all([
        fetchApi('/reports/valuation'),
        fetchApi('/reports/profit-loss'),
        fetchApi('/reports/stagnant')
      ]);
      setValuationData(valRes.data);
      setProfitLossData(plRes.data);
      setStagnantItems(stagRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">التقارير الرقابية والمحاسبية</h2>
          <p className="text-slate-500 text-sm mt-0.5">تقييم المخزون، قائمة الدخل والأرباح، وتحليل حركة وركود الأصناف</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة التقرير المالي</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('valuation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'valuation'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>تقييم المخزون حسب الأقسام</span>
        </button>
        <button
          onClick={() => setActiveTab('profit-loss')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'profit-loss'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>الأرباح وتكلفة البضاعة المباعة (COGS)</span>
        </button>
        <button
          onClick={() => setActiveTab('stagnant')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'stagnant'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>البضاعة الراكدة وبطيئة الحركة</span>
        </button>
      </div>

      {/* Tab 1: Valuation */}
      {activeTab === 'valuation' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">تقرير تقييم البضاعة والمخزون الحالي</h3>
            <p className="text-xs text-slate-500 mt-0.5">مقارنة القيمة بالتكلفة مقابل سعر البيع وهامش الربح المتوقع لكل تصنيف</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">التصنيف</th>
                  <th className="px-4 py-3 text-center">عدد الأصناف</th>
                  <th className="px-4 py-3 text-center">إجمالي القطع</th>
                  <th className="px-4 py-3 text-center">القيمة بسعر التكلفة</th>
                  <th className="px-4 py-3 text-center">القيمة بسعر البيع</th>
                  <th className="px-4 py-3 text-center font-bold text-emerald-700">الأرباح المتوقعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {valuationData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">{row.category_name}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{row.item_count}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-800">{formatNumber(row.total_units)}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-800">{formatMoney(row.total_cost)}</td>
                    <td className="px-4 py-3 text-center font-semibold text-purple-900">{formatMoney(row.total_retail)}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-700">+{formatMoney(row.expected_profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Profit & Loss */}
      {activeTab === 'profit-loss' && (
        <div className="space-y-4">
          {/* Overall Financial Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block">إجمالي الإيرادات (المبيعات)</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {formatMoney(profitLossData.overall?.total_revenue || 0)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block">تكلفة البضاعة المباعة (COGS)</span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">
                {formatMoney(profitLossData.overall?.total_cogs || 0)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-300 bg-emerald-50/50">
              <span className="text-xs text-emerald-800 font-bold block">صافي مجمل الربح</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                +{formatMoney(profitLossData.overall?.gross_profit || 0)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">سجل الأرباح اليومية التفصيلية</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase">
                  <tr>
                    <th className="px-4 py-3">التاريخ</th>
                    <th className="px-4 py-3 text-center">عدد العمليات</th>
                    <th className="px-4 py-3 text-center">إجمالي المبيعات</th>
                    <th className="px-4 py-3 text-center">الخصومات الممنوحة</th>
                    <th className="px-4 py-3 text-center">تكلفة البضاعة COGS</th>
                    <th className="px-4 py-3 text-center font-bold text-emerald-700">مجمل الربح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profitLossData.dailyData && profitLossData.dailyData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">{row.sale_date}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{row.invoices_count}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-900">{formatMoney(row.total_revenue)}</td>
                      <td className="px-4 py-3 text-center text-rose-600">{formatMoney(row.total_discounts)}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{formatMoney(row.total_cogs)}</td>
                      <td className="px-4 py-3 text-center font-extrabold text-emerald-700">+{formatMoney(row.gross_profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Stagnant Items */}
      {activeTab === 'stagnant' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">الأصناف الراكدة (لم تُسجل مبيعات خلال آخر 30 يوماً)</h3>
            <p className="text-xs text-slate-500 mt-0.5">تساعد هذه القائمة على تحديد البضاعة المجمدة لتطبيق تخفيضات أو تصفية لتسييل السيولة</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">الصنف</th>
                  <th className="px-4 py-3">التصنيف</th>
                  <th className="px-4 py-3 text-center">الكمية المجمدة بالمخزن</th>
                  <th className="px-4 py-3 text-center">سعر التكلفة</th>
                  <th className="px-4 py-3 text-center">سعر البيع الحالي</th>
                  <th className="px-4 py-3 text-center font-bold text-rose-700">رأس المال المحبوس</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stagnantItems.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-slate-400">لا توجد بضاعة راكدة حالياً</td></tr>
                ) : (
                  stagnantItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">{item.name}</span>
                        <span className="text-[11px] text-slate-400">{item.barcode || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.category_name}</td>
                      <td className="px-4 py-3 text-center font-bold text-amber-800">{item.stock_quantity} {item.unit}</td>
                      <td className="px-4 py-3 text-center">{formatMoney(item.cost_price)}</td>
                      <td className="px-4 py-3 text-center">{formatMoney(item.retail_price)}</td>
                      <td className="px-4 py-3 text-center font-bold text-rose-700">
                        {formatMoney(item.stock_quantity * item.cost_price)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

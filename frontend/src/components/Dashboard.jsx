import React, { useEffect, useState } from 'react';
import { fetchApi, formatMoney, formatNumber } from '../api';
import { 
  DollarSign, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  Receipt, 
  ClipboardCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  RefreshCw,
  Users
} from 'lucide-react';

export default function Dashboard({ setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-slate-600 font-medium text-sm">جاري تحميل المؤشرات المحاسبية...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 my-6">
        <p className="font-bold mb-1">تعذر تحميل بيانات لوحة التحكم</p>
        <p className="text-sm">{error}</p>
        <button 
          onClick={loadData}
          className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">نظرة عامة للمحاسب</h2>
          <p className="text-slate-500 text-sm mt-0.5">مؤشرات المخزون، ديون العملاء بالسوق، وحركة المبيعات والأرباح</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('customers')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <Users className="w-4 h-4" />
            <span>دفتر ديون العملاء</span>
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <ClipboardCheck className="w-4 h-4 text-emerald-400" />
            <span>جلسة جرد جديدة</span>
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل مبيعات</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 text-xs transition"
            title="تحديث الأرقام"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Cost Stock Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">رأس المال بالمخزون</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-extrabold text-slate-900">{formatMoney(data.totalCostValue)}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              إجمالي {formatNumber(data.totalStockQty)} قطعة
            </p>
          </div>
        </div>

        {/* Total Retail Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">قيمة المخزون (بيع)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-extrabold text-purple-950">{formatMoney(data.totalRetailValue)}</h3>
            <p className="text-[11px] text-purple-700 font-medium mt-1">
              القيمة الإجمالية للبيع
            </p>
          </div>
        </div>

        {/* Market Debt (Receivables) */}
        <div 
          onClick={() => setActiveTab('customers')}
          className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden cursor-pointer hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">ديون العملاء بالسوق</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-black text-amber-950">{formatMoney(data.totalDebtReceivable || 0)}</h3>
            <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
              <span>مبالغ التحصيل بالتقطيع</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>

        {/* Potential Gross Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">مجمل الأرباح المتوقعة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-extrabold text-emerald-600">{formatMoney(data.potentialProfit)}</h3>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              هامش: {data.totalCostValue > 0 ? Math.round((data.potentialProfit / data.totalCostValue) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div 
          onClick={() => setActiveTab('inventory')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden cursor-pointer hover:border-slate-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">النواقص بالمخزن</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-extrabold text-slate-900">{formatNumber(data.lowStockCount)} صنف</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
              <span>تحت حد الأمان</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>
      </div>

      {/* Sales Summary Strip (Today & Month) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-l from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">مبيعات اليوم المسجلة</span>
              <h4 className="text-xl font-bold mt-1 text-emerald-400">{formatMoney(data.todaySales.total)}</h4>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-400 font-medium">صافي ربح مبيعات اليوم</span>
              <h4 className="text-lg font-bold mt-1 text-white">{formatMoney(data.todaySales.profit)}</h4>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
            <span>عدد الفواتير/الكشوفات: {data.todaySales.count}</span>
            <button 
              onClick={() => setActiveTab('sales')}
              className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <span>سجل المبيعات</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-l from-emerald-900 to-teal-900 text-white p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-200 font-medium">مبيعات هذا الشهر</span>
              <h4 className="text-xl font-bold mt-1 text-white">{formatMoney(data.monthSales.total)}</h4>
            </div>
            <div className="text-left">
              <span className="text-xs text-emerald-200 font-medium">مجمل أرباح الشهر</span>
              <h4 className="text-lg font-bold mt-1 text-emerald-300">{formatMoney(data.monthSales.profit)}</h4>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-800/60 flex items-center justify-between text-xs text-emerald-100">
            <span>إجمالي فواتير الشهر: {data.monthSales.count}</span>
            <button 
              onClick={() => setActiveTab('reports')}
              className="text-emerald-200 hover:text-white font-medium flex items-center gap-1"
            >
              <span>كشف الأرباح والخسائر</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Two Columns: Low Stock Warning List + Recent Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Low Stock Items List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-800 text-sm">تنبيهات انخفاض المخزون (تحت الحد الأدنى)</h3>
            </div>
            <button 
              onClick={() => setActiveTab('inventory')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              عرض الكل
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {data.lowStockItems && data.lowStockItems.length > 0 ? (
              data.lowStockItems.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block text-sm">{item.name}</span>
                    <span className="text-slate-400 font-mono text-[11px]">باركود: {item.barcode || '—'}</span>
                  </div>
                  <div className="text-left">
                    <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                      المتبقي: {item.stock_quantity}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">حد الطلب: {item.min_stock_alert}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">
                جميع الأصناف متوفرة بكميات كافية أعلى من حد الأمان.
              </p>
            )}
          </div>
        </div>

        {/* Recent Audits */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold text-slate-800 text-sm">آخر جلسات الجرد وتسوية الفروقات</h3>
            </div>
            <button 
              onClick={() => setActiveTab('audits')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              إدارة الجرد
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {data.recentAudits && data.recentAudits.length > 0 ? (
              data.recentAudits.map((audit) => (
                <div key={audit.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block text-sm">{audit.title}</span>
                    <div className="flex items-center gap-2 mt-0.5 text-slate-400 text-[11px]">
                      <span>{audit.session_code}</span>
                      <span>•</span>
                      <span>{audit.start_date}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      audit.status === 'reconciled' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {audit.status === 'reconciled' ? 'تمت التسوية' : 'قيد الجرد'}
                    </span>
                    {audit.status === 'reconciled' && (
                      <span className={`block text-[11px] font-semibold mt-0.5 ${audit.total_variance_cost < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                        الفرق: {formatMoney(audit.total_variance_cost)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                لا توجد جلسات جرد سابقة. ابدأ جلسة جرد أولى لمطابقة المخزون.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

import { 
  LayoutDashboard, 
  Package, 
  ClipboardCheck, 
  Receipt, 
  BarChart3, 
  Settings,
  Boxes,
  Users,
  LogOut
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, companyName = 'نظام المحاسب الذكي', currentUser, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'inventory', label: 'المخزون والأصناف', icon: Package },
    { id: 'audits', label: 'الجرد والتسويات', icon: ClipboardCheck },
    { id: 'sales', label: 'تسجيل المبيعات', icon: Receipt },
    { id: 'customers', label: 'دفتر العملاء والديون', icon: Users },
    { id: 'reports', label: 'التقارير المحاسبية', icon: BarChart3 },
    { id: 'settings', label: 'الإعدادات والنسخ', icon: Settings },
  ];

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Company Title */}
          <div className="flex items-center gap-3">
            {/* Inventory Icon Logo Badge */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md text-white border border-emerald-400/30">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-white">{companyName}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  ريال سعودي (ر.س)
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Side / Logout Actions */}
          {onLogout && (
            <div className="hidden lg:flex items-center gap-3">
              {currentUser && (
                <div className="flex items-center gap-2 text-xs bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-bold text-slate-200">{currentUser.name || currentUser.username}</span>
                </div>
              )}
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-900/80 border border-rose-800/50 rounded-xl transition cursor-pointer shadow-sm"
                title="تسجيل الخروج وقفل النظام"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            </div>
          )}

        </div>

        {/* Mobile Navigation Scrollable */}
        <div className="lg:hidden flex items-center justify-between gap-1 overflow-x-auto py-2 border-t border-slate-800 no-scrollbar">
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    isActive 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-300 bg-rose-950/60 border border-rose-800/50 rounded-lg shrink-0 ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}

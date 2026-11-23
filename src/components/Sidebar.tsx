import React from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  FilePlus2,
  Receipt,
  Clock,
  History,
  Settings,
  LogOut,
  Building2,
  ChevronRight,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
    { label: 'Products & Stock', path: 'products', icon: Package },
    { label: 'Customers', path: 'customers', icon: Users },
    { label: 'Create Bill', path: 'create-bill', icon: FilePlus2, highlight: true },
    { label: 'Bills', path: 'bills', icon: Receipt },
    { label: 'Pending Dues & Reminders', path: 'pending-payments', icon: Clock },
    { label: 'Rozmel / Cash Book', path: 'rozmel', icon: BookOpen },
    { label: 'Payment Audit', path: 'payment-audit', icon: History },
    { label: 'Settings / Profile', path: 'settings', icon: Settings },
  ];

  const handleItemClick = (path: string) => {
    onNavigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-950/40 text-white shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-white text-sm tracking-tight truncate leading-snug">
              Bhawani Steel &amp; Cement
            </h1>
            <p className="text-[11px] text-amber-500 font-medium tracking-wide uppercase truncate">
              Billing Management
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Main Menu
          </div>

          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;

            if (item.highlight) {
              return (
                <button
                  key={item.path}
                  onClick={() => handleItemClick(item.path)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs tracking-wide transition-all shadow-md ${isActive
                      ? 'bg-amber-600 text-white shadow-amber-950/50'
                      : 'bg-amber-600/15 text-amber-300 border border-amber-500/30 hover:bg-amber-600/25'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200">
                    + New
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => handleItemClick(item.path)}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${isActive
                    ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            );
          })}
        </div>

        {/* User Footer Profile & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 text-xs font-bold border border-slate-700/80 shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {user?.name || 'Administrator'}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{user?.email || 'admin'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Log out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-1"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

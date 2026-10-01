import React from 'react';
import { Menu, Plus, Clock, Building2 } from 'lucide-react';

interface NavbarProps {
  title: string;
  onOpenMobileMenu: () => void;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  onOpenMobileMenu,
  onNavigate,
}) => {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 md:px-8">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 md:hidden transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center text-white">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div>
            <h1 className="text-base md:text-lg font-bold text-white tracking-tight">
              {title}
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Steel Sariya &amp; Cement Management Portal • {currentDate}
            </p>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onNavigate('pending-payments')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Pending Balance</span>
          </button>

          <button
            onClick={() => onNavigate('create-bill')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-950/50 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Bill</span>
          </button>
        </div>
      </div>
    </header>
  );
};

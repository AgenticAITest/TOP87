import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminBackdrop, qk } from '../lib/queries';
import { Outlet, NavLink, Link, Navigate } from 'react-router-dom';
import { Users, Image, LayoutDashboard, FileText, Globe, ChevronRight, ChevronLeft, ChevronDown, LogOut, BookOpen, ShieldCheck, PenSquare, CreditCard, ShoppingBag, Package, BarChart3, CircleHelp, Sun, Moon, Landmark, Building2, HeartHandshake, Receipt, ListChecks } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { useTheme } from '../contexts/ThemeContext';
import HelpModal from '../components/HelpModal';

const adminLinks = [
  { to: '/admin',         label: 'Dashboard',  icon: LayoutDashboard, end: true  },
  { to: '/admin/members', label: 'Members',    icon: Users,           end: false },
  { to: '/admin/cms',     label: 'Charter CMS',icon: FileText,        end: false },
];

const superAdminLinks = [
  { to: '/admin/site',        label: 'Site Settings',  icon: Globe,         end: false },
  { to: '/admin/site-cms',    label: 'Site CMS',       icon: PenSquare,     end: false },
  { to: '/admin/content',     label: 'Content',        icon: BookOpen,      end: false },
  { to: '/admin/all-members', label: 'All Members',    icon: Users,         end: false },
  { to: '/admin/roster',      label: 'Pemetaan Roster',icon: ListChecks,    end: false },
  { to: '/admin/roles',       label: 'Admin Roles',    icon: ShieldCheck,   end: false },
  { to: '/admin/charters',    label: 'Charters',       icon: Building2,     end: false },
  { to: '/admin/media',       label: 'Media Queue',    icon: Image,         end: false },
  { to: '/admin/payments',    label: 'Pembayaran',     icon: CreditCard,    end: false },
  { to: '/admin/merchandise', label: 'Merchandise',    icon: ShoppingBag,   end: false },
  { to: '/admin/orders',      label: 'Pesanan',        icon: Package,       end: false },
  { to: '/admin/bank-rekon',  label: 'Bank Rekon',     icon: Landmark,      end: false },
  { to: '/admin/financial',   label: 'Lap. Keuangan',  icon: BarChart3,     end: false },
  { to: '/admin/keringanan',  label: 'Permintaan Anggota', icon: HeartHandshake, end: false },
  { to: '/admin/expenses',    label: 'Pengeluaran',    icon: Receipt,       end: false },
];

const financeOnlyLinks = [
  { to: '/admin/bank-rekon', label: 'Bank Rekon',     icon: Landmark,  end: false },
  { to: '/admin/financial',  label: 'Lap. Keuangan',  icon: BarChart3, end: false },
];

export default function AdminLayout() {
  const { user, profile, signOut } = useAuth();
  const { isAdmin, isSuperAdmin, isFinanceAdmin, loading } = useAdminStatus();
  const { theme, toggleTheme } = useTheme();
  const [helpOpen,        setHelpOpen]        = useState(false);
  const [collapsed,       setCollapsed]       = useState(() => localStorage.getItem('admin-sidebar-collapsed') === 'true');
  const [charterExpanded, setCharterExpanded] = useState(() => localStorage.getItem('admin-charter-expanded') !== 'false');
  const [superExpanded,   setSuperExpanded]   = useState(() => localStorage.getItem('admin-super-expanded') !== 'false');

  function toggle() {
    setCollapsed(v => {
      const next = !v;
      localStorage.setItem('admin-sidebar-collapsed', String(next));
      return next;
    });
  }

  const { data: backdrop } = useQuery({
    queryKey: qk.adminBackdrop(),
    queryFn:  fetchAdminBackdrop,
    staleTime: 1000 * 60 * 5,
  });
  const backdropUrl     = backdrop?.url     ?? '';
  const backdropOpacity = backdrop?.opacity ?? 15;

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center text-gray-600 text-sm tracking-widest uppercase">
        Loading…
      </div>
    );
  }

  if (!user || (!isAdmin && !isFinanceAdmin)) {
    return <Navigate to="/" replace />;
  }

  const financeOnly = isFinanceAdmin && !isAdmin;
  const avatarUrl   = profile?.avatar_url ?? user.user_metadata?.avatar_url;
  const displayName = profile?.name ?? user.user_metadata?.full_name ?? 'Admin';

  const sidebarW = collapsed ? 'w-14' : 'w-60';
  const contentL = collapsed ? 'ml-14' : 'ml-60';
  const backdropL = collapsed ? 'left-14' : 'left-60';

  function navLinkClass(isActive: boolean) {
    return `flex items-center ${collapsed ? 'justify-center px-1' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm transition-all group ${
      isActive ? 'bg-gold/10 text-gold border border-gold/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`;
  }

  function renderLinks(links: typeof adminLinks) {
    return links.map(({ to, label, icon: Icon, end }) => (
      <NavLink key={to} to={to} end={end} title={collapsed ? label : undefined}
        className={({ isActive }) => navLinkClass(isActive)}>
        <Icon size={16} className="shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{label}</span>
            <ChevronRight size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />
          </>
        )}
      </NavLink>
    ));
  }

  return (
    <div className="flex min-h-screen bg-charcoal selection:bg-gold selection:text-charcoal overflow-x-hidden">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full ${sidebarW} bg-navy/60 border-r border-white/5 flex flex-col z-40 transition-[width] duration-200 overflow-hidden`}>
        {/* Logo */}
        <Link to="/" className={`flex items-center border-b border-white/5 group ${collapsed ? 'justify-center px-2 py-5' : 'gap-3 px-5 py-5'}`}>
          <img src="/logo.png" alt="TOP87" className="w-9 h-9 object-contain shrink-0" />
          {!collapsed && (
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-widest">Class of '87</p>
              <p className="text-[10px] text-gold/60 uppercase tracking-widest">Admin Panel</p>
            </div>
          )}
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {financeOnly ? (
            <>
              {!collapsed && <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-gray-600">Finance</p>}
              {renderLinks(financeOnlyLinks)}
            </>
          ) : (
            <>
              {/* Charter Admin section */}
              {!collapsed ? (
                <button
                  onClick={() => { setCharterExpanded(v => { const n = !v; localStorage.setItem('admin-charter-expanded', String(n)); return n; }); }}
                  className="w-full flex items-center justify-between px-3 mb-2 group"
                >
                  <span className="text-[10px] uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors">Charter Admin</span>
                  <ChevronDown size={10} className={`text-gray-600 transition-transform duration-150 ${charterExpanded ? '' : '-rotate-90'}`} />
                </button>
              ) : (
                <div className="my-1 border-t border-white/5" />
              )}
              {charterExpanded && renderLinks(adminLinks)}

              {isSuperAdmin && (
                <>
                  {!collapsed ? (
                    <button
                      onClick={() => { setSuperExpanded(v => { const n = !v; localStorage.setItem('admin-super-expanded', String(n)); return n; }); }}
                      className="w-full flex items-center justify-between px-3 mt-5 mb-2 group"
                    >
                      <span className="text-[10px] uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors">Super Admin</span>
                      <ChevronDown size={10} className={`text-gray-600 transition-transform duration-150 ${superExpanded ? '' : '-rotate-90'}`} />
                    </button>
                  ) : (
                    <div className="my-2 border-t border-white/5" />
                  )}
                  {superExpanded && renderLinks(superAdminLinks)}
                </>
              )}
            </>
          )}

          {/* Collapse toggle */}
          <div className={`mt-4 pt-3 border-t border-white/5 flex ${collapsed ? 'justify-center' : 'justify-end pr-1'}`}>
            <button
              onClick={toggle}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-2 rounded-lg text-gray-600 hover:text-gold hover:bg-white/5 transition-all"
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-white/5">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2 py-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover" title={displayName} />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center" title={displayName}>
                  <span className="text-xs font-bold text-gold">{displayName.charAt(0)}</span>
                </div>
              )}
              <button onClick={signOut} title="Sign out"
                className="text-gray-600 hover:text-red-400 transition-colors p-1">
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-gold">{displayName.charAt(0)}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{displayName}</p>
                  <p className="text-[10px] text-gold/60 uppercase tracking-widest">
                    {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Charter Admin' : 'Finance Admin'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to="/" className="flex-1 text-center text-[10px] uppercase tracking-widest text-gray-600 hover:text-gold transition-colors py-1">
                  ← Site
                </Link>
                <button
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-gray-600 hover:text-gold transition-colors py-1 px-2"
                >
                  {theme === 'dark' ? <Sun size={10} /> : <Moon size={10} />}
                </button>
                <button
                  onClick={() => setHelpOpen(true)}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-gray-600 hover:text-gold transition-colors py-1 px-2"
                  title="Panduan Pengguna"
                >
                  <CircleHelp size={10} /> Help
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-gray-600 hover:text-red-400 transition-colors py-1 px-2"
                >
                  <LogOut size={10} /> Out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 ${contentL} min-h-screen relative transition-all duration-200`}>
        {backdropUrl && (
          <>
            <div
              className={`fixed inset-y-0 right-0 ${backdropL} bg-cover bg-center transition-all duration-200`}
              style={{ backgroundImage: `url(${backdropUrl})`, zIndex: -2 }}
            />
            <div
              className={`fixed inset-y-0 right-0 ${backdropL} transition-all duration-200`}
              style={{ backgroundColor: `rgba(10, 10, 10, ${backdropOpacity / 100})`, zIndex: -1 }}
            />
          </>
        )}
        <Outlet />
      </div>

      <HelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        isSuperAdmin={isSuperAdmin}
        isCharterAdmin={isAdmin && !isSuperAdmin}
      />
    </div>
  );
}

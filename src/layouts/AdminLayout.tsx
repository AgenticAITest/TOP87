import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminBackdrop, qk } from '../lib/queries';
import { Outlet, NavLink, Link, Navigate } from 'react-router-dom';
import { Users, Image, LayoutDashboard, FileText, Globe, ChevronRight, LogOut, BookOpen, ShieldCheck, PenSquare, CreditCard, ShoppingBag, Package, BarChart3, CircleHelp, Sun, Moon, Landmark, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { useTheme } from '../contexts/ThemeContext';
import HelpModal from '../components/HelpModal';

const adminLinks = [
  { to: '/admin',            label: 'Dashboard',   icon: LayoutDashboard, end: true  },
  { to: '/admin/members',    label: 'Members',      icon: Users,           end: false },
  { to: '/admin/media',      label: 'Media Queue',  icon: Image,           end: false },
  { to: '/admin/cms',        label: 'Charter CMS',  icon: FileText,        end: false },
  { to: '/admin/payments',     label: 'Pembayaran',   icon: CreditCard,   end: false },
  { to: '/admin/merchandise',  label: 'Merchandise',  icon: ShoppingBag,  end: false },
  { to: '/admin/orders',       label: 'Pesanan',      icon: Package,      end: false },
];

const superAdminLinks = [
  { to: '/admin/site',        label: 'Site Settings',  icon: Globe,       end: false },
  { to: '/admin/site-cms',    label: 'Site CMS',       icon: PenSquare,   end: false },
  { to: '/admin/content',     label: 'Content',        icon: BookOpen,    end: false },
  { to: '/admin/all-members', label: 'All Members',    icon: Users,       end: false },
  { to: '/admin/roles',       label: 'Admin Roles',    icon: ShieldCheck, end: false },
  { to: '/admin/charters',    label: 'Charters',       icon: Building2,   end: false },
  { to: '/admin/bank-rekon',  label: 'Bank Rekon',     icon: Landmark,    end: false },
  { to: '/admin/financial',   label: 'Lap. Keuangan',  icon: BarChart3,   end: false },
];

const financeOnlyLinks = [
  { to: '/admin/bank-rekon', label: 'Bank Rekon',     icon: Landmark,  end: false },
  { to: '/admin/financial',  label: 'Lap. Keuangan',  icon: BarChart3, end: false },
];

export default function AdminLayout() {
  const { user, profile, signOut } = useAuth();
  const { isAdmin, isSuperAdmin, isFinanceAdmin, loading } = useAdminStatus();
  const { theme, toggleTheme } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);

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

  return (
    <div className="flex min-h-screen bg-charcoal selection:bg-gold selection:text-charcoal overflow-x-hidden">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-60 bg-navy/60 border-r border-white/5 flex flex-col z-40">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 px-5 py-5 border-b border-white/5 group">
          <img src="/logo.png" alt="TOP87" className="w-9 h-9 object-contain" />
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">Class of '87</p>
            <p className="text-[10px] text-gold/60 uppercase tracking-widest">Admin Panel</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {financeOnly ? (
            <>
              <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-gray-600">Finance</p>
              {financeOnlyLinks.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${isActive ? 'bg-gold/10 text-gold border border-gold/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
                }>
                  <Icon size={16} /><span className="flex-1">{label}</span>
                  <ChevronRight size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                </NavLink>
              ))}
            </>
          ) : (
            <>
              <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-gray-600">Charter Admin</p>
              {adminLinks.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${isActive ? 'bg-gold/10 text-gold border border-gold/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
                }>
                  <Icon size={16} /><span className="flex-1">{label}</span>
                  <ChevronRight size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                </NavLink>
              ))}

              {isSuperAdmin && (
                <>
                  <p className="px-3 mt-6 mb-2 text-[10px] uppercase tracking-widest text-gray-600">Super Admin</p>
                  {superAdminLinks.map(({ to, label, icon: Icon, end }) => (
                    <NavLink key={to} to={to} end={end} className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${isActive ? 'bg-gold/10 text-gold border border-gold/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
                    }>
                      <Icon size={16} /><span className="flex-1">{label}</span>
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                    </NavLink>
                  ))}
                </>
              )}
            </>
          )}
        </nav>

        {/* Current user footer */}
        <div className="px-4 py-4 border-t border-white/5 space-y-3">
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
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-60 min-h-screen relative">
        {backdropUrl && (
          <>
            <div
              className="fixed inset-y-0 right-0 left-60 bg-cover bg-center"
              style={{ backgroundImage: `url(${backdropUrl})`, zIndex: -2 }}
            />
            <div
              className="fixed inset-y-0 right-0 left-60"
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

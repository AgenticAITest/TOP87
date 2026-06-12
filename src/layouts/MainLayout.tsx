import { useState, Fragment, type ElementType } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, ShoppingBag, Heart, Megaphone, HelpCircle,
  Users, Image as ImageIcon, MapPin, BookOpen, Bell, LogOut, Menu, X,
  ShieldCheck, Info, CircleHelp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import Footer from '../components/Footer';
import HelpModal from '../components/HelpModal';

const coreNav = [
  { to: '/home',       label: 'Dashboard',               icon: LayoutDashboard, end: true  },
  { to: '/anggaran',   label: 'Anggaran & Transparansi',  icon: Receipt,         end: false },
  { to: '/pengumuman', label: 'Pengumuman',               icon: Megaphone,       end: false },
  { to: '/faq',        label: 'FAQ',                      icon: HelpCircle,      end: false },
];

const communityNav = [
  { to: '/directory',     label: 'Directory',    icon: Users      },
  { to: '/gallery',       label: 'Gallery',      icon: ImageIcon  },
  { to: '/charters',      label: 'Charters',     icon: MapPin     },
  { to: '/yearbook/2026', label: 'Yearbook',     icon: BookOpen   },
  { to: '/about',         label: 'Tentang Kami', icon: Info       },
];

function NavItem({
  to, label, icon: Icon, end, onClick,
}: {
  to: string; label: string; icon: ElementType; end?: boolean; onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 rounded-md text-sm transition-all relative z-10 ${
          isActive
            ? 'bg-white/10 text-white font-medium'
            : 'text-gray-300 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <Icon className="w-5 h-5 mr-3 shrink-0 text-gold/70" />
      <span>{label}</span>
    </NavLink>
  );
}

function SidebarInner({ onClose }: { onClose?: () => void }) {
  const { user, profile, signOut, signInWithGoogle } = useAuth();
  const { isAdmin } = useAdminStatus();
  const { data: flags } = useFeatureFlags();
  const navigate = useNavigate();

  const avatarUrl   = profile?.avatar_url ?? user?.user_metadata?.avatar_url;
  const displayName = profile?.name ?? user?.user_metadata?.full_name ?? 'Tamu';
  const isApproved  = profile?.status === 'approved';

  return (
    <>
      {/* Brand */}
      <div className="p-8 text-center flex flex-col items-center border-b border-green-900/50 relative z-10">
        <div className="w-20 h-20 rounded-full border-2 border-gold/60 flex items-center justify-center mb-4">
          <div>
            <div className="text-xl font-bold text-gold font-serif leading-none">TOP87</div>
            <div className="text-[8px] uppercase tracking-tighter text-gold/70 mt-0.5">ALUMNI ASSOC.</div>
          </div>
        </div>
        <h2 className="font-serif text-base font-bold text-gold tracking-widest uppercase leading-tight">
          Reuni 40 Tahun
        </h2>
        <p className="text-xs font-medium tracking-widest text-white/60 mt-1">TOP87</p>
      </div>

      {/* Navigation */}
      <nav className="flex-grow px-4 py-6 space-y-0.5 overflow-y-auto relative z-10">
        {coreNav.map(item => (
          <Fragment key={item.to}>
            <NavItem to={item.to} label={item.label} icon={item.icon} end={item.end} onClick={onClose} />
          </Fragment>
        ))}

        {flags?.donations && (
          <NavItem to="/payments" label="Donasi" icon={Heart} onClick={onClose} />
        )}
        {flags?.merchandise && (
          <NavItem to="/merchandise" label="Merchandise" icon={ShoppingBag} onClick={onClose} />
        )}

        {isApproved && (
          <>
            <div className="pt-5 pb-2 px-4">
              <p className="text-[10px] uppercase tracking-widest text-white/30">Komunitas</p>
            </div>
            {communityNav.map(item => (
              <Fragment key={item.to}>
                <NavItem to={item.to} label={item.label} icon={item.icon} onClick={onClose} />
              </Fragment>
            ))}
          </>
        )}

        {isAdmin && (
          <div className="pt-4">
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-md text-sm transition-all relative z-10 ${
                  isActive
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'text-gold/70 hover:bg-gold/5 hover:text-gold'
                }`
              }
            >
              <ShieldCheck className="w-5 h-5 mr-3 shrink-0" />
              <span>Admin Panel</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="mt-auto p-4 space-y-3 border-t border-green-900/50 relative z-10">
        {user ? (
          <>
            <div className="bg-black/20 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center min-w-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full border border-gold/50 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center shrink-0 border border-gold/50">
                    <span className="text-sm font-bold text-gold">{displayName.charAt(0)}</span>
                  </div>
                )}
                <div className="ml-3 min-w-0">
                  <p className="text-[10px] text-gray-400">Pengguna:</p>
                  <p className="text-sm font-semibold text-white truncate max-w-[120px]">{displayName}</p>
                </div>
              </div>
              <Bell className="w-5 h-5 text-gold shrink-0 ml-2" />
            </div>

            {flags?.donations && (
              <Link
                to="/payments"
                onClick={onClose}
                className="btn-primary w-full py-2 px-4 rounded font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
              >
                <Heart className="w-4 h-4" />
                Donasi Sekarang
              </Link>
            )}

            <div className="flex justify-center text-[10px] text-gray-500 space-x-4">
              <Link to="/profile" onClick={onClose} className="hover:text-gray-300 transition-colors">
                Profil
              </Link>
              <button
                onClick={() => { signOut(); onClose?.(); navigate('/'); }}
                className="hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" />
                Keluar
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => { signInWithGoogle(); onClose?.(); }}
            className="btn-primary w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-wider"
          >
            Masuk dengan Google
          </button>
        )}
      </div>
    </>
  );
}

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen,   setHelpOpen]   = useState(false);
  const { isSuperAdmin, isAdmin: isCharterAdmin } = useAdminStatus();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — sticky, never scrolls with page */}
      <aside className="sidebar-bg w-64 flex-shrink-0 text-white flex-col border-r border-green-900 sticky top-0 h-screen overflow-y-auto z-10 hidden md:flex">
        <SidebarInner />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="sidebar-bg absolute left-0 top-0 h-full w-64 text-white flex flex-col border-r border-green-900 overflow-y-auto">
            <div className="absolute top-4 right-4 z-20">
              <button onClick={() => setMobileOpen(false)} className="text-white/60 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarInner onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-grow parchment-bg min-h-screen overflow-x-hidden">
        {/* Mobile topbar */}
        <div
          className="md:hidden sticky top-0 z-40 border-b border-green-900 px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: '#0d2b1f' }}
        >
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold text-gold font-serif">TOP87</div>
            <div className="text-[10px] text-gold/50 uppercase tracking-widest hidden sm:block">
              Reuni 40 Tahun
            </div>
          </div>
          <button onClick={() => setMobileOpen(true)} className="text-white p-1">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <Outlet />
        <Footer />
      </main>

      {/* Floating help button */}
      <button
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-all flex items-center justify-center shadow-lg"
        title="Panduan Pengguna"
      >
        <CircleHelp size={18} />
      </button>

      <HelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        isSuperAdmin={isSuperAdmin}
        isCharterAdmin={isCharterAdmin && !isSuperAdmin}
      />
    </div>
  );
}

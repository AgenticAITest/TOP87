import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, LogOut, User, ShieldCheck, Upload, BookOpen, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect, RefObject } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAdminStatus } from '../hooks/useAdminStatus';

const navLinks = [
  { label: 'Directory', to: '/directory' },
  { label: 'Charters',  to: '/charters'  },
  { label: 'Gallery',   to: '/gallery'   },
  { label: 'About',     to: '/about'     },
];

const yearbookLinks = [
  { label: '1987 Yearbook', to: '/yearbook/1987' },
  { label: '2026 Yearbook', to: '/yearbook/2026' },
];

function useOutsideClick(ref: RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose]);
}

export default function Navbar() {
  const { user, profile, loading, signInWithGoogle, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const [isOpen,        setIsOpen]        = useState(false);
  const [dropdownOpen,  setDropdown]      = useState(false);
  const [yearbookOpen,  setYearbookOpen]  = useState(false);
  const [mobileYearbook, setMobileYearbook] = useState(false);
  const dropdownRef  = useRef<HTMLDivElement>(null);
  const yearbookRef  = useRef<HTMLDivElement>(null);

  useOutsideClick(dropdownRef, () => setDropdown(false));
  useOutsideClick(yearbookRef, () => setYearbookOpen(false));

  const avatarUrl   = profile?.avatar_url ?? user?.user_metadata?.avatar_url;
  const displayName = profile?.name ?? user?.user_metadata?.full_name ?? 'Member';

  const dropdownVariants = {
    hidden: { opacity: 0, y: 8, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass px-6 py-3 rounded-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group cursor-pointer">
          <div className="relative w-13 h-13 flex items-center justify-center">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-md group-hover:bg-gold/30 transition-all" />
            <img src="/logo.png" alt="TOP87 Logo"
              className="relative w-13 h-13 object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
          </div>
          <span className="font-serif text-xl font-bold tracking-tight text-white uppercase italic">
            Class <span className="text-gold">of</span> '87
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, to }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `text-sm font-medium uppercase tracking-widest transition-colors ${isActive ? 'text-gold' : 'text-gray-300 hover:text-gold'}`
              }>
              {label}
            </NavLink>
          ))}

          {/* Yearbook dropdown */}
          <div className="relative" ref={yearbookRef}>
            <button
              onClick={() => setYearbookOpen(o => !o)}
              className={`flex items-center gap-1 text-sm font-medium uppercase tracking-widest transition-colors ${
                yearbookOpen ? 'text-gold' : 'text-gray-300 hover:text-gold'
              }`}>
              Yearbook
              <ChevronDown size={12} className={`transition-transform duration-200 ${yearbookOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {yearbookOpen && (
                <motion.div
                  initial="hidden" animate="visible" exit="hidden"
                  variants={dropdownVariants}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 -translate-x-1/2 mt-3 w-44 glass rounded-2xl py-2 shadow-xl border border-white/10">
                  {yearbookLinks.map(({ label, to }) => (
                    <Link key={to} to={to} onClick={() => setYearbookOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                      <BookOpen size={13} className="text-gold/50 shrink-0" /> {label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {user && (
            <NavLink to="/mengenang"
              className={({ isActive }) =>
                `text-sm font-medium uppercase tracking-widest transition-colors ${isActive ? 'text-gold' : 'text-gray-300 hover:text-gold'}`
              }>
              In Memoriam
            </NavLink>
          )}

          {/* Auth area */}
          {loading ? (
            <div className="w-24 h-8 rounded-full bg-white/5 animate-pulse" />
          ) : !user ? (
            <button onClick={signInWithGoogle}
              className="glass-gold px-5 py-1.5 rounded-full text-sm font-medium text-gold hover:bg-gold hover:text-charcoal transition-all duration-300">
              Sign In
            </button>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setDropdown(o => !o)}
                className="flex items-center gap-2 glass px-3 py-1.5 rounded-full hover:border-gold/30 transition-all">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                    <User size={12} className="text-gold" />
                  </div>
                )}
                <span className="text-sm text-white max-w-[100px] truncate">{displayName}</span>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial="hidden" animate="visible" exit="hidden"
                    variants={dropdownVariants}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 glass rounded-2xl py-2 shadow-xl border border-white/10">
                    <Link to="/profile" onClick={() => setDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                      <User size={14} /> My Profile
                    </Link>
                    {profile?.status === 'approved' && (
                      <Link to="/submit" onClick={() => setDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                        <Upload size={14} /> Submit Media
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gold hover:bg-gold/5 transition-colors">
                        <ShieldCheck size={14} /> Admin Panel
                      </Link>
                    )}
                    <div className="my-1 border-t border-white/5" />
                    <button onClick={() => { signOut(); setDropdown(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-white p-1" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="md:hidden mt-4 glass p-6 rounded-2xl flex flex-col gap-4">
          {navLinks.map(({ label, to }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `text-lg font-medium transition-colors ${isActive ? 'text-gold' : 'text-gray-300 hover:text-gold'}`
              }
              onClick={() => setIsOpen(false)}>
              {label}
            </NavLink>
          ))}

          {/* Mobile Yearbook expand */}
          <div>
            <button onClick={() => setMobileYearbook(o => !o)}
              className="flex items-center gap-2 text-lg font-medium text-gray-300 hover:text-gold transition-colors w-full">
              Yearbook
              <ChevronDown size={14} className={`transition-transform duration-200 ${mobileYearbook ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {mobileYearbook && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden pl-4 mt-2 space-y-2">
                  {yearbookLinks.map(({ label, to }) => (
                    <Link key={to} to={to} onClick={() => { setIsOpen(false); setMobileYearbook(false); }}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-gold transition-colors py-1">
                      <BookOpen size={12} className="text-gold/50" /> {label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {user && (
            <NavLink to="/mengenang"
              className={({ isActive }) =>
                `text-lg font-medium transition-colors ${isActive ? 'text-gold' : 'text-gray-300 hover:text-gold'}`
              }
              onClick={() => setIsOpen(false)}>
              In Memoriam
            </NavLink>
          )}

          {!user ? (
            <button onClick={() => { signInWithGoogle(); setIsOpen(false); }}
              className="glass-gold py-3 rounded-xl text-gold font-medium text-center">
              Sign In with Google
            </button>
          ) : (
            <>
              <Link to="/profile" onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-lg font-medium text-gray-300 hover:text-gold transition-colors">
                <User size={18} /> My Profile
              </Link>
              {profile?.status === 'approved' && (
                <Link to="/submit" onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 text-lg font-medium text-gray-300 hover:text-gold transition-colors">
                  <Upload size={18} /> Submit Media
                </Link>
              )}
              <div className="border-t border-white/5 pt-2">
                <button onClick={() => { signOut(); setIsOpen(false); }}
                  className="flex items-center gap-3 text-sm font-medium text-gray-500 hover:text-red-400 transition-colors">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </nav>
  );
}

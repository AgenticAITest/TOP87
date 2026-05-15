import { motion } from 'motion/react';
import { Clock, XCircle, ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Pending() {
  const { profile, signOut } = useAuth();

  const config = {
    rejected: {
      icon: <XCircle size={24} className="text-red-400/70" />,
      label: 'Application Rejected',
      title: 'We\'re sorry.',
      body:  'Your membership application was not approved. Please contact a charter admin if you believe this is a mistake.',
      color: 'border-red-500/20',
    },
    suspended: {
      icon: <ShieldOff size={24} className="text-orange-400/70" />,
      label: 'Account Suspended',
      title: 'Access suspended.',
      body:  'Your account has been suspended. Please contact your charter admin for more information.',
      color: 'border-orange-500/20',
    },
    pending: {
      icon: <Clock size={24} className="text-gold/60" />,
      label: 'Membership Pending',
      title: 'Hang tight.',
      body:  'Your registration has been received. Your charter admin will review and approve your membership shortly.',
      color: 'border-gold/20',
    },
  };

  const status = (profile?.status as keyof typeof config) ?? 'pending';
  const { icon, label, title, body, color } = config[status] ?? config.pending;

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-lg"
      >
        <div className={`w-16 h-16 rounded-full border glass ${color} flex items-center justify-center mx-auto mb-8`}>
          {icon}
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-4">{label}</p>
        <h1 className="font-serif text-5xl font-bold text-white mb-4">{title}</h1>
        <p className="text-gray-500 leading-relaxed text-sm">{body}</p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="text-xs uppercase tracking-widest text-gray-600 hover:text-gold transition-colors py-2">
            ← Back to home
          </Link>
          <button
            onClick={signOut}
            className="text-xs uppercase tracking-widest text-gray-600 hover:text-red-400 transition-colors py-2"
          >
            Sign out
          </button>
        </div>
      </motion.div>
    </div>
  );
}

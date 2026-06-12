import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Package, CheckCircle, Clock, XCircle, Truck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchMyOrders, qk } from '../lib/queries';

import type { LucideProps } from 'lucide-react';
type IconComponent = (props: LucideProps) => unknown;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: IconComponent }> = {
  submitted:      { label: 'Dikirim',      color: 'bg-blue-100 text-blue-700',     icon: Clock        },
  pending_review: { label: 'Diproses',     color: 'bg-yellow-100 text-yellow-700', icon: Clock        },
  confirmed:      { label: 'Dikonfirmasi', color: 'bg-green-100 text-green-700',   icon: CheckCircle  },
  rejected:       { label: 'Ditolak',      color: 'bg-red-100 text-red-700',       icon: XCircle      },
  shipped:        { label: 'Dikirimkan',   color: 'bg-purple-100 text-purple-700', icon: Truck        },
};

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function MyOrdersPage() {
  const { profile } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: qk.orders(profile?.id ?? ''),
    queryFn:  () => fetchMyOrders(profile!.id),
    enabled:  !!profile?.id,
  });

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-700/70 mb-1">Member</p>
        <h1 className="font-serif text-4xl font-bold text-gray-900">Pesanan Saya</h1>
        <p className="text-gray-500 text-sm mt-1">Riwayat pemesanan merchandise.</p>
      </div>

      <div className="mb-6">
        <Link
          to="/merchandise"
          className="text-sm text-amber-700 hover:text-amber-600 transition-colors"
        >
          ← Kembali ke Katalog
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-xs uppercase tracking-widest animate-pulse">
          Memuat…
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 text-sm">Belum ada pesanan.</p>
          <Link
            to="/merchandise"
            className="text-xs text-amber-600 mt-2 inline-block hover:underline underline-offset-2"
          >
            Lihat katalog merchandise →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o, i) => {
            const cfg        = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.submitted;
            const Icon       = cfg.icon;
            const displayAmt = o.admin_adjusted_amount ?? o.member_amount;
            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card flex items-center gap-4 p-4 rounded-xl shadow-sm"
              >
                {o.merchandise?.image_url ? (
                  <img
                    src={o.merchandise.image_url}
                    alt={o.merchandise.name ?? ''}
                    className="w-12 h-12 rounded-lg object-cover shrink-0 border border-amber-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                    <Package size={20} className="text-amber-500" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {o.merchandise?.name ?? '—'}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {o.quantity}× {formatRp(displayAmt)}
                    {o.admin_adjusted_amount && o.admin_adjusted_amount !== o.member_amount && (
                      <span className="ml-1.5 line-through text-gray-300 text-[10px]">
                        {formatRp(o.member_amount)}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(o.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {o.receipt_url && (
                    <a
                      href={o.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all border border-amber-200"
                      title="Lihat bukti"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${cfg.color}`}>
                    <Icon size={11} />
                    {cfg.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

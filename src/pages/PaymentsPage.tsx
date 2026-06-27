import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { CreditCard, CheckCircle, Clock, XCircle, Receipt, ExternalLink, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchMyPayments, fetchMemberIuranPaid, qk, type Payment } from '../lib/queries';
import QRISModal from '../components/QRISModal';

type Tab = 'reunion_fee' | 'donation';

const STATUS_CONFIG = {
  submitted:      { label: 'Dikirim',       color: 'bg-blue-100 text-blue-700',   icon: Clock },
  pending_review: { label: 'Diproses',      color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmed:      { label: 'Dikonfirmasi',  color: 'bg-green-100 text-green-700', icon: CheckCircle },
  bank_reconciled:{ label: 'Dikonfirmasi',  color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected:       { label: 'Ditolak',       color: 'bg-red-100 text-red-700',     icon: XCircle },
};

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function PaymentsPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [tab,       setTab]       = useState<Tab>('reunion_fee');
  const [showModal, setShowModal] = useState(false);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: qk.payments(profile?.id ?? ''),
    queryFn:  () => fetchMyPayments(profile!.id),
    enabled:  !!profile?.id,
  });

  const { data: iuranPaid = false } = useQuery({
    queryKey: qk.memberIuranPaid(profile?.id ?? ''),
    queryFn:  () => fetchMemberIuranPaid(profile!.id),
    enabled:  !!profile?.id,
  });

  const filtered = payments.filter(p => p.type === tab);

  // Total submitted by member (all non-rejected)
  const totalSubmitted = filtered
    .filter(p => p.status !== 'rejected')
    .reduce((s, p) => s + p.member_amount, 0);

  // Total confirmed by admin (using admin-adjusted amount if set)
  const totalConfirmed = filtered
    .filter(p => p.status === 'confirmed')
    .reduce((s, p) => s + (p.admin_adjusted_amount ?? p.member_amount), 0);

  const pendingCount = filtered.filter(p => p.status === 'submitted' || p.status === 'pending_review').length;
  const tabLabel = tab === 'reunion_fee' ? 'Iuran Reuni' : 'Donasi';
  // Donations open only after iuran is fully paid — keeps iuran/donasi accounting clean.
  const donationLocked = tab === 'donation' && !iuranPaid;

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-700/70 mb-1">Member</p>
        <h1 className="font-serif text-4xl font-bold text-gray-900">Pembayaran</h1>
        <p className="text-gray-500 text-sm mt-1">Kelola iuran reuni dan donasi kamu.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['reunion_fee', 'donation'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
              tab === t
                ? 'bg-amber-700 text-white border-amber-700 shadow-sm'
                : 'text-gray-600 bg-white border-amber-200 hover:border-amber-400 hover:text-gray-900'
            }`}>
            {t === 'reunion_fee' ? 'Iuran Reuni' : 'Donasi'}
          </button>
        ))}
      </div>

      {/* Summary card */}
      <div className="glass-card rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">{tabLabel}</p>
            {tab === 'reunion_fee' && iuranPaid && filtered.length === 0 ? (
              <p className="text-sm text-green-700 font-medium mt-1">Dibayarkan oleh member lain</p>
            ) : (
              <>
                <p className="text-2xl font-bold font-serif text-gray-900 mb-2">
                  {isLoading ? '—' : formatRp(totalSubmitted)}
                </p>
                <div className="flex flex-wrap gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-green-700">
                    <CheckCircle size={11} />
                    {formatRp(totalConfirmed)} dikonfirmasi
                  </span>
                  {pendingCount > 0 && (
                    <span className="flex items-center gap-1 text-blue-700">
                      <Clock size={11} />
                      {pendingCount} menunggu konfirmasi
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          {tab === 'reunion_fee' && iuranPaid ? (
            <span className="flex items-center gap-2 py-2.5 px-5 rounded-full font-bold uppercase tracking-widest text-xs whitespace-nowrap shrink-0 bg-green-100 text-green-700 border border-green-200">
              <CheckCircle size={14} />
              Iuran Lunas
            </span>
          ) : donationLocked ? (
            <span
              title="Selesaikan iuran reuni untuk membuka donasi"
              className="flex items-center gap-2 py-2.5 px-5 rounded-full font-bold uppercase tracking-widest text-xs whitespace-nowrap shrink-0 bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed select-none"
            >
              <Lock size={14} />
              Lunasi Iuran Dulu
            </span>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2 py-2.5 px-5 rounded-full font-bold uppercase tracking-widest text-xs whitespace-nowrap shrink-0"
            >
              <Receipt size={14} />
              Bayar Sekarang
            </button>
          )}
        </div>
        {donationLocked && (
          <p className="mt-3 text-xs text-gray-500 border-t border-gray-100 pt-3">
            Donasi terbuka setelah iuran reuni kamu lunas. Selesaikan iuran terlebih dahulu di tab <span className="font-semibold text-gray-700">Iuran Reuni</span>.
          </p>
        )}
      </div>

      {/* Payment history */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-xs uppercase tracking-widest animate-pulse">Memuat…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <CreditCard size={32} className="mx-auto mb-3 opacity-30" />
          {tab === 'reunion_fee' && iuranPaid ? (
            <p className="text-gray-600">Iuran dibayarkan oleh member lain.</p>
          ) : donationLocked ? (
            <p className="text-gray-600">Donasi terbuka setelah iuran reuni kamu lunas.</p>
          ) : (
            <>
              <p className="text-gray-600">Belum ada riwayat {tabLabel.toLowerCase()}.</p>
              <p className="text-xs mt-1 text-gray-400">Klik "Bayar Sekarang" untuk melakukan pembayaran.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const cfg  = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.submitted;
            const Icon = cfg.icon;
            const displayAmt = p.admin_adjusted_amount ?? p.member_amount;
            return (
              <motion.div key={p.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card flex items-center gap-4 p-4 rounded-xl shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                  <CreditCard size={18} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">
                    {formatRp(displayAmt)}
                    {p.admin_adjusted_amount && p.admin_adjusted_amount !== p.member_amount && (
                      <span className="ml-2 text-xs text-gray-400 line-through">{formatRp(p.member_amount)}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-500">
                      {new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {p.member_notes && (
                      <span className="text-[10px] text-gray-400 truncate max-w-[160px]">{p.member_notes}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.receipt_url && (
                    <a href={p.receipt_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all border border-amber-200"
                      title="Lihat bukti">
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

      {/* QRIS Modal */}
      {showModal && (
        <QRISModal
          type={tab}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: qk.payments(profile?.id ?? '') });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'member'] });
          }}
        />
      )}
    </div>
  );
}

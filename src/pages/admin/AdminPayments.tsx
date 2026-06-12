import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, Check, X, ExternalLink, Loader, ChevronDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminStatus } from '../../hooks/useAdminStatus';
import { fetchAdminPayments, updatePaymentAdmin, qk, type Payment } from '../../lib/queries';

type TypeFilter   = 'all' | 'reunion_fee' | 'donation';
type StatusFilter = 'all' | 'submitted' | 'pending_review' | 'confirmed' | 'rejected';

const STATUS_COLORS: Record<string, string> = {
  submitted:      'bg-blue-500/10 text-blue-400',
  pending_review: 'bg-yellow-500/10 text-yellow-400',
  confirmed:      'bg-green-500/10 text-green-400',
  rejected:       'bg-red-500/10 text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  submitted:      'Dikirim',
  pending_review: 'Diproses',
  confirmed:      'Dikonfirmasi',
  rejected:       'Ditolak',
};

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function parseRp(s: string): number {
  return parseInt(s.replace(/\D/g, ''), 10) || 0;
}

function EditDrawer({
  payment,
  onClose,
  reviewerId,
}: {
  payment: Payment;
  onClose: () => void;
  reviewerId: string;
}) {
  const queryClient = useQueryClient();
  const [adjAmt,      setAdjAmt]     = useState(String(payment.admin_adjusted_amount ?? payment.member_amount));
  const [status,      setStatus]     = useState(payment.status);
  const [adminNotes,  setAdminNotes] = useState(payment.admin_notes ?? '');
  const [saved,       setSaved]      = useState(false);

  const mutation = useMutation({
    mutationFn: () => updatePaymentAdmin(payment.id, {
      admin_adjusted_amount: parseRp(adjAmt) !== payment.member_amount ? parseRp(adjAmt) : null,
      status,
      admin_notes:  adminNotes.trim() || null,
      reviewed_by:  reviewerId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'member'] });
      setSaved(true);
      setTimeout(onClose, 800);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        className="relative z-10 glass rounded-2xl w-full max-w-sm p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-white">Edit Pembayaran</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="text-xs text-gray-500 space-y-0.5">
          <p>{payment.profile?.name ?? '—'}</p>
          <p>{payment.type === 'reunion_fee' ? 'Iuran Reuni' : 'Donasi'} • Member entry: {formatRp(payment.member_amount)}</p>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Jumlah Admin (koreksi)</label>
          <input
            type="text"
            value={parseRp(adjAmt) > 0 ? 'Rp ' + parseRp(adjAmt).toLocaleString('id-ID') : ''}
            onChange={e => setAdjAmt(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50"
          />
          <button
            type="button"
            onClick={() => setAdjAmt(String(payment.member_amount))}
            className="mt-1 text-[10px] text-gold/60 hover:text-gold transition-colors"
          >
            Reset ke {formatRp(payment.member_amount)}
          </button>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Status</label>
          <div className="relative">
            <select
              value={status}
              onChange={e => setStatus(e.target.value as Payment['status'])}
              className="w-full appearance-none bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 pr-8"
            >
              <option value="submitted"      className="bg-zinc-800 text-white">Dikirim</option>
              <option value="pending_review" className="bg-zinc-800 text-white">Diproses</option>
              <option value="confirmed"      className="bg-zinc-800 text-white">Dikonfirmasi</option>
              <option value="rejected"       className="bg-zinc-800 text-white">Ditolak</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Catatan Admin</label>
          <textarea
            value={adminNotes}
            onChange={e => setAdminNotes(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 resize-none"
          />
        </div>

        {mutation.isError && (
          <p className="text-red-400 text-xs">{(mutation.error as Error).message}</p>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 rounded-full transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
        >
          {mutation.isPending
            ? <><Loader size={13} className="animate-spin" /> Menyimpan…</>
            : saved
              ? <><Check size={13} /> Tersimpan</>
              : 'Simpan'}
        </button>
      </motion.div>
    </div>
  );
}

export default function AdminPayments() {
  const { user }    = useAuth();
  const { isSuperAdmin, charterIds, loading: adminLoading } = useAdminStatus();
  const [search,    setSearch]    = useState('');
  const [typeTab,   setTypeTab]   = useState<TypeFilter>('all');
  const [statusTab, setStatusTab] = useState<StatusFilter>('all');
  const [editing,   setEditing]   = useState<Payment | null>(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: qk.adminPayments(isSuperAdmin, charterIds),
    queryFn:  () => fetchAdminPayments(isSuperAdmin, charterIds),
    enabled:  !adminLoading,
  });

  const filtered = useMemo(() => {
    let r = payments;
    if (typeTab   !== 'all') r = r.filter(p => p.type   === typeTab);
    if (statusTab !== 'all') r = r.filter(p => p.status === statusTab);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(p => p.profile?.name?.toLowerCase().includes(q));
    }
    return r;
  }, [payments, typeTab, statusTab, search]);

  const totals = useMemo(() => {
    const confirmed = payments.filter(p => p.status === 'confirmed');
    return {
      reunionFee: confirmed.filter(p => p.type === 'reunion_fee').reduce((s, p) => s + (p.admin_adjusted_amount ?? p.member_amount), 0),
      donation:   confirmed.filter(p => p.type === 'donation').reduce((s,   p) => s + (p.admin_adjusted_amount ?? p.member_amount), 0),
      pending:    payments.filter(p => p.status === 'submitted').length,
    };
  }, [payments]);

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white">Pembayaran</h1>
        <p className="text-gray-500 text-sm mt-1">Rekonsiliasi iuran reuni dan donasi.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-green-400">Rp {totals.reunionFee.toLocaleString('id-ID')}</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Iuran Terkonfirmasi</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-blue-400">Rp {totals.donation.toLocaleString('id-ID')}</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Donasi Terkonfirmasi</p>
        </div>
        <div className="glass rounded-xl p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold font-serif text-yellow-400">{totals.pending}</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Menunggu Konfirmasi</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari nama anggota…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          {(['all', 'reunion_fee', 'donation'] as TypeFilter[]).map(t => (
            <button key={t} onClick={() => setTypeTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                typeTab === t
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : 'text-gray-500 border border-white/5 hover:text-white hover:border-white/15'
              }`}>
              {t === 'all' ? 'Semua' : t === 'reunion_fee' ? 'Iuran' : 'Donasi'}
            </button>
          ))}
        </div>

        <div className="flex gap-1 flex-wrap">
          {(['all', 'submitted', 'confirmed', 'rejected'] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setStatusTab(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                statusTab === s
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : 'text-gray-500 border border-white/5 hover:text-white hover:border-white/15'
              }`}>
              {s === 'all' ? 'Status: Semua' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="text-right text-xs text-gray-600 mb-4">{filtered.length} transaksi</div>

      {isLoading ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase animate-pulse">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-600 text-sm">Belum ada pembayaran.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p, i) => {
            const displayAmt = p.admin_adjusted_amount ?? p.member_amount;
            return (
              <motion.div key={p.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.015, 0.3) }}
                className="glass flex items-center gap-4 p-4 rounded-xl hover:border-white/10 transition-colors cursor-pointer"
                onClick={() => setEditing(p)}
              >
                {p.profile?.avatar_url ? (
                  <img src={p.profile.avatar_url} alt={p.profile.name ?? ''} referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                    <span className="font-serif font-bold text-gold text-sm">{p.profile?.name?.charAt(0) ?? '?'}</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.profile?.name ?? '—'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-500">
                      {new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-gray-600 uppercase">
                      {p.type === 'reunion_fee' ? 'Iuran' : 'Donasi'}
                    </span>
                    {p.member_notes && (
                      <span className="text-[10px] text-gray-600 truncate max-w-[120px]">{p.member_notes}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-white">{formatRp(displayAmt)}</p>
                    {p.admin_adjusted_amount && p.admin_adjusted_amount !== p.member_amount && (
                      <p className="text-[10px] text-gray-500 line-through">{formatRp(p.member_amount)}</p>
                    )}
                  </div>

                  {p.receipt_url && (
                    <a href={p.receipt_url} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-gold hover:bg-gold/10 transition-all"
                      title="Lihat bukti">
                      <ExternalLink size={13} />
                    </a>
                  )}

                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? ''}`}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {editing && user && (
        <EditDrawer
          payment={editing}
          reviewerId={user.id}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

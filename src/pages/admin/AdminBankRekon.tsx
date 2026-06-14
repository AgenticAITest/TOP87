import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, CheckCircle2, ExternalLink, Loader, ChevronDown, Landmark } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { fetchConfirmedPayments, updatePaymentAdmin, qk, type Payment } from '../../lib/queries';

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

const TYPE_LABELS: Record<string, string> = {
  reunion_fee: 'Iuran Reuni',
  donation:    'Donasi',
};

function RekonRow({ payment, userId }: { payment: Payment; userId: string }) {
  const queryClient  = useQueryClient();
  const [open,  setOpen]  = useState(false);
  const [notes, setNotes] = useState(payment.admin_notes ?? '');
  const [done,  setDone]  = useState(false);

  const reconcile = useMutation({
    mutationFn: () => updatePaymentAdmin(payment.id, {
      status:      'bank_reconciled',
      admin_notes: notes.trim() || null,
      reviewed_by: userId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.confirmedPayments() });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'member'] });
      setDone(true);
    },
  });

  const displayAmt = payment.admin_adjusted_amount ?? payment.member_amount;
  const isConfirmed = payment.status === 'confirmed';

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        {payment.profile?.avatar_url ? (
          <img src={payment.profile.avatar_url} alt={payment.profile.name ?? ''} referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <span className="font-serif font-bold text-gold text-sm">{payment.profile?.name?.charAt(0) ?? '?'}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{payment.profile?.name ?? '—'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-500">
              {new Date(payment.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-[10px] text-gray-600 uppercase">
              {TYPE_LABELS[payment.type] ?? payment.type}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <p className="text-sm font-bold text-white hidden sm:block">{formatRp(displayAmt)}</p>
          {payment.receipt_url && (
            <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-gold hover:bg-gold/10 transition-all"
              title="Lihat bukti">
              <ExternalLink size={13} />
            </a>
          )}
          {isConfirmed ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
              Dikonfirmasi
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
              Bank Rekon ✓
            </span>
          )}
          <ChevronDown size={14} className={`text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-white/5 bg-white/[0.02]"
          >
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Jumlah: <span className="text-white font-semibold">{formatRp(displayAmt)}</span></span>
                {payment.member_notes && <span className="italic truncate max-w-[200px]">"{payment.member_notes}"</span>}
              </div>

              {isConfirmed && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                      Catatan Admin (opsional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Referensi bank, nomor transaksi, dll."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 resize-none"
                    />
                  </div>
                  {reconcile.isError && (
                    <p className="text-red-400 text-xs">{(reconcile.error as Error).message}</p>
                  )}
                  <button
                    onClick={() => reconcile.mutate()}
                    disabled={reconcile.isPending || done}
                    className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2 px-5 rounded-full transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                  >
                    {reconcile.isPending
                      ? <><Loader size={13} className="animate-spin" /> Memproses…</>
                      : done
                        ? <><CheckCircle2 size={13} /> Selesai</>
                        : <><Landmark size={13} /> Rekonsiliasi</>
                    }
                  </button>
                </>
              )}

              {!isConfirmed && payment.admin_notes && (
                <p className="text-xs text-gray-400 italic">Catatan: {payment.admin_notes}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminBankRekon() {
  const { user }    = useAuth();
  const [search,   setSearch]  = useState('');
  const [tab,      setTab]     = useState<'pending' | 'done'>('pending');

  const { data: payments = [], isLoading } = useQuery({
    queryKey: qk.confirmedPayments(),
    queryFn:  fetchConfirmedPayments,
  });

  const { pendingList, doneList } = useMemo(() => {
    const q = search.toLowerCase();
    const match = (p: Payment) =>
      !q || (p.profile?.name?.toLowerCase().includes(q) ?? false);

    return {
      pendingList: payments.filter(p => p.status === 'confirmed'       && match(p)),
      doneList:    payments.filter(p => p.status === 'bank_reconciled' && match(p)),
    };
  }, [payments, search]);

  const list = tab === 'pending' ? pendingList : doneList;

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Finance</p>
        <h1 className="font-serif text-4xl font-bold text-white">Bank Rekonsiliasi</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tandai pembayaran yang sudah dicocokkan dengan rekening bank.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-8 max-w-sm">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-yellow-400">
            {payments.filter(p => p.status === 'confirmed').length}
          </p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Perlu Rekon</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-blue-400">
            {payments.filter(p => p.status === 'bank_reconciled').length}
          </p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Selesai</p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1">
          {(['pending', 'done'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                tab === t
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : 'text-gray-500 border border-white/5 hover:text-white hover:border-white/15'
              }`}>
              {t === 'pending' ? 'Perlu Rekonsiliasi' : 'Sudah Direkonsiliasi'}
            </button>
          ))}
        </div>

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
      </div>

      <div className="text-right text-xs text-gray-600 mb-4">{list.length} transaksi</div>

      {isLoading ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase animate-pulse">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-24 text-gray-600 text-sm">
          {tab === 'pending' ? 'Semua pembayaran sudah direkonsiliasi.' : 'Belum ada yang direkonsiliasi.'}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((p, i) => (
            <motion.div key={p.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.015, 0.3) }}
            >
              <RekonRow payment={p} userId={user?.id ?? ''} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

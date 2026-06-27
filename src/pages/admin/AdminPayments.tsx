import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, Check, X, ExternalLink, Loader, ChevronDown, UserCheck, Plus, List, BarChart2, Shirt } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminStatus } from '../../hooks/useAdminStatus';
import {
  fetchAdminPayments, updatePaymentAdmin,
  fetchApprovedMembers, fetchPaymentSummaryReport,
  fetchPaymentAllocations, savePaymentAllocations,
  fetchKaosReport, fetchFundTotals,
  qk, type Payment, type MemberPaymentSummary, type LedgerAllocation, type AccountType, type KaosRow,
} from '../../lib/queries';

type TypeFilter   = 'all' | 'reunion_fee' | 'donation';
type StatusFilter = 'all' | 'submitted' | 'pending_review' | 'confirmed' | 'rejected';
type View         = 'transaksi' | 'rekap' | 'kaos';

const STATUS_COLORS: Record<string, string> = {
  submitted:      'bg-blue-500/10 text-blue-400',
  pending_review: 'bg-yellow-500/10 text-yellow-400',
  confirmed:      'bg-green-500/10 text-green-400',
  bank_reconciled:'bg-emerald-500/10 text-emerald-400',
  rejected:       'bg-red-500/10 text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  submitted:      'Dikirim',
  pending_review: 'Diproses',
  confirmed:      'Dikonfirmasi',
  bank_reconciled:'Bank Rekon',
  rejected:       'Ditolak',
};

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function parseRp(s: string): number {
  return parseInt(s.replace(/\D/g, ''), 10) || 0;
}

// ─── Allocation row type (UI-only) ────────────────────────────────────────────

interface AllocRow {
  key:         string;
  accountType: AccountType;
  profileId:   string | null;
  label:       string;
  amount:      string;  // raw digits string
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

function EditDrawer({
  payment,
  onClose,
  reviewerId,
  isSuperAdmin,
}: {
  payment:      Payment;
  onClose:      () => void;
  reviewerId:   string;
  isSuperAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const [adjAmt,     setAdjAmt]    = useState(String(payment.admin_adjusted_amount ?? payment.member_amount));
  const [status,     setStatus]    = useState(payment.status);
  const [adminNotes, setAdminNotes] = useState(payment.admin_notes ?? '');
  const [saved,      setSaved]     = useState(false);

  // Allocation rows state
  const [rows,         setRows]        = useState<AllocRow[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchTarget, setSearchTarget] = useState<string | null>(null); // key of row being searched
  const [allocSaved,   setAllocSaved]   = useState(false);
  const [mismatchAck,  setMismatchAck]  = useState(false); // confirm allocating against payment type

  const { data: allMembers = [] } = useQuery({
    queryKey: qk.members(),
    queryFn:  fetchApprovedMembers,
    enabled:  isSuperAdmin,
    staleTime: 5 * 60_000,
  });

  // Load existing allocations for this payment
  const { data: existingAllocs } = useQuery({
    queryKey: ['payment-allocations', payment.id],
    queryFn:  () => fetchPaymentAllocations(payment.id),
    enabled:  isSuperAdmin,
    staleTime: 0,
  });

  // Pre-populate rows once existing allocs load
  const [rowsInitialized, setRowsInitialized] = useState(false);
  if (!rowsInitialized && existingAllocs !== undefined) {
    setRowsInitialized(true);
    if (existingAllocs.length > 0) {
      setRows(existingAllocs.map((e, i) => {
        const member = allMembers.find(m => m.id === e.profile_id);
        const label  = e.profile_id
          ? (member?.name ?? e.profile_id)
          : (e.accountType === 'donation' ? 'Donasi' : 'Merchandise');
        return { key: String(i), accountType: e.accountType, profileId: e.profile_id, label, amount: String(e.amount) };
      }));
    } else {
      // Default: payer's own iuran + remainder as donation (if reunion_fee type)
      if (payment.type === 'reunion_fee') {
        const payerName = payment.profile?.name ?? 'Payer';
        const fee       = 1_870_000;
        const don       = Math.max(0, payment.member_amount - fee);
        const initial: AllocRow[] = [
          { key: 'r0', accountType: 'iuran',    profileId: payment.profile_id, label: payerName, amount: String(Math.min(fee, payment.member_amount)) },
        ];
        if (don > 0) initial.push({ key: 'r1', accountType: 'donation', profileId: null, label: 'Donasi', amount: String(don) });
        setRows(initial);
      } else {
        setRows([{ key: 'r0', accountType: 'donation', profileId: null, label: 'Donasi', amount: String(payment.member_amount) }]);
      }
    }
  }

  const totalAmount    = parseRp(adjAmt) || payment.member_amount;
  const allocatedTotal = rows.reduce((s, r) => s + (parseInt(r.amount, 10) || 0), 0);
  const remaining      = totalAmount - allocatedTotal;

  // Confirmed (and bank_reconciled) payments are FINAL: the drawer is read-only and the
  // ledger/status are frozen. Correcting a mistake requires a direct DB edit, by design.
  const isLocked = payment.status === 'confirmed' || payment.status === 'bank_reconciled';

  // Guard against allocating money against the payment's stated type.
  const donationToIuran = payment.type === 'donation'
    && rows.some(r => r.accountType === 'iuran' && (parseInt(r.amount, 10) || 0) > 0);
  const feeNoIuran = payment.type === 'reunion_fee'
    && rows.length > 0
    && !rows.some(r => r.accountType === 'iuran' && (parseInt(r.amount, 10) || 0) > 0);
  const typeMismatch = donationToIuran || feeNoIuran;
  const mismatchMsg  = donationToIuran
    ? 'Pembayaran ini bertipe Donasi tapi dialokasikan ke Iuran anggota.'
    : 'Pembayaran ini bertipe Iuran tapi tidak ada alokasi ke Iuran (semua ke Donasi).';

  // A payment may only be confirmed once its money is fully allocated: nothing left over,
  // every iuran row assigned to a member, and any type-mismatch explicitly acknowledged.
  const allIuranAssigned       = rows.every(r => r.accountType !== 'iuran' || !!r.profileId);
  const allocationComplete     = remaining === 0 && allIuranAssigned && (!typeMismatch || mismatchAck);
  const confirmNeedsAllocation = status === 'confirmed' && !isLocked && !allocationComplete;

  function addIuranRow() {
    const key = String(Date.now());
    setRows(prev => [...prev, { key, accountType: 'iuran', profileId: null, label: '', amount: String(Math.max(0, remaining)) }]);
    setSearchTarget(key);
    setMemberSearch('');
  }

  function addDonationRow() {
    setRows(prev => [...prev, { key: String(Date.now()), accountType: 'donation', profileId: null, label: 'Donasi', amount: String(Math.max(0, remaining)) }]);
  }

  function removeRow(key: string) {
    setRows(prev => prev.filter(r => r.key !== key));
  }

  function updateAmount(key: string, raw: string) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, amount: raw.replace(/\D/g, '') } : r));
  }

  const memberSuggestions = memberSearch.length > 1
    ? allMembers
        .filter(m => !rows.some(r => r.profileId === m.id) && (m.name ?? '').toLowerCase().includes(memberSearch.toLowerCase()))
        .slice(0, 5)
    : [];

  function selectMember(rowKey: string, m: { id: string; name: string | null }) {
    setRows(prev => prev.map(r => r.key === rowKey ? { ...r, profileId: m.id, label: m.name ?? m.id } : r));
    setSearchTarget(null);
    setMemberSearch('');
  }

  function formatRpLocal(n: number) { return 'Rp ' + n.toLocaleString('id-ID'); }

  const mutation = useMutation({
    // When confirming, the allocation is committed atomically with the status change so a
    // confirmed payment is always fully posted to the ledger (Option B: allocation-first).
    mutationFn: async () => {
      if (status === 'confirmed') {
        const allocations: LedgerAllocation[] = rows
          .filter(r => parseInt(r.amount, 10) > 0 && (r.accountType !== 'iuran' || r.profileId))
          .map(r => ({ profileId: r.profileId, accountType: r.accountType, amount: parseInt(r.amount, 10) }));
        await savePaymentAllocations(payment.id, allocations, reviewerId);
      }
      await updatePaymentAdmin(payment.id, {
        admin_adjusted_amount: parseRp(adjAmt) !== payment.member_amount ? parseRp(adjAmt) : null,
        status,
        admin_notes: adminNotes.trim() || null,
        reviewed_by: reviewerId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-summary'] });
      queryClient.invalidateQueries({ queryKey: qk.fundTotals() });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'member'] });
      queryClient.invalidateQueries({ queryKey: ['payment-allocations', payment.id] });
      setSaved(true);
      setTimeout(onClose, 800);
    },
  });

  const allocMutation = useMutation({
    mutationFn: () => {
      const allocations: LedgerAllocation[] = rows
        .filter(r => parseInt(r.amount, 10) > 0 && (r.accountType !== 'iuran' || r.profileId))
        .map(r => ({ profileId: r.profileId, accountType: r.accountType, amount: parseInt(r.amount, 10) }));
      return savePaymentAllocations(payment.id, allocations, reviewerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-summary'] });
      queryClient.invalidateQueries({ queryKey: qk.fundTotals() });
      queryClient.invalidateQueries({ queryKey: ['payment-allocations', payment.id] });
      setAllocSaved(true);
      setTimeout(() => setAllocSaved(false), 2000);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        className="relative z-10 glass rounded-2xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-white">Edit Pembayaran</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="text-xs text-gray-500 space-y-0.5">
          <p className="text-gray-300 font-medium">{payment.profile?.name ?? '—'}</p>
          <p>{payment.type === 'reunion_fee' ? 'Iuran Reuni' : 'Donasi'} • {formatRpLocal(payment.member_amount)}</p>
          {payment.member_notes && (
            <p className="italic text-gold/70">"{payment.member_notes}"</p>
          )}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Jumlah Admin (koreksi)</label>
          <input
            type="text"
            value={parseRp(adjAmt) > 0 ? 'Rp ' + parseRp(adjAmt).toLocaleString('id-ID') : ''}
            onChange={e => setAdjAmt(e.target.value.replace(/\D/g, ''))}
            disabled={isLocked}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 disabled:opacity-60"
          />
          {!isLocked && (
            <button
              type="button"
              onClick={() => setAdjAmt(String(payment.member_amount))}
              className="mt-1 text-[10px] text-gold/60 hover:text-gold transition-colors"
            >
              Reset ke {formatRpLocal(payment.member_amount)}
            </button>
          )}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Status</label>
          {isLocked ? (
            <div className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-emerald-400 font-medium">
              {STATUS_LABELS[payment.status] ?? payment.status} · final
            </div>
          ) : (
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
          )}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Catatan Admin</label>
          <textarea
            value={adminNotes}
            onChange={e => setAdminNotes(e.target.value)}
            rows={2}
            disabled={isLocked}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 resize-none disabled:opacity-60"
          />
        </div>

        {mutation.isError && (
          <p className="text-red-400 text-xs">{(mutation.error as Error).message}</p>
        )}

        {isLocked ? (
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 text-[11px] text-emerald-300/90 leading-snug">
            🔒 Pembayaran sudah dikonfirmasi dan terkunci. Alokasi & status bersifat final dan tidak
            dapat diubah.
          </div>
        ) : (
          <>
            {confirmNeedsAllocation && (
              <p className="text-yellow-400 text-[11px]">
                Alokasikan seluruh dana ke iuran anggota / donasi sebelum mengonfirmasi.
              </p>
            )}
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || confirmNeedsAllocation}
              className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 rounded-full transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
            >
              {mutation.isPending
                ? <><Loader size={13} className="animate-spin" /> Menyimpan…</>
                : saved
                  ? <><Check size={13} /> Tersimpan</>
                  : status === 'confirmed' ? 'Konfirmasi & Simpan Alokasi' : 'Simpan'}
            </button>
          </>
        )}

        {/* ── Allocation section (super admin only) ── */}
        {isSuperAdmin && (
          <div className="border-t border-white/10 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck size={13} className="text-gold/60" />
                <span className="text-[10px] uppercase tracking-widest text-gray-500">Alokasi Dana</span>
              </div>
              {/* allocated / total indicator */}
              <span className={`text-[10px] font-mono tabular-nums ${remaining === 0 ? 'text-green-400' : remaining < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                {formatRpLocal(allocatedTotal)} / {formatRpLocal(totalAmount)}
              </span>
            </div>

            {/* Allocation rows */}
            <div className="space-y-2">
              {rows.map(row => (
                <div key={row.key} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                      row.accountType === 'iuran' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {row.accountType === 'iuran' ? 'Iuran' : 'Donasi'}
                    </span>
                    <span className="text-xs text-gray-300 flex-1 truncate">
                      {row.label || <span className="text-gray-600 italic">Pilih anggota…</span>}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={row.amount ? 'Rp ' + parseInt(row.amount || '0', 10).toLocaleString('id-ID') : ''}
                      onChange={e => updateAmount(row.key, e.target.value)}
                      disabled={isLocked}
                      className="w-28 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs text-right focus:outline-none focus:border-gold/50 disabled:opacity-60"
                    />
                    {!isLocked && (
                      <button type="button" onClick={() => removeRow(row.key)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  {/* Member search for iuran rows without a profile yet */}
                  {!isLocked && row.accountType === 'iuran' && !row.profileId && (
                    <div className="relative ml-14">
                      <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Cari anggota…"
                        value={searchTarget === row.key ? memberSearch : ''}
                        onFocus={() => setSearchTarget(row.key)}
                        onChange={e => { setSearchTarget(row.key); setMemberSearch(e.target.value); }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-2 py-1 text-white text-xs focus:outline-none focus:border-gold/50"
                      />
                      {searchTarget === row.key && memberSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden z-20">
                          {memberSuggestions.map(m => (
                            <button
                              type="button"
                              key={m.id}
                              onClick={() => selectMember(row.key, m)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-white/5 transition-colors"
                            >
                              <Plus size={10} className="text-gold/60 shrink-0" />
                              <span className="text-gray-300">{m.name}</span>
                              <span className="text-gray-600 ml-auto text-[9px]">{(m as any).primaryCharter?.name ?? ''}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add row buttons */}
            {!isLocked && (
              <div className="flex gap-2">
                <button type="button" onClick={addIuranRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold text-green-400 bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-all">
                  <Plus size={10} /> Iuran Anggota
                </button>
                <button type="button" onClick={addDonationRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold text-blue-400 bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-all">
                  <Plus size={10} /> Donasi
                </button>
              </div>
            )}

            {remaining !== 0 && (
              <p className={`text-[10px] ${remaining < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                {remaining > 0 ? `Sisa ${formatRpLocal(remaining)} belum dialokasikan` : `Kelebihan ${formatRpLocal(-remaining)}`}
              </p>
            )}

            {typeMismatch && (
              <label className="flex items-start gap-2 rounded-lg bg-yellow-500/5 border border-yellow-500/30 p-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mismatchAck}
                  onChange={e => setMismatchAck(e.target.checked)}
                  className="mt-0.5 accent-yellow-400"
                />
                <span className="text-[11px] text-yellow-300/90 leading-snug">
                  ⚠️ {mismatchMsg} Centang untuk melanjutkan.
                </span>
              </label>
            )}

            {allocMutation.isError && (
              <p className="text-red-400 text-xs">{(allocMutation.error as Error).message}</p>
            )}

            {!isLocked && (
              <button
                type="button"
                onClick={() => allocMutation.mutate()}
                disabled={allocMutation.isPending || remaining !== 0 || (typeMismatch && !mismatchAck)}
                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-gold/10 border border-white/10 hover:border-gold/30 text-gray-300 hover:text-gold font-bold py-2 rounded-full transition-all disabled:opacity-40 uppercase tracking-widest text-xs"
              >
                {allocMutation.isPending
                  ? <><Loader size={12} className="animate-spin" /> Menyimpan…</>
                  : allocSaved
                    ? <><Check size={12} /> Alokasi Tersimpan</>
                    : <><UserCheck size={12} /> Simpan Alokasi</>}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Rekap Table ──────────────────────────────────────────────────────────────

function RekapTable({ rows, isLoading }: { rows: MemberPaymentSummary[]; isLoading: boolean }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? rows.filter(r => (r.name ?? '').toLowerCase().includes(q) || (r.primaryCharter ?? '').toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const totals = useMemo(() => ({
    iuranConfirmed: rows.filter(r => r.iuranStatus === 'confirmed').reduce((s, r) => s + (r.iuranAmount ?? 0), 0),
    donasi:         rows.reduce((s, r) => s + r.donationTotal, 0),
    lunas:          rows.filter(r => r.iuranFullyPaid).length,
    cicilan:        rows.filter(r => !r.iuranFullyPaid && (r.iuranStatus === 'confirmed' || r.iuranStatus === 'credited')).length,
    belumBayar:     rows.filter(r => !r.iuranStatus).length,
  }), [rows]);

  if (isLoading) return (
    <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase animate-pulse">Memuat…</div>
  );

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
          {totals.lunas} iuran lunas
        </span>
        <span className="px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          {totals.cicilan} cicilan
        </span>
        <span className="px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
          {totals.belumBayar} belum bayar
        </span>
        <span className="px-3 py-1.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
          {rows.length} total anggota
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
        <input
          type="text"
          placeholder="Cari nama atau charter…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="pb-3 pr-4 text-[10px] uppercase tracking-widest text-gray-500 font-normal">Nama</th>
              <th className="pb-3 pr-4 text-[10px] uppercase tracking-widest text-gray-500 font-normal">Charter</th>
              <th className="pb-3 pr-4 text-[10px] uppercase tracking-widest text-gray-500 font-normal text-right">Iuran</th>
              <th className="pb-3 pr-4 text-[10px] uppercase tracking-widest text-gray-500 font-normal">Status</th>
              <th className="pb-3 text-[10px] uppercase tracking-widest text-gray-500 font-normal text-right">Donasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-white/2 transition-colors">
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    {r.avatar_url
                      ? <img src={r.avatar_url} referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover shrink-0" />
                      : <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-gold">{r.name?.charAt(0) ?? '?'}</span>
                        </div>
                    }
                    <span className="text-white font-medium truncate max-w-[140px]">{r.name ?? '—'}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-gray-500 text-xs">{r.primaryCharter ?? '—'}</td>
                <td className="py-2.5 pr-4 text-right">
                  {r.iuranStatus === 'credited'
                    ? <span className="text-purple-400 font-medium text-xs">via kredit</span>
                    : r.iuranAmount != null
                      ? <div>
                          <span className="text-white font-medium">{formatRp(r.iuranAmount)}</span>
                          {r.iuranStatus === 'confirmed' && !r.iuranFullyPaid && (
                            <p className="text-[9px] text-gray-600 mt-0.5">dari {formatRp(r.iuranRequired)}</p>
                          )}
                        </div>
                      : <span className="text-gray-600 italic text-xs">Belum bayar</span>
                  }
                </td>
                <td className="py-2.5 pr-4">
                  {r.iuranStatus === 'credited'
                    ? <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                          Dikreditkan
                        </span>
                        <p className="text-[9px] text-gray-600 mt-0.5 pl-0.5">oleh {r.iuranCreditedBy}</p>
                      </div>
                    : r.iuranFullyPaid
                      ? <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                          Lunas
                        </span>
                      : r.iuranStatus === 'confirmed'
                        ? <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">
                            Cicilan
                          </span>
                        : r.iuranStatus
                          ? <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[r.iuranStatus] ?? ''}`}>
                              {STATUS_LABELS[r.iuranStatus] ?? r.iuranStatus}
                            </span>
                          : <span className="text-gray-600 text-[10px]">—</span>
                  }
                </td>
                <td className="py-2.5 text-right">
                  {r.donationTotal > 0
                    ? <span className="text-blue-400 font-medium">{formatRp(r.donationTotal)}</span>
                    : <span className="text-gray-600 text-xs">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr className="border-t-2 border-white/20">
              <td colSpan={2} className="pt-3 text-xs uppercase tracking-widest text-gray-500 font-bold">Total Terkonfirmasi</td>
              <td className="pt-3 text-right font-bold text-green-400">{formatRp(totals.iuranConfirmed)}</td>
              <td />
              <td className="pt-3 text-right font-bold text-blue-400">{formatRp(totals.donasi)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-600 text-sm py-8">Tidak ada data.</p>
      )}
    </div>
  );
}

// ─── Kaos View ───────────────────────────────────────────────────────────────

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

function KaosView({ rows, isLoading }: { rows: KaosRow[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="text-center py-16 text-gray-500 text-sm uppercase tracking-widest animate-pulse">Loading…</div>;
  }

  const paidRows  = rows.filter(r => r.iuran_paid);
  const sizeCounts = TSHIRT_SIZES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = paidRows.filter(r => r.tshirt_size === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">
          Rekap Ukuran — Anggota Lunas Iuran ({paidRows.length} orang)
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {TSHIRT_SIZES.map(size => (
            <div key={size} className="glass rounded-xl p-3 text-center">
              <p className="text-xl font-bold font-serif text-gold">{sizeCounts[size]}</p>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">{size}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detail table */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-gray-500">Anggota</th>
              <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-gray-500">Charter</th>
              <th className="text-center px-5 py-3 text-xs uppercase tracking-widest text-gray-500">Ukuran</th>
              <th className="text-center px-5 py-3 text-xs uppercase tracking-widest text-gray-500">Iuran</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-gray-600 text-sm">Belum ada data.</td>
              </tr>
            ) : rows.map(r => (
              <tr key={r.profile_id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-5 py-3 text-white font-medium">{r.name ?? '—'}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{r.charter_name ?? '—'}</td>
                <td className="px-5 py-3 text-center">
                  {r.tshirt_size ? (
                    <span className="bg-gold/10 text-gold border border-gold/20 text-xs font-bold px-2.5 py-1 rounded-full">{r.tshirt_size}</span>
                  ) : (
                    <span className="text-gray-600 text-xs italic">belum dipilih</span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  {r.iuran_paid
                    ? <span className="text-green-400 text-xs font-bold uppercase">Lunas</span>
                    : <span className="text-gray-600 text-xs">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPayments() {
  const { user }    = useAuth();
  const { isSuperAdmin, charterIds, loading: adminLoading } = useAdminStatus();
  const [view,      setView]      = useState<View>('transaksi');
  const [search,    setSearch]    = useState('');
  const [typeTab,   setTypeTab]   = useState<TypeFilter>('all');
  const [statusTab, setStatusTab] = useState<StatusFilter>('all');
  const [editing,   setEditing]   = useState<Payment | null>(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: qk.adminPayments(isSuperAdmin, charterIds),
    queryFn:  () => fetchAdminPayments(isSuperAdmin, charterIds),
    enabled:  !adminLoading,
  });

  const { data: summaryRows = [], isLoading: summaryLoading } = useQuery({
    queryKey: qk.paymentSummary(isSuperAdmin, charterIds),
    queryFn:  () => fetchPaymentSummaryReport(isSuperAdmin, charterIds),
    enabled:  !adminLoading && view === 'rekap',
    staleTime: 2 * 60_000,
  });

  const { data: kaosRows = [], isLoading: kaosLoading } = useQuery({
    queryKey: qk.kaosReport(isSuperAdmin, charterIds),
    queryFn:  () => fetchKaosReport(isSuperAdmin, charterIds),
    enabled:  !adminLoading && view === 'kaos',
    staleTime: 2 * 60_000,
  });

  // Allocation-aware totals for the stat cards (reclassify model — matches Rekap Anggota).
  const { data: fundTotals = { reunion_fee: 0, donation: 0 } } = useQuery({
    queryKey: qk.fundTotals(),
    queryFn:  fetchFundTotals,
    enabled:  !adminLoading,
    staleTime: 60_000,
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

  // Iuran/donasi totals now come from fundTotals (allocation-aware). Only the pending count
  // is derived from the raw transaction list here.
  const pendingCount = useMemo(
    () => payments.filter(p => p.status === 'submitted').length,
    [payments],
  );

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white">Pembayaran</h1>
        <p className="text-gray-500 text-sm mt-1">Rekonsiliasi iuran reuni dan donasi.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-green-400">Rp {fundTotals.reunion_fee.toLocaleString('id-ID')}</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Iuran Terkonfirmasi</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-blue-400">Rp {fundTotals.donation.toLocaleString('id-ID')}</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Saldo Donasi</p>
        </div>
        <div className="glass rounded-xl p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold font-serif text-yellow-400">{pendingCount}</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Menunggu Konfirmasi</p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('transaksi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
            view === 'transaksi'
              ? 'bg-gold/15 text-gold border border-gold/30'
              : 'text-gray-500 border border-white/10 hover:text-white hover:border-white/20'
          }`}
        >
          <List size={13} /> Transaksi
        </button>
        <button
          onClick={() => setView('rekap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
            view === 'rekap'
              ? 'bg-gold/15 text-gold border border-gold/30'
              : 'text-gray-500 border border-white/10 hover:text-white hover:border-white/20'
          }`}
        >
          <BarChart2 size={13} /> Rekap Anggota
        </button>
        <button
          onClick={() => setView('kaos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
            view === 'kaos'
              ? 'bg-gold/15 text-gold border border-gold/30'
              : 'text-gray-500 border border-white/10 hover:text-white hover:border-white/20'
          }`}
        >
          <Shirt size={13} /> Rekap Kaos
        </button>
      </div>

      {/* ── Rekap view ── */}
      {view === 'rekap' && (
        <div className="glass rounded-2xl p-6">
          <RekapTable rows={summaryRows} isLoading={summaryLoading} />
        </div>
      )}

      {/* ── Kaos view ── */}
      {view === 'kaos' && (
        <KaosView rows={kaosRows} isLoading={kaosLoading} />
      )}

      {/* ── Transaksi view ── */}
      {view === 'transaksi' && (
        <>
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{p.profile?.name ?? '—'}</p>
                        {(p.credits ?? []).length > 0 && (
                          <span className="text-[9px] bg-gold/10 text-gold border border-gold/20 px-1.5 py-0.5 rounded-full shrink-0">
                            {(p.credits ?? []).length} kredit
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500">
                          {new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-gray-600 uppercase">
                          {p.type === 'reunion_fee' ? 'Iuran' : 'Donasi'}
                        </span>
                        {p.donation_amount > 0 && (
                          <span className="text-[10px] text-blue-400">+don</span>
                        )}
                        {p.member_notes && (
                          <span className="text-[10px] text-gold/60 italic truncate max-w-[120px]">"{p.member_notes}"</span>
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
        </>
      )}

      {editing && user && (
        <EditDrawer
          payment={editing}
          reviewerId={user.id}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

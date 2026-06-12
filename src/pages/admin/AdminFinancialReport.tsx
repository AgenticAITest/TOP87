import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Search } from 'lucide-react';
import { fetchFinancialReport, fetchCharters, qk } from '../../lib/queries';
import type { FinancialReportRow, FinancialTxType, FinancialTxStatus } from '../../lib/queries';

// ─── constants ───────────────────────────────────────────────────────────────

const TX_LABELS: Record<FinancialTxType, string> = {
  reunion_fee: 'Iuran',
  donation:    'Donasi',
  merchandise: 'Merchandise',
};

const TX_COLORS: Record<FinancialTxType, string> = {
  reunion_fee: 'bg-blue-500/10 text-blue-400',
  donation:    'bg-purple-500/10 text-purple-400',
  merchandise: 'bg-amber-500/10 text-amber-400',
};

const STATUS_LABELS: Record<FinancialTxStatus, string> = {
  submitted:        'Diajukan',
  pending_review:   'Diproses',
  confirmed:        'Dikonfirmasi',
  bank_reconciled:  'Bank Rekon',
  shipped:          'Dikirim',
  rejected:         'Ditolak',
};

const STATUS_COLORS: Record<FinancialTxStatus, string> = {
  submitted:       'bg-sky-500/10 text-sky-400',
  pending_review:  'bg-yellow-500/10 text-yellow-400',
  confirmed:       'bg-green-500/10 text-green-400',
  bank_reconciled: 'bg-emerald-500/10 text-emerald-400',
  shipped:         'bg-violet-500/10 text-violet-400',
  rejected:        'bg-red-500/10 text-red-400',
};

const REVENUE_STATUSES: FinancialTxStatus[] = ['confirmed', 'bank_reconciled', 'shipped'];

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

// ─── summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ rows }: { rows: FinancialReportRow[] }) {
  const revenue = rows.filter(r => REVENUE_STATUSES.includes(r.status));

  const iuran = revenue
    .filter(r => r.txType === 'reunion_fee')
    .reduce((s, r) => s + r.effectiveAmount, 0);
  const donasi = revenue
    .filter(r => r.txType === 'donation')
    .reduce((s, r) => s + r.effectiveAmount, 0);
  const merchRevenue = revenue
    .filter(r => r.txType === 'merchandise')
    .reduce((s, r) => s + (r.totalRevenue ?? 0), 0);
  const merchMargin = revenue
    .filter(r => r.txType === 'merchandise')
    .reduce((s, r) => s + (r.totalMargin ?? 0), 0);

  const cards = [
    { label: 'Total Iuran',        value: iuran,        color: 'text-blue-400'   },
    { label: 'Total Donasi',       value: donasi,        color: 'text-purple-400' },
    { label: 'Merch Harga Jual',   value: merchRevenue,  color: 'text-amber-400'  },
    { label: 'Merch Margin',       value: merchMargin,   color: 'text-emerald-400'},
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {cards.map(c => (
        <div key={c.label} className="glass rounded-xl p-4">
          <p className={`text-xl font-bold font-serif ${c.color}`}>{formatRp(c.value)}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">{c.label}</p>
          <p className="text-[9px] text-gray-600 mt-0.5">Terkonfirmasi / Rekon / Dikirim</p>
        </div>
      ))}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

type TxTypeFilter    = 'all' | FinancialTxType;
type StatusFilter    = 'all' | FinancialTxStatus;

export default function AdminFinancialReport() {
  const { data: rows = [],     isLoading }  = useQuery({
    queryKey: qk.financialReport(),
    queryFn:  fetchFinancialReport,
  });
  const { data: charters = [] } = useQuery({
    queryKey: qk.charters(),
    queryFn:  fetchCharters,
  });

  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>('all');
  const [statusFilter, setStatus]   = useState<StatusFilter>('all');
  const [charterId,  setCharterId]  = useState<string>('all');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');

  const filtered = useMemo(() => {
    let r = rows;

    if (typeFilter !== 'all')
      r = r.filter(row => row.txType === typeFilter);

    if (statusFilter !== 'all')
      r = r.filter(row => row.status === statusFilter);

    if (charterId !== 'all')
      r = r.filter(row => row.charter?.id === charterId);

    if (dateFrom)
      r = r.filter(row => row.created_at >= dateFrom);

    if (dateTo) {
      const end = dateTo + 'T23:59:59';
      r = r.filter(row => row.created_at <= end);
    }

    if (search) {
      const q = search.toLowerCase();
      r = r.filter(row =>
        row.profile.name.toLowerCase().includes(q) ||
        (row.itemName?.toLowerCase().includes(q) ?? false) ||
        (row.charter?.name.toLowerCase().includes(q) ?? false),
      );
    }

    return r;
  }, [rows, typeFilter, statusFilter, charterId, dateFrom, dateTo, search]);

  const allStatuses = useMemo<FinancialTxStatus[]>(() => {
    const set = new Set<FinancialTxStatus>();
    rows.forEach(r => set.add(r.status));
    return Array.from(set);
  }, [rows]);

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Super Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="text-gold" size={32} />
          Laporan Keuangan
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Semua transaksi iuran, donasi, dan merchandise dalam satu tampilan.
        </p>
      </div>

      {/* Summary */}
      <SummaryCards rows={filtered} />

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6 space-y-3">
        {/* Row 1: search + date */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari nama, item, charter…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-gold/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest whitespace-nowrap">Dari</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest whitespace-nowrap">Sampai</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-[10px] text-gray-500 hover:text-gold transition-colors uppercase tracking-widest"
            >
              Reset
            </button>
          )}
        </div>

        {/* Row 2: type + status + charter chips */}
        <div className="flex flex-wrap gap-2">
          {/* Type */}
          {(['all', 'reunion_fee', 'donation', 'merchandise'] as TxTypeFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                typeFilter === t
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : 'text-gray-500 border border-white/5 hover:text-white hover:border-white/15'
              }`}
            >
              {t === 'all' ? 'Semua Tipe' : TX_LABELS[t]}
            </button>
          ))}

          <span className="w-px bg-white/10 mx-1" />

          {/* Status */}
          {(['all', ...allStatuses] as ('all' | FinancialTxStatus)[]).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                statusFilter === s
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : 'text-gray-500 border border-white/5 hover:text-white hover:border-white/15'
              }`}
            >
              {s === 'all' ? 'Semua Status' : STATUS_LABELS[s] ?? s}
            </button>
          ))}

          <span className="w-px bg-white/10 mx-1" />

          {/* Charter */}
          <select
            value={charterId}
            onChange={e => setCharterId(e.target.value)}
            className="bg-zinc-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50"
          >
            <option value="all">Semua Charter</option>
            {charters.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-right text-xs text-gray-600 mb-3">{filtered.length} transaksi</div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase animate-pulse">
          Memuat…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-600 text-sm">Tidak ada transaksi.</div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-gray-500 font-normal">Tanggal</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-gray-500 font-normal">Anggota</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-gray-500 font-normal">Charter</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-gray-500 font-normal">Tipe</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-gray-500 font-normal">Item / Keterangan</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-gray-500 font-normal">Status</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-gray-500 font-normal">Jumlah</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-gray-500 font-normal">Harga Jual</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-gray-500 font-normal">Margin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.01, 0.3) }}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Tanggal */}
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>

                    {/* Anggota */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.profile.avatar_url ? (
                          <img
                            src={row.profile.avatar_url}
                            alt={row.profile.name}
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                            <span className="text-[8px] font-bold text-gold">
                              {row.profile.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-white text-xs whitespace-nowrap">{row.profile.name}</span>
                      </div>
                    </td>

                    {/* Charter */}
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {row.charter?.name ?? <span className="text-gray-600">—</span>}
                    </td>

                    {/* Tipe */}
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${TX_COLORS[row.txType]}`}>
                        {TX_LABELS[row.txType]}
                      </span>
                    </td>

                    {/* Item */}
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {row.rowType === 'merchandise' && row.itemName
                        ? <>{row.itemName} <span className="text-gray-600">×{row.quantity}</span></>
                        : <span className="text-gray-600">—</span>
                      }
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[row.status] ?? 'bg-gray-500/10 text-gray-400'}`}>
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </td>

                    {/* Jumlah (effective payment) */}
                    <td className="px-4 py-3 text-right font-mono text-xs text-white whitespace-nowrap">
                      {formatRp(row.effectiveAmount)}
                      {row.effectiveAmount !== row.memberAmount && (
                        <div className="text-gray-600 line-through text-[10px]">
                          {formatRp(row.memberAmount)}
                        </div>
                      )}
                    </td>

                    {/* Harga Jual (merch catalog price only) */}
                    <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">
                      {row.totalRevenue != null
                        ? <span className="text-amber-400">{formatRp(row.totalRevenue)}</span>
                        : <span className="text-gray-600">—</span>
                      }
                    </td>

                    {/* Margin */}
                    <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">
                      {row.totalMargin != null
                        ? <span className="text-emerald-400">{formatRp(row.totalMargin)}</span>
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                  </motion.tr>
                ))}
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="border-t border-white/10 bg-white/[0.02]">
                  <td colSpan={6} className="px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500">
                    Total ({filtered.length})
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-white whitespace-nowrap">
                    {formatRp(filtered.reduce((s, r) => s + r.effectiveAmount, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-amber-400 whitespace-nowrap">
                    {formatRp(filtered.reduce((s, r) => s + (r.totalRevenue ?? 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-emerald-400 whitespace-nowrap">
                    {formatRp(filtered.reduce((s, r) => s + (r.totalMargin ?? 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

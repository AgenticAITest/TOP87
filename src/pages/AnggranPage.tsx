import { useState } from 'react';
import { Info, Receipt, ExternalLink, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { usePageContent } from '../hooks/usePageContent';
import { fetchExpenseCategories, fetchPublishedExpenses, qk, type ExpenseCategory, type Expense } from '../lib/queries';

interface AnggaranConfig {
  mode: 'per_person' | 'per_category';
  quota: number;
  items: { keterangan: string; amount: number }[];
  fee_per_orang?: number;
}

const DEFAULT_ANGGARAN_CONFIG: AnggaranConfig = {
  mode: 'per_person',
  quota: 122,
  items: [
    { keterangan: 'Akomodasi & Konsumsi Resort',          amount: 863000 },
    { keterangan: 'Lunch Hari Pertama (Prasmanan Sunda)', amount: 125000 },
    { keterangan: 'Outdoor Activity & Games',             amount: 210000 },
    { keterangan: 'Transportasi & Logistik',              amount: 200000 },
    { keterangan: 'Dokumentasi & Kenang-kenangan',        amount: 250000 },
    { keterangan: 'Panitia & Lain-lain',                  amount: 369000 },
  ],
};

const DEFAULT_NOTE =
  'Selisih dana yang terkumpul akan dialokasikan untuk Dana Sosial, Beasiswa & Yatim.';

function fmt(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function isImage(url: string) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
}

// ─── Realisasi tab ────────────────────────────────────────────────────────────

function RealisasiTab() {
  const [lightboxUrl,     setLightboxUrl]     = useState<string | null>(null);
  const [expandedCats,    setExpandedCats]    = useState<Set<string>>(new Set());

  const { data: categories = [], isLoading: catLoad } = useQuery({
    queryKey: qk.expenseCategories(),
    queryFn:  fetchExpenseCategories,
    staleTime: 5 * 60_000,
  });

  const { data: expenses = [], isLoading: expLoad } = useQuery({
    queryKey: qk.expenses(),
    queryFn:  fetchPublishedExpenses,
    staleTime: 2 * 60_000,
  });

  const isLoading = catLoad || expLoad;

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  function toggleCat(id: string) {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function expensesForCat(catId: string): Expense[] {
    return expenses.filter(e => e.category_id === catId);
  }

  const catsWithExpenses = categories.filter(c => expensesForCat(c.id).length > 0);

  if (isLoading) {
    return <div className="text-center py-20 text-gray-400 text-sm uppercase tracking-widest animate-pulse">Memuat…</div>;
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm">
        Belum ada pengeluaran yang dipublikasikan.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total card */}
      <div className="glass-card rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70 mb-1">Total Terpakai</p>
          <p className="font-serif text-3xl font-bold text-forest dark:text-white">{fmt(totalSpent)}</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
          {expenses.length} item pengeluaran<br />
          dari {catsWithExpenses.length} kategori
        </p>
      </div>

      {/* Per-category sections */}
      {catsWithExpenses.map(cat => {
        const rows    = expensesForCat(cat.id);
        const subtotal = rows.reduce((s, e) => s + e.amount, 0);
        const open    = expandedCats.has(cat.id);

        return (
          <div key={cat.id} className="glass-card rounded-xl overflow-hidden shadow-sm">
            {/* Category header — clickable to expand/collapse */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-50/30 dark:hover:bg-white/5 transition-colors"
              onClick={() => toggleCat(cat.id)}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{cat.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">({rows.length} item)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-forest dark:text-gold text-sm">{fmt(subtotal)}</span>
                {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </div>
            </button>

            {open && (
              <div className="border-t border-amber-100 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-amber-100 dark:border-white/5">
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">Tanggal</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">Keterangan</th>
                      <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">Jumlah</th>
                      <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">Bukti</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-800 dark:text-gray-200">
                    {rows.map((e, i) => (
                      <tr key={e.id}
                        className={`border-b border-amber-50 dark:border-white/5 ${i % 2 === 0 ? '' : 'bg-amber-50/30 dark:bg-white/3'}`}>
                        <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                          {new Date(e.expense_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-medium">{e.description}</p>
                          {e.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{e.notes}</p>}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">{fmt(e.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          {e.receipt_url ? (
                            isImage(e.receipt_url) ? (
                              <button onClick={() => setLightboxUrl(e.receipt_url)}>
                                <img src={e.receipt_url} alt="bukti"
                                  className="w-8 h-8 object-cover rounded border border-amber-200 dark:border-white/10 hover:border-gold/50 transition-colors cursor-pointer mx-auto" />
                              </button>
                            ) : (
                              <a href={e.receipt_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-gold hover:text-gold/70 transition-colors">
                                <Receipt size={13} /> Lihat
                              </a>
                            )
                          ) : (
                            <span className="text-gray-300 dark:text-gray-700">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-amber-200 dark:border-white/20">
                      <td colSpan={2} className="px-5 py-3 text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">
                        Subtotal {cat.name}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-forest dark:text-gold">
                        {fmt(subtotal)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Image lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <img src={lightboxUrl} alt="Bukti pengeluaran" className="w-full rounded-xl shadow-2xl" />
            <a href={lightboxUrl} target="_blank" rel="noopener noreferrer"
              className="absolute -top-10 right-10 text-white/70 hover:text-gold transition-colors">
              <ExternalLink size={20} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnggranPage() {
  const [tab, setTab] = useState<'anggaran' | 'realisasi'>('anggaran');
  const { data: cms } = usePageContent('anggaran');

  let config = DEFAULT_ANGGARAN_CONFIG;
  if (cms?.['items.config']) {
    try { config = JSON.parse(cms['items.config']) as AnggaranConfig; }
    catch { /* use defaults */ }
  }

  const mode  = config.mode  ?? 'per_person';
  const quota = config.quota ?? DEFAULT_ANGGARAN_CONFIG.quota;
  const items = config.items ?? DEFAULT_ANGGARAN_CONFIG.items;
  const note  = cms?.['notes.body'] ?? DEFAULT_NOTE;

  const sumAmount   = items.reduce((s, i) => s + (i.amount || 0), 0);
  const grandTotal  = mode === 'per_person' ? sumAmount * quota : sumAmount;
  const grandPerOrang = mode === 'per_person' ? sumAmount
                        : quota > 0 ? Math.round(sumAmount / quota) : 0;

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-forest dark:text-gold mb-2">Anggaran & Transparansi</h1>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Seluruh anggaran dan realisasi pengeluaran reuni dipublikasikan secara transparan untuk anggota alumni.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('anggaran')}
          className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
            tab === 'anggaran'
              ? 'bg-forest dark:bg-gold/20 text-white dark:text-gold border border-forest/80 dark:border-gold/30'
              : 'text-gray-500 dark:text-gray-400 border border-amber-200 dark:border-white/10 hover:border-amber-300 dark:hover:border-white/20'
          }`}>
          Anggaran
        </button>
        <button onClick={() => setTab('realisasi')}
          className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
            tab === 'realisasi'
              ? 'bg-forest dark:bg-gold/20 text-white dark:text-gold border border-forest/80 dark:border-gold/30'
              : 'text-gray-500 dark:text-gray-400 border border-amber-200 dark:border-white/10 hover:border-amber-300 dark:hover:border-white/20'
          }`}>
          Realisasi
        </button>
      </div>

      {/* ── Anggaran tab ── */}
      {tab === 'anggaran' && (
        <div className="glass-card p-6 rounded-xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-amber-200 dark:border-white/10">
                  <th className="py-3 font-medium text-gray-500 dark:text-gray-400 w-12">No</th>
                  <th className="py-3 font-medium text-gray-500 dark:text-gray-400">Keterangan</th>
                  <th className="py-3 font-medium text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">Total Biaya</th>
                  <th className="py-3 font-medium text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">Per Orang</th>
                </tr>
              </thead>
              <tbody className="text-gray-800 dark:text-gray-200">
                {items.map((item, i) => {
                  const perOrang   = mode === 'per_person' ? item.amount : (quota > 0 ? Math.round(item.amount / quota) : 0);
                  const totalBiaya = mode === 'per_person' ? item.amount * quota : item.amount;
                  return (
                    <tr key={i} className="border-b border-amber-100 dark:border-white/5 hover:bg-amber-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-4 text-gray-500 dark:text-gray-400">{i + 1}</td>
                      <td className="py-4 font-medium">{item.keterangan}</td>
                      <td className="py-4 text-right whitespace-nowrap">{fmt(totalBiaya)}</td>
                      <td className="py-4 text-right whitespace-nowrap">{fmt(perOrang)}</td>
                    </tr>
                  );
                })}
                <tr className="font-bold text-gray-900 dark:text-white bg-amber-50 dark:bg-white/10">
                  <td className="py-4 px-2" colSpan={2}>TOTAL ANGGARAN REUNI</td>
                  <td className="py-4 text-right whitespace-nowrap">{fmt(grandTotal)}</td>
                  <td className="py-4 text-right whitespace-nowrap">{fmt(grandPerOrang)}</td>
                </tr>
                {config.fee_per_orang ? (
                  <tr className="border-t-2 border-amber-300 text-amber-700">
                    <td colSpan={3} className="py-3 pr-4 text-right text-sm font-semibold">
                      Target Iuran Kebersamaan Per Orang
                    </td>
                    <td className="py-3 text-right whitespace-nowrap font-bold">
                      {fmt(config.fee_per_orang)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-start gap-2 border-t border-amber-100 dark:border-white/10 pt-4">
            <Info className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">{note}</p>
          </div>
        </div>
      )}

      {/* ── Realisasi tab ── */}
      {tab === 'realisasi' && <RealisasiTab />}
    </div>
  );
}

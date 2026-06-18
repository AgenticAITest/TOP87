import { Info } from 'lucide-react';
import { usePageContent } from '../hooks/usePageContent';

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

export default function AnggranPage() {
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

  const sumAmount  = items.reduce((s, i) => s + (i.amount || 0), 0);
  const grandTotal = mode === 'per_person' ? sumAmount * quota : sumAmount;
  const grandPerOrang = mode === 'per_person' ? sumAmount
                        : quota > 0 ? Math.round(sumAmount / quota) : 0;

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-forest dark:text-gold mb-2">Anggaran & Transparansi</h1>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Seluruh anggaran reuni dipublikasikan secara transparan untuk anggota alumni.
        </p>
      </div>

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
    </div>
  );
}

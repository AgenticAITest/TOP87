import { Info } from 'lucide-react';
import { usePageContent } from '../hooks/usePageContent';

interface BudgetItem {
  no?: number;
  keterangan: string;
  total: string;
  per_orang: string;
  is_total?: boolean;
}

const DEFAULT_BUDGET: BudgetItem[] = [
  { no: 1, keterangan: 'Akomodasi & Konsumsi Resort',          total: 'Rp 105.230.000', per_orang: 'Rp 863.000'   },
  { no: 2, keterangan: 'Lunch Hari Pertama (Prasmanan Sunda)',  total: 'Rp 15.258.000',  per_orang: 'Rp 125.000'   },
  { no: 3, keterangan: 'Outdoor Activity & Games',             total: 'Rp 25.620.000',  per_orang: 'Rp 210.000'   },
];
const DEFAULT_TOTAL = { total: 'Rp 246.108.000', per_orang: 'Rp 2.017.000' };
const DEFAULT_NOTE  =
  'Target dana terkumpul Rp 247.000.000. Selisih dana akan dialokasikan untuk Dana Sosial/Beasiswa & Yatim.';

export default function AnggranPage() {
  const { data: cms } = usePageContent('anggaran');

  let items = DEFAULT_BUDGET;
  let total = DEFAULT_TOTAL;
  if (cms?.['items.data']) {
    try {
      const parsed: BudgetItem[] = JSON.parse(cms['items.data']);
      const totalRow = parsed.find(r => r.is_total);
      items = parsed.filter(r => !r.is_total);
      if (totalRow) total = { total: totalRow.total, per_orang: totalRow.per_orang };
    } catch { /* use defaults */ }
  }

  const note = cms?.['notes.body'] ?? DEFAULT_NOTE;

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-forest mb-2">Anggaran & Transparansi</h1>
        <p className="text-gray-600 text-sm">
          Seluruh anggaran reuni dipublikasikan secara transparan untuk anggota alumni.
        </p>
      </div>

      <div className="glass-card p-6 rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-amber-200">
                <th className="py-3 font-medium text-gray-500 w-12">No</th>
                <th className="py-3 font-medium text-gray-500">Keterangan</th>
                <th className="py-3 font-medium text-gray-500 text-right whitespace-nowrap">Total Biaya</th>
                <th className="py-3 font-medium text-gray-500 text-right whitespace-nowrap">Per Orang</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {items.map((item, i) => (
                <tr key={i} className="border-b border-amber-100 hover:bg-amber-50/50 transition-colors">
                  <td className="py-4 text-gray-500">{item.no ?? i + 1}</td>
                  <td className="py-4 font-medium">{item.keterangan}</td>
                  <td className="py-4 text-right whitespace-nowrap">{item.total}</td>
                  <td className="py-4 text-right whitespace-nowrap">{item.per_orang}</td>
                </tr>
              ))}
              <tr className="font-bold text-gray-900 bg-amber-50">
                <td className="py-4 px-2" colSpan={2}>TOTAL ANGGARAN REUNI</td>
                <td className="py-4 text-right whitespace-nowrap">{total.total}</td>
                <td className="py-4 text-right whitespace-nowrap">{total.per_orang}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-start gap-2 border-t border-amber-100 pt-4">
          <Info className="w-4 h-4 text-gold shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 italic">{note}</p>
        </div>
      </div>
    </div>
  );
}

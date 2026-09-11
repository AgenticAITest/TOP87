import { Link } from 'react-router-dom';
import type { FeatureFlags } from '../../hooks/useFeatureFlags';

interface Props {
  totals: { confirmed: number; pending: number } | undefined;
  flags:  FeatureFlags | undefined;
}

/** "Merchandise Terpesan" — confirmed item count, or a placeholder while the feature is off. */
export default function MerchandiseCard({ totals, flags }: Props) {
  return (
    <div className="glass-card p-6 rounded-xl shadow-sm">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-700 dark:text-yellow-400 mr-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-200">Merchandise Terpesan</h3>
      </div>
      {flags?.merchandise ? (
        <>
          <p className="text-3xl font-bold font-serif text-gray-900 dark:text-gray-100 mb-1">
            {totals?.confirmed ?? 0}
            <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-1">item</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            terkonfirmasi
            {(totals?.pending ?? 0) > 0 && (
              <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                · {totals!.pending} menunggu
              </span>
            )}
          </p>
          <Link
            to="/merchandise"
            className="btn-primary w-full py-2 rounded text-sm font-bold flex items-center justify-center gap-2"
          >
            Lihat Katalog
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">Merchandise belum tersedia.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Katalog merchandise akan segera hadir.</p>
          <div className="pt-3 border-t border-amber-100 dark:border-amber-800/20 mt-8">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">Fitur aktif di fase berikutnya.</p>
          </div>
        </>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';
import type { FeatureFlags } from '../../hooks/useFeatureFlags';

interface Props {
  totalDana:    { reunion_fee: number; donation: number; merchandise_margin: number } | undefined;
  budgetTarget: number;
  flags:        FeatureFlags | undefined;
}

/** "Total Dana Terkumpul" — iuran + donasi (+ merch margin) against the budget target. */
export default function FundsCard({ totalDana, budgetTarget, flags }: Props) {
  const reunionFee  = totalDana?.reunion_fee       ?? 0;
  const donation    = totalDana?.donation           ?? 0;
  const merchMargin = totalDana?.merchandise_margin ?? 0;
  const grandTotal  = flags?.donations
    ? reunionFee + donation + (flags?.merchandise ? merchMargin : 0)
    : 0;
  const danaPct = budgetTarget > 0
    ? Math.min(Math.round((grandTotal / budgetTarget) * 100), 100)
    : 0;

  return (
    <div className="glass-card p-6 rounded-xl shadow-sm">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-orange-700 dark:text-orange-400 mr-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-200">Total Dana Terkumpul</h3>
      </div>
      <div className="flex items-end justify-between mb-2">
        <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Rp {grandTotal.toLocaleString('id-ID')}
        </span>
        <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{danaPct}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${danaPct}%`, background: 'linear-gradient(to right, #c67119, #a35a12)' }}
        />
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
        dari target Rp {budgetTarget.toLocaleString('id-ID')}
      </p>
      {flags?.donations ? (
        <>
          <div className="space-y-1 text-[11px] text-gray-500 dark:text-gray-400 mb-4">
            <div className="flex justify-between">
              <span>Iuran Reuni</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">Rp {reunionFee.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span>Donasi</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">Rp {donation.toLocaleString('id-ID')}</span>
            </div>
            {flags?.merchandise && merchMargin > 0 && (
              <div className="flex justify-between">
                <span>Margin Merchandise</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">Rp {merchMargin.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>
          <Link to="/payments" className="btn-primary w-full py-2 rounded text-sm font-bold flex items-center justify-center gap-2">
            Bayar Sekarang
          </Link>
        </>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          Pembayaran belum dibuka. Fitur akan aktif segera.
        </p>
      )}
    </div>
  );
}

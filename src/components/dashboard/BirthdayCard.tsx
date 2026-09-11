import { useQuery } from '@tanstack/react-query';
import { Cake } from 'lucide-react';
import { qk, fetchBirthdaysToday } from '../../lib/queries';

/**
 * "Ulang Tahun Hari Ini" — the alumni whose birthday falls today (Asia/Jakarta), from the
 * get_birthdays_today() RPC over the full roster, so unregistered alumni appear too.
 *
 * Roughly half the days of the year nobody has a birthday; that day shows the placeholder.
 * The busiest real day is 14 July with four people.
 */
export default function BirthdayCard() {
  const { data: people = [], isLoading, isError } = useQuery({
    queryKey: qk.birthdaysToday(),
    queryFn:  fetchBirthdaysToday,
    staleTime: 10 * 60_000,
    retry: false,
  });

  return (
    <div className="glass-card p-6 rounded-xl shadow-sm">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded text-pink-700 dark:text-pink-400 mr-3">
          <Cake className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-200 flex-grow">Ulang Tahun Hari Ini</h3>
        {people.length > 1 && (
          <span className="text-xs font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30 rounded-full px-2 py-0.5">
            {people.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest animate-pulse py-6 text-center">
          Memuat…
        </p>
      ) : isError || people.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            Belum ada yang berulang tahun hari ini
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {people.map((p, i) => (
            <div key={`${p.kelas}-${p.nama}-${i}`} className="flex items-center">
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={p.nama}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border border-pink-200 dark:border-pink-700/30 object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-700/30 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-pink-700 dark:text-pink-400">{p.nama.charAt(0)}</span>
                </div>
              )}
              <div className="ml-3 min-w-0">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate" title={p.nama}>
                  {p.nama}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {p.kelas} · HUT ke-{p.age}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

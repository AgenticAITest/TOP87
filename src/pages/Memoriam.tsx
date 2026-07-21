import { motion } from 'motion/react';
import { Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchMemorials, qk, type Memorial } from '../lib/queries';

const CLASS_ORDER = ['3A', '3B', '3C', '3D', '3E', '3F'];

export default function Memoriam() {
  const { data: memorials = [], isLoading } = useQuery({
    queryKey: qk.memorials(),
    queryFn:  fetchMemorials,
    staleTime: 10 * 60_000,
  });

  const grouped = CLASS_ORDER
    .map(kelas => ({ kelas, names: memorials.filter(m => m.kelas === kelas) }))
    .filter(g => g.names.length > 0);

  return (
    <div className="min-h-screen px-6 pt-28 pb-24">
      <div className="max-w-2xl mx-auto">

        {/* ── Candle + title ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center"
        >
          <div className="relative mb-6">
            <div className="absolute inset-0 -m-4 rounded-full bg-gold/20 blur-2xl" />
            <motion.div
              animate={{ opacity: [0.7, 1, 0.85, 1], scale: [1, 1.06, 0.97, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <Flame size={40} className="text-gold drop-shadow-[0_0_12px_rgba(212,175,55,0.6)]" strokeWidth={1.5} />
            </motion.div>
          </div>

          <p className="text-xs uppercase tracking-[0.4em] text-forest/70 dark:text-gold/70 mb-3">In Memoriam</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-forest dark:text-gold">
            Mengenang Sahabat
          </h1>
          <p className="mt-5 text-gray-600 dark:text-gray-400 leading-relaxed max-w-md">
            Mengenang sahabat-sahabat Angkatan '87 yang telah mendahului kita. Terima kasih atas
            kebersamaan dan kenangan yang tak terlupakan. Semoga tenang dalam keabadian.
          </p>

          {!isLoading && memorials.length > 0 && (
            <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-600">
              · {memorials.length} nama ·
            </p>
          )}
        </motion.div>

        {/* ── Divider ── */}
        <div className="my-12 flex items-center justify-center gap-3">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-gold/50" />
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/40" />
        </div>

        {/* ── Names ── */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-6 mx-auto bg-amber-100 dark:bg-white/10 rounded animate-pulse"
                style={{ width: `${45 + (i % 3) * 12}%` }} />
            ))}
          </div>
        ) : memorials.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-500 text-sm italic">Belum ada data.</p>
        ) : (
          <div className="space-y-12">
            {grouped.map((group, gi) => (
              <motion.section
                key={group.kelas}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: Math.min(gi * 0.05, 0.3) }}
              >
                <p className="text-center text-[11px] uppercase tracking-[0.35em] text-forest/70 dark:text-gold/60 mb-5">
                  Kelas {group.kelas}
                </p>
                <ul className="space-y-4">
                  {group.names.map((m: Memorial, i) => {
                    const alt = m.nama_update && m.nama_update !== m.nama_lengkap ? m.nama_update : null;
                    return (
                      <li key={`${group.kelas}-${i}`} className="text-center">
                        <p className="font-serif text-xl text-forest dark:text-gray-100 tracking-wide">
                          {m.nama_lengkap}
                        </p>
                        {alt && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 italic">{alt}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </motion.section>
            ))}
          </div>
        )}

        {/* ── Closing ── */}
        {!isLoading && memorials.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 text-center font-serif italic text-gray-500 dark:text-gray-500"
          >
            Kalian akan selalu ada di hati kami.
          </motion.p>
        )}
      </div>
    </div>
  );
}

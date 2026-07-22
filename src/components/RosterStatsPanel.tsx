import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { PieChart, Trophy, ArrowRight, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchRosterStats, qk, type RosterStat } from '../lib/queries';

// Category palette — status semantics, CVD-validated (worst adjacent ΔE 21.4). Gray for
// "Belum Daftar" is intentionally neutral. Every segment carries a text label, never color-alone.
const CATS = [
  { key: 'hadir',        label: 'Hadir',       color: '#22c55e' },
  { key: 'belum_tahu',   label: 'Belum Tahu',  color: '#f59e0b' },
  { key: 'belum_isi',    label: 'Belum Isi',   color: '#ef4444' },
  { key: 'rip',          label: 'Almarhum/ah', color: '#a855f7' },
  { key: 'belum_daftar', label: 'Belum Daftar',color: '#94a3b8' },
] as const;

type CatKey = typeof CATS[number]['key'];

function Donut({ segments, total }: { segments: { value: number; color: string }[]; total: number }) {
  const size = 150, stroke = 24;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const gap = total > 0 ? 2 : 0;
  let offset = 0;

  return (
    <div className="relative shrink-0 mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          className="stroke-gray-200 dark:stroke-white/5" />
        {segments.map((s, i) => {
          const raw = total > 0 ? (s.value / total) * C : 0;
          const len = Math.max(raw - gap, 0);
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
              strokeWidth={stroke} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}>
              <title>{`${s.value}`}</title>
            </circle>
          );
          offset += raw;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500">Total</span>
        <span className="font-serif text-3xl font-bold text-gray-900 dark:text-gray-100 leading-none">{total}</span>
      </div>
    </div>
  );
}

export default function RosterStatsPanel() {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: qk.rosterStats(),
    queryFn:  fetchRosterStats,
    staleTime: 5 * 60_000,
  });

  const totals = useMemo(() => {
    const t: Record<CatKey, number> & { total: number } = {
      hadir: 0, belum_tahu: 0, belum_isi: 0, rip: 0, belum_daftar: 0, total: 0,
    };
    for (const s of stats) {
      t.hadir += s.hadir; t.belum_tahu += s.belum_tahu; t.belum_isi += s.belum_isi;
      t.rip += s.rip; t.belum_daftar += s.belum_daftar; t.total += s.total;
    }
    return t;
  }, [stats]);

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map(i => <div key={i} className="glass-card p-6 rounded-xl shadow-sm h-72 animate-pulse" />)}
      </div>
    );
  }
  if (totals.total === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
    >
      {/* ── Card 1 — Pie ── */}
      <div className="glass-card p-6 rounded-xl shadow-sm">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-gold/10 rounded text-gold mr-3"><PieChart className="w-5 h-5" /></div>
          <h3 className="font-bold text-gray-800 dark:text-gray-200">Rekap Kehadiran</h3>
        </div>
        <Donut segments={CATS.map(c => ({ value: totals[c.key], color: c.color }))} total={totals.total} />
        <div className="mt-5 space-y-1.5">
          {CATS.map(c => (
            <div key={c.key} className="flex items-center gap-2.5 text-sm">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-gray-600 dark:text-gray-300 flex-1">{c.label}</span>
              <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{totals[c.key]}</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums w-10 text-right">
                {pct(totals[c.key], totals.total)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Card 2 — Attendance per Kelas (the race) ── */}
      <div className="glass-card p-6 rounded-xl shadow-sm">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded text-green-700 dark:text-green-400 mr-3">
            <Trophy className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-gray-800 dark:text-gray-200">Kehadiran per Kelas</h3>
        </div>
        <div className="space-y-3">
          {stats.map((s: RosterStat) => {
            const rate = pct(s.hadir, s.total);
            return (
              <Link
                key={s.kelas}
                to={`/kehadiran/${s.kelas}`}
                className="block group"
                title={`Lihat daftar Kelas ${s.kelas}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-gray-800 dark:text-gray-200 w-8">{s.kelas}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums flex-1">
                    {s.hadir}<span className="text-gray-400 dark:text-gray-600">/{s.total}</span>
                  </span>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400 tabular-nums">{rate}%</span>
                  <ChevronRight size={13} className="text-gray-300 dark:text-gray-600 group-hover:text-gold transition-colors" />
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full transition-all group-hover:bg-green-400"
                    style={{ width: `${rate}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-4 italic">Klik kelas untuk lihat daftar teman.</p>
      </div>

      {/* ── Card 3 — CTA ── */}
      <div className="glass-card p-6 rounded-xl shadow-sm flex flex-col items-center justify-center text-center">
        <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Masih Ada</p>
        <p className="font-serif text-6xl font-bold text-gold leading-none mb-2">{totals.belum_daftar}</p>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">teman belum mendaftar</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-5 leading-relaxed">
          Yuk bantu hubungi teman sekelasmu agar reuni kita makin ramai!
        </p>
        <Link to="/directory"
          className="btn-primary w-full py-2.5 rounded text-sm font-bold flex items-center justify-center gap-2">
          Lihat Directory <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
}

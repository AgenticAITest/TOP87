import { useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchClassRoster, qk, type ClassRosterMember } from '../lib/queries';

const CLASSES = ['3A', '3B', '3C', '3D', '3E', '3F'];

// Display groups, in order. Each has a predicate over a roster member.
const GROUPS = [
  { key: 'hadir',        label: 'Hadir',       dot: '#22c55e', test: (m: ClassRosterMember) => !m.rip && m.status === 'hadir' },
  { key: 'belum_tahu',   label: 'Belum Tahu',  dot: '#f59e0b', test: (m: ClassRosterMember) => !m.rip && m.status === 'belum_tahu' },
  { key: 'belum_isi',    label: 'Belum Isi',   dot: '#ef4444', test: (m: ClassRosterMember) => !m.rip && m.status === 'belum_isi' },
  { key: 'belum_daftar', label: 'Belum Daftar',dot: '#94a3b8', test: (m: ClassRosterMember) => !m.rip && m.status === null },
  { key: 'rip',          label: 'Almarhum/ah', dot: '#a855f7', test: (m: ClassRosterMember) => m.rip },
] as const;

export default function ClassRoster() {
  const { kelas = '' } = useParams<{ kelas: string }>();
  const valid = CLASSES.includes(kelas);

  const { data: members = [], isLoading } = useQuery({
    queryKey: qk.classRoster(kelas),
    queryFn:  () => fetchClassRoster(kelas),
    enabled:  valid,
    staleTime: 5 * 60_000,
  });

  const grouped = useMemo(
    () => GROUPS.map(g => ({ ...g, members: members.filter(g.test) })),
    [members],
  );
  const hadir = grouped.find(g => g.key === 'hadir')?.members.length ?? 0;
  const rate  = members.length > 0 ? Math.round((hadir / members.length) * 100) : 0;

  if (!valid) return <Navigate to="/home" replace />;

  return (
    <div className="p-6 md:p-8 pb-16">
      <div className="max-w-3xl mx-auto">

        <Link to="/home" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-gray-500 hover:text-forest dark:hover:text-gold transition-colors mb-6">
          <ArrowLeft size={13} /> Dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-gold" size={18} />
            <span className="text-xs uppercase tracking-[0.3em] text-gold/70">Kehadiran Kelas</span>
          </div>
          <div className="flex items-end justify-between flex-wrap gap-3">
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-forest dark:text-gold">{kelas}</h1>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{hadir}<span className="text-gray-400 dark:text-gray-600 text-lg">/{members.length}</span></p>
              <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400">{rate}% Hadir</p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 glass-card rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(g => g.members.length === 0 ? null : (
              <section key={g.key}>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: g.dot }} />
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600 dark:text-gray-300">{g.label}</h2>
                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{g.members.length}</span>
                </div>
                <div className="glass-card rounded-xl divide-y divide-gray-200/60 dark:divide-white/5 overflow-hidden">
                  {g.members.map((m, i) => {
                    const alt = m.nama_update && m.nama_update !== m.nama_lengkap ? m.nama_update : null;
                    return (
                      <div key={`${g.key}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-gold">{m.nama_lengkap.charAt(0)}</span>
                        </span>
                        <div className="min-w-0">
                          <p className={`text-sm truncate ${g.key === 'rip' ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                            {m.nama_lengkap}
                          </p>
                          {alt && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate italic">{alt}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

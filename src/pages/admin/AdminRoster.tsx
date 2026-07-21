import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Loader, Link2, Link2Off, Check, Sparkles, ChevronDown, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminStatus } from '../../hooks/useAdminStatus';
import {
  fetchAlumniRoster, fetchRosterCandidates, linkRosterProfile, unlinkRosterProfile,
  qk, type RosterEntry, type RosterCandidate,
} from '../../lib/queries';

const CLASSES = ['3A', '3B', '3C', '3D', '3E', '3F'] as const;
type ClassTab  = 'all' | typeof CLASSES[number];
type LinkFilter = 'all' | 'linked' | 'unlinked' | 'suggested';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  hadir:      { label: 'Hadir',      cls: 'bg-green-500/10 text-green-400' },
  belum_tahu: { label: 'Belum Tahu', cls: 'bg-yellow-500/10 text-yellow-400' },
  belum_isi:  { label: 'Belum Isi',  cls: 'bg-white/5 text-gray-400' },
};

// ─── Name matching (roster ↔ account) ─────────────────────────────────────────
// Names changed a lot (spelling, marriage, Chinese→Indonesian), so we score token overlap
// rather than exact-match, and let the admin confirm every link.

function tokens(s: string | null): Set<string> {
  return new Set(
    (s ?? '').toUpperCase().replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(t => t.length > 1)
  );
}
function overlap(a: string | null, b: string | null): number {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / Math.max(A.size, B.size);   // 0..1
}
// Best name score between a roster row (lengkap + update) and a candidate (name + nickname).
function nameScore(r: RosterEntry, c: RosterCandidate): number {
  return Math.max(
    overlap(r.nama_update, c.name), overlap(r.nama_lengkap, c.name),
    overlap(r.nama_update, c.nickname), overlap(r.nama_lengkap, c.nickname),
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ url, name, size = 'md' }: { url: string | null; name: string | null; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-sm';
  return url ? (
    <img src={url} alt={name ?? ''} referrerPolicy="no-referrer" className={`${dim} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${dim} rounded-full bg-gold/10 flex items-center justify-center shrink-0`}>
      <span className="font-serif font-bold text-gold">{name?.charAt(0) ?? '?'}</span>
    </div>
  );
}

// ─── Roster row ───────────────────────────────────────────────────────────────

function RosterRow({
  entry, suggestion, candidatesUnlinked, busy, onLink, onUnlink,
}: {
  entry:               RosterEntry;
  suggestion:          { candidate: RosterCandidate; score: number } | null;
  candidatesUnlinked:  RosterCandidate[];
  busy:                boolean;
  onLink:              (rosterId: string, profileId: string) => void;
  onUnlink:            (rosterId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [q, setQ] = useState('');

  const displayName = entry.nama_update ?? entry.nama_lengkap;
  const linked = entry.profile;
  const status = entry.status ? STATUS_BADGE[entry.status] : null;

  const searchResults = useMemo(() => {
    if (q.trim().length < 2) return [];
    const needle = q.toLowerCase();
    return candidatesUnlinked
      .filter(c => (c.name ?? '').toLowerCase().includes(needle)
        || (c.nickname ?? '').toLowerCase().includes(needle)
        || (c.city ?? '').toLowerCase().includes(needle))
      .slice(0, 6);
  }, [q, candidatesUnlinked]);

  return (
    <div className={`rounded-xl border transition-colors ${linked ? 'border-green-500/20 bg-green-500/[0.03]' : 'border-white/10'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-[10px] font-mono text-gray-600 w-6 text-right shrink-0">{entry.absen}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white truncate">{displayName}</span>
            {entry.rip && <span className="text-red-400 text-xs shrink-0" title="Deceased">✝</span>}
            {status && (
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${status.cls}`}>
                {status.label}
              </span>
            )}
          </div>
          {entry.nama_update && (
            <p className="text-[11px] text-gray-600 truncate">roster: {entry.nama_lengkap}</p>
          )}
        </div>

        {/* Link state / actions */}
        {linked ? (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full pl-1 pr-2.5 py-0.5">
              <Avatar url={linked.avatar_url} name={linked.name} size="sm" />
              <span className="text-xs text-green-300 max-w-[120px] truncate">{linked.name ?? '—'}</span>
            </div>
            <button onClick={() => onUnlink(entry.id)} disabled={busy} title="Unlink"
              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-40">
              <Link2Off size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            {suggestion && (
              <button
                onClick={() => onLink(entry.id, suggestion.candidate.id)}
                disabled={busy}
                title={`Link to ${suggestion.candidate.name} (${Math.round(suggestion.score * 100)}% match)`}
                className="flex items-center gap-1.5 text-xs font-bold text-gold border border-gold/30 bg-gold/5 pl-1.5 pr-3 py-1 rounded-full hover:bg-gold/15 transition-all disabled:opacity-40 max-w-[190px]"
              >
                <Sparkles size={11} className="shrink-0" />
                <Avatar url={suggestion.candidate.avatar_url} name={suggestion.candidate.name} size="sm" />
                <span className="truncate">{suggestion.candidate.name}</span>
              </button>
            )}
            <button
              onClick={() => setExpanded(e => !e)}
              className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border transition-all ${
                expanded ? 'border-gold/30 text-gold bg-gold/5' : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              <Search size={11} /> Search
              <ChevronDown size={11} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Manual search panel */}
      <AnimatePresence>
        {expanded && !linked && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }} className="overflow-hidden border-t border-white/5">
            <div className="px-4 py-3 space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search registered accounts (name / nickname / city)…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
                />
              </div>
              {q.trim().length < 2 ? (
                <p className="text-[11px] text-gray-600 px-1">Type at least 2 letters.</p>
              ) : searchResults.length === 0 ? (
                <p className="text-[11px] text-gray-600 px-1">No unlinked account matches.</p>
              ) : (
                <div className="space-y-1">
                  {searchResults.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { onLink(entry.id, c.id); setExpanded(false); setQ(''); }}
                      disabled={busy}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left disabled:opacity-40"
                    >
                      <Avatar url={c.avatar_url} name={c.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{c.name ?? '—'}{c.nickname ? ` (${c.nickname})` : ''}</p>
                        <p className="text-[10px] text-gray-600 truncate">{[c.kelas, c.city].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                      <Link2 size={12} className="text-gold/60 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRoster() {
  const { user } = useAuth();
  const { isSuperAdmin, loading: roleLoad } = useAdminStatus();
  const queryClient = useQueryClient();

  const [classTab,  setClassTab]  = useState<ClassTab>('all');
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('all');
  const [search,    setSearch]    = useState('');
  const [showUnmapped, setShowUnmapped] = useState(false);

  const { data: roster = [],     isLoading: rosterLoading } = useQuery({ queryKey: qk.roster(),           queryFn: fetchAlumniRoster });
  const { data: candidates = [], isLoading: candLoading }   = useQuery({ queryKey: qk.rosterCandidates(), queryFn: fetchRosterCandidates });

  const linkedProfileIds = useMemo(
    () => new Set(roster.map(r => r.profile_id).filter(Boolean) as string[]),
    [roster],
  );
  const candidatesUnlinked = useMemo(
    () => candidates.filter(c => !linkedProfileIds.has(c.id)),
    [candidates, linkedProfileIds],
  );

  // Best suggestion per unlinked, living roster row.
  const suggestions = useMemo(() => {
    const map = new Map<string, { candidate: RosterCandidate; score: number }>();
    for (const r of roster) {
      if (r.profile_id || r.rip) continue;
      let best: RosterCandidate | null = null;
      let bestScore = 0;
      for (const c of candidatesUnlinked) {
        const base = nameScore(r, c);
        if (base <= 0) continue;
        const s = base + (c.kelas === r.kelas ? 0.2 : 0);   // same-class boost as tiebreaker
        if (s > bestScore) { bestScore = s; best = c; }
      }
      if (best) {
        const base = nameScore(r, best);
        const sameClass = best.kelas === r.kelas;
        if (base >= 0.34 || (sameClass && base >= 0.25)) {
          map.set(r.id, { candidate: best, score: Math.min(bestScore, 1) });
        }
      }
    }
    return map;
  }, [roster, candidatesUnlinked]);

  const stats = useMemo(() => {
    const living = roster.filter(r => !r.rip);
    return {
      total:     roster.length,
      living:    living.length,
      linked:    roster.filter(r => r.profile_id).length,
      unlinked:  living.filter(r => !r.profile_id).length,
      unmapped:  candidatesUnlinked.length,
    };
  }, [roster, candidatesUnlinked]);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return roster.filter(r => {
      if (classTab !== 'all' && r.kelas !== classTab) return false;
      if (linkFilter === 'linked'    && !r.profile_id) return false;
      if (linkFilter === 'unlinked'  && (r.profile_id || r.rip)) return false;
      if (linkFilter === 'suggested' && !suggestions.has(r.id)) return false;
      if (needle) {
        const hay = `${r.nama_lengkap} ${r.nama_update ?? ''} ${r.profile?.name ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [roster, classTab, linkFilter, search, suggestions]);

  const linkMut = useMutation({
    mutationFn: ({ rosterId, profileId }: { rosterId: string; profileId: string }) =>
      linkRosterProfile(rosterId, profileId, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.roster() }),
  });
  const unlinkMut = useMutation({
    mutationFn: (rosterId: string) => unlinkRosterProfile(rosterId, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.roster() }),
  });
  const busy = linkMut.isPending || unlinkMut.isPending;

  if (roleLoad) return (
    <div className="p-8 min-h-screen flex items-center justify-center text-gray-600 text-sm tracking-widest uppercase animate-pulse">Loading…</div>
  );
  if (!isSuperAdmin) return <Navigate to="/admin" replace />;

  const pct = stats.living > 0 ? Math.round((stats.linked / stats.living) * 100) : 0;

  return (
    <div className="p-8 min-h-screen max-w-4xl">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Super Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white">Roster Matching</h1>
        <p className="text-gray-500 text-sm mt-1">Link the Class of '87 rollcall to registered member accounts.</p>
      </div>

      {(linkMut.error || unlinkMut.error) && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Failed to update link: {((linkMut.error ?? unlinkMut.error) as Error).message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glass rounded-xl p-4">
          <p className="text-2xl font-bold font-serif text-green-400">{stats.linked}<span className="text-sm text-gray-600">/{stats.living}</span></p>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Linked ({pct}%)</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-2xl font-bold font-serif text-yellow-400">{stats.unlinked}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Not Linked</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-2xl font-bold font-serif text-sky-400">{suggestions.size}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Suggested</p>
        </div>
        <button onClick={() => setShowUnmapped(s => !s)}
          className={`glass rounded-xl p-4 text-left transition-colors ${showUnmapped ? 'border-gold/30' : 'hover:border-white/15'}`}>
          <p className="text-2xl font-bold font-serif text-purple-400">{stats.unmapped}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Unlinked Accounts</p>
        </button>
      </div>

      {/* Unmapped accounts panel */}
      <AnimatePresence>
        {showUnmapped && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }} className="overflow-hidden mb-6">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-purple-400" />
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">Registered accounts not yet linked</h2>
              </div>
              <p className="text-[11px] text-gray-500 mb-3">
                These members have an account but aren't linked to a roster row yet. Find their name in
                the roster list below, then link them from that row.
              </p>
              {candidatesUnlinked.length === 0 ? (
                <p className="text-sm text-gray-600">All accounts are linked. 🎉</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {candidatesUnlinked.map(c => (
                    <div key={c.id} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full pl-1 pr-3 py-0.5">
                      <Avatar url={c.avatar_url} name={c.name} size="sm" />
                      <span className="text-xs text-gray-300">{c.name ?? '—'}</span>
                      {c.kelas && <span className="text-[9px] text-gray-600 uppercase">{c.kelas}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input type="text" placeholder="Search name…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['all', ...CLASSES] as ClassTab[]).map(c => (
            <button key={c} onClick={() => setClassTab(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                classTab === c ? 'bg-gold/15 text-gold border border-gold/30' : 'text-gray-500 border border-white/5 hover:text-white hover:border-white/15'
              }`}>
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 flex-wrap mb-4">
        {([['all', 'All'], ['linked', 'Linked'], ['unlinked', 'Not Linked'], ['suggested', 'Suggested']] as [LinkFilter, string][]).map(([f, lbl]) => (
          <button key={f} onClick={() => setLinkFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              linkFilter === f ? 'bg-white/10 text-white border border-white/20' : 'text-gray-500 border border-white/5 hover:text-white hover:border-white/15'
            }`}>
            {lbl}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-gray-600">{filtered.length} rows</span>
      </div>

      {/* Roster list */}
      {rosterLoading || candLoading ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase animate-pulse">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-600 text-sm">No rows.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry, i) => (
            <motion.div key={entry.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.01, 0.25) }}>
              <RosterRow
                entry={entry}
                suggestion={suggestions.get(entry.id) ?? null}
                candidatesUnlinked={candidatesUnlinked}
                busy={busy}
                onLink={(rosterId, profileId) => linkMut.mutate({ rosterId, profileId })}
                onUnlink={(rosterId) => unlinkMut.mutate(rosterId)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

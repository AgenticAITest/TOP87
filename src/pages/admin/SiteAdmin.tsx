import { useState, useMemo, ReactNode } from 'react';
import { motion } from 'motion/react';
import { Check, Loader, HardDrive, Cloud, Shuffle, List, Search, X, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStorageBackend, setStorageBackend, type StorageBackend } from '../../lib/storage';
import {
  getFeaturedConfig, setFeaturedConfig,
  fetchApprovedMembers,
  type FeaturedMode, type FeaturedConfig,
  qk,
} from '../../lib/queries';

// ─── Storage backend ──────────────────────────────────────────────────────────

const BACKENDS: { id: StorageBackend; label: string; description: string; icon: ReactNode }[] = [
  {
    id: 'supabase',
    label: 'Supabase Storage',
    description: 'Free tier storage built into the project. Limited to 1 GB total.',
    icon: <Cloud size={20} />,
  },
  {
    id: 'vps',
    label: 'VPS (top87.id)',
    description: '94 GB free on srv1664106.hstgr.cloud. Files served via media.top87.id.',
    icon: <HardDrive size={20} />,
  },
];

// ─── Featured members ─────────────────────────────────────────────────────────

const INTERVALS = [
  { value: 10,  label: '10 seconds' },
  { value: 15,  label: '15 seconds' },
  { value: 30,  label: '30 seconds' },
  { value: 60,  label: '1 minute' },
  { value: 120, label: '2 minutes' },
];

const MODES: { id: FeaturedMode; label: string; description: string; icon: ReactNode }[] = [
  {
    id: 'random',
    label: 'Auto-rotate',
    description: 'Shuffles all approved members and cycles through groups of 4 on a timer.',
    icon: <Shuffle size={18} />,
  },
  {
    id: 'manual',
    label: 'Manual pick',
    description: 'You choose exactly which 4 members to spotlight on the homepage.',
    icon: <List size={18} />,
  },
];

type ApprovedMember = Awaited<ReturnType<typeof fetchApprovedMembers>>[number];

// ─── Main component ───────────────────────────────────────────────────────────

export default function SiteAdmin() {
  const queryClient = useQueryClient();

  // ── Storage state ──
  const [storageSaved, setStorageSaved] = useState(false);
  const { data: currentBackend, isLoading: backendLoading } = useQuery({
    queryKey: ['site_settings', 'storage_backend'],
    queryFn:  getStorageBackend,
  });
  const [selectedBackend, setSelectedBackend] = useState<StorageBackend | null>(null);
  const activeBackend = selectedBackend ?? currentBackend ?? 'supabase';

  const storageMutation = useMutation({
    mutationFn: () => setStorageBackend(activeBackend),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_settings'] });
      setStorageSaved(true);
      setTimeout(() => setStorageSaved(false), 2000);
    },
  });

  // ── Featured members state ──
  const [featuredSaved, setFeaturedSaved] = useState(false);
  const [memberSearch, setMemberSearch]   = useState('');

  const { data: featuredConfig, isLoading: featuredLoading } = useQuery({
    queryKey: ['site_settings', 'featured'],
    queryFn:  getFeaturedConfig,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: qk.members(),
    queryFn:  fetchApprovedMembers,
    staleTime: 1000 * 60 * 5,
  });

  const [localMode,      setLocalMode]      = useState<FeaturedMode | null>(null);
  const [localIds,       setLocalIds]       = useState<string[] | null>(null);
  const [localInterval,  setLocalInterval]  = useState<number | null>(null);

  const mode     = localMode     ?? featuredConfig?.mode     ?? 'random';
  const ids      = localIds      ?? featuredConfig?.memberIds ?? [];
  const interval = localInterval ?? featuredConfig?.interval  ?? 15;

  const featuredMutation = useMutation({
    mutationFn: () => setFeaturedConfig({ mode, memberIds: ids, interval }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_settings', 'featured'] });
      setFeaturedSaved(true);
      setTimeout(() => setFeaturedSaved(false), 2000);
    },
  });

  const featuredDirty =
    mode     !== (featuredConfig?.mode ?? 'random') ||
    interval !== (featuredConfig?.interval ?? 15)   ||
    JSON.stringify(ids) !== JSON.stringify(featuredConfig?.memberIds ?? []);

  // Member search helpers
  const searchResults = useMemo(() => {
    if (!memberSearch.trim()) return [];
    const q = memberSearch.toLowerCase();
    return allMembers
      .filter(m => !ids.includes(m.id))
      .filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.city?.toLowerCase().includes(q) ||
        m.profession?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [memberSearch, allMembers, ids]);

  const selectedMembers = ids
    .map(id => allMembers.find(m => m.id === id))
    .filter(Boolean) as ApprovedMember[];

  function addMember(m: ApprovedMember) {
    if (ids.length >= 4) return;
    setLocalIds([...ids, m.id]);
    setMemberSearch('');
  }

  function removeMember(id: string) {
    setLocalIds(ids.filter(i => i !== id));
  }

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white">Site Settings</h1>
      </div>

      <div className="max-w-2xl space-y-8">

        {/* ── Storage backend ── */}
        <section className="glass rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-1">Media Storage</h2>
          <p className="text-gray-500 text-sm mb-6">
            New uploads go to the active backend. Existing files stay where they are — switching is non-destructive.
          </p>

          {backendLoading ? (
            <div className="text-gray-600 text-xs uppercase tracking-widest animate-pulse">Loading…</div>
          ) : (
            <div className="space-y-3 mb-6">
              {BACKENDS.map(b => (
                <motion.button key={b.id} type="button" whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedBackend(b.id)}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                    activeBackend === b.id
                      ? 'border-gold/40 bg-gold/5'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                  }`}>
                  <div className={`mt-0.5 ${activeBackend === b.id ? 'text-gold' : 'text-gray-500'}`}>{b.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold mb-0.5 ${activeBackend === b.id ? 'text-white' : 'text-gray-400'}`}>{b.label}</p>
                    <p className="text-xs text-gray-600 leading-snug">{b.description}</p>
                  </div>
                  {activeBackend === b.id && (
                    <div className="w-5 h-5 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} className="text-gold" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          )}

          <button onClick={() => storageMutation.mutate()}
            disabled={storageMutation.isPending || activeBackend === currentBackend}
            className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 px-6 rounded-full transition-all disabled:opacity-40 uppercase tracking-widest text-xs">
            {storageMutation.isPending
              ? <><Loader size={14} className="animate-spin" /> Saving…</>
              : storageSaved
                ? <><Check size={14} /> Saved</>
                : 'Save'}
          </button>

          {storageMutation.isError && (
            <p className="text-red-400 text-xs mt-3">{(storageMutation.error as Error).message}</p>
          )}

          {activeBackend === 'vps' && (
            <div className="mt-4 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/15">
              <p className="text-yellow-400/80 text-xs leading-relaxed">
                VPS backend requires the upload server running on{' '}
                <code className="font-mono text-yellow-300/80">media.top87.id</code>.
              </p>
            </div>
          )}
        </section>

        {/* ── Featured Members ── */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-gold/60" />
            <h2 className="text-white font-bold text-lg">Featured Members</h2>
          </div>
          <p className="text-gray-500 text-sm mb-6">
            Controls the spotlight section on the homepage below Charter Spotlight.
          </p>

          {featuredLoading ? (
            <div className="text-gray-600 text-xs uppercase tracking-widest animate-pulse">Loading…</div>
          ) : (
            <div className="space-y-6">

              {/* Mode selector */}
              <div className="space-y-3">
                {MODES.map(m => (
                  <motion.button key={m.id} type="button" whileTap={{ scale: 0.99 }}
                    onClick={() => setLocalMode(m.id)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                      mode === m.id
                        ? 'border-gold/40 bg-gold/5'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                    }`}>
                    <div className={`mt-0.5 ${mode === m.id ? 'text-gold' : 'text-gray-500'}`}>{m.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold mb-0.5 ${mode === m.id ? 'text-white' : 'text-gray-400'}`}>{m.label}</p>
                      <p className="text-xs text-gray-600 leading-snug">{m.description}</p>
                    </div>
                    {mode === m.id && (
                      <div className="w-5 h-5 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={11} className="text-gold" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Random: interval picker */}
              {mode === 'random' && (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Rotation interval</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERVALS.map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setLocalInterval(opt.value)}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                          interval === opt.value
                            ? 'bg-gold/15 text-gold border border-gold/30'
                            : 'glass text-gray-500 border border-white/5 hover:border-white/15 hover:text-white'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual: member picker */}
              {mode === 'manual' && (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-3">
                    Selected members ({ids.length}/4)
                  </label>

                  {/* Selected list */}
                  {selectedMembers.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {selectedMembers.map(m => (
                        <div key={m.id} className="flex items-center gap-3 glass rounded-xl px-4 py-2.5">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt={m.name ?? ''} referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                              <span className="font-serif font-bold text-gold text-sm">{m.name?.charAt(0)}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{m.name}</p>
                            {(m.profession || m.primaryCharter) && (
                              <p className="text-xs text-gray-600 truncate">
                                {m.profession ?? m.primaryCharter?.name}
                              </p>
                            )}
                          </div>
                          <button type="button" onClick={() => removeMember(m.id)}
                            className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Search to add */}
                  {ids.length < 4 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <input
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        placeholder="Search members to add…"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden z-10 shadow-xl">
                          {searchResults.map(m => (
                            <button key={m.id} type="button" onClick={() => addMember(m)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                              {m.avatar_url ? (
                                <img src={m.avatar_url} alt={m.name ?? ''} referrerPolicy="no-referrer"
                                  className="w-7 h-7 rounded-lg object-cover shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                                  <span className="font-serif font-bold text-gold text-xs">{m.name?.charAt(0)}</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm text-white truncate">{m.name}</p>
                                {m.profession && <p className="text-xs text-gray-500 truncate">{m.profession}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {ids.length === 0 && (
                    <p className="text-xs text-gray-600 mt-3">Search for members above to fill the 4 spotlight slots.</p>
                  )}
                </div>
              )}

              {/* Save */}
              {featuredMutation.isError && (
                <p className="text-red-400 text-xs">{(featuredMutation.error as Error).message}</p>
              )}

              <button onClick={() => featuredMutation.mutate()}
                disabled={featuredMutation.isPending || !featuredDirty}
                className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 px-6 rounded-full transition-all disabled:opacity-40 uppercase tracking-widest text-xs">
                {featuredMutation.isPending
                  ? <><Loader size={14} className="animate-spin" /> Saving…</>
                  : featuredSaved
                    ? <><Check size={14} /> Saved</>
                    : 'Save'}
              </button>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

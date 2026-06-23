import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShieldCheck, UserPlus, X, Loader, ChevronDown, Landmark } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminStatus } from '../../hooks/useAdminStatus';
import { fetchCharters, grantFinanceAdmin, revokeFinanceAdmin, qk } from '../../lib/queries';

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchAdmins() {
  const [{ data: sData }, { data: cData }, { data: fData }] = await Promise.all([
    supabase.from('profiles').select('id, name, avatar_url').eq('is_super_admin', true).order('name'),
    supabase.from('charter_admins').select('profile_id, charter_id, profiles(id, name, avatar_url), charters(id, name)'),
    supabase.from('finance_admins').select('profile_id, profiles(id, name, avatar_url)'),
  ]);
  return {
    superAdmins: (sData ?? []).map((p: any) => ({
      id: p.id as string,
      name: p.name as string | null,
      avatar_url: p.avatar_url as string | null,
    })),
    charterAdmins: (cData ?? []).map((r: any) => ({
      profile_id:   r.profile_id as string,
      charter_id:   r.charter_id as string,
      name:         (r.profiles?.name   ?? null) as string | null,
      avatar_url:   (r.profiles?.avatar_url ?? null) as string | null,
      charter_name: (r.charters?.name   ?? null) as string | null,
    })),
    financeAdmins: (fData ?? []).map((r: any) => ({
      profile_id: r.profile_id as string,
      name:       (r.profiles?.name       ?? null) as string | null,
      avatar_url: (r.profiles?.avatar_url ?? null) as string | null,
    })),
  };
}

async function fetchApprovedForGrant() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, city, is_super_admin')
    .eq('status', 'approved')
    .order('name');
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id:             p.id as string,
    name:           p.name as string | null,
    avatar_url:     p.avatar_url as string | null,
    city:           p.city as string | null,
    is_super_admin: p.is_super_admin as boolean,
  }));
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  return url ? (
    <img src={url} alt={name ?? ''} referrerPolicy="no-referrer"
      className="w-9 h-9 rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
      <span className="font-serif font-bold text-gold text-sm">{name?.charAt(0) ?? '?'}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRoles() {
  const { user }                            = useAuth();
  const { isSuperAdmin, loading: roleLoad } = useAdminStatus();
  const queryClient                         = useQueryClient();
  const [searchParams]                      = useSearchParams();

  const [search, setSearch]       = useState(() => searchParams.get('q') ?? '');
  const [expandedId, setExpanded] = useState<string | null>(null);

  const { data: admins,  isLoading: adminsLoading }   = useQuery({ queryKey: ['admin', 'roles'],         queryFn: fetchAdmins });
  const { data: members = [], isLoading: membersLoading } = useQuery({ queryKey: ['admin', 'roles', 'members'], queryFn: fetchApprovedForGrant });
  const { data: charters = [] }                        = useQuery({ queryKey: ['charters'], queryFn: fetchCharters, staleTime: 60_000 * 5 });

  const superMut = useMutation({
    mutationFn: async ({ profileId, grant }: { profileId: string; grant: boolean }) => {
      const { error } = await supabase.from('profiles').update({ is_super_admin: grant }).eq('id', profileId);
      if (error) throw error;
      await supabase.from('audit_log').insert({
        action: grant ? 'grant_super_admin' : 'revoke_super_admin',
        actor_id: user!.id, target_id: profileId, details: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles', 'members'] });
    },
  });

  const charterMut = useMutation({
    mutationFn: async ({ profileId, charterId, grant }: { profileId: string; charterId: string; grant: boolean }) => {
      if (grant) {
        // Idempotent: if the member already admins this charter, treat as a no-op (avoid 409).
        const { error } = await supabase.from('charter_admins')
          .upsert({ profile_id: profileId, charter_id: charterId, granted_by: user!.id },
                  { onConflict: 'profile_id,charter_id', ignoreDuplicates: true });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('charter_admins')
          .delete().eq('profile_id', profileId).eq('charter_id', charterId);
        if (error) throw error;
      }
      await supabase.from('audit_log').insert({
        action: grant ? 'grant_charter_admin' : 'revoke_charter_admin',
        actor_id: user!.id, target_id: profileId, details: { charter_id: charterId },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  });

  const financeMut = useMutation({
    mutationFn: async ({ profileId, grant }: { profileId: string; grant: boolean }) => {
      if (grant) {
        await grantFinanceAdmin(profileId);
      } else {
        await revokeFinanceAdmin(profileId);
      }
      await supabase.from('audit_log').insert({
        action: grant ? 'grant_finance_admin' : 'revoke_finance_admin',
        actor_id: user!.id, target_id: profileId, details: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      queryClient.invalidateQueries({ queryKey: qk.financeAdmins() });
    },
  });

  const busy = superMut.isPending || charterMut.isPending || financeMut.isPending;

  // charter_id set per profile_id for quick lookups
  const charterAdminMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    (admins?.charterAdmins ?? []).forEach(ca => {
      (map[ca.profile_id] ??= new Set()).add(ca.charter_id);
    });
    return map;
  }, [admins]);

  const financeAdminSet = useMemo(() =>
    new Set((admins?.financeAdmins ?? []).map(fa => fa.profile_id)),
  [admins]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return members.filter(m =>
      m.name?.toLowerCase().includes(q) || m.city?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [members, search]);

  if (roleLoad) return (
    <div className="p-8 min-h-screen flex items-center justify-center text-gray-600 text-sm tracking-widest uppercase animate-pulse">
      Loading…
    </div>
  );
  if (!isSuperAdmin) return <Navigate to="/admin" replace />;

  return (
    <div className="p-8 min-h-screen max-w-3xl">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Super Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white">Admin Roles</h1>
        <p className="text-gray-500 text-sm mt-1">Appoint and manage site administrators.</p>
      </div>

      {(charterMut.error || superMut.error || financeMut.error) && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Gagal memperbarui peran: {((charterMut.error ?? superMut.error ?? financeMut.error) as Error).message}
        </div>
      )}

      {/* Super Admins */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gold/60 mb-3">Super Admins</h2>
        {adminsLoading ? (
          <div className="glass rounded-xl p-5 text-center text-gray-600 text-sm animate-pulse">Loading…</div>
        ) : (admins?.superAdmins ?? []).length === 0 ? (
          <div className="glass rounded-xl p-4 text-center text-gray-600 text-sm">None.</div>
        ) : (
          <div className="space-y-2">
            {(admins?.superAdmins ?? []).map(sa => (
              <div key={sa.id} className="glass flex items-center gap-3 px-4 py-3 rounded-xl">
                <Avatar url={sa.avatar_url} name={sa.name} />
                <span className="text-sm text-white flex-1 truncate">{sa.name ?? '—'}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                  Super Admin
                </span>
                {sa.id === user!.id
                  ? <span className="text-[10px] text-gray-600 tracking-widest uppercase">You</span>
                  : (
                    <button onClick={() => superMut.mutate({ profileId: sa.id, grant: false })}
                      disabled={busy} title="Revoke super admin"
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-40">
                      <X size={14} />
                    </button>
                  )
                }
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Finance Admins */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gold/60 mb-3">Finance Admins</h2>
        {adminsLoading ? (
          <div className="glass rounded-xl p-5 text-center text-gray-600 text-sm animate-pulse">Loading…</div>
        ) : (admins?.financeAdmins ?? []).length === 0 ? (
          <div className="glass rounded-xl p-4 text-center text-gray-600 text-sm">None yet.</div>
        ) : (
          <div className="space-y-2">
            {(admins?.financeAdmins ?? []).map(fa => (
              <div key={fa.profile_id} className="glass flex items-center gap-3 px-4 py-3 rounded-xl">
                <Avatar url={fa.avatar_url} name={fa.name} />
                <span className="text-sm text-white flex-1 truncate">{fa.name ?? '—'}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Finance Admin
                </span>
                <button onClick={() => financeMut.mutate({ profileId: fa.profile_id, grant: false })}
                  disabled={busy} title="Revoke finance admin"
                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-40">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Charter Admins */}
      <section className="mb-10">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gold/60 mb-3">Charter Admins</h2>
        {adminsLoading ? (
          <div className="glass rounded-xl p-5 text-center text-gray-600 text-sm animate-pulse">Loading…</div>
        ) : (admins?.charterAdmins ?? []).length === 0 ? (
          <div className="glass rounded-xl p-4 text-center text-gray-600 text-sm">None yet.</div>
        ) : (
          <div className="space-y-2">
            {(admins?.charterAdmins ?? []).map(ca => (
              <div key={`${ca.profile_id}-${ca.charter_id}`}
                className="glass flex items-center gap-3 px-4 py-3 rounded-xl">
                <Avatar url={ca.avatar_url} name={ca.name} />
                <span className="text-sm text-white flex-1 truncate">{ca.name ?? '—'}</span>
                <span className="text-xs text-gray-400 shrink-0">{ca.charter_name}</span>
                <button onClick={() => charterMut.mutate({ profileId: ca.profile_id, charterId: ca.charter_id, grant: false })}
                  disabled={busy} title="Revoke charter admin"
                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-40">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Grant Admin */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gold/60 mb-3">Grant Admin Role</h2>
        <div className="glass rounded-2xl p-5">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input type="text" placeholder="Search approved members by name or city…"
              value={search} onChange={e => { setSearch(e.target.value); setExpanded(null); }}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors" />
          </div>

          {membersLoading ? (
            <div className="text-center py-4 text-gray-600 text-sm animate-pulse">Loading…</div>
          ) : search.trim() === '' ? (
            <p className="text-center text-gray-600 text-xs py-4 tracking-widest uppercase">Type a name to search.</p>
          ) : filteredMembers.length === 0 ? (
            <p className="text-center text-gray-600 text-xs py-4 tracking-widest uppercase">No members found.</p>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map(m => {
                const isExpanded      = expandedId === m.id;
                const memberCharters  = charterAdminMap[m.id] ?? new Set<string>();

                return (
                  <div key={m.id} className="border border-white/10 rounded-xl overflow-hidden">
                    {/* Row */}
                    <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                      onClick={() => setExpanded(isExpanded ? null : m.id)}>
                      <Avatar url={m.avatar_url} name={m.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{m.name ?? '—'}</p>
                        {m.city && <p className="text-xs text-gray-500">{m.city}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {m.is_super_admin && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                            Super Admin
                          </span>
                        )}
                        {memberCharters.size > 0 && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                            Charter Admin
                          </span>
                        )}
                        <ChevronDown size={14} className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Expanded panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
                          className="overflow-hidden border-t border-white/5 bg-white/[0.02]">
                          <div className="px-5 py-4 space-y-5">

                            {/* Super Admin row */}
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-white">Super Admin</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">Full access across all charters.</p>
                              </div>
                              {m.id === user!.id ? (
                                <span className="text-[10px] text-gray-600 tracking-widest uppercase italic">That's you</span>
                              ) : m.is_super_admin ? (
                                <button onClick={() => superMut.mutate({ profileId: m.id, grant: false })}
                                  disabled={busy}
                                  className="flex items-center gap-1.5 text-xs font-bold text-red-400 border border-red-500/30 px-3 py-1.5 rounded-full hover:bg-red-500/10 transition-all disabled:opacity-40">
                                  {superMut.isPending ? <Loader size={12} className="animate-spin" /> : <X size={12} />} Revoke
                                </button>
                              ) : (
                                <button onClick={() => superMut.mutate({ profileId: m.id, grant: true })}
                                  disabled={busy}
                                  className="flex items-center gap-1.5 text-xs font-bold text-gold border border-gold/30 px-3 py-1.5 rounded-full hover:bg-gold/10 transition-all disabled:opacity-40">
                                  {superMut.isPending ? <Loader size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Grant
                                </button>
                              )}
                            </div>

                            {/* Finance Admin row */}
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-white">Finance Admin</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">Bank rekonsiliasi & laporan keuangan.</p>
                              </div>
                              {m.id === user!.id ? (
                                <span className="text-[10px] text-gray-600 tracking-widest uppercase italic">That's you</span>
                              ) : financeAdminSet.has(m.id) ? (
                                <button onClick={() => financeMut.mutate({ profileId: m.id, grant: false })}
                                  disabled={busy}
                                  className="flex items-center gap-1.5 text-xs font-bold text-red-400 border border-red-500/30 px-3 py-1.5 rounded-full hover:bg-red-500/10 transition-all disabled:opacity-40">
                                  {financeMut.isPending ? <Loader size={12} className="animate-spin" /> : <X size={12} />} Revoke
                                </button>
                              ) : (
                                <button onClick={() => financeMut.mutate({ profileId: m.id, grant: true })}
                                  disabled={busy}
                                  className="flex items-center gap-1.5 text-xs font-bold text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-full hover:bg-amber-500/10 transition-all disabled:opacity-40">
                                  {financeMut.isPending ? <Loader size={12} className="animate-spin" /> : <Landmark size={12} />} Grant
                                </button>
                              )}
                            </div>

                            {/* Per-charter admin rows */}
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-white mb-2">Charter Admin</p>
                              <div className="space-y-2">
                                {charters.map(c => {
                                  const has = memberCharters.has(c.id);
                                  return (
                                    <div key={c.id} className="flex items-center justify-between">
                                      <span className="text-xs text-gray-400">{c.name}</span>
                                      {has ? (
                                        <button onClick={() => charterMut.mutate({ profileId: m.id, charterId: c.id, grant: false })}
                                          disabled={busy}
                                          className="flex items-center gap-1 text-[10px] font-bold text-red-400 border border-red-500/20 px-2 py-1 rounded-full hover:bg-red-500/10 transition-all disabled:opacity-40">
                                          {charterMut.isPending ? <Loader size={10} className="animate-spin" /> : <X size={10} />} Revoke
                                        </button>
                                      ) : (
                                        <button onClick={() => charterMut.mutate({ profileId: m.id, charterId: c.id, grant: true })}
                                          disabled={busy}
                                          className="flex items-center gap-1 text-[10px] font-bold text-sky-400 border border-sky-500/20 px-2 py-1 rounded-full hover:bg-sky-500/10 transition-all disabled:opacity-40">
                                          {charterMut.isPending ? <Loader size={10} className="animate-spin" /> : <UserPlus size={10} />} Grant
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

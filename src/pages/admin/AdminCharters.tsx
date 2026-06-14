import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, ChevronDown, Users, MapPin, Save, X, Search, Star,
  Loader, UserPlus, UserMinus, Edit2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminCharters, createCharter, updateCharter,
  fetchCharterMembers, addMemberToCharter, removeMemberFromCharter, setPrimaryCharter,
  fetchApprovedMembers, qk,
  type AdminCharter, type CharterMember,
} from '../../lib/queries';

function toSlug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
}

// ── Member management panel (shown when a charter is expanded) ────────────────

function MemberPanel({ charterId }: { charterId: string }) {
  const queryClient   = useQueryClient();
  const [memberSearch, setMemberSearch] = useState('');
  const [addSearch,    setAddSearch]    = useState('');
  const [showAdd,      setShowAdd]      = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: qk.charterMembers(charterId),
    queryFn:  () => fetchCharterMembers(charterId),
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: qk.members(),
    queryFn:  fetchApprovedMembers,
    enabled:  showAdd,
  });

  const memberIds = useMemo(() => new Set(members.map(m => m.profile_id)), [members]);

  const filteredCurrent = useMemo(() => {
    const q = memberSearch.toLowerCase();
    return members.filter(m => !q || (m.profile.name?.toLowerCase().includes(q) ?? false));
  }, [members, memberSearch]);

  const filteredAdd = useMemo(() => {
    const q = addSearch.toLowerCase();
    return allMembers.filter(m =>
      !memberIds.has(m.id) && (!q || (m.name?.toLowerCase().includes(q) ?? false))
    );
  }, [allMembers, addSearch, memberIds]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.charterMembers(charterId) });
    queryClient.invalidateQueries({ queryKey: qk.adminCharters() });
  };

  const addMut    = useMutation({ mutationFn: (id: string) => addMemberToCharter(charterId, id),       onSuccess: invalidate });
  const removeMut = useMutation({ mutationFn: (id: string) => removeMemberFromCharter(charterId, id), onSuccess: invalidate });
  const primaryMut = useMutation({
    mutationFn: ({ profileId, isPrimary }: { profileId: string; isPrimary: boolean }) =>
      setPrimaryCharter(charterId, profileId, isPrimary),
    onSuccess: invalidate,
  });

  return (
    <div className="border-t border-white/5 mt-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
          <Users size={11} /> Anggota ({members.length})
        </h4>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-gold/10 text-gold hover:bg-gold/20 border border-gold/20 transition-all"
        >
          <UserPlus size={11} /> Tambah
        </button>
      </div>

      {/* Add-member search panel */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3 h-3" />
                <input
                  type="text"
                  placeholder="Cari anggota untuk ditambahkan…"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-8 pr-4 text-xs text-white focus:outline-none focus:border-gold/50"
                />
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {filteredAdd.slice(0, 20).map(m => (
                  <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.name ?? ''} referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-gold">{m.name?.charAt(0) ?? '?'}</span>
                      </div>
                    )}
                    <span className="flex-1 text-xs text-gray-300 truncate">{m.name}</span>
                    <button
                      onClick={() => addMut.mutate(m.id)}
                      disabled={addMut.isPending}
                      className="p-1 rounded text-green-400 hover:bg-green-400/10 transition-colors"
                    >
                      <UserPlus size={11} />
                    </button>
                  </div>
                ))}
                {filteredAdd.length === 0 && (
                  <p className="text-center text-xs text-gray-600 py-3">
                    {addSearch ? 'Tidak ditemukan.' : 'Semua anggota sudah terdaftar.'}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search current */}
      {members.length > 6 && (
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3 h-3" />
          <input
            type="text"
            placeholder="Cari dalam charter ini…"
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-8 pr-4 text-xs text-white focus:outline-none focus:border-gold/50"
          />
        </div>
      )}

      {/* Member rows */}
      {isLoading ? (
        <p className="text-center text-xs text-gray-600 py-4 animate-pulse uppercase tracking-widest">Loading…</p>
      ) : filteredCurrent.length === 0 ? (
        <p className="text-center text-xs text-gray-600 py-4">Belum ada anggota.</p>
      ) : (
        <div className="space-y-0.5">
          {filteredCurrent.map((m: CharterMember) => (
            <div key={m.profile_id}
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 group transition-colors"
            >
              {m.profile.avatar_url ? (
                <img src={m.profile.avatar_url} alt={m.profile.name ?? ''} referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-gold">{m.profile.name?.charAt(0) ?? '?'}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{m.profile.name}</p>
                {m.profile.city && <p className="text-[10px] text-gray-500 truncate">{m.profile.city}</p>}
              </div>
              {m.is_primary && (
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
                  Primary
                </span>
              )}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => primaryMut.mutate({ profileId: m.profile_id, isPrimary: !m.is_primary })}
                  disabled={primaryMut.isPending}
                  title={m.is_primary ? 'Batalkan Primary' : 'Jadikan Primary'}
                  className={`p-1 rounded transition-colors ${m.is_primary ? 'text-gold hover:bg-gold/10' : 'text-gray-600 hover:text-gold hover:bg-gold/10'}`}
                >
                  <Star size={11} fill={m.is_primary ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => removeMut.mutate(m.profile_id)}
                  disabled={removeMut.isPending}
                  title="Keluarkan dari charter"
                  className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <UserMinus size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Charter card (expandable) ─────────────────────────────────────────────────

function CharterCard({ charter }: { charter: AdminCharter }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [form, setForm] = useState({
    name: charter.name, slug: charter.slug, city: charter.city, country: charter.country,
  });

  const saveMut = useMutation({
    mutationFn: () => updateCharter(charter.id, form),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: qk.adminCharters() });
      setEditing(false);
    },
  });

  const toggleActive = useMutation({
    mutationFn: () => updateCharter(charter.id, { is_active: !charter.is_active }),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: qk.adminCharters() }),
  });

  return (
    <div className={`glass rounded-xl overflow-hidden border transition-opacity ${charter.is_active ? 'border-white/5' : 'border-white/[0.02] opacity-60'}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-1 flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <span className="font-serif font-bold text-gold text-sm">{charter.name.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{charter.name}</p>
            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin size={9} /> {charter.city}, {charter.country}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] text-gray-500 flex items-center gap-1">
              <Users size={11} /> {charter.memberCount}
            </span>
            {!charter.is_active && (
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                Nonaktif
              </span>
            )}
            <ChevronDown size={14}
              className={`text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="px-5 py-4">
              {editing ? (
                <div className="space-y-2 mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Nama</label>
                      <input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Slug</label>
                      <input
                        value={form.slug}
                        onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-gold/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Kota</label>
                      <input
                        value={form.city}
                        onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Negara</label>
                      <input
                        value={form.country}
                        onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold/50"
                      />
                    </div>
                  </div>
                  {saveMut.isError && (
                    <p className="text-red-400 text-xs">{(saveMut.error as Error).message}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveMut.mutate()}
                      disabled={saveMut.isPending}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 border border-gold/20 transition-all disabled:opacity-50"
                    >
                      {saveMut.isPending ? <Loader size={11} className="animate-spin" /> : <Save size={11} />} Simpan
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setForm({ name: charter.name, slug: charter.slug, city: charter.city, country: charter.country });
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <X size={11} /> Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs text-gray-500">/{charter.slug}</span>
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => toggleActive.mutate()}
                      disabled={toggleActive.isPending}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${charter.is_active
                        ? 'border-green-500/20 text-green-400 bg-green-500/10 hover:bg-green-500/20'
                        : 'border-red-500/20 text-red-400 bg-red-500/10 hover:bg-red-500/20'
                      }`}
                    >
                      {charter.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 border border-white/5 transition-all"
                    >
                      <Edit2 size={11} /> Edit
                    </button>
                  </div>
                </div>
              )}

              <MemberPanel charterId={charter.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Create charter modal ───────────────────────────────────────────────────────

function CreateCharterModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', slug: '', city: '', country: 'Indonesia' });

  const createMut = useMutation({
    mutationFn: () => createCharter(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.adminCharters() });
      onClose();
    },
  });

  const valid = form.name.trim() && form.slug.trim() && form.city.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-serif text-xl font-bold text-white">Tambah Charter Baru</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Nama Charter *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))}
              placeholder="Bandung Charter"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Slug *</label>
            <input
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="bandung"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-gold/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Kota *</label>
              <input
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="Bandung"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Negara</label>
              <input
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>
        </div>

        {createMut.isError && (
          <p className="text-red-400 text-xs mt-3">{(createMut.error as Error).message}</p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !valid}
            className="flex-1 flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 px-5 rounded-full transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {createMut.isPending
              ? <><Loader size={13} className="animate-spin" /> Membuat…</>
              : <><Plus size={13} /> Buat Charter</>
            }
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-xs uppercase tracking-widest"
          >
            Batal
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminCharters() {
  const [showCreate, setShowCreate] = useState(false);
  const [search,     setSearch]     = useState('');

  const { data: charters = [], isLoading } = useQuery({
    queryKey: qk.adminCharters(),
    queryFn:  fetchAdminCharters,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return charters.filter(c =>
      !q || c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
    );
  }, [charters, search]);

  const activeCount  = charters.filter(c => c.is_active).length;
  const totalMembers = charters.reduce((s, c) => s + c.memberCount, 0);

  return (
    <div className="p-8 min-h-screen">
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Super Admin</p>
          <h1 className="font-serif text-4xl font-bold text-white">Charter Management</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola charter, kota, dan keanggotaan.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 px-5 rounded-full transition-all uppercase tracking-widest text-xs"
        >
          <Plus size={14} /> Tambah Charter
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-8 max-w-xs">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-white">{charters.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Total</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-green-400">{activeCount}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Aktif</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-white">{totalMembers}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Anggota</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
        <input
          type="text"
          placeholder="Cari charter…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-gold/50"
        />
      </div>
      <div className="text-right text-xs text-gray-600 mb-3">{filtered.length} charter</div>

      {isLoading ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase animate-pulse">Loading…</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((charter, i) => (
            <motion.div key={charter.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <CharterCard charter={charter} />
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-24 text-gray-600 text-sm">
              Tidak ada charter yang sesuai.
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateCharterModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

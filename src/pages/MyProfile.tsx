import { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Save, Camera, Loader, RefreshCw, UserPlus, X, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { qk, fetchMemberships, fetchApprovedMembers, fetchFriends, saveFriends } from '../lib/queries';

const ATTENDANCE_OPTIONS = [
  { value: 'yes',         label: 'Ya, aku hadir!',   color: 'text-green-700 bg-green-50 border-green-300' },
  { value: 'most_likely', label: 'Berencana Hadir',    color: 'text-blue-700  bg-blue-50  border-blue-300' },
  { value: 'undecided',   label: 'Belum tahu',        color: 'text-yellow-700 bg-yellow-50 border-yellow-300' },
  { value: 'no',          label: 'Tidak bisa hadir',  color: 'text-red-600   bg-red-50   border-red-300' },
] as const;

type FriendSlot = { id: string; name: string; avatar_url: string | null } | null;

export default function MyProfile() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: memberships = [] } = useQuery({
    queryKey: qk.memberships(user?.id ?? ''),
    queryFn:  () => fetchMemberships(user!.id),
    enabled:  !!user,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: qk.members(),
    queryFn:  fetchApprovedMembers,
    enabled:  !!user && profile?.status === 'approved',
    staleTime: 5 * 60_000,
  });

  const { data: savedFriends = [] } = useQuery({
    queryKey: qk.friends(user?.id ?? ''),
    queryFn:  () => fetchFriends(user!.id),
    enabled:  !!user,
  });

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name:               profile?.name ?? '',
    phone:              profile?.phone ?? '',
    city:               profile?.city ?? '',
    profession:         profile?.profession ?? '',
    bio:                profile?.bio ?? '',
    nickname:           profile?.nickname ?? '',
    birthdate:          profile?.birthdate ?? '',
    whatsapp:           profile?.whatsapp ?? '',
    reunion_attendance: (profile?.reunion_attendance ?? '') as string,
    reunion_no_reason:  profile?.reunion_no_reason ?? '',
    funny_event:        profile?.funny_event ?? '',
    message_to_friends: profile?.message_to_friends ?? '',
  });
  const [saved, setSaved] = useState(false);
  const formKey = profile?.id ?? 'none';

  // ── Friends state ─────────────────────────────────────────────────────────
  const [friends, setFriends] = useState<[FriendSlot, FriendSlot, FriendSlot]>([null, null, null]);
  const [friendSearch, setFriendSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [friendSaved, setFriendSaved] = useState(false);
  const friendsInitialized = useRef(false);

  useEffect(() => {
    if (!friendsInitialized.current && savedFriends.length > 0) {
      friendsInitialized.current = true;
      const slots: [FriendSlot, FriendSlot, FriendSlot] = [null, null, null];
      savedFriends.forEach(fe => {
        if (fe.rank >= 1 && fe.rank <= 3) slots[fe.rank - 1] = fe.friend;
      });
      setFriends(slots);
    }
  }, [savedFriends]);

  const selectedIds = new Set(friends.filter(Boolean).map(f => f!.id));
  const filteredMembers = friendSearch.length > 1
    ? allMembers.filter(m =>
        m.id !== user?.id &&
        !selectedIds.has(m.id) &&
        m.name?.toLowerCase().includes(friendSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  function addFriend(m: { id: string; name: string; avatar_url: string | null }) {
    const idx = friends.findIndex(f => f === null);
    if (idx === -1) return;
    setFriends(prev => {
      const n = [...prev] as [FriendSlot, FriendSlot, FriendSlot];
      n[idx] = m;
      return n;
    });
    setFriendSearch('');
    setShowDropdown(false);
  }

  function removeFriend(i: number) {
    setFriends(prev => {
      const n = [...prev] as [FriendSlot, FriendSlot, FriendSlot];
      n[i] = null;
      return n;
    });
  }

  // ── Profile update mutation ───────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async (f: typeof form) => {
      const { error } = await supabase.from('profiles').update({
        name:               f.name,
        phone:              f.phone || null,
        city:               f.city,
        profession:         f.profession || null,
        bio:                f.bio || null,
        nickname:           f.nickname || null,
        birthdate:          f.birthdate || null,
        whatsapp:           f.whatsapp || null,
        reunion_attendance: f.reunion_attendance || null,
        reunion_no_reason:  f.reunion_attendance === 'no' ? f.reunion_no_reason || null : null,
        funny_event:        f.funny_event || null,
        message_to_friends: f.message_to_friends || null,
        updated_at:         new Date().toISOString(),
      }).eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: qk.dashboard() });
    },
  });

  // ── Avatar upload mutation ────────────────────────────────────────────────
  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${user!.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('profiles')
        .update({ avatar_url: publicUrl }).eq('id', user!.id);
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: qk.members() });
    },
  });

  // ── Friends save mutation ─────────────────────────────────────────────────
  const friendsMutation = useMutation({
    mutationFn: () => {
      const entries = friends
        .map((f, i) => (f ? { friendId: f.id, rank: i + 1 } : null))
        .filter((e): e is { friendId: string; rank: number } => e !== null);
      return saveFriends(user!.id, entries);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.friends(user!.id) });
      friendsInitialized.current = false;
      setFriendSaved(true);
      setTimeout(() => setFriendSaved(false), 3000);
    },
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    await updateMutation.mutateAsync(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    avatarMutation.mutate(file);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-sm tracking-widest uppercase animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 text-sm">Could not load your profile.</p>
        <button
          onClick={async () => { setRetrying(true); await refreshProfile(); setRetrying(false); }}
          disabled={retrying}
          className="flex items-center gap-2 text-gold text-sm hover:underline disabled:opacity-50"
        >
          <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      </div>
    );
  }

  const avatarUrl   = profile.avatar_url ?? user.user_metadata?.avatar_url;
  const displayName = profile.name ?? user.user_metadata?.full_name ?? 'Member';

  const statusColor = {
    approved:  'text-green-400',
    pending:   'text-yellow-400',
    suspended: 'text-orange-400',
    rejected:  'text-red-400',
  }[profile.status] ?? 'text-gray-400';

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-2xl">
        <span className="text-xs uppercase tracking-[0.3em] text-gold/70 mb-3 block">Account</span>
        <h1 className="font-serif text-4xl font-bold text-forest mb-8">My Profile</h1>

        {/* Identity card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-5 mb-6 glass-card p-5 rounded-xl shadow-sm">
          <div className="relative shrink-0 group cursor-pointer" onClick={() => fileRef.current?.click()}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer"
                className="rounded-xl object-cover" style={{ width: 72, height: 72 }} />
            ) : (
              <div className="rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center" style={{ width: 72, height: 72 }}>
                <span className="text-3xl font-serif font-bold text-gold">{displayName.charAt(0)}</span>
              </div>
            )}
            <div className="absolute inset-0 rounded-xl bg-forest/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {avatarMutation.isPending
                ? <Loader size={20} className="text-white animate-spin" />
                : <Camera size={20} className="text-white" />}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

          <div>
            <p className="text-forest font-semibold text-lg">{displayName}</p>
            <p className="text-gray-500 text-sm">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <ShieldCheck size={12} className={statusColor} />
              <span className={`text-xs uppercase tracking-widest capitalize ${statusColor}`}>{profile.status}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Click avatar to change photo</p>
          </div>
        </motion.div>

        {avatarMutation.isError && (
          <p className="text-red-400 text-sm mb-4">
            Avatar upload failed: {(avatarMutation.error as Error).message}
          </p>
        )}

        {/* Charter memberships */}
        {memberships.length > 0 && (
          <div className="glass-card p-5 rounded-xl mb-6 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">Charter Membership</p>
            <div className="flex flex-wrap gap-3">
              {memberships.map(m => (
                <Link key={m.charter_id} to={`/charters/${m.charter.slug}`}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
                    m.is_primary
                      ? 'bg-amber-50 text-gold border border-gold/30 hover:bg-amber-100'
                      : 'bg-white text-gray-600 border border-amber-200 hover:border-amber-300 hover:text-forest'
                  }`}>
                  {m.charter.name}{m.is_primary ? ' ★' : ''}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Edit form */}
        <form key={formKey} onSubmit={handleSubmit} className="space-y-5"
          ref={el => { if (el && !form.name && profile.name) setForm({
            name:               profile.name ?? '',
            phone:              profile.phone ?? '',
            city:               profile.city ?? '',
            profession:         profile.profession ?? '',
            bio:                profile.bio ?? '',
            nickname:           profile.nickname ?? '',
            birthdate:          profile.birthdate ?? '',
            whatsapp:           profile.whatsapp ?? '',
            reunion_attendance: profile.reunion_attendance ?? '',
            reunion_no_reason:  profile.reunion_no_reason ?? '',
            funny_event:        profile.funny_event ?? '',
            message_to_friends: profile.message_to_friends ?? '',
          }); }}>

          {/* ── Full Name + Nickname ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Full Name *</label>
              <input required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Panggilan / Nickname</label>
              <input value={form.nickname}
                onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="e.g. Budi, Neng" />
            </div>
          </div>

          {/* ── City + Profession ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Kota Domisili *</label>
              <input required value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="e.g. Jakarta" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Pekerjaan</label>
              <input value={form.profession}
                onChange={e => setForm(f => ({ ...f, profession: e.target.value }))}
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="e.g. Architect" />
            </div>
          </div>

          {/* ── Birthdate + WhatsApp ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Tanggal Lahir</label>
              <input type="date" value={form.birthdate}
                onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))}
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">No. WhatsApp</label>
              <input type="tel" value={form.whatsapp}
                onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="+62 812 …" />
            </div>
          </div>

          {/* ── Phone ── */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">No. Telepon Lain</label>
            <input value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors"
              placeholder="Opsional jika beda dari WA" />
          </div>

          {/* ── Bio ── */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Short Bio</label>
            <textarea value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              rows={3}
              className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none"
              placeholder="A few words about yourself…" />
          </div>

          {/* ── Reunion Attendance ── */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-3">Rencana Kehadiran Reuni</label>
            <div className="grid grid-cols-2 gap-2">
              {ATTENDANCE_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, reunion_attendance: opt.value, reunion_no_reason: '' }))}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                    form.reunion_attendance === opt.value
                      ? opt.color + ' ring-2 ring-offset-1 ring-current'
                      : 'bg-white border-amber-200 text-gray-600 hover:border-amber-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {form.reunion_attendance === 'no' && (
              <div className="mt-3">
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Alasan (opsional)</label>
                <textarea value={form.reunion_no_reason}
                  onChange={e => setForm(f => ({ ...f, reunion_no_reason: e.target.value }))}
                  rows={2}
                  className="w-full bg-white border border-red-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-red-400/50 transition-colors resize-none"
                  placeholder="Ceritakan sedikit jika berkenan…" />
              </div>
            )}
          </div>

          {/* ── Funny Event ── */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Cerita Lucu / Kenangan Unik</label>
            <textarea value={form.funny_event}
              onChange={e => setForm(f => ({ ...f, funny_event: e.target.value }))}
              rows={3}
              className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none"
              placeholder="Cerita seru atau kenangan unik yang masih kamu ingat dari zaman sekolah…" />
          </div>

          {/* ── Message to Friends ── */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Pesan untuk Teman Angkatan</label>
            <textarea value={form.message_to_friends}
              onChange={e => setForm(f => ({ ...f, message_to_friends: e.target.value }))}
              rows={3}
              className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none"
              placeholder="Apa yang ingin kamu sampaikan kepada teman-teman angkatan?" />
          </div>

          {updateMutation.isError && (
            <p className="text-red-400 text-sm">{(updateMutation.error as Error).message}</p>
          )}
          {saved && <p className="text-green-600 text-sm font-medium">Profile updated.</p>}

          <button type="submit" disabled={updateMutation.isPending}
            className="btn-primary flex items-center gap-2 font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50 uppercase tracking-widest text-sm">
            {updateMutation.isPending ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </form>

        {/* ── Friend Selector ── */}
        <div className="mt-8 glass-card p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus size={18} className="text-gold/70" />
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400">Sahabat Angkatan</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Pilih hingga 3 orang yang paling dekat denganmu</p>
            </div>
          </div>

          {/* Current friend slots */}
          <div className="flex flex-col gap-2 mb-4">
            {friends.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-widest text-gray-400 w-16 shrink-0">Sahabat {i + 1}</span>
                {f ? (
                  <div className="flex items-center gap-2 flex-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {f.avatar_url ? (
                      <img src={f.avatar_url} alt={f.name} referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-gold">{f.name.charAt(0)}</span>
                      </div>
                    )}
                    <span className="text-sm text-gray-700 flex-1">{f.name}</span>
                    <button type="button" onClick={() => removeFriend(i)}
                      className="text-gray-400 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 bg-white border border-dashed border-amber-200 rounded-lg px-3 py-2 text-xs text-gray-400 italic">
                    —
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Search input */}
          {friends.some(f => f === null) && (
            <div className="relative">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={friendSearch}
                  onChange={e => { setFriendSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Cari nama teman…"
                  className="w-full bg-white border border-amber-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>
              {showDropdown && filteredMembers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-amber-200 rounded-xl shadow-lg overflow-hidden">
                  {filteredMembers.map(m => (
                    <button key={m.id} type="button"
                      onMouseDown={() => addFriend(m)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors text-left">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={m.name ?? ''} referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-gold">{m.name?.charAt(0) ?? '?'}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-800">{m.name}</p>
                        {m.city && <p className="text-[10px] text-gray-500">{m.city}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {friendsMutation.isError && (
            <p className="text-red-400 text-sm mt-3">{(friendsMutation.error as Error).message}</p>
          )}
          {friendSaved && <p className="text-green-600 text-sm font-medium mt-3">Daftar sahabat disimpan.</p>}

          <button type="button"
            onClick={() => friendsMutation.mutate()}
            disabled={friendsMutation.isPending}
            className="mt-4 flex items-center gap-2 btn-primary font-bold py-2.5 px-6 rounded-xl transition-all disabled:opacity-50 uppercase tracking-widest text-xs">
            {friendsMutation.isPending ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            {friendsMutation.isPending ? 'Menyimpan…' : 'Simpan Sahabat'}
          </button>
        </div>

      </div>
    </div>
  );
}

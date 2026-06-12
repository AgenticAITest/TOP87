import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Save, Camera, Loader, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { qk, fetchMemberships } from '../lib/queries';

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

  // Profile update mutation
  const updateMutation = useMutation({
    mutationFn: async (form: { name: string; phone: string; city: string; profession: string; bio: string }) => {
      const { error } = await supabase.from('profiles').update({
        name:       form.name,
        phone:      form.phone || null,
        city:       form.city,
        profession: form.profession || null,
        bio:        form.bio || null,
        updated_at: new Date().toISOString(),
      }).eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => refreshProfile(),
  });

  // Avatar upload mutation
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

  const [form, setForm] = useState({
    name: profile?.name ?? '', phone: profile?.phone ?? '',
    city: profile?.city ?? '', profession: profile?.profession ?? '', bio: profile?.bio ?? '',
  });
  const [saved, setSaved] = useState(false);

  // Keep form in sync when profile loads
  const formKey = profile?.id ?? 'none';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    await updateMutation.mutateAsync(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return; // silently ignore oversized — error shown below
    avatarMutation.mutate(file);
  }

  // Auth still initialising
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-sm tracking-widest uppercase animate-pulse">Loading…</p>
      </div>
    );
  }

  // Auth done but profile failed to load
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
                className="w-18 h-18 rounded-xl object-cover" style={{ width: 72, height: 72 }} />
            ) : (
              <div className="w-18 h-18 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center" style={{ width: 72, height: 72 }}>
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

        {/* Edit form — key forces re-init when profile loads */}
        <form key={formKey} onSubmit={handleSubmit} className="space-y-5"
          ref={el => { if (el && !form.name && profile.name) setForm({
            name: profile.name ?? '', phone: profile.phone ?? '',
            city: profile.city ?? '', profession: profile.profession ?? '', bio: profile.bio ?? '',
          }); }}>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Full Name *</label>
            <input required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Current City *</label>
              <input required value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="e.g. Jakarta" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Profession</label>
              <input value={form.profession}
                onChange={e => setForm(f => ({ ...f, profession: e.target.value }))}
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="e.g. Architect" />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Phone / WhatsApp</label>
            <input value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors"
              placeholder="+62 812 …" />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Short Bio</label>
            <textarea value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              rows={4}
              className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none"
              placeholder="A few words about yourself…" />
          </div>

          {updateMutation.isError && (
            <p className="text-red-400 text-sm">{(updateMutation.error as Error).message}</p>
          )}
          {saved && <p className="text-green-400 text-sm">Profile updated.</p>}

          <button type="submit" disabled={updateMutation.isPending}
            className="btn-primary flex items-center gap-2 font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50 uppercase tracking-widest text-sm">
            {updateMutation.isPending ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

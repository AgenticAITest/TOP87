import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { qk, fetchCharters } from '../lib/queries';

const ATTENDANCE_OPTIONS = [
  { value: 'yes',       label: 'Hadir',              color: 'text-green-700 bg-green-50 border-green-300' },
  { value: 'undecided', label: 'Belum Tahu',          color: 'text-yellow-700 bg-yellow-50 border-yellow-300' },
  { value: 'no',        label: 'Tidak Bisa Hadir',   color: 'text-red-600   bg-red-50   border-red-300' },
] as const;

function toTitleCase(str: string): string {
  return str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export default function Register() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [primaryCharter, setPrimary] = useState('');
  const [extraCharters, setExtras]   = useState<string[]>([]);

  const [form, setForm] = useState({
    name:               profile?.name ?? user?.user_metadata?.full_name ?? '',
    phone:              profile?.phone ?? '',
    city:               profile?.city ?? '',
    profession:         profile?.profession ?? '',
    bio:                profile?.bio ?? '',
    nickname:           profile?.nickname ?? '',
    birthdate:          profile?.birthdate ?? '',
    whatsapp:           profile?.whatsapp ?? '',
    reunion_attendance: (profile?.reunion_attendance ?? '') as string,
    reunion_no_reason:  profile?.reunion_no_reason ?? '',
  });

  const { data: charters = [] } = useQuery({
    queryKey: qk.charters(),
    queryFn:  fetchCharters,
    staleTime: 1000 * 60 * 5,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated.');
      if (!primaryCharter) throw new Error('Please select your primary charter.');

      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id:                 user.id,
          name:               toTitleCase(form.name),
          phone:              form.phone || null,
          city:               form.city,
          profession:         form.profession || null,
          bio:                form.bio || null,
          nickname:           form.nickname || null,
          birthdate:          form.birthdate || null,
          whatsapp:           form.whatsapp || null,
          reunion_attendance: form.reunion_attendance || null,
          reunion_no_reason:  form.reunion_attendance === 'no' ? form.reunion_no_reason || null : null,
          status:             'pending',
          updated_at:         new Date().toISOString(),
        }, { onConflict: 'id' });
      if (profileErr) throw profileErr;

      const memberships = [
        { profile_id: user.id, charter_id: primaryCharter, is_primary: true },
        ...extraCharters.map(id => ({ profile_id: user.id, charter_id: id, is_primary: false })),
      ];
      const { error: memberErr } = await supabase
        .from('charter_members')
        .upsert(memberships, { onConflict: 'profile_id,charter_id' });
      if (memberErr) throw memberErr;

      await refreshProfile();
    },
    onSuccess: () => navigate('/pending'),
  });

  function toggleExtra(id: string) {
    if (id === primaryCharter) return;
    setExtras(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submitMutation.mutate();
  }

  return (
    <div className="py-12 px-6">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/70 mb-3">Step 2 of 2</p>
        <h1 className="font-serif text-4xl font-bold text-forest mb-2">Complete your profile</h1>
        <p className="text-gray-500 text-sm mb-8">
          Fill in your details and select your charter. Your membership will be reviewed by the charter admin.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Name + Nickname ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Full Name *</label>
              <input required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="Nama lengkap" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Panggilan / Nickname</label>
              <input value={form.nickname}
                onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="e.g. Budi, Neng, Dodot" />
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

          {/* ── Phone (legacy) ── */}
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
              placeholder="Cerita singkat tentang dirimu…" />
          </div>

          {/* ── Reunion Attendance ── */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-3">
              Rencana Kehadiran Reuni *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ATTENDANCE_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, reunion_attendance: opt.value, reunion_no_reason: '' }))}
                  className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left ${
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

          {/* ── Charter Membership ── */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-3">Charter Membership *</label>
            <p className="text-xs text-gray-600 mb-4">Select your primary charter. You may also join secondary charters.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {charters.map(charter => {
                const isPrimary = primaryCharter === charter.id;
                const isExtra   = extraCharters.includes(charter.id);
                return (
                  <div key={charter.id}
                    className={`glass-card rounded-xl p-4 cursor-pointer transition-all border ${
                      isPrimary ? 'border-gold/50 bg-amber-50/80' :
                      isExtra   ? 'border-amber-300 bg-amber-50/50' :
                      'border-amber-100 hover:border-amber-300'
                    }`}
                    onClick={() => {
                      if (isPrimary) return;
                      setPrimary(charter.id);
                      setExtras(prev => prev.filter(x => x !== charter.id));
                    }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-forest">{charter.name}</p>
                        <p className="text-xs text-gray-500">{charter.city}, {charter.country}</p>
                      </div>
                      {isPrimary ? (
                        <span className="text-[10px] uppercase tracking-widest text-gold bg-gold/10 px-2 py-0.5 rounded-full">Primary</span>
                      ) : (
                        <button type="button"
                          onClick={e => { e.stopPropagation(); toggleExtra(charter.id); }}
                          className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full transition-colors ${
                            isExtra ? 'text-white bg-white/10' : 'text-gray-600 hover:text-white'
                          }`}>
                          {isExtra ? '✓ Added' : '+ Also join'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {submitMutation.isError && (
            <p className="text-red-400 text-sm">{(submitMutation.error as Error).message}</p>
          )}

          <button type="submit" disabled={submitMutation.isPending}
            className="w-full btn-primary font-bold py-4 rounded-xl transition-all disabled:opacity-50 uppercase tracking-widest text-sm">
            {submitMutation.isPending ? 'Submitting…' : 'Submit for Approval'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

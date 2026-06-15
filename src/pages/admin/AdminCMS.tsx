import { useState, useEffect, useRef, type ChangeEvent, ReactNode } from 'react';
import { motion } from 'motion/react';
import { Check, Loader, ImageIcon, Megaphone, AlignLeft, ExternalLink, Upload } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminStatus } from '../../hooks/useAdminStatus';
import { supabase } from '../../lib/supabase';
import { uploadFile, resolveMediaUrl } from '../../lib/storage';
import { fetchCharters, fetchCharterById, updateCharterContent } from '../../lib/queries';

type Charter = Awaited<ReturnType<typeof fetchCharterById>>;

// Fetch the charters an admin is allowed to edit
async function fetchAdminCharters(isSuperAdmin: boolean, charterIds: string[]) {
  if (isSuperAdmin) {
    const { data, error } = await supabase
      .from('charters')
      .select('id, slug, name, city, country, description, hero_image_url, announcement')
      .order('name');
    if (error) throw error;
    return (data ?? []) as Charter[];
  }
  if (charterIds.length === 0) return [];
  const { data, error } = await supabase
    .from('charters')
    .select('id, slug, name, city, country, description, hero_image_url, announcement')
    .in('id', charterIds)
    .order('name');
  if (error) throw error;
  return (data ?? []) as Charter[];
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">{label}</label>
      {hint && <p className="text-[11px] text-gray-600 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

export default function AdminCMS() {
  const { user }   = useAuth();
  const { isSuperAdmin, charterIds, loading: adminLoading } = useAdminStatus();
  const queryClient = useQueryClient();

  const [selectedId,   setSelectedId]   = useState('');
  const [description,  setDescription]  = useState('');
  const [heroUrl,      setHeroUrl]      = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [saved,        setSaved]        = useState(false);

  const { data: editableCharters = [], isLoading: chartersLoading } = useQuery({
    queryKey: ['admin', 'cms-charters', isSuperAdmin, charterIds],
    queryFn:  () => fetchAdminCharters(isSuperAdmin, charterIds),
    enabled:  !adminLoading,
  });

  // Auto-select when only one charter
  useEffect(() => {
    if (!selectedId && editableCharters.length === 1) {
      setSelectedId(editableCharters[0].id);
    }
  }, [editableCharters, selectedId]);

  // Populate form when a charter is selected
  const selectedCharter = editableCharters.find(c => c.id === selectedId);
  useEffect(() => {
    if (selectedCharter) {
      setDescription(selectedCharter.description ?? '');
      setHeroUrl(selectedCharter.hero_image_url ?? '');
      setAnnouncement(selectedCharter.announcement ?? '');
    }
  }, [selectedCharter?.id]);

  const heroFileRef = useRef<HTMLInputElement>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroUploadErr, setHeroUploadErr] = useState<string | null>(null);

  async function handleHeroUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setHeroUploading(true);
    setHeroUploadErr(null);
    try {
      const path = await uploadFile(file, user.id, () => {});
      setHeroUrl(resolveMediaUrl(path) ?? path);
    } catch (err) {
      setHeroUploadErr((err as Error).message);
    } finally {
      setHeroUploading(false);
      if (heroFileRef.current) heroFileRef.current.value = '';
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => updateCharterContent(selectedId, {
      description:   description.trim() || null,
      hero_image_url: heroUrl.trim() || null,
      announcement:  announcement.trim() || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charters'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'cms-charters'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const loading = adminLoading || chartersLoading;

  if (loading) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-xs uppercase tracking-widest animate-pulse">Loading…</p>
      </div>
    );
  }

  if (editableCharters.length === 0) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">You are not assigned as admin of any charter.</p>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white">Charter CMS</h1>
        <p className="text-gray-500 text-sm mt-1">Edit your charter's public page content.</p>
      </div>

      <div className="max-w-2xl space-y-8">

        {/* Charter selector — only shown when admin manages more than one */}
        {editableCharters.length > 1 && (
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Charter</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors">
              <option value="">Select a charter…</option>
              {editableCharters.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
              ))}
            </select>
          </div>
        )}

        {selectedCharter && (
          <motion.div key={selectedCharter.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-6">

            {/* Preview link */}
            <a href={`/charters/${selectedCharter.slug}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gold/60 hover:text-gold transition-colors">
              <ExternalLink size={11} /> Preview charter page
            </a>

            {/* Hero image */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon size={15} className="text-gold/60" />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Hero Image</h2>
              </div>

              <Field label="Hero Image" hint="Upload a photo or paste a direct image URL. Displayed as a banner at the top of your charter page.">
                <div className="flex gap-2">
                  <input value={heroUrl} onChange={e => setHeroUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors" />
                  <button type="button" onClick={() => heroFileRef.current?.click()} disabled={heroUploading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 bg-white/[0.02] transition-all disabled:opacity-50 text-sm shrink-0">
                    {heroUploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                    {heroUploading ? 'Uploading…' : 'Upload'}
                  </button>
                  <input ref={heroFileRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
                </div>
                {heroUploadErr && <p className="text-red-400 text-xs mt-1">{heroUploadErr}</p>}
              </Field>

              {heroUrl.trim() && (
                <div className="rounded-xl overflow-hidden h-36 bg-white/5">
                  <img src={heroUrl.trim()} alt="Hero preview"
                    className="w-full h-full object-cover grayscale opacity-60"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>

            {/* About text */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <AlignLeft size={15} className="text-gold/60" />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">About</h2>
              </div>

              <Field label="Description" hint="Short paragraph shown below the charter name on the public page.">
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  rows={4} placeholder="Tell members and visitors about this charter…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none" />
              </Field>
            </div>

            {/* Announcement */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Megaphone size={15} className="text-gold/60" />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Announcement</h2>
              </div>

              <Field label="Pinned message" hint="Shown as a highlighted banner on the charter page. Leave empty to hide.">
                <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)}
                  rows={3} placeholder="Next gathering: Saturday 14 June at 7pm…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none" />
              </Field>
            </div>

            {saveMutation.isError && (
              <p className="text-red-400 text-sm">{(saveMutation.error as Error).message}</p>
            )}

            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-3 px-8 rounded-full transition-all disabled:opacity-50 uppercase tracking-widest text-sm">
              {saveMutation.isPending
                ? <><Loader size={15} className="animate-spin" /> Saving…</>
                : saved
                  ? <><Check size={15} /> Saved!</>
                  : 'Save Changes'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

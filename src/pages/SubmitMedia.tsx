import { useState, useRef, FormEvent, ChangeEvent, ReactNode } from 'react';
import { motion } from 'motion/react';
import { Upload, Link as LinkIcon, Camera, Check, Loader, X, Film } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { qk, fetchCharters, fetchMemberships } from '../lib/queries';
import { uploadFile } from '../lib/storage';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i);

type MediaType = 'photo' | 'video-file' | 'video-link';

const VIDEO_TYPES = /\.(mp4|mov|avi|mkv|webm|m4v)$/i;
const MAX_PHOTO_MB = 15;
const MAX_VIDEO_MB = 500;

export default function SubmitMedia() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [type, setType]           = useState<MediaType>('photo');
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [videoUrl, setVideoUrl]   = useState('');
  const [caption, setCaption]     = useState('');
  const [yearTaken, setYearTaken] = useState('');
  const [charterId, setCharterId] = useState('');
  const [progress, setProgress]   = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: charters = [] } = useQuery({
    queryKey: qk.charters(),
    queryFn:  fetchCharters,
    staleTime: 1000 * 60 * 5,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: qk.memberships(user?.id ?? ''),
    queryFn:  () => fetchMemberships(user!.id),
    enabled:  !!user,
  });

  const primaryCharterId = memberships.find(m => m.is_primary)?.charter_id ?? '';
  const effectiveCharter = charterId || primaryCharterId;

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !effectiveCharter) throw new Error('No charter selected.');

      if (type === 'photo' || type === 'video-file') {
        if (!file) throw new Error(`Please select a ${type === 'photo' ? 'photo' : 'video'}.`);

        const storagePath = await uploadFile(file, user.id, setProgress);

        const { error: dbErr } = await supabase.from('media').insert({
          profile_id:   user.id,
          charter_id:   effectiveCharter,
          type:         type === 'photo' ? 'photo' : 'video',
          storage_path: storagePath,
          caption:      caption.trim() || null,
          year_taken:   yearTaken ? parseInt(yearTaken) : null,
        });
        if (dbErr) throw new Error(`Database error: ${dbErr.message}`);
      } else {
        const trimmed = videoUrl.trim();
        if (!trimmed) throw new Error('Please enter a YouTube or Vimeo URL.');
        const { error } = await supabase.from('media').insert({
          profile_id:   user.id,
          charter_id:   effectiveCharter,
          type:         'video',
          external_url: trimmed,
          caption:      caption.trim() || null,
          year_taken:   yearTaken ? parseInt(yearTaken) : null,
        });
        if (error) throw new Error(`Database error: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
    },
  });

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    const isVideo = VIDEO_TYPES.test(f.name);
    const maxMB   = isVideo ? MAX_VIDEO_MB : MAX_PHOTO_MB;
    if (f.size > maxMB * 1024 * 1024) {
      alert(`File exceeds ${maxMB} MB limit.`);
      return;
    }
    setFile(f);
    setPreview(isVideo ? null : URL.createObjectURL(f));
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleTypeChange(t: MediaType) {
    setType(t);
    submitMutation.reset();
    clearFile();
    setVideoUrl('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setProgress(0);
    await submitMutation.mutateAsync();
  }

  function reset() {
    submitMutation.reset();
    clearFile();
    setVideoUrl('');
    setCaption('');
    setYearTaken('');
    setProgress(0);
  }

  if (submitMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-forest mb-3">Submitted!</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">
            Your media has been sent to the charter admin for review.
          </p>
          <button onClick={reset}
            className="btn-secondary px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all">
            Submit Another
          </button>
        </motion.div>
      </div>
    );
  }

  const tabs: { id: MediaType; label: string; icon: ReactNode }[] = [
    { id: 'photo',      label: 'Photo',      icon: <Camera size={14} /> },
    { id: 'video-file', label: 'Video File', icon: <Film size={14} /> },
    { id: 'video-link', label: 'Video Link', icon: <LinkIcon size={14} /> },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-2xl">
        <span className="text-xs uppercase tracking-[0.3em] text-gold/70 mb-3 block">Gallery</span>
        <h1 className="font-serif text-4xl font-bold text-forest mb-2">Submit Media</h1>
        <p className="text-gray-500 text-sm mb-8">
          Share photos or videos with your chapter. All submissions require admin approval.
        </p>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => handleTypeChange(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                type === t.id ? 'bg-gold/15 text-gold border border-gold/30' : 'glass-card text-gray-600 hover:text-forest border border-amber-200'
              }`}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {type === 'photo' && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Photo *</label>
              {preview ? (
                <div className="relative rounded-2xl overflow-hidden">
                  <img src={preview} alt="Preview" className="w-full max-h-72 object-cover" />
                  <button type="button" onClick={clearFile}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div onClick={() => fileRef.current?.click()}
                  className="w-full h-44 rounded-xl border-2 border-dashed border-amber-200 hover:border-gold/50 bg-amber-50/40 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group">
                  <Upload size={24} className="text-gray-400 group-hover:text-gold transition-colors" />
                  <p className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                    Click to select a photo <span className="text-gray-400">(max {MAX_PHOTO_MB} MB)</span>
                  </p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          )}

          {type === 'video-file' && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Video File *</label>
              {file ? (
                <div className="glass-card rounded-xl border border-amber-200 p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                    <Film size={18} className="text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-forest text-sm font-medium truncate">{file.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button type="button" onClick={clearFile}
                    className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div onClick={() => fileRef.current?.click()}
                  className="w-full h-44 rounded-xl border-2 border-dashed border-amber-200 hover:border-gold/50 bg-amber-50/40 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group">
                  <Film size={24} className="text-gray-400 group-hover:text-gold transition-colors" />
                  <p className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                    Click to select a video <span className="text-gray-400">(MP4, MOV, MKV — max {MAX_VIDEO_MB} MB)</span>
                  </p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
            </div>
          )}

          {type === 'video-link' && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">YouTube / Vimeo URL *</label>
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Charter *</label>
              <select value={effectiveCharter} onChange={e => setCharterId(e.target.value)} required
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors">
                <option value="" className="bg-white text-gray-800">Select charter…</option>
                {charters.map(c => <option key={c.id} value={c.id} className="bg-white text-gray-800">{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Year Taken (optional)</label>
              <select value={yearTaken} onChange={e => setYearTaken(e.target.value)}
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors">
                <option value="" className="bg-white text-gray-800">Select year…</option>
                {YEARS.map(y => <option key={y} value={y} className="bg-white text-gray-800">{y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Caption (optional)</label>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3}
              placeholder="Describe this photo or video…"
              className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none" />
          </div>

          {submitMutation.isPending && progress > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1 bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {submitMutation.isError && (
            <p className="text-red-400 text-sm">{(submitMutation.error as Error).message}</p>
          )}

          <button type="submit" disabled={submitMutation.isPending}
            className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50 uppercase tracking-widest text-sm">
            {submitMutation.isPending ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
            {submitMutation.isPending ? 'Submitting…' : 'Submit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, FormEvent, ChangeEvent, ReactNode, KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { Upload, Link as LinkIcon, Camera, Check, Loader, X, Film, Tag, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { qk, fetchCharters, fetchMemberships } from '../lib/queries';
import { uploadFile } from '../lib/storage';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i);

type MediaType = 'photo' | 'video-file' | 'video-link';

const VIDEO_TYPES  = /\.(mp4|mov|avi|mkv|webm|m4v)$/i;
const MAX_PHOTO_MB = 15;
const MAX_VIDEO_MB = 500;
const MAX_PHOTOS   = 20;
const MAX_VIDEOS   = 3;

// ── TagInput ──────────────────────────────────────────────────────────────────

function TagInput({
  tags, onChange, placeholder, compact = false,
}: {
  tags: string[];
  onChange: (t: string[]) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const [input, setInput] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  function commit() {
    const val = input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setInput('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
    if (e.key === 'Backspace' && !input && tags.length > 0) onChange(tags.slice(0, -1));
  }

  return (
    <div
      className={`w-full bg-white border border-amber-200 rounded-xl flex flex-wrap gap-1.5 cursor-text focus-within:border-gold/50 transition-colors ${
        compact ? 'px-2 py-1.5 min-h-[34px]' : 'px-3 py-2 min-h-[48px]'
      }`}
      onClick={() => ref.current?.focus()}
    >
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full px-2 py-0.5">
          <Tag size={9} />
          {t}
          <button type="button"
            onClick={e => { e.stopPropagation(); onChange(tags.filter(x => x !== t)); }}
            className="hover:text-red-500 transition-colors ml-0.5">
            <X size={9} />
          </button>
        </span>
      ))}
      <input
        ref={ref}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={tags.length === 0 ? (placeholder ?? 'Tambah tag… (Enter atau koma)') : ''}
        className="flex-1 min-w-[100px] bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SubmitMedia() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [type, setType] = useState<MediaType>('photo');

  // Multi-file state
  const [files,    setFiles]    = useState<File[]>([]);
  const [previews, setPreviews] = useState<(string | null)[]>([]);
  const [fileTags, setFileTags] = useState<string[][]>([]);

  // Shared metadata
  const [videoUrl,         setVideoUrl]         = useState('');
  const [batchTags,        setBatchTags]        = useState<string[]>([]);
  const [caption,          setCaption]          = useState('');
  const [yearTaken,        setYearTaken]        = useState('');
  const [selectedCharters, setSelectedCharters] = useState<string[]>([]);

  // Upload progress
  const [uploadIndex, setUploadIndex] = useState(0);
  const [progress,    setProgress]    = useState(0);

  const fileRef       = useRef<HTMLInputElement>(null);
  const didPreselect  = useRef(false);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => { previews.forEach(p => { if (p) URL.revokeObjectURL(p); }); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: charters = [] } = useQuery({
    queryKey: qk.charters(),
    queryFn:  fetchCharters,
    staleTime: 5 * 60_000,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: qk.memberships(user?.id ?? ''),
    queryFn:  () => fetchMemberships(user!.id),
    enabled:  !!user,
  });

  const primaryId = memberships.find(m => m.is_primary)?.charter_id ?? '';
  if (primaryId && selectedCharters.length === 0 && !didPreselect.current && memberships.length > 0) {
    didPreselect.current = true;
    setSelectedCharters([primaryId]);
  }

  const effectiveCharters = selectedCharters.length > 0 ? selectedCharters : (primaryId ? [primaryId] : []);

  function toggleCharter(id: string) {
    setSelectedCharters(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  const maxCount = type === 'photo' ? MAX_PHOTOS : MAX_VIDEOS;
  const remaining = maxCount - files.length;

  function addFiles(incoming: File[]) {
    const toAdd = incoming.slice(0, remaining);
    const newPreviews = toAdd.map(f => VIDEO_TYPES.test(f.name) ? null : URL.createObjectURL(f));
    setFiles(prev => [...prev, ...toAdd]);
    setPreviews(prev => [...prev, ...newPreviews]);
    setFileTags(prev => [...prev, ...toAdd.map(() => [] as string[])]);
  }

  function removeFile(idx: number) {
    const p = previews[idx];
    if (p) URL.revokeObjectURL(p);
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
    setFileTags(prev => prev.filter((_, i) => i !== idx));
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    const maxMB = type === 'photo' ? MAX_PHOTO_MB : MAX_VIDEO_MB;
    const all   = Array.from(e.target.files) as File[];
    const valid = all.filter(f => {
      if (f.size > maxMB * 1024 * 1024) {
        alert(`${f.name} melebihi batas ${maxMB} MB.`);
        return false;
      }
      return true;
    });
    addFiles(valid);
    e.target.value = '';
  }

  function handleTypeChange(t: MediaType) {
    setType(t);
    submitMutation.reset();
    previews.forEach(p => { if (p) URL.revokeObjectURL(p); });
    setFiles([]); setPreviews([]); setFileTags([]);
    setVideoUrl('');
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: async (): Promise<{ ok: number; failed: string[] }> => {
      if (effectiveCharters.length === 0) throw new Error('Pilih minimal satu charter.');
      if (batchTags.length === 0)          throw new Error('Tambahkan minimal satu tag untuk semua file.');

      const primaryCharter = effectiveCharters[0];

      // Video link — unchanged single-item flow
      if (type === 'video-link') {
        const trimmed = videoUrl.trim();
        if (!trimmed) throw new Error('Masukkan URL YouTube atau Vimeo.');
        const { data: ins, error } = await supabase.from('media').insert({
          profile_id:   user!.id,
          charter_id:   primaryCharter,
          type:         'video',
          external_url: trimmed,
          caption:      caption.trim() || null,
          year_taken:   yearTaken ? parseInt(yearTaken) : null,
          tags:         batchTags,
        }).select('id').single();
        if (error) throw new Error(error.message);
        if (effectiveCharters.length > 1) {
          await supabase.from('media_charters').upsert(
            effectiveCharters.map(cid => ({ media_id: ins!.id, charter_id: cid })),
            { onConflict: 'media_id,charter_id' }
          );
        }
        return { ok: 1, failed: [] };
      }

      if (files.length === 0) throw new Error('Pilih minimal satu file.');

      let ok = 0;
      const failed: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setUploadIndex(i + 1);
        setProgress(0);
        const mergedTags = [...new Set([...batchTags, ...(fileTags[i] ?? [])])];
        try {
          const storagePath = await uploadFile(f, user!.id, setProgress);
          const isVideo = VIDEO_TYPES.test(f.name);
          const { data: ins, error: dbErr } = await supabase.from('media').insert({
            profile_id:   user!.id,
            charter_id:   primaryCharter,
            type:         isVideo ? 'video' : 'photo',
            storage_path: storagePath,
            caption:      caption.trim() || null,
            year_taken:   yearTaken ? parseInt(yearTaken) : null,
            tags:         mergedTags,
          }).select('id').single();
          if (dbErr) throw dbErr;
          if (effectiveCharters.length > 1) {
            await supabase.from('media_charters').upsert(
              effectiveCharters.map(cid => ({ media_id: ins!.id, charter_id: cid })),
              { onConflict: 'media_id,charter_id' }
            );
          }
          ok++;
        } catch {
          failed.push(f.name);
        }
      }

      return { ok, failed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
    },
  });

  function reset() {
    submitMutation.reset();
    previews.forEach(p => { if (p) URL.revokeObjectURL(p); });
    setFiles([]); setPreviews([]); setFileTags([]);
    setVideoUrl(''); setBatchTags([]); setCaption(''); setYearTaken('');
    setUploadIndex(0); setProgress(0);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setUploadIndex(0); setProgress(0);
    await submitMutation.mutateAsync();
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (submitMutation.isSuccess) {
    const result = submitMutation.data;
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-forest mb-3">Terkirim!</h2>
          <p className="text-gray-600 text-sm mb-2">
            {result.ok} {result.ok === 1 ? 'item' : 'item'} berhasil dikirim ke admin untuk ditinjau.
          </p>
          {result.failed.length > 0 && (
            <div className="mt-3 mb-4 text-left bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-xs mx-auto">
              <p className="text-red-600 text-xs font-semibold uppercase tracking-wider mb-1">{result.failed.length} gagal:</p>
              {result.failed.map(name => (
                <p key={name} className="text-xs text-red-500 truncate">{name}</p>
              ))}
            </div>
          )}
          <button onClick={reset}
            className="mt-4 btn-secondary px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all">
            Submit Lagi
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  const tabs: { id: MediaType; label: string; icon: ReactNode }[] = [
    { id: 'photo',      label: 'Foto',       icon: <Camera size={14} /> },
    { id: 'video-file', label: 'Video File', icon: <Film size={14} /> },
    { id: 'video-link', label: 'Video Link', icon: <LinkIcon size={14} /> },
  ];

  const isUploading = submitMutation.isPending;
  const currentFileName = files[uploadIndex - 1]?.name ?? '';

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-2xl">
        <span className="text-xs uppercase tracking-[0.3em] text-gold/70 mb-3 block">Gallery</span>
        <h1 className="font-serif text-4xl font-bold text-forest mb-2">Submit Media</h1>
        <p className="text-gray-500 text-sm mb-8">
          Bagikan foto atau video bersama chapter Anda. Semua kiriman memerlukan persetujuan admin.
        </p>

        {/* Type tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => handleTypeChange(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                type === t.id
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : 'glass-card text-gray-600 hover:text-forest border border-amber-200'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Photo grid ── */}
          {type === 'photo' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-widest text-gray-500">
                  Foto * <span className="normal-case text-gray-400">(maks {MAX_PHOTOS} per submit)</span>
                </label>
                {files.length > 0 && (
                  <span className="text-[11px] text-gray-400">{files.length} / {MAX_PHOTOS} dipilih</span>
                )}
              </div>

              {/* Thumbnail grid */}
              {files.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                  {files.map((f, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-amber-50 border border-amber-100">
                      {previews[i] ? (
                        <img src={previews[i]!} alt={f.name}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film size={20} className="text-amber-300" />
                        </div>
                      )}
                      <button type="button" onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors">
                        <X size={10} />
                      </button>
                      {/* Extra-tags badge */}
                      {fileTags[i]?.length > 0 && (
                        <div className="absolute bottom-1 left-1 bg-amber-600/80 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                          +{fileTags[i].length}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add more slot */}
                  {remaining > 0 && (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-amber-200 hover:border-gold/50 bg-amber-50/40 flex flex-col items-center justify-center gap-1 transition-all group">
                      <Plus size={18} className="text-gray-400 group-hover:text-gold transition-colors" />
                      <span className="text-[10px] text-gray-400 group-hover:text-gray-600">Tambah</span>
                    </button>
                  )}
                </div>
              )}

              {/* Drop zone (empty state) */}
              {files.length === 0 && (
                <div onClick={() => fileRef.current?.click()}
                  className="w-full h-44 rounded-xl border-2 border-dashed border-amber-200 hover:border-gold/50 bg-amber-50/40 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group">
                  <Upload size={24} className="text-gray-400 group-hover:text-gold transition-colors" />
                  <p className="text-xs text-gray-500 group-hover:text-gray-700 text-center px-4">
                    Klik untuk pilih foto <span className="text-gray-400">(maks {MAX_PHOTO_MB} MB per foto, {MAX_PHOTOS} foto per submit)</span>
                  </p>
                </div>
              )}

              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />

              {/* Per-file extra tags */}
              {files.length > 0 && (
                <div className="mt-3 border border-amber-100 rounded-xl overflow-hidden">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 bg-amber-50 px-3 py-2 border-b border-amber-100">
                    Extra tag per foto <span className="normal-case font-normal">(opsional)</span>
                  </p>
                  <div className="divide-y divide-amber-50">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2">
                        {previews[i] ? (
                          <img src={previews[i]!} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                            <Film size={12} className="text-amber-400" />
                          </div>
                        )}
                        <p className="text-xs text-gray-500 truncate w-24 shrink-0">{f.name}</p>
                        <TagInput
                          compact
                          tags={fileTags[i] ?? []}
                          onChange={t => setFileTags(prev => prev.map((ft, j) => j === i ? t : ft))}
                          placeholder="Tag tambahan…"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Video file list ── */}
          {type === 'video-file' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-widest text-gray-500">
                  Video * <span className="normal-case text-gray-400">(maks {MAX_VIDEOS} per submit)</span>
                </label>
                {files.length > 0 && (
                  <span className="text-[11px] text-gray-400">{files.length} / {MAX_VIDEOS} dipilih</span>
                )}
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2 mb-3">
                  {files.map((f, i) => (
                    <div key={i} className="glass-card rounded-xl border border-amber-200 p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                          <Film size={16} className="text-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-forest text-sm font-medium truncate">{f.name}</p>
                          <p className="text-gray-400 text-xs">{(f.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                        <button type="button" onClick={() => removeFile(i)}
                          className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                          <X size={13} />
                        </button>
                      </div>
                      <TagInput
                        compact
                        tags={fileTags[i] ?? []}
                        onChange={t => setFileTags(prev => prev.map((ft, j) => j === i ? t : ft))}
                        placeholder="Extra tag untuk video ini… (opsional)"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Add more / drop zone */}
              {remaining > 0 && (
                <div onClick={() => fileRef.current?.click()}
                  className={`w-full rounded-xl border-2 border-dashed border-amber-200 hover:border-gold/50 bg-amber-50/40 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group ${
                    files.length > 0 ? 'h-20' : 'h-44'
                  }`}>
                  <Film size={files.length > 0 ? 18 : 24} className="text-gray-400 group-hover:text-gold transition-colors" />
                  <p className="text-xs text-gray-500 group-hover:text-gray-700 text-center px-4">
                    {files.length > 0
                      ? `Tambah video (${remaining} slot tersisa)`
                      : `Klik untuk pilih video — MP4, MOV, MKV (maks ${MAX_VIDEO_MB} MB, ${MAX_VIDEOS} video per submit)`}
                  </p>
                </div>
              )}

              <input ref={fileRef} type="file" accept="video/*" multiple className="hidden" onChange={handleFileInput} />
            </div>
          )}

          {/* ── Video link ── */}
          {type === 'video-link' && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">YouTube / Vimeo URL *</label>
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors" />
            </div>
          )}

          {/* ── Batch tags (required for all types) ── */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
              Tags * <span className="normal-case text-gray-400">
                {type !== 'video-link'
                  ? '— berlaku untuk semua file, min. 1 (Enter atau koma)'
                  : '— min. 1 (Enter atau koma)'}
              </span>
            </label>
            <TagInput tags={batchTags} onChange={setBatchTags} />
          </div>

          {/* ── Charter ── */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
              Charter * <span className="normal-case text-gray-400">(boleh lebih dari satu)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {charters.map(c => {
                const selected = effectiveCharters.includes(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => toggleCharter(c.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                      selected
                        ? 'bg-gold/15 text-gold border-gold/40'
                        : 'bg-white text-gray-600 border-amber-200 hover:border-gold/30 hover:text-forest'
                    }`}>
                    {selected && <Check size={11} />}
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Year ── */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Tahun (opsional)</label>
            <select value={yearTaken} onChange={e => setYearTaken(e.target.value)}
              className="w-full sm:w-48 bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors">
              <option value="" className="bg-white text-gray-800">Pilih tahun…</option>
              {YEARS.map(y => <option key={y} value={y} className="bg-white text-gray-800">{y}</option>)}
            </select>
          </div>

          {/* ── Caption ── */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Keterangan (opsional)</label>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3}
              placeholder="Ceritakan foto atau video ini…"
              className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none" />
          </div>

          {/* ── Upload progress ── */}
          {isUploading && type !== 'video-link' && files.length > 1 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>
                  Mengupload {uploadIndex} dari {files.length}
                  {currentFileName && <span className="text-gray-400 ml-1">({currentFileName})</span>}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold transition-all duration-300 rounded-full"
                  style={{ width: `${Math.round(((uploadIndex - 1) / files.length) * 100 + (progress / files.length))}%` }}
                />
              </div>
            </div>
          )}

          {isUploading && (type === 'video-link' || files.length === 1) && progress > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Mengupload…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                <div className="h-full bg-gold transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {submitMutation.isError && (
            <p className="text-red-400 text-sm">{(submitMutation.error as Error).message}</p>
          )}

          <button type="submit" disabled={isUploading}
            className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50 uppercase tracking-widest text-sm">
            {isUploading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
            {isUploading
              ? `Mengirim… (${uploadIndex}/${type === 'video-link' ? 1 : files.length})`
              : 'Kirim untuk Ditinjau'}
          </button>
        </form>
      </div>
    </div>
  );
}

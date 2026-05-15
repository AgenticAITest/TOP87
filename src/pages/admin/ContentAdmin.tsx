import { useState, ReactNode } from 'react';
import { Check, Loader, FileText, BookOpen, Film, File } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  getContentConfig, setAboutContent, setYearbookContent,
  type AboutContent, type YearbookContent,
} from '../../lib/queries';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">{label}</label>
      {hint && <p className="text-[11px] text-gray-600 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

type YearbookType = 'pdf' | 'video';

const TYPE_OPTIONS: { id: YearbookType; label: string; icon: ReactNode }[] = [
  { id: 'pdf',   label: 'PDF',   icon: <File size={14} /> },
  { id: 'video', label: 'Video', icon: <Film size={14} /> },
];

export default function ContentAdmin() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['site_settings', 'content'],
    queryFn:  getContentConfig,
  });

  // ── About state ──
  const [aboutSaved,   setAboutSaved]   = useState(false);
  const [aboutHeroUrl, setAboutHeroUrl] = useState<string | null>(null);
  const [aboutBody,    setAboutBody]    = useState<string | null>(null);

  const heroUrl = aboutHeroUrl ?? data?.about.heroUrl ?? '';
  const body    = aboutBody    ?? data?.about.body    ?? '';

  const aboutMutation = useMutation({
    mutationFn: () => setAboutContent({ heroUrl, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_settings', 'content'] });
      setAboutSaved(true);
      setTimeout(() => setAboutSaved(false), 2500);
    },
  });

  // ── Yearbook state ──
  const [yearbookSaved, setYearbookSaved] = useState(false);
  const [y1987type, setY1987type] = useState<YearbookType | null>(null);
  const [y1987url,  setY1987url]  = useState<string | null>(null);
  const [y2026type, setY2026type] = useState<YearbookType | null>(null);
  const [y2026url,  setY2026url]  = useState<string | null>(null);

  const t1987 = y1987type ?? data?.yearbook.y1987.type ?? 'pdf';
  const u1987 = y1987url  ?? data?.yearbook.y1987.url  ?? '';
  const t2026 = y2026type ?? data?.yearbook.y2026.type ?? 'pdf';
  const u2026 = y2026url  ?? data?.yearbook.y2026.url  ?? '';

  const yearbookMutation = useMutation({
    mutationFn: () => setYearbookContent({
      y1987: { type: t1987, url: u1987 },
      y2026: { type: t2026, url: u2026 },
    } as YearbookContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_settings', 'content'] });
      setYearbookSaved(true);
      setTimeout(() => setYearbookSaved(false), 2500);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-xs uppercase tracking-widest animate-pulse">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white">Content</h1>
        <p className="text-gray-500 text-sm mt-1">Manage the About page and Yearbook content.</p>
      </div>

      <div className="max-w-2xl space-y-8">

        {/* ── About ── */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={15} className="text-gold/60" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">About — Our Story</h2>
          </div>

          <Field label="Hero Image URL" hint="Optional banner shown at the top of the About page.">
            <input value={heroUrl} onChange={e => setAboutHeroUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors" />
          </Field>

          {heroUrl && (
            <div className="rounded-xl overflow-hidden h-32 bg-white/5">
              <img src={heroUrl} alt="Hero preview"
                className="w-full h-full object-cover grayscale opacity-50"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}

          <Field label="Body Text" hint="Shown as paragraphs on the About page. Use a blank line to separate paragraphs.">
            <textarea value={body} onChange={e => setAboutBody(e.target.value)} rows={8}
              placeholder={"We are the Class of 1987...\n\nOver the years we've stayed connected..."}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none" />
          </Field>

          {aboutMutation.isError && (
            <p className="text-red-400 text-sm">{(aboutMutation.error as Error).message}</p>
          )}

          <button onClick={() => aboutMutation.mutate()} disabled={aboutMutation.isPending}
            className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 px-6 rounded-full transition-all disabled:opacity-50 uppercase tracking-widest text-xs">
            {aboutMutation.isPending
              ? <><Loader size={14} className="animate-spin" /> Saving…</>
              : aboutSaved
                ? <><Check size={14} /> Saved!</>
                : 'Save About'}
          </button>
        </motion.section>

        {/* ── Yearbook ── */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={15} className="text-gold/60" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Yearbook</h2>
          </div>

          {/* 1987 */}
          {([
            { label: '1987 Yearbook', type: t1987, url: u1987, setType: setY1987type, setUrl: setY1987url },
            { label: '2026 Yearbook', type: t2026, url: u2026, setType: setY2026type, setUrl: setY2026url },
          ] as const).map(({ label, type, url, setType, setUrl }) => (
            <div key={label} className="space-y-3 pb-6 border-b border-white/5 last:border-0 last:pb-0">
              <p className="text-xs font-bold text-gold/70 uppercase tracking-widest">{label}</p>

              {/* Type toggle */}
              <div className="flex gap-2">
                {TYPE_OPTIONS.map(opt => (
                  <button key={opt.id} type="button"
                    onClick={() => setType(opt.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                      type === opt.id
                        ? 'bg-gold/15 text-gold border border-gold/30'
                        : 'glass text-gray-500 border border-white/5 hover:border-white/15 hover:text-white'
                    }`}>
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>

              <Field
                label={type === 'pdf' ? 'PDF URL' : 'Video URL'}
                hint={type === 'pdf'
                  ? 'Use a Google Drive preview link (drive.google.com/file/d/.../preview) or direct PDF URL.'
                  : 'Paste a YouTube or Vimeo URL — it will be converted to an embed automatically.'}>
                <input value={url} onChange={e => setUrl(e.target.value)}
                  placeholder={type === 'pdf'
                    ? 'https://drive.google.com/file/d/.../preview'
                    : 'https://youtube.com/watch?v=…'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors" />
              </Field>
            </div>
          ))}

          {yearbookMutation.isError && (
            <p className="text-red-400 text-sm">{(yearbookMutation.error as Error).message}</p>
          )}

          <button onClick={() => yearbookMutation.mutate()} disabled={yearbookMutation.isPending}
            className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 px-6 rounded-full transition-all disabled:opacity-50 uppercase tracking-widest text-xs">
            {yearbookMutation.isPending
              ? <><Loader size={14} className="animate-spin" /> Saving…</>
              : yearbookSaved
                ? <><Check size={14} /> Saved!</>
                : 'Save Yearbook'}
          </button>
        </motion.section>

      </div>
    </div>
  );
}

import { useState, useMemo, useEffect, useRef, useCallback, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Filter, Upload, ChevronLeft, ChevronRight, Search, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { qk, fetchApprovedMedia, fetchCharters } from '../lib/queries';
import { resolveMediaUrl } from '../lib/storage';
import MediaComments from '../components/MediaComments';
import MediaTags from '../components/MediaTags';

type MediaItem = Awaited<ReturnType<typeof fetchApprovedMedia>>[number];

function ytThumb(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}
function embedUrl(url: string) {
  return url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
}
function isEmbedVideo(item: MediaItem): boolean {
  return item.type === 'video' && !!item.external_url;
}
function displayUrl(item: MediaItem): string | null {
  if (item.type === 'photo') return resolveMediaUrl(item.storage_path);
  return item.external_url ?? resolveMediaUrl(item.storage_path);
}

function matchesSearch(item: MediaItem, q: string): boolean {
  if (!q) return true;
  const lq = q.toLowerCase();
  return (
    (item.caption?.toLowerCase().includes(lq) ?? false) ||
    item.tags.some(t => t.includes(lq)) ||
    (item.charter?.name.toLowerCase().includes(lq) ?? false) ||
    item.allCharters.some(c => c.name.toLowerCase().includes(lq)) ||
    (item.profile?.name.toLowerCase().includes(lq) ?? false)
  );
}

const slideVariants = {
  enter:  (dir: number) => ({ x: dir >= 0 ? 180 : -180, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir >= 0 ? -180 : 180, opacity: 0 }),
};

function ArrowBtn({ side, onClick }: { side: 'left' | 'right'; onClick: (e: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      onClick={onClick}
      className={`fixed top-1/2 -translate-y-1/2 z-10
        ${side === 'left' ? 'left-2 md:left-4' : 'right-2 md:right-4'}
        w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10
        flex items-center justify-center text-white
        hover:bg-gold/20 hover:border-gold/30 hover:text-gold
        transition-all active:scale-95`}
      aria-label={side === 'left' ? 'Sebelumnya' : 'Berikutnya'}
    >
      {side === 'left' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>
  );
}

export default function Gallery() {
  const [selectedCharter, setCharter] = useState('');
  const [selectedYear,    setYear]    = useState('');
  const [selectedTag,     setTag]     = useState('');
  const [search,          setSearch]  = useState('');
  const [lightboxIdx,  setLightboxIdx] = useState<number | null>(null);
  const [direction,    setDirection]   = useState(1);
  const backdropRef                    = useRef<HTMLDivElement>(null);
  const touchStartX                    = useRef(0);

  const { data: items = [], isLoading } = useQuery({
    queryKey: qk.media('approved'),
    queryFn:  fetchApprovedMedia,
  });

  const { data: charters = [] } = useQuery({
    queryKey: qk.charters(),
    queryFn:  fetchCharters,
    staleTime: 1000 * 60 * 5,
  });

  const years = useMemo(() =>
    [...new Set(items.map(m => m.year_taken).filter(Boolean) as number[])].sort((a, b) => b - a),
    [items],
  );

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach(m => m.tags.forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [items]);

  const filtered = useMemo(() => {
    let r = items;
    if (selectedCharter) r = r.filter(m => m.allCharters.some(c => c.id === selectedCharter));
    if (selectedYear)    r = r.filter(m => m.year_taken === parseInt(selectedYear));
    if (selectedTag)     r = r.filter(m => m.tags.includes(selectedTag));
    if (search)          r = r.filter(m => matchesSearch(m, search));
    return r;
  }, [items, selectedCharter, selectedYear, selectedTag, search]);

  const lightbox = lightboxIdx !== null ? (filtered[lightboxIdx] ?? null) : null;

  const navigate = useCallback((delta: number) => {
    if (filtered.length === 0) return;
    setDirection(delta);
    setLightboxIdx(prev =>
      prev === null ? prev
        : ((prev + delta) % filtered.length + filtered.length) % filtered.length,
    );
    requestAnimationFrame(() => backdropRef.current?.scrollTo({ top: 0, behavior: 'instant' }));
  }, [filtered.length]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navigate(1);
      else if (e.key === 'ArrowLeft') navigate(-1);
      else if (e.key === 'Escape') setLightboxIdx(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, navigate]);

  function openLightbox(idx: number) { setDirection(1); setLightboxIdx(idx); }

  const hasFilters = !!(selectedCharter || selectedYear || selectedTag || search);

  return (
    <section className="p-6 md:p-8 min-h-screen">
      <div className="max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-5 mb-6">
          <div>
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-gold/70 mb-2 block">Memories</span>
            <h2 className="text-4xl font-bold text-forest font-serif">Gallery</h2>
          </div>
          <Link to="/submit"
            className="btn-primary flex items-center gap-2 font-bold py-2 px-5 rounded-full text-xs uppercase tracking-widest transition-all shrink-0">
            <Upload size={13} /> Submit Media
          </Link>
        </div>

        {/* Search + filters row */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Search bar */}
          <div className="relative">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setLightboxIdx(null); }}
              placeholder="Cari foto, video, caption, charter…"
              className="w-full bg-white border border-amber-200 rounded-full pl-10 pr-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-gold/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Dropdown filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Filter size={14} className="text-gray-400 shrink-0" />
            <select value={selectedCharter} onChange={e => { setCharter(e.target.value); setLightboxIdx(null); }}
              className="glass-card px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-gray-600 border border-amber-200 focus:outline-none cursor-pointer">
              <option value="">Semua Charter</option>
              {charters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {years.length > 0 && (
              <select value={selectedYear} onChange={e => { setYear(e.target.value); setLightboxIdx(null); }}
                className="glass-card px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-gray-600 border border-amber-200 focus:outline-none cursor-pointer">
                <option value="">Semua Tahun</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            {hasFilters && (
              <button
                onClick={() => { setCharter(''); setYear(''); setTag(''); setSearch(''); }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={12} /> Reset
              </button>
            )}
          </div>

          {/* Tag chips */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={12} className="text-gray-400 shrink-0" />
              {allTags.slice(0, 15).map(t => (
                <button
                  key={t}
                  onClick={() => { setTag(selectedTag === t ? '' : t); setLightboxIdx(null); }}
                  className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-all ${
                    selectedTag === t
                      ? 'bg-gold/20 text-gold border-gold/40'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-gold/30 hover:bg-amber-100'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="text-center py-20 text-gray-400 text-sm tracking-widest uppercase animate-pulse">Memuat galeri…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm tracking-widest uppercase">Belum ada foto.</div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 [column-gap:1rem]">
            {filtered.map((item, i) => {
              const url   = displayUrl(item);
              const thumb = item.type === 'photo' ? url : (url ? ytThumb(url) : null);
              return (
                <motion.div key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                  onClick={() => openLightbox(i)}
                  className="break-inside-avoid mb-4 rounded-2xl overflow-hidden cursor-pointer group relative">
                  {thumb
                    ? <img src={thumb} alt={item.caption ?? ''} loading="lazy"
                        className="w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                    : <div className="aspect-video bg-white/5 flex items-center justify-center">
                        <Play size={32} className="text-gold/30" />
                      </div>
                  }
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-gold/80 transition-all duration-300">
                        <Play size={18} className="text-white ml-1" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {item.caption && <p className="text-white text-xs leading-snug mb-1 line-clamp-2">{item.caption}</p>}
                      <p className="text-gold/60 text-[10px] uppercase tracking-widest">
                        {item.charter?.name}{item.year_taken ? ` · ${item.year_taken}` : ''}
                      </p>
                      {item.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1.5">
                          {item.tags.slice(0, 3).map(t => (
                            <span key={t} className="text-[9px] bg-white/20 text-white/80 rounded-full px-2 py-0.5">#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            ref={backdropRef}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 overflow-y-auto"
            onClick={() => setLightboxIdx(null)}
            onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              const delta = touchStartX.current - e.changedTouches[0].clientX;
              if (Math.abs(delta) > 50) navigate(delta > 0 ? 1 : -1);
            }}
          >
            <button
              onClick={() => setLightboxIdx(null)}
              className="fixed top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:text-gold hover:border-gold/30 transition-all"
            >
              <X size={18} />
            </button>

            {filtered.length > 1 && (
              <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white text-xs font-bold tracking-widest">
                {lightboxIdx! + 1} / {filtered.length}
              </div>
            )}

            {filtered.length > 1 && (
              <>
                <ArrowBtn side="left"  onClick={e => { e.stopPropagation(); navigate(-1); }} />
                <ArrowBtn side="right" onClick={e => { e.stopPropagation(); navigate(1);  }} />
              </>
            )}

            <div
              className="flex min-h-full items-center justify-center px-14 py-6 md:px-20 md:py-8"
              onClick={e => e.stopPropagation()}
            >
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={lightboxIdx}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.18, ease: 'easeInOut' }}
                  className="max-w-4xl w-full"
                >
                  {/* Media */}
                  {lightbox.type === 'photo' && displayUrl(lightbox)
                    ? <img src={displayUrl(lightbox)!} alt={lightbox.caption ?? ''} className="w-full max-h-[55vh] object-contain rounded-2xl" />
                    : isEmbedVideo(lightbox) && displayUrl(lightbox)
                      ? <div className="aspect-video rounded-2xl overflow-hidden">
                          <iframe src={embedUrl(displayUrl(lightbox)!)} className="w-full h-full" allowFullScreen title={lightbox.caption ?? 'Video'} />
                        </div>
                      : displayUrl(lightbox)
                        ? <div className="aspect-video rounded-2xl overflow-hidden">
                            <video src={displayUrl(lightbox)!} controls className="w-full h-full" />
                          </div>
                        : null
                  }

                  {/* Caption + meta */}
                  <div className="mt-4 px-2">
                    {(lightbox.caption || lightbox.allCharters.length > 0 || lightbox.profile) && (
                      <div className="text-center mb-3">
                        {lightbox.caption && (
                          <p className="text-gray-300 text-sm mb-1">{lightbox.caption}</p>
                        )}
                        <p className="text-gold/50 text-xs uppercase tracking-widest">
                          {[lightbox.allCharters.map(c => c.name).join(', '), lightbox.year_taken, lightbox.profile?.name]
                            .filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    )}

                    {/* Tags (uploader + member-added) */}
                    <MediaTags
                      mediaId={lightbox.id}
                      uploaderTags={lightbox.tags}
                      onTagClick={t => { setTag(t); setLightboxIdx(null); }}
                      variant="dark"
                    />

                    <div className="border-t border-white/10 pt-4">
                      <MediaComments mediaId={lightbox.id} variant="dark" />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

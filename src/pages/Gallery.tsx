import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Filter, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { qk, fetchApprovedMedia, fetchCharters } from '../lib/queries';
import { resolveMediaUrl } from '../lib/storage';

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
  // Video: prefer external (YouTube/Vimeo), fall back to VPS-stored video
  return item.external_url ?? resolveMediaUrl(item.storage_path);
}

export default function Gallery() {
  const [selectedCharter, setCharter] = useState('');
  const [selectedYear, setYear]       = useState('');
  const [lightbox, setLightbox]       = useState<MediaItem | null>(null);

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
    [items]
  );

  const filtered = useMemo(() => {
    let r = items;
    if (selectedCharter) r = r.filter(m => m.charter?.id === selectedCharter);
    if (selectedYear)    r = r.filter(m => m.year_taken === parseInt(selectedYear));
    return r;
  }, [items, selectedCharter, selectedYear]);

  return (
    <section className="p-6 md:p-8 min-h-screen">
      <div className="max-w-7xl">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-5 mb-8">
          <div>
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-gold/70 mb-2 block">Memories</span>
            <h2 className="text-4xl font-bold text-forest font-serif">Gallery</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
            <Link to="/submit"
              className="btn-primary flex items-center gap-2 font-bold py-2 px-5 rounded-full text-xs uppercase tracking-widest transition-all shrink-0">
              <Upload size={13} /> Submit Media
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <Filter size={14} className="text-gray-400 shrink-0" />
              <select value={selectedCharter} onChange={e => setCharter(e.target.value)}
                className="glass-card px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-gray-600 border border-amber-200 focus:outline-none cursor-pointer">
                <option value="">All Charters</option>
                {charters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {years.length > 0 && (
                <select value={selectedYear} onChange={e => setYear(e.target.value)}
                  className="glass-card px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-gray-600 border border-amber-200 focus:outline-none cursor-pointer">
                  <option value="">All Years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-gray-400 text-sm tracking-widest uppercase animate-pulse">Loading gallery…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm tracking-widest uppercase">No photos yet.</div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 [column-gap:1rem]">
            {filtered.map((item, i) => {
              const url   = displayUrl(item);
              const thumb = item.type === 'photo' ? url : (url ? ytThumb(url) : null);
              return (
                <motion.div key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                  onClick={() => setLightbox(item)}
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
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightbox && (() => {
          const url = displayUrl(lightbox);
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setLightbox(null)}
              className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 md:p-8">
              <button onClick={() => setLightbox(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full glass flex items-center justify-center text-white hover:text-gold transition-colors z-10">
                <X size={18} />
              </button>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.2 }}
                onClick={e => e.stopPropagation()} className="max-w-4xl w-full">
                {lightbox.type === 'photo' && url
                  ? <img src={url} alt={lightbox.caption ?? ''} className="w-full max-h-[80vh] object-contain rounded-2xl" />
                  : isEmbedVideo(lightbox) && url
                    ? <div className="aspect-video rounded-2xl overflow-hidden">
                        <iframe src={embedUrl(url)} className="w-full h-full" allowFullScreen title={lightbox.caption ?? 'Video'} />
                      </div>
                    : url
                      ? <div className="aspect-video rounded-2xl overflow-hidden">
                          <video src={url} controls className="w-full h-full" />
                        </div>
                      : null
                }
                {(lightbox.caption || lightbox.charter || lightbox.profile) && (
                  <div className="mt-4 text-center px-4">
                    {lightbox.caption && <p className="text-gray-300 text-sm mb-1">{lightbox.caption}</p>}
                    <p className="text-gold/50 text-xs uppercase tracking-widest">
                      {[lightbox.charter?.name, lightbox.year_taken, lightbox.profile?.name].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </section>
  );
}

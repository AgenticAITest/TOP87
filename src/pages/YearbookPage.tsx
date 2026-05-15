import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getContentConfig } from '../lib/queries';

function getEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

export default function YearbookPage() {
  const { year } = useParams<{ year: string }>();
  const isValid = year === '1987' || year === '2026';

  const { data, isLoading } = useQuery({
    queryKey: ['site_settings', 'content'],
    queryFn:  getContentConfig,
  });

  const entry = year === '1987' ? data?.yearbook.y1987 : data?.yearbook.y2026;
  const otherYear = year === '1987' ? '2026' : '1987';

  if (!isValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Yearbook not found.</p>
        <Link to="/yearbook/2026" className="text-gold text-sm hover:underline">← Back to Yearbook</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="text-gold" size={18} />
            <span className="text-xs uppercase tracking-[0.3em] text-gold">Yearbook</span>
          </div>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-white">{year}</h1>
            <Link
              to={`/yearbook/${otherYear}`}
              className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-gray-500 hover:text-gold transition-colors"
            >
              Switch to {otherYear} <ChevronDown size={12} className="-rotate-90" />
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            {year === '1987'
              ? 'The original — our class as it was.'
              : 'The reunion edition — where we are now.'}
          </p>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="h-[70vh] glass rounded-2xl animate-pulse" />
        ) : !entry?.url ? (
          <div className="h-[70vh] glass rounded-2xl flex flex-col items-center justify-center gap-3">
            <BookOpen size={40} className="text-gold/20" />
            <p className="text-gray-600 text-sm uppercase tracking-widest">Coming soon</p>
            <p className="text-gray-700 text-xs">The {year} yearbook hasn't been uploaded yet.</p>
          </div>
        ) : entry.type === 'pdf' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="rounded-2xl overflow-hidden shadow-2xl border border-white/5">
            <iframe
              src={entry.url}
              className="w-full"
              style={{ height: '80vh' }}
              title={`${year} Yearbook`}
              allow="autoplay"
            />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="rounded-2xl overflow-hidden shadow-2xl border border-white/5 aspect-video">
            <iframe
              src={getEmbedUrl(entry.url)}
              className="w-full h-full"
              title={`${year} Yearbook`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}

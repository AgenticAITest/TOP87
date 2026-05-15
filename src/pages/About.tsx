import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getContentConfig } from '../lib/queries';

export default function About() {
  const { data, isLoading } = useQuery({
    queryKey: ['site_settings', 'content'],
    queryFn:  getContentConfig,
  });

  const heroUrl = data?.about.heroUrl;
  const body    = data?.about.body ?? '';
  const paragraphs = body.split('\n').map(p => p.trim()).filter(Boolean);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      {heroUrl && (
        <div className="relative h-72 md:h-96 overflow-hidden">
          <img src={heroUrl} alt="Our Story" className="w-full h-full object-cover grayscale opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-charcoal" />
        </div>
      )}

      <div className={`px-6 ${heroUrl ? 'pt-8' : 'pt-32'} pb-24`}>
        <div className="max-w-3xl mx-auto">

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-3 block">About</span>
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-white mb-10">Our Story</h1>
          </motion.div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-5 bg-white/5 rounded animate-pulse" style={{ width: `${70 + i * 10}%` }} />
              ))}
            </div>
          ) : paragraphs.length === 0 ? (
            <p className="text-gray-600 text-sm italic">Content coming soon.</p>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              className="space-y-6">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-gray-300 leading-relaxed text-lg">{p}</p>
              ))}
            </motion.div>
          )}

          {/* CTA */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mt-16 pt-10 border-t border-white/5 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 text-gray-500">
              <Users size={16} />
              <span className="text-sm">Connect with fellow alumni</span>
            </div>
            <Link to="/directory"
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gold hover:text-white transition-colors">
              Member Directory <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

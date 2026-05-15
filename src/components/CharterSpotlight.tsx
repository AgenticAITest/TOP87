import { motion } from 'motion/react';
import { Globe, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { qk, fetchCharters } from '../lib/queries';

const IMAGES: Record<string, string> = {
  jakarta:   'https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&q=80&w=600&h=400',
  bandung:   '/gedung_sate.png',
  us:        'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&q=80&w=600&h=400',
  australia: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&q=80&w=600&h=400',
};

export default function CharterSpotlight() {
  const { data: charters = [], isLoading } = useQuery({
    queryKey: qk.charters(),
    queryFn:  fetchCharters,
    staleTime: 1000 * 60 * 5, // charters rarely change
  });

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <span className="text-xs font-bold tracking-[0.3em] uppercase text-gold mb-2 block">Our Communities</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white font-serif">Charter Spotlight</h2>
        </div>
        <p className="text-gray-400 max-w-md italic">
          No matter where life took us after '87, we've always found a way to stay connected.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-24 text-gray-600 text-sm uppercase tracking-widest animate-pulse">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {charters.map((charter, i) => (
            <motion.div
              key={charter.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="group glass rounded-2xl overflow-hidden hover:border-gold/30 transition-all duration-500"
            >
              <div className="h-48 relative overflow-hidden">
                {IMAGES[charter.slug] ? (
                  <img
                    src={IMAGES[charter.slug]}
                    alt={charter.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-navy/50 flex items-center justify-center">
                    {charter.country === 'Indonesia'
                      ? <MapPin size={40} className="text-gold/30" />
                      : <Globe size={40} className="text-gold/30" />}
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white group-hover:text-gold transition-colors mb-1">{charter.name}</h3>
                <p className="text-xs text-gray-600 mb-3">{charter.city}, {charter.country}</p>
                {charter.description && (
                  <p className="text-sm text-gray-400 font-light mb-4">{charter.description}</p>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users size={12} /> {charter.memberCount} members
                  </span>
                  <Link
                    to={`/charters/${charter.slug}`}
                    className="text-xs font-bold uppercase tracking-widest text-gold hover:text-white transition-colors"
                  >
                    View →
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

import { motion } from 'motion/react';
import { Globe, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { qk, fetchCharters } from '../lib/queries';


export default function CharterSpotlight() {
  const { data: charters = [], isLoading } = useQuery({
    queryKey: qk.charters(),
    queryFn:  fetchCharters,
    staleTime: 1000 * 60 * 5, // charters rarely change
  });

  return (
    <section className="p-6 md:p-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-xs font-bold tracking-[0.3em] uppercase text-gold/70 mb-2 block">Our Communities</span>
          <h2 className="text-4xl font-bold text-forest font-serif">Charter Spotlight</h2>
        </div>
        <p className="text-gray-500 max-w-md italic text-sm">
          No matter where life took us after '87, we've always found a way to stay connected.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm uppercase tracking-widest animate-pulse">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {charters.map((charter, i) => (
            <motion.div
              key={charter.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              viewport={{ once: true }}
              className="group glass-card rounded-xl overflow-hidden hover:border-gold/30 transition-all duration-500 shadow-sm"
            >
              <div className="h-44 relative overflow-hidden">
                {(charter as any).hero_image_url ? (
                  <img
                    src={(charter as any).hero_image_url}
                    alt={charter.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                    {charter.country === 'Indonesia'
                      ? <MapPin size={40} className="text-gold/40" />
                      : <Globe size={40} className="text-gold/40" />}
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-forest group-hover:text-gold transition-colors mb-0.5">{charter.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{charter.city}, {charter.country}</p>
                {charter.description && (
                  <p className="text-sm text-gray-600 font-light mb-3 line-clamp-2">{charter.description}</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-amber-100 mt-auto">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users size={11} /> {charter.memberCount} members
                  </span>
                  <Link
                    to={`/charters/${charter.slug}`}
                    className="text-xs font-bold uppercase tracking-widest text-gold hover:text-forest transition-colors"
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

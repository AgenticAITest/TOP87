import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Globe, MapPin, Users, ShieldCheck, ArrowLeft, Megaphone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { qk, fetchCharterBySlug } from '../lib/queries';

export default function CharterDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: qk.charter(slug ?? ''),
    queryFn:  () => fetchCharterBySlug(slug!),
    enabled:  !!slug,
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm tracking-widest uppercase animate-pulse">Loading…</div>;
  }
  if (isError || !data?.charter) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Charter not found.</p>
        <Link to="/charters" className="text-gold text-sm hover:underline">← Back to Charters</Link>
      </div>
    );
  }

  const { charter, members } = data;

  return (
    <div className="min-h-screen">
      {/* Hero banner */}
      {(charter as any).hero_image_url && (
        <div className="relative h-64 md:h-72 overflow-hidden">
          <img src={(charter as any).hero_image_url} alt={charter.name}
            className="w-full h-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-parchment" />
        </div>
      )}

      <div className={`px-6 md:px-8 ${(charter as any).hero_image_url ? 'pt-6' : 'pt-8'} pb-16`}>
      <div className="max-w-6xl">
        <Link to="/charters" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-forest transition-colors mb-8">
          <ArrowLeft size={14} /> All Charters
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            {charter.country === 'Indonesia'
              ? <MapPin className="text-gold" size={18} />
              : <Globe className="text-gold" size={18} />}
            <span className="text-xs uppercase tracking-[0.3em] text-gold/70">Charter</span>
          </div>
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-forest mb-2">{charter.name}</h1>
          <p className="text-gray-500 text-base mb-3">{charter.city}, {charter.country}</p>
          {charter.description && (
            <p className="text-gray-600 max-w-xl leading-relaxed">{charter.description}</p>
          )}
          <div className="flex items-center gap-2 mt-5 text-sm text-gray-500">
            <Users size={16} />
            <span>{members.length} approved member{members.length !== 1 ? 's' : ''}</span>
          </div>
        </motion.div>

        {/* Announcement */}
        {(charter as any).announcement && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 items-start glass-card border-l-4 border-gold rounded-xl p-4 mb-8 max-w-2xl">
            <Megaphone size={16} className="text-gold shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">{(charter as any).announcement}</p>
          </motion.div>
        )}

        {members.length === 0 ? (
          <p className="text-gray-400 text-sm tracking-widest uppercase text-center py-12">No approved members yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {members.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
                className="glass-card p-5 rounded-xl group hover:border-gold/30 transition-all shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.name} referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                      <span className="font-serif font-bold text-gold text-lg">{member.name?.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-forest group-hover:text-gold transition-colors truncate">{member.name}</h3>
                      {member.is_primary && <ShieldCheck size={12} className="text-gold shrink-0" />}
                    </div>
                    {member.profession && <p className="text-xs text-gray-500 truncate">{member.profession}</p>}
                    {member.city && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={9} /> {member.city}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-amber-100 flex justify-end">
                  <Link to={`/members/${member.id}`}
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-gold transition-colors">
                    View Profile →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

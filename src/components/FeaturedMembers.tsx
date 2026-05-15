import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, MapPin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { qk, fetchApprovedMembers, getFeaturedConfig } from '../lib/queries';

type Member = Awaited<ReturnType<typeof fetchApprovedMembers>>[number];

function shuffle(arr: Member[]): Member[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FeaturedMembers() {
  const { data: config } = useQuery({
    queryKey: ['site_settings', 'featured'],
    queryFn:  getFeaturedConfig,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: qk.members(),
    queryFn:  fetchApprovedMembers,
    staleTime: 1000 * 60 * 5,
  });

  const [page, setPage]       = useState(0);
  const [shuffled, setShuffled] = useState<Member[]>([]);

  useEffect(() => {
    if (allMembers.length > 0) {
      setShuffled(shuffle(allMembers));
      setPage(0);
    }
  }, [allMembers.length]);

  const isRandom = !config || config.mode === 'random';
  const interval = config?.interval ?? 15;

  const totalPages = isRandom && shuffled.length > 0
    ? Math.ceil(shuffled.length / 4)
    : 1;

  useEffect(() => {
    if (!isRandom || totalPages <= 1) return;
    const timer = setInterval(() => {
      setPage(p => (p + 1) % totalPages);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [isRandom, totalPages, interval]);

  const displayMembers = useMemo((): Member[] => {
    if (allMembers.length === 0) return [];
    if (config?.mode === 'manual') {
      return (config.memberIds ?? [])
        .map(id => allMembers.find(m => m.id === id))
        .filter(Boolean) as Member[];
    }
    if (shuffled.length === 0) return [];
    return shuffled.slice(page * 4, page * 4 + 4);
  }, [config, allMembers, shuffled, page]);

  if (allMembers.length === 0 || displayMembers.length === 0) return null;

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <span className="text-xs font-bold tracking-[0.3em] uppercase text-gold mb-2 block">Alumni Spotlight</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white font-serif">Featured Members</h2>
        </div>
        <Link to="/directory"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gold transition-colors self-start md:self-auto">
          View All Members <ArrowRight size={14} />
        </Link>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {displayMembers.map((member, i) => (
            <motion.div key={member.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass rounded-2xl p-5 group hover:border-gold/20 transition-all flex flex-col"
            >
              <div className="flex flex-col items-center text-center flex-1">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.name ?? ''} referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all duration-500 mb-4 shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gold/10 flex items-center justify-center mb-4 shrink-0">
                    <span className="font-serif font-bold text-gold text-2xl">{member.name?.charAt(0) ?? '?'}</span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <h3 className="font-semibold text-white group-hover:text-gold transition-colors text-sm leading-snug">{member.name}</h3>
                  <ShieldCheck size={11} className="text-gold shrink-0" />
                </div>
                {member.profession && <p className="text-xs text-gray-500 mt-0.5">{member.profession}</p>}
                {member.city && (
                  <p className="text-[11px] text-gray-600 flex items-center gap-1 mt-1">
                    <MapPin size={9} /> {member.city}
                  </p>
                )}
                {member.primaryCharter && (
                  <span className="mt-3 text-[10px] uppercase tracking-widest text-gold/50">
                    {member.primaryCharter.name}
                  </span>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 text-center">
                <Link to={`/members/${member.id}`}
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-gold transition-colors">
                  View Profile →
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {isRandom && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={`rounded-full transition-all duration-300 ${
                i === page
                  ? 'w-6 h-1.5 bg-gold'
                  : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
              }`} />
          ))}
        </div>
      )}
    </section>
  );
}

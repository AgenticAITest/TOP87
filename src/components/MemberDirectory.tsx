import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Search, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { qk, fetchApprovedMembers, fetchCharters } from '../lib/queries';

export default function MemberDirectory() {
  const [search, setSearch]           = useState('');
  const [selectedCharter, setCharter] = useState('');

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: qk.members(),
    queryFn:  fetchApprovedMembers,
  });

  const { data: charters = [] } = useQuery({
    queryKey: qk.charters(),
    queryFn:  fetchCharters,
    staleTime: 1000 * 60 * 5,
  });

  const filtered = useMemo(() => {
    let result = members;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.city?.toLowerCase().includes(q) ||
        m.profession?.toLowerCase().includes(q)
      );
    }
    if (selectedCharter) {
      result = result.filter(m => m.primaryCharter?.id === selectedCharter);
    }
    return result;
  }, [members, search, selectedCharter]);

  return (
    <section className="py-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
          <div>
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-gold mb-2 block">Alumni Network</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white font-serif">Member Directory</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search alumni…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>
            <select
              value={selectedCharter}
              onChange={e => setCharter(e.target.value)}
              className="glass px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-gray-400 bg-charcoal border border-white/10 focus:outline-none cursor-pointer"
            >
              <option value="">All Charters</option>
              {charters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {loadingMembers ? (
          <div className="text-center py-32 text-gray-600 text-sm tracking-widest uppercase animate-pulse">Loading members…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-32 text-gray-600 text-sm tracking-widest uppercase">No members found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="glass p-6 rounded-3xl group hover:border-gold/20 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center">
                        <span className="text-2xl font-serif font-bold text-gold">{member.name?.charAt(0) ?? '?'}</span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-green-500/20">
                      <ShieldCheck size={12} className="text-green-400" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-lg font-bold text-white group-hover:text-gold transition-colors truncate">
                      {member.name}
                    </h3>
                    {member.profession && <p className="text-sm text-gray-500 truncate">{member.profession}</p>}
                    {member.city && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin size={10} /> {member.city}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-5 pt-5 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-gold/50">
                    {member.primaryCharter?.name ?? '—'}
                  </span>
                  <Link
                    to={`/members/${member.id}`}
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-gold transition-colors"
                  >
                    View Profile →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

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
    <section className="p-6 md:p-8 min-h-screen">
      <div className="max-w-7xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-8">
          <div>
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-gold/70 mb-2 block">Alumni Network</span>
            <h2 className="text-4xl font-bold text-forest font-serif">Member Directory</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search alumni…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border border-amber-200 rounded-full py-2 pl-10 pr-4 text-sm text-gray-800 focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>
            <select
              value={selectedCharter}
              onChange={e => setCharter(e.target.value)}
              className="glass-card px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-gray-600 border border-amber-200 focus:outline-none cursor-pointer"
            >
              <option value="">All Charters</option>
              {charters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {loadingMembers ? (
          <div className="text-center py-20 text-gray-400 text-sm tracking-widest uppercase animate-pulse">Loading members…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm tracking-widest uppercase">No members found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="glass-card p-5 rounded-xl group hover:border-gold/30 transition-all duration-300 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover transition-all duration-500"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                        <span className="text-xl font-serif font-bold text-gold">{member.name?.charAt(0) ?? '?'}</span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-green-50 border border-green-200">
                      <ShieldCheck size={10} className="text-green-600" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base font-bold text-forest group-hover:text-gold transition-colors truncate">
                      {member.name}
                    </h3>
                    {member.profession && <p className="text-sm text-gray-500 truncate">{member.profession}</p>}
                    {member.city && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <MapPin size={10} /> {member.city}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-amber-100 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-gold/60">
                    {member.primaryCharter?.name ?? '—'}
                  </span>
                  <Link
                    to={`/members/${member.id}`}
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-gold transition-colors"
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

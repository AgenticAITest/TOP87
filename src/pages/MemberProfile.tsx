import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, Briefcase, ShieldCheck, ArrowLeft, Smile, MessageSquare, Heart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { qk, fetchMemberById, fetchFriends } from '../lib/queries';

export default function MemberProfile() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: qk.member(id ?? ''),
    queryFn:  () => fetchMemberById(id!),
    enabled:  !!id,
  });

  const { data: friends = [] } = useQuery({
    queryKey: qk.friends(id ?? ''),
    queryFn:  () => fetchFriends(id!),
    enabled:  !!id && !isLoading && !isError,
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600 text-sm tracking-widest uppercase animate-pulse">Loading…</div>;
  }
  if (isError || !data?.profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Member not found.</p>
        <Link to="/directory" className="text-gold text-sm hover:underline">← Back to Directory</Link>
      </div>
    );
  }

  const { profile, memberships } = data;
  const primary = memberships.find(m => m.is_primary);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-3xl">
        <Link to="/directory" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-forest transition-colors mb-8">
          <ArrowLeft size={14} /> Directory
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name ?? ''} referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-2xl object-cover shadow-sm shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <span className="text-4xl font-serif font-bold text-gold">{profile.name?.charAt(0)}</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={13} className="text-green-600" />
                <span className="text-xs uppercase tracking-widest text-green-600">Approved Member</span>
              </div>
              <h1 className="font-serif text-3xl font-bold text-forest mb-1">{profile.name}</h1>
              {profile.nickname && (
                <p className="text-sm text-gold/80 font-medium mb-1">"{profile.nickname}"</p>
              )}
              {profile.profession && (
                <p className="text-gray-600 text-base flex items-center gap-2">
                  <Briefcase size={15} className="text-gold/60" /> {profile.profession}
                </p>
              )}
              {profile.city && (
                <p className="text-gray-500 flex items-center gap-2 mt-1">
                  <MapPin size={13} className="text-gold/60" /> {profile.city}
                </p>
              )}
              {primary && (
                <Link to={`/charters/${primary.charter.slug}`}
                  className="inline-block mt-3 text-[10px] uppercase tracking-widest text-gold/70 hover:text-gold transition-colors">
                  {primary.charter.name} Chapter →
                </Link>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {/* ── Bio ── */}
            {profile.bio && (
              <div className="glass-card p-6 rounded-xl shadow-sm">
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">About</p>
                <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* ── Funny Event ── */}
            {profile.funny_event && (
              <div className="glass-card p-6 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Smile size={15} className="text-gold/60" />
                  <p className="text-xs uppercase tracking-widest text-gray-400">Cerita Lucu / Kenangan Unik</p>
                </div>
                <p className="text-gray-700 leading-relaxed italic">"{profile.funny_event}"</p>
              </div>
            )}

            {/* ── Message to Friends ── */}
            {profile.message_to_friends && (
              <div className="glass-card p-6 rounded-xl shadow-sm border-l-4 border-gold/30">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={15} className="text-gold/60" />
                  <p className="text-xs uppercase tracking-widest text-gray-400">Pesan untuk Teman Angkatan</p>
                </div>
                <p className="text-gray-700 leading-relaxed">"{profile.message_to_friends}"</p>
              </div>
            )}

            {/* ── Friends List ── */}
            {friends.length > 0 && (
              <div className="glass-card p-6 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Heart size={15} className="text-gold/60" />
                  <p className="text-xs uppercase tracking-widest text-gray-400">Sahabat Angkatan</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {friends.map(fe => (
                    <Link key={fe.friend.id} to={`/members/${fe.friend.id}`}
                      className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-full hover:border-gold/40 hover:bg-amber-100 transition-colors">
                      {fe.friend.avatar_url ? (
                        <img src={fe.friend.avatar_url} alt={fe.friend.name} referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-gold">{fe.friend.name.charAt(0)}</span>
                        </div>
                      )}
                      <span className="text-xs text-gray-700 font-medium">{fe.friend.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── Charter Membership ── */}
            {memberships.length > 0 && (
              <div className="glass-card p-6 rounded-xl shadow-sm">
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">Charter Membership</p>
                <div className="flex flex-wrap gap-3">
                  {memberships.map(m => (
                    <Link key={m.charter_id} to={`/charters/${m.charter.slug}`}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
                        m.is_primary
                          ? 'bg-amber-50 text-gold border border-gold/30 hover:bg-amber-100'
                          : 'bg-white text-gray-600 border border-amber-200 hover:border-amber-300 hover:text-forest'
                      }`}>
                      {m.charter.name}{m.is_primary ? ' ★' : ''}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

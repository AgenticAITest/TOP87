import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, Briefcase, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { qk, fetchMemberById } from '../lib/queries';

export default function MemberProfile() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: qk.member(id ?? ''),
    queryFn:  () => fetchMemberById(id!),
    enabled:  !!id,
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
    <div className="min-h-screen py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/directory" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-gold transition-colors mb-12">
          <ArrowLeft size={14} /> Directory
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row items-start gap-8 mb-12">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} referrerPolicy="no-referrer"
                className="w-28 h-28 rounded-3xl object-cover shadow-[0_0_40px_rgba(212,175,55,0.15)]" />
            ) : (
              <div className="w-28 h-28 rounded-3xl bg-gold/10 flex items-center justify-center shrink-0">
                <span className="text-5xl font-serif font-bold text-gold">{profile.name?.charAt(0)}</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-green-400" />
                <span className="text-xs uppercase tracking-widest text-green-400">Approved Member</span>
              </div>
              <h1 className="font-serif text-4xl font-bold text-white mb-2">{profile.name}</h1>
              {profile.profession && (
                <p className="text-gray-400 text-lg flex items-center gap-2">
                  <Briefcase size={16} className="text-gold/50" /> {profile.profession}
                </p>
              )}
              {profile.city && (
                <p className="text-gray-500 flex items-center gap-2 mt-1">
                  <MapPin size={14} className="text-gold/50" /> {profile.city}
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

          {profile.bio && (
            <div className="glass p-6 rounded-2xl mb-6">
              <p className="text-xs uppercase tracking-widest text-gray-600 mb-3">About</p>
              <p className="text-gray-300 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {memberships.length > 0 && (
            <div className="glass p-6 rounded-2xl">
              <p className="text-xs uppercase tracking-widest text-gray-600 mb-4">Charter Membership</p>
              <div className="flex flex-wrap gap-3">
                {memberships.map(m => (
                  <Link key={m.charter_id} to={`/charters/${m.charter.slug}`}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
                      m.is_primary
                        ? 'bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20'
                        : 'glass text-gray-400 hover:text-white'
                    }`}>
                    {m.charter.name}{m.is_primary ? ' ★' : ''}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

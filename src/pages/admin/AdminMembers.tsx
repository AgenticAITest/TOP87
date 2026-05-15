import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, Check, X, ShieldOff, RotateCcw, MapPin } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminStatus } from '../../hooks/useAdminStatus';
import { qk, fetchAdminMembers } from '../../lib/queries';

type Status = 'all' | 'pending' | 'approved' | 'suspended' | 'rejected';

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-500/10 text-yellow-400',
  approved:  'bg-green-500/10 text-green-400',
  suspended: 'bg-orange-500/10 text-orange-400',
  rejected:  'bg-red-500/10 text-red-400',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminMembers() {
  const { user } = useAuth();
  const { isSuperAdmin, charterIds, loading: adminLoading } = useAdminStatus();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('all');

  const { data: members = [], isLoading } = useQuery({
    queryKey: qk.adminMembers(isSuperAdmin, charterIds),
    queryFn:  () => fetchAdminMembers(isSuperAdmin, charterIds),
    enabled:  !adminLoading,
  });

  const filtered = useMemo(() => {
    let result = members;
    if (status !== 'all') result = result.filter(m => m.status === status);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.city?.toLowerCase().includes(q) ||
        m.profession?.toLowerCase().includes(q) ||
        m.primaryCharter?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [members, status, search]);

  const actionMutation = useMutation({
    mutationFn: async ({ memberId, newStatus }: { memberId: string; newStatus: 'approved' | 'rejected' | 'suspended' }) => {
      await supabase.from('profiles').update({ status: newStatus }).eq('id', memberId);
      await supabase.from('audit_log').insert({
        action: `member_${newStatus}`, actor_id: user!.id, target_id: memberId,
        details: { new_status: newStatus },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: qk.members() });
    },
  });

  const statusTabs: Status[] = ['all', 'pending', 'approved', 'suspended', 'rejected'];
  const counts = statusTabs.reduce((acc, s) => {
    acc[s] = s === 'all' ? members.length : members.filter(m => m.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white">Member Management</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input type="text" placeholder="Search members…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {statusTabs.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                status === s
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : 'text-gray-500 hover:text-white border border-white/5 hover:border-white/15'
              }`}>
              {s} {counts[s] > 0 && <span className="ml-1 opacity-60">{counts[s]}</span>}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase animate-pulse">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase">No members found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((member, i) => (
            <motion.div key={member.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.2) }}
              className="glass flex items-center gap-4 p-4 rounded-xl hover:border-white/10 transition-colors">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.name} referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <span className="font-serif font-bold text-gold text-sm">{member.name?.charAt(0)}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{member.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-2 truncate">
                  {member.primaryCharter && <span>{member.primaryCharter}</span>}
                  {member.city && <span className="flex items-center gap-0.5"><MapPin size={9} />{member.city}</span>}
                  {member.profession && <span className="text-gray-600">{member.profession}</span>}
                </p>
              </div>
              <span className="text-[10px] text-gray-600 shrink-0 hidden sm:block">{timeAgo(member.created_at)}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[member.status] ?? 'text-gray-400'}`}>
                {member.status}
              </span>
              <div className="flex gap-1.5 shrink-0">
                {member.status === 'pending' && (
                  <>
                    <button onClick={() => actionMutation.mutate({ memberId: member.id, newStatus: 'approved' })}
                      disabled={actionMutation.isPending} title="Approve"
                      className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all disabled:opacity-40">
                      <Check size={14} />
                    </button>
                    <button onClick={() => actionMutation.mutate({ memberId: member.id, newStatus: 'rejected' })}
                      disabled={actionMutation.isPending} title="Reject"
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-40">
                      <X size={14} />
                    </button>
                  </>
                )}
                {member.status === 'approved' && (
                  <button onClick={() => actionMutation.mutate({ memberId: member.id, newStatus: 'suspended' })}
                    disabled={actionMutation.isPending} title="Suspend"
                    className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white transition-all disabled:opacity-40">
                    <ShieldOff size={14} />
                  </button>
                )}
                {(member.status === 'suspended' || member.status === 'rejected') && (
                  <button onClick={() => actionMutation.mutate({ memberId: member.id, newStatus: 'approved' })}
                    disabled={actionMutation.isPending} title="Restore"
                    className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all disabled:opacity-40">
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

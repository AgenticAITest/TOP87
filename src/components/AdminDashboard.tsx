import { motion } from 'motion/react';
import { Users, Clock, ShieldOff, CheckCircle, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { qk, fetchAdminDashboard } from '../lib/queries';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function actionLabel(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { isSuperAdmin, charterIds, loading: adminLoading } = useAdminStatus();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: qk.adminDashboard(isSuperAdmin, charterIds),
    queryFn:  () => fetchAdminDashboard(isSuperAdmin, charterIds),
    enabled:  !adminLoading,
  });

  const stats   = data?.stats   ?? { pending: 0, approved: 0, suspended: 0, total: 0 };
  const pending = data?.pending ?? [];
  const audit   = data?.audit   ?? [];

  const actionMutation = useMutation({
    mutationFn: async ({ memberId, status }: { memberId: string; status: 'approved' | 'rejected' }) => {
      await supabase.from('profiles').update({ status }).eq('id', memberId);
      await supabase.from('audit_log').insert({
        action: `member_${status}`, actor_id: user!.id, target_id: memberId,
        details: { new_status: status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: qk.members() });
    },
  });

  const statCards = [
    { label: 'Pending',   value: stats.pending,   icon: Clock,        color: 'text-yellow-400' },
    { label: 'Approved',  value: stats.approved,   icon: CheckCircle,  color: 'text-green-400'  },
    { label: 'Suspended', value: stats.suspended,  icon: ShieldOff,    color: 'text-orange-400' },
    { label: 'Total',     value: stats.total,       icon: Users,        color: 'text-gold'       },
  ];

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }} className="glass p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest text-gray-500">{label}</span>
              <Icon size={16} className={color} />
            </div>
            <p className={`text-4xl font-bold font-serif ${color}`}>
              {isLoading ? '—' : value}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <h2 className="font-serif text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Clock size={18} className="text-yellow-400" /> Pending Approvals
            {stats.pending > 0 && (
              <span className="ml-auto text-xs bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full">
                {stats.pending}
              </span>
            )}
          </h2>

          {isLoading ? (
            <p className="text-gray-600 text-sm text-center py-12 tracking-widest uppercase animate-pulse">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-12 tracking-widest uppercase">No pending applications.</p>
          ) : (
            <div className="space-y-3">
              {pending.map(member => (
                <div key={member.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.name} referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                      <span className="font-serif font-bold text-gold">{member.name?.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{member.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {member.primaryCharter ?? '—'}{member.city ? ` · ${member.city}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(member.created_at)}</span>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => actionMutation.mutate({ memberId: member.id, status: 'approved' })}
                      disabled={actionMutation.isPending}
                      className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all disabled:opacity-40">
                      <Check size={15} />
                    </button>
                    <button onClick={() => actionMutation.mutate({ memberId: member.id, status: 'rejected' })}
                      disabled={actionMutation.isPending}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-40">
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-serif text-xl font-bold text-white mb-6">Audit Log</h2>
          {audit.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-12 tracking-widest uppercase">No activity yet.</p>
          ) : (
            <div className="space-y-5">
              {audit.map((entry: any, i) => (
                <div key={entry.id} className="flex gap-3 relative">
                  {i < audit.length - 1 && (
                    <div className="absolute left-1.5 top-5 bottom-0 w-px bg-white/10" />
                  )}
                  <div className="w-3 h-3 rounded-full bg-gold shrink-0 mt-1 z-10 shadow-[0_0_6px_rgba(212,175,55,0.4)]" />
                  <div className="min-w-0">
                    <p className="text-xs text-white font-medium">{actionLabel(entry.action)}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(entry.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

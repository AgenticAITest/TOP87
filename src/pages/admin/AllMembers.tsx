import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, Check, X, ShieldOff, RotateCcw, MapPin, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { fetchCharters, qk } from '../../lib/queries';

async function fetchAllMembersAdmin() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, city, profession, status, reunion_attendance, created_at, charter_members(charter_id, is_primary, charters(id, name))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p: any) => {
    const cms: any[] = p.charter_members ?? [];
    const primary = cms.find(cm => cm.is_primary);
    return {
      id:                 p.id as string,
      name:               p.name as string | null,
      avatar_url:         p.avatar_url as string | null,
      city:               p.city as string | null,
      profession:         p.profession as string | null,
      status:             p.status as string,
      reunion_attendance: (p.reunion_attendance ?? null) as string | null,
      created_at:         p.created_at as string,
      primaryCharterId:   (primary?.charters?.id ?? null) as string | null,
      allCharters:        cms.map(cm => cm.charters?.name as string).filter(Boolean),
    };
  });
}

type Status = 'all' | 'pending' | 'approved' | 'suspended' | 'rejected';
type AttendanceFilter = 'all' | 'yes' | 'most_likely' | 'undecided' | 'no' | 'none';

const ATTENDANCE_LABELS: Record<string, string> = {
  yes:         'Hadir',
  most_likely: 'InshaAllah',
  undecided:   'Belum Tahu',
  no:          'Tidak Bisa',
};

const ATTENDANCE_COLORS: Record<string, string> = {
  yes:         'bg-green-500/10 text-green-400',
  most_likely: 'bg-blue-500/10  text-blue-400',
  undecided:   'bg-yellow-500/10 text-yellow-400',
  no:          'bg-red-500/10   text-red-400',
};

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-500/10 text-yellow-400',
  approved:  'bg-green-500/10  text-green-400',
  suspended: 'bg-orange-500/10 text-orange-400',
  rejected:  'bg-red-500/10    text-red-400',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_TABS: Status[] = ['all', 'pending', 'approved', 'suspended', 'rejected'];

export default function AllMembers() {
  const { user }       = useAuth();
  const queryClient    = useQueryClient();
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState<Status>('all');
  const [charterId, setCharterId] = useState('');
  const [attendance, setAttendance] = useState<AttendanceFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['admin', 'all-members'],
    queryFn:  fetchAllMembersAdmin,
  });

  const { data: charters = [] } = useQuery({
    queryKey: ['charters'],
    queryFn:  fetchCharters,
    staleTime: 1000 * 60 * 5,
  });

  const stats = useMemo(() => ({
    total:     members.length,
    pending:   members.filter(m => m.status === 'pending').length,
    approved:  members.filter(m => m.status === 'approved').length,
    suspended: members.filter(m => m.status === 'suspended').length,
  }), [members]);

  const filtered = useMemo(() => {
    let r = members;
    if (status !== 'all') r = r.filter(m => m.status === status);
    if (charterId)        r = r.filter(m => m.primaryCharterId === charterId);
    if (attendance === 'none') r = r.filter(m => !m.reunion_attendance);
    else if (attendance !== 'all') r = r.filter(m => m.reunion_attendance === attendance);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.city?.toLowerCase().includes(q) ||
        m.profession?.toLowerCase().includes(q) ||
        m.allCharters.some(c => c.toLowerCase().includes(q))
      );
    }
    return r;
  }, [members, status, charterId, attendance, search]);

  const actionMutation = useMutation({
    mutationFn: async ({ memberId, newStatus }: { memberId: string; newStatus: 'approved' | 'rejected' | 'suspended' }) => {
      await supabase.from('profiles').update({ status: newStatus }).eq('id', memberId);
      await supabase.from('audit_log').insert({
        action: `member_${newStatus}`, actor_id: user!.id, target_id: memberId,
        details: { new_status: newStatus },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.functions.invoke('delete-member', {
        body: { userId: memberId },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: qk.members() });
    },
  });

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Super Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white">All Members</h1>
        <p className="text-gray-500 text-sm mt-1">Every account across all charters.</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {([
          { label: 'Total',     key: 'total',     color: 'text-white' },
          { label: 'Pending',   key: 'pending',   color: 'text-yellow-400' },
          { label: 'Approved',  key: 'approved',  color: 'text-green-400' },
          { label: 'Suspended', key: 'suspended', color: 'text-orange-400' },
        ] as const).map(s => (
          <div key={s.key} className="glass rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold font-serif ${s.color}`}>
              {stats[s.key]}
            </p>
            <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + charter filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input type="text" placeholder="Search name, city, charter…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors" />
        </div>
        <select value={charterId} onChange={e => setCharterId(e.target.value)}
          className="bg-zinc-900 border border-white/10 rounded-full px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-gold/50 transition-colors">
          <option value="">All Charters</option>
          {charters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={attendance} onChange={e => setAttendance(e.target.value as AttendanceFilter)}
          className="bg-zinc-900 border border-white/10 rounded-full px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-gold/50 transition-colors">
          <option value="all">All Attendance</option>
          <option value="yes">Hadir</option>
          <option value="most_likely">InshaAllah</option>
          <option value="undecided">Belum Tahu</option>
          <option value="no">Tidak Bisa</option>
          <option value="none">Belum Isi</option>
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap items-center mb-6">
        {STATUS_TABS.map(s => {
          const count = s === 'all' ? members.length : members.filter(m => m.status === s).length;
          return (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                status === s
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : 'text-gray-500 hover:text-white border border-white/5 hover:border-white/15'
              }`}>
              {s}{count > 0 && <span className="ml-1 opacity-60">{count}</span>}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-gray-600">{filtered.length} shown</span>
      </div>

      {isLoading ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase animate-pulse">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase">No members found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((member, i) => (
            <motion.div key={member.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.015, 0.25) }}
              className={`glass flex items-center gap-4 p-4 rounded-xl transition-colors ${
                confirmDeleteId === member.id ? 'border border-red-500/30' : 'hover:border-white/10'
              }`}>

              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.name ?? ''} referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <span className="font-serif font-bold text-gold text-sm">{member.name?.charAt(0) ?? '?'}</span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{member.name ?? '—'}</p>
                {confirmDeleteId === member.id ? (
                  <p className="text-xs text-red-400">Delete this member? This cannot be undone.</p>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {member.allCharters.length > 0
                      ? member.allCharters.map((c, idx) => (
                          <span key={idx} className={`text-xs ${idx === 0 ? 'text-gray-400' : 'text-gray-600'}`}>{c}</span>
                        ))
                      : <span className="text-xs text-gray-700 italic">No charter</span>
                    }
                    {member.city && (
                      <span className="text-xs text-gray-600 flex items-center gap-0.5">
                        <MapPin size={9} />{member.city}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {confirmDeleteId === member.id ? (
                <div className="flex gap-2 shrink-0 ml-auto">
                  <button onClick={() => deleteMutation.mutate(member.id)}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-600 transition-all disabled:opacity-50">
                    {deleteMutation.isPending ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-all">
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-[10px] text-gray-600 shrink-0 hidden md:block">
                    {timeAgo(member.created_at)}
                  </span>

                  {member.reunion_attendance && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 hidden lg:inline ${ATTENDANCE_COLORS[member.reunion_attendance] ?? 'text-gray-400'}`}>
                      {ATTENDANCE_LABELS[member.reunion_attendance] ?? member.reunion_attendance}
                    </span>
                  )}

                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[member.status] ?? 'text-gray-400'}`}>
                    {member.status}
                  </span>

                  <div className="flex gap-1.5 shrink-0">
                    {member.status === 'pending' && (<>
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
                    </>)}
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
                    <button onClick={() => setConfirmDeleteId(member.id)}
                      title="Delete member"
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

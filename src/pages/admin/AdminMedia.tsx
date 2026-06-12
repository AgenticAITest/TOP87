import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, X, Play, ImageIcon, ExternalLink, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminStatus } from '../../hooks/useAdminStatus';
import { qk, fetchAdminMedia } from '../../lib/queries';
import { resolveMediaUrl } from '../../lib/storage';
import MediaComments from '../../components/MediaComments';

type StatusFilter = 'pending' | 'approved' | 'rejected';

function ytThumb(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function thumbUrl(item: Awaited<ReturnType<typeof fetchAdminMedia>>[number]): string | null {
  if (item.type === 'photo') return resolveMediaUrl(item.storage_path);
  if (item.external_url) return ytThumb(item.external_url);
  // VPS-stored video — no thumbnail available yet
  return null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_STYLES: Record<StatusFilter, string> = {
  pending:  'bg-yellow-500/10 text-yellow-400',
  approved: 'bg-green-500/10  text-green-400',
  rejected: 'bg-red-500/10    text-red-400',
};

export default function AdminMedia() {
  const { user } = useAuth();
  const { isSuperAdmin, charterIds, loading: adminLoading } = useAdminStatus();
  const queryClient = useQueryClient();

  const [filter,           setFilter]           = useState<StatusFilter>('pending');
  const [expandedComments, setExpandedComments] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: qk.adminMedia(filter, isSuperAdmin, charterIds),
    queryFn:  () => fetchAdminMedia(filter, isSuperAdmin, charterIds),
    enabled:  !adminLoading,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('media')
        .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
      queryClient.invalidateQueries({ queryKey: qk.media('approved') });
    },
  });

  const tabs: StatusFilter[] = ['pending', 'approved', 'rejected'];

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white">Media Queue</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              filter === s
                ? 'bg-gold/15 text-gold border border-gold/30'
                : 'text-gray-500 hover:text-white border border-white/5 hover:border-white/15'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase animate-pulse">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase">No {filter} submissions.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => {
            const thumb = thumbUrl(item);
            return (
              <motion.div key={item.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="glass rounded-2xl overflow-hidden flex flex-col">
                <div className="relative aspect-video bg-white/5 shrink-0">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.type === 'video'
                        ? <Play size={32} className="text-gold/30" />
                        : <ImageIcon size={32} className="text-gold/30" />}
                    </div>
                  )}
                  {item.type === 'video' && thumb && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Play size={22} className="text-white/80" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/70 text-gray-300">
                    {item.type}
                  </span>
                  {item.type === 'video' && item.external_url && (
                    <a href={item.external_url} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-gray-300 hover:text-gold transition-colors">
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  {item.caption && (
                    <p className="text-sm text-gray-300 mb-2 line-clamp-2 leading-snug">{item.caption}</p>
                  )}
                  <p className="text-xs text-gray-500 truncate">
                    <span className="text-gray-400">{item.profile?.name ?? '—'}</span>
                    {item.charter && <span className="text-gray-600"> · {item.charter.name}</span>}
                    {item.year_taken && <span className="text-gray-600"> · {item.year_taken}</span>}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(item.created_at)}</p>

                  <div className="mt-auto pt-4">
                    {item.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => actionMutation.mutate({ id: item.id, status: 'approved' })}
                          disabled={actionMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-40">
                          <Check size={13} /> Approve
                        </button>
                        <button onClick={() => actionMutation.mutate({ id: item.id, status: 'rejected' })}
                          disabled={actionMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-40">
                          <X size={13} /> Reject
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${STATUS_STYLES[item.status as StatusFilter] ?? 'text-gray-400'}`}>
                          {item.status}
                        </span>
                        {item.status === 'approved' && (
                          <button
                            onClick={() => setExpandedComments(expandedComments === item.id ? null : item.id)}
                            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-colors ${
                              expandedComments === item.id
                                ? 'bg-gold/15 text-gold'
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <MessageSquare size={11} />
                            <span>Komentar</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inline comment section for approved items */}
                  {item.status === 'approved' && expandedComments === item.id && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <MediaComments mediaId={item.id} variant="dark" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

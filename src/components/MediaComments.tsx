import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Send, Loader, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { fetchComments, addComment, deleteComment, qk } from '../lib/queries';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'baru saja';
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  return `${Math.floor(h / 24)}h lalu`;
}

interface Props {
  mediaId: string;
  /** Dark bg variant for lightbox; default is glass card variant */
  variant?: 'dark' | 'card';
}

export default function MediaComments({ mediaId, variant = 'dark' }: Props) {
  const { user, profile }  = useAuth();
  const { isAdmin }        = useAdminStatus();
  const queryClient        = useQueryClient();
  const [draft, setDraft]  = useState('');
  const textareaRef        = useRef<HTMLTextAreaElement>(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: qk.comments(mediaId),
    queryFn:  () => fetchComments(mediaId),
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: () => addComment(mediaId, draft),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: qk.comments(mediaId) });
      queryClient.invalidateQueries({ queryKey: qk.latestComment() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.comments(mediaId) });
      queryClient.invalidateQueries({ queryKey: qk.latestComment() });
    },
  });

  const canDelete = (commentProfileId: string) =>
    isAdmin || user?.id === commentProfileId;

  const isDark = variant === 'dark';
  const textColor     = isDark ? 'text-gray-300' : 'text-gray-700';
  const mutedColor    = isDark ? 'text-gray-500' : 'text-gray-400';
  const dividerColor  = isDark ? 'border-white/10' : 'border-amber-100';
  const inputBg       = isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-gold/50' : 'bg-white border-amber-200 text-gray-800 placeholder-gray-400 focus:border-amber-400';

  return (
    <div className={`flex flex-col gap-3 ${isDark ? '' : ''}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 text-[10px] uppercase tracking-widest ${mutedColor}`}>
        <MessageSquare size={12} />
        <span>{comments.length} Komentar</span>
      </div>

      {/* Comment list */}
      {isLoading ? (
        <p className={`text-xs ${mutedColor} animate-pulse`}>Memuat komentar…</p>
      ) : comments.length === 0 ? (
        <p className={`text-xs italic ${mutedColor}`}>Belum ada komentar. Jadilah yang pertama!</p>
      ) : (
        <div className={`space-y-3 max-h-48 overflow-y-auto pr-1`}>
          {comments.map(c => (
            <div key={c.id} className={`flex gap-2.5 pb-2.5 border-b ${dividerColor} last:border-0 last:pb-0`}>
              {c.profile.avatar_url ? (
                <img
                  src={c.profile.avatar_url}
                  alt={c.profile.name}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                />
              ) : (
                <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-gold/20' : 'bg-amber-100'} flex items-center justify-center shrink-0 mt-0.5`}>
                  <span className="text-[8px] font-bold text-gold">{c.profile.name.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={`text-[11px] font-semibold ${isDark ? 'text-white' : 'text-gray-800'} truncate`}>
                    {c.profile.name}
                  </span>
                  <span className={`text-[10px] ${mutedColor} shrink-0`}>{timeAgo(c.created_at)}</span>
                </div>
                <p className={`text-xs ${textColor} leading-relaxed mt-0.5 break-words`}>{c.body}</p>
              </div>
              {canDelete(c.profile.id) && (
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  disabled={deleteMutation.isPending}
                  className={`shrink-0 p-1 rounded transition-colors ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500'} disabled:opacity-40`}
                  title="Hapus komentar"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add comment — only for approved members */}
      {profile?.status === 'approved' && (
        <div className="flex gap-2 items-end mt-1">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && draft.trim()) {
                e.preventDefault();
                addMutation.mutate();
              }
            }}
            placeholder="Tulis komentar… (Enter untuk kirim)"
            maxLength={500}
            rows={2}
            className={`flex-1 rounded-xl px-3 py-2 text-xs border resize-none focus:outline-none transition-colors ${inputBg}`}
          />
          <button
            onClick={() => draft.trim() && addMutation.mutate()}
            disabled={!draft.trim() || addMutation.isPending}
            className="shrink-0 w-8 h-8 rounded-full bg-gold/20 hover:bg-gold/40 text-gold transition-all flex items-center justify-center disabled:opacity-30"
          >
            {addMutation.isPending
              ? <Loader size={13} className="animate-spin" />
              : <Send size={13} />
            }
          </button>
        </div>
      )}
      {addMutation.isError && (
        <p className="text-xs text-red-400">{(addMutation.error as Error).message}</p>
      )}
    </div>
  );
}

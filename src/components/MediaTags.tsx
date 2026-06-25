import { useState, type KeyboardEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { qk, fetchMediaTags, addMediaTag, removeMediaTag } from '../lib/queries';

interface Props {
  mediaId:      string;
  uploaderTags: string[];
  onTagClick?:  (tag: string) => void;
  variant?:     'dark' | 'light';
}

export default function MediaTags({ mediaId, uploaderTags, onTagClick, variant = 'dark' }: Props) {
  const { user, profile } = useAuth();
  const { isAdmin }       = useAdminStatus();
  const queryClient       = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [input,  setInput]  = useState('');

  const isDark = variant === 'dark';

  const { data: memberTags = [] } = useQuery({
    queryKey: qk.mediaTags(mediaId),
    queryFn:  () => fetchMediaTags(mediaId),
    staleTime: 30_000,
    enabled:  !!mediaId,
  });

  const addMutation = useMutation({
    mutationFn: (tag: string) => addMediaTag(mediaId, tag, user!.id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: qk.mediaTags(mediaId) });
      setInput('');
      setAdding(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeMediaTag(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: qk.mediaTags(mediaId) });
    },
  });

  function commit() {
    const val = input.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '');
    if (!val) { setAdding(false); setInput(''); return; }
    const allExisting = [...uploaderTags, ...memberTags.map(t => t.tag)];
    if (allExisting.includes(val)) { setInput(''); return; }
    addMutation.mutate(val);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setAdding(false); setInput(''); }
  }

  const isApproved = profile?.status === 'approved';
  const canDelete  = (addedBy: string) => user?.id === addedBy || isAdmin;

  const uploaderChip = isDark
    ? 'bg-white/10 text-white/70 hover:bg-gold/20 hover:text-gold'
    : 'bg-amber-100 text-amber-800 hover:bg-amber-200';

  const memberChip = isDark
    ? 'bg-gold/10 text-gold/80 hover:bg-gold/20'
    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-300';

  const hasAny = uploaderTags.length > 0 || memberTags.length > 0 || isApproved;
  if (!hasAny) return null;

  return (
    <div className="flex gap-1.5 flex-wrap justify-center items-center mb-4">
      {/* Uploader tags (immutable from viewer) */}
      {uploaderTags.map(t => (
        <button
          key={`u-${t}`}
          onClick={() => onTagClick?.(t)}
          className={`text-[10px] rounded-full px-2.5 py-0.5 transition-colors ${uploaderChip}`}
        >
          #{t}
        </button>
      ))}

      {/* Member-added tags */}
      {memberTags.map(mt => (
        <span
          key={mt.id}
          className={`flex items-center gap-1 text-[10px] rounded-full px-2.5 py-0.5 transition-colors ${memberChip}`}
        >
          <button onClick={() => onTagClick?.(mt.tag)} className="hover:opacity-80">
            #{mt.tag}
          </button>
          {canDelete(mt.added_by) && (
            <button
              onClick={() => removeMutation.mutate(mt.id)}
              disabled={removeMutation.isPending}
              title="Hapus tag"
              className={`opacity-50 hover:opacity-100 transition-opacity ml-0.5 ${
                isDark ? 'hover:text-red-400' : 'hover:text-red-500'
              }`}
            >
              <X size={9} />
            </button>
          )}
        </span>
      ))}

      {/* Add tag */}
      {isApproved && !adding && (
        <button
          onClick={() => setAdding(true)}
          className={`flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 border transition-all ${
            isDark
              ? 'border-white/15 text-white/35 hover:border-gold/40 hover:text-gold/70'
              : 'border-amber-200 text-gray-400 hover:border-gold/40 hover:text-amber-700'
          }`}
        >
          <Plus size={9} /> tag
        </button>
      )}

      {adding && (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => { if (!addMutation.isPending) commit(); }}
            placeholder="nama-tag…"
            maxLength={50}
            className={`rounded-full px-2.5 py-0.5 text-[10px] w-28 focus:outline-none border transition-colors ${
              isDark
                ? 'bg-white/5 border-white/20 text-white placeholder-gray-600 focus:border-gold/50'
                : 'bg-white border-amber-200 text-gray-800 placeholder-gray-400 focus:border-gold/50'
            }`}
          />
          {addMutation.isPending && <Loader size={10} className="text-gold animate-spin" />}
        </div>
      )}
    </div>
  );
}

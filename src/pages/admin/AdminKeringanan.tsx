import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, X, MessageSquare, Phone, Mail, Wallet } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk, fetchAllKeringanan, updateKeringananStatus, type KeringananRequest } from '../../lib/queries';

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  approved: 'bg-green-500/10  text-green-400  border-green-500/20',
  rejected: 'bg-red-500/10    text-red-400    border-red-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  pending:  'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RequestCard({ req }: { req: KeringananRequest }) {
  const queryClient = useQueryClient();
  const [notesInput, setNotesInput] = useState(req.admin_notes ?? '');
  const [showNotes,  setShowNotes]  = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ status, notes }: { status: 'approved' | 'rejected'; notes?: string }) =>
      updateKeringananStatus(req.id, status, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.allKeringanan() }),
  });

  const saveNotesMutation = useMutation({
    mutationFn: () =>
      updateKeringananStatus(req.id, req.status as 'approved' | 'rejected', notesInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.allKeringanan() });
      setShowNotes(false);
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5 space-y-4"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">{req.name}</p>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLE[req.status]}`}>
              {STATUS_LABEL[req.status]}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">{timeAgo(req.created_at)}</p>
        </div>

        {/* Action buttons — only for pending */}
        {req.status === 'pending' && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => updateMutation.mutate({ status: 'approved', notes: notesInput || undefined })}
              disabled={updateMutation.isPending}
              title="Setujui"
              className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all disabled:opacity-40"
            >
              <Check size={15} />
            </button>
            <button
              onClick={() => updateMutation.mutate({ status: 'rejected', notes: notesInput || undefined })}
              disabled={updateMutation.isPending}
              title="Tolak"
              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-40"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-400">
        <span className="flex items-center gap-1.5 truncate">
          <Phone size={11} className="text-gray-600 shrink-0" />
          {req.contact_number}
        </span>
        <span className="flex items-center gap-1.5 truncate">
          <Mail size={11} className="text-gray-600 shrink-0" />
          {req.email}
        </span>
        <span className="flex items-center gap-1.5">
          <Wallet size={11} className="text-gray-600 shrink-0" />
          Sanggup: Rp {req.jumlah_sanggup.toLocaleString('id-ID')}
        </span>
      </div>

      {/* Alasan */}
      <div className="bg-white/[0.03] rounded-xl p-3">
        <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5">Alasan</p>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{req.alasan}</p>
      </div>

      {/* Admin notes */}
      {req.admin_notes && !showNotes && (
        <div className="bg-gold/5 border border-gold/20 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-widest text-gold/60 mb-1">Catatan Admin</p>
          <p className="text-xs text-gray-300">{req.admin_notes}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setShowNotes(v => !v)}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gray-600 hover:text-white transition-colors"
        >
          <MessageSquare size={11} />
          {showNotes ? 'Tutup catatan' : req.admin_notes ? 'Edit catatan' : 'Tambah catatan'}
        </button>
      </div>

      {showNotes && (
        <div className="space-y-2">
          <textarea
            value={notesInput}
            onChange={e => setNotesInput(e.target.value)}
            rows={2}
            placeholder="Catatan internal panitia…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => saveNotesMutation.mutate()}
              disabled={saveNotesMutation.isPending || req.status === 'pending'}
              title={req.status === 'pending' ? 'Setujui atau tolak terlebih dahulu' : ''}
              className="px-3 py-1.5 rounded-lg bg-gold/15 text-gold border border-gold/30 text-[10px] uppercase tracking-widest font-bold hover:bg-gold/25 transition-all disabled:opacity-40"
            >
              {saveNotesMutation.isPending ? 'Menyimpan…' : 'Simpan Catatan'}
            </button>
            <button
              onClick={() => setShowNotes(false)}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-[10px] uppercase tracking-widest hover:text-white transition-colors"
            >
              Batal
            </button>
          </div>
          {req.status === 'pending' && (
            <p className="text-[10px] text-gray-600">Catatan tersimpan saat kamu menekan Setujui / Tolak.</p>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function AdminKeringanan() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: qk.allKeringanan(),
    queryFn:  fetchAllKeringanan,
    staleTime: 0,
  });

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const counts = {
    all:      requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const tabs = ['all', 'pending', 'approved', 'rejected'] as const;

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Super Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white">Permintaan Keringanan</h1>
        <p className="text-gray-500 text-sm mt-1">Permintaan bantuan biaya dari alumni.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {([
          { key: 'all',      label: 'Total',     color: 'text-white'  },
          { key: 'pending',  label: 'Menunggu',  color: 'text-yellow-400' },
          { key: 'approved', label: 'Disetujui', color: 'text-green-400'  },
          { key: 'rejected', label: 'Ditolak',   color: 'text-red-400'    },
        ] as const).map(s => (
          <div key={s.key} className="glass rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold font-serif ${s.color}`}>{counts[s.key]}</p>
            <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              filter === t
                ? 'bg-gold/15 text-gold border border-gold/30'
                : 'text-gray-500 hover:text-white border border-white/5 hover:border-white/15'
            }`}>
            {t === 'all' ? 'Semua' : STATUS_LABEL[t]}
            {counts[t] > 0 && <span className="ml-1 opacity-60">{counts[t]}</span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase animate-pulse">Memuat…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase">
          Belum ada permintaan.
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {filtered.map(req => (
            <div key={req.id}>
              <RequestCard req={req} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

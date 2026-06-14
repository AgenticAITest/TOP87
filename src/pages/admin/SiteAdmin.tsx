import { useState, useMemo, useRef, type ChangeEvent, ReactNode } from 'react';
import { motion } from 'motion/react';
import { Check, Loader, HardDrive, Cloud, Shuffle, List, Search, X, Users, ToggleLeft, ToggleRight, QrCode, FileText, Monitor, Upload } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getStorageBackend, setStorageBackend, uploadFile, resolveMediaUrl, type StorageBackend } from '../../lib/storage';
import { useAuth } from '../../contexts/AuthContext';
import {
  getFeaturedConfig, setFeaturedConfig,
  fetchApprovedMembers,
  fetchQRISConfig, setQRISConfig,
  fetchSiteSetting, setSiteSetting,
  fetchAdminBackdrop, setAdminBackdrop,
  type FeaturedMode, type FeaturedConfig, type QRISConfig,
  qk,
} from '../../lib/queries';

// ─── Storage backend ──────────────────────────────────────────────────────────

const BACKENDS: { id: StorageBackend; label: string; description: string; icon: ReactNode }[] = [
  {
    id: 'supabase',
    label: 'Supabase Storage',
    description: 'Free tier storage built into the project. Limited to 1 GB total.',
    icon: <Cloud size={20} />,
  },
  {
    id: 'vps',
    label: 'VPS (top87.id)',
    description: '94 GB free on srv1664106.hstgr.cloud. Files served via media.top87.id.',
    icon: <HardDrive size={20} />,
  },
];

// ─── Feature flags ────────────────────────────────────────────────────────────

interface FeatureFlags { donations: boolean; merchandise: boolean; }

async function getFeatureFlags(): Promise<FeatureFlags> {
  const { data } = await supabase.from('site_settings').select('value').eq('key', 'feature_flags').single();
  if (!data?.value) return { donations: false, merchandise: false };
  try { return JSON.parse(data.value); } catch { return { donations: false, merchandise: false }; }
}

async function setFeatureFlags(flags: FeatureFlags): Promise<void> {
  const { error } = await supabase.from('site_settings')
    .upsert({ key: 'feature_flags', value: JSON.stringify(flags) }, { onConflict: 'key' });
  if (error) throw error;
}

// ─── Featured members ─────────────────────────────────────────────────────────

const INTERVALS = [
  { value: 10,  label: '10 seconds' },
  { value: 15,  label: '15 seconds' },
  { value: 30,  label: '30 seconds' },
  { value: 60,  label: '1 minute' },
  { value: 120, label: '2 minutes' },
];

const MODES: { id: FeaturedMode; label: string; description: string; icon: ReactNode }[] = [
  {
    id: 'random',
    label: 'Auto-rotate',
    description: 'Shuffles all approved members and cycles through groups of 4 on a timer.',
    icon: <Shuffle size={18} />,
  },
  {
    id: 'manual',
    label: 'Manual pick',
    description: 'You choose exactly which 4 members to spotlight on the homepage.',
    icon: <List size={18} />,
  },
];

type ApprovedMember = Awaited<ReturnType<typeof fetchApprovedMembers>>[number];

// ─── Main component ───────────────────────────────────────────────────────────

export default function SiteAdmin() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ── Feature flags state ──
  const [flagsSaved, setFlagsSaved] = useState(false);
  const { data: currentFlags, isLoading: flagsLoading } = useQuery({
    queryKey: qk.featureFlags(),
    queryFn:  getFeatureFlags,
  });
  const [localFlags, setLocalFlags] = useState<FeatureFlags | null>(null);
  const activeFlags = localFlags ?? currentFlags ?? { donations: false, merchandise: false };

  const flagsMutation = useMutation({
    mutationFn: () => setFeatureFlags(activeFlags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.featureFlags() });
      setFlagsSaved(true);
      setTimeout(() => setFlagsSaved(false), 2000);
    },
  });

  const flagsDirty = localFlags !== null &&
    JSON.stringify(localFlags) !== JSON.stringify(currentFlags ?? { donations: false, merchandise: false });

  function toggleFlag(key: keyof FeatureFlags) {
    setLocalFlags({ ...activeFlags, [key]: !activeFlags[key] });
  }

  // ── Storage state ──
  const [storageSaved, setStorageSaved] = useState(false);
  const { data: currentBackend, isLoading: backendLoading } = useQuery({
    queryKey: ['site_settings', 'storage_backend'],
    queryFn:  getStorageBackend,
  });
  const [selectedBackend, setSelectedBackend] = useState<StorageBackend | null>(null);
  const activeBackend = selectedBackend ?? currentBackend ?? 'supabase';

  const storageMutation = useMutation({
    mutationFn: () => setStorageBackend(activeBackend),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_settings'] });
      setStorageSaved(true);
      setTimeout(() => setStorageSaved(false), 2000);
    },
  });

  // ── QRIS config state ──
  const [qrisSaved, setQrisSaved] = useState(false);
  const { data: currentQRIS, isLoading: qrisLoading } = useQuery({
    queryKey: qk.qrisConfig(),
    queryFn:  fetchQRISConfig,
  });
  const [localQRIS, setLocalQRIS] = useState<QRISConfig | null>(null);
  const activeQRIS: QRISConfig = localQRIS ?? currentQRIS ?? {
    qris_image_url: '', qris_bank_name: '', qris_account_no: '', qris_account_name: '',
    reunion_fee_target: 2017000, donation_target: 10000000,
  };

  const qrisMutation = useMutation({
    mutationFn: () => setQRISConfig(activeQRIS),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.qrisConfig() });
      setQrisSaved(true);
      setTimeout(() => setQrisSaved(false), 2000);
    },
  });

  const qrisDirty = localQRIS !== null &&
    JSON.stringify(localQRIS) !== JSON.stringify(currentQRIS);

  function patchQRIS(key: keyof QRISConfig, value: string | number) {
    setLocalQRIS({ ...activeQRIS, [key]: value });
  }

  // ── Featured members state ──
  const [featuredSaved, setFeaturedSaved] = useState(false);
  const [memberSearch, setMemberSearch]   = useState('');

  const { data: featuredConfig, isLoading: featuredLoading } = useQuery({
    queryKey: ['site_settings', 'featured'],
    queryFn:  getFeaturedConfig,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: qk.members(),
    queryFn:  fetchApprovedMembers,
    staleTime: 1000 * 60 * 5,
  });

  const [localMode,      setLocalMode]      = useState<FeaturedMode | null>(null);
  const [localIds,       setLocalIds]       = useState<string[] | null>(null);
  const [localInterval,  setLocalInterval]  = useState<number | null>(null);

  const mode     = localMode     ?? featuredConfig?.mode     ?? 'random';
  const ids      = localIds      ?? featuredConfig?.memberIds ?? [];
  const interval = localInterval ?? featuredConfig?.interval  ?? 15;

  const featuredMutation = useMutation({
    mutationFn: () => setFeaturedConfig({ mode, memberIds: ids, interval }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_settings', 'featured'] });
      setFeaturedSaved(true);
      setTimeout(() => setFeaturedSaved(false), 2000);
    },
  });

  const featuredDirty =
    mode     !== (featuredConfig?.mode ?? 'random') ||
    interval !== (featuredConfig?.interval ?? 15)   ||
    JSON.stringify(ids) !== JSON.stringify(featuredConfig?.memberIds ?? []);

  // ── Anggaran flyer URL ──
  const [flyerSaved, setFlyerSaved]       = useState(false);
  const [localFlyerUrl, setLocalFlyerUrl] = useState<string | null>(null);
  const { data: currentFlyerUrl = '' }    = useQuery({
    queryKey: qk.siteSetting('anggaran_flyer_url'),
    queryFn:  () => fetchSiteSetting('anggaran_flyer_url'),
  });
  const activeFlyerUrl = localFlyerUrl ?? currentFlyerUrl;
  const flyerDirty     = localFlyerUrl !== null && localFlyerUrl !== currentFlyerUrl;

  const flyerMutation = useMutation({
    mutationFn: () => setSiteSetting('anggaran_flyer_url', activeFlyerUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.siteSetting('anggaran_flyer_url') });
      setLocalFlyerUrl(null);
      setFlyerSaved(true);
      setTimeout(() => setFlyerSaved(false), 2000);
    },
  });

  // ── Admin backdrop state ──
  const [backdropSaved, setBackdropSaved]   = useState(false);
  const [localBackdropUrl,     setLocalBackdropUrl]     = useState<string | null>(null);
  const [localBackdropOpacity, setLocalBackdropOpacity] = useState<number | null>(null);

  const { data: currentBackdrop } = useQuery({
    queryKey: qk.adminBackdrop(),
    queryFn:  fetchAdminBackdrop,
  });

  const activeBackdropUrl     = localBackdropUrl     ?? currentBackdrop?.url     ?? '';
  const activeBackdropOpacity = localBackdropOpacity ?? currentBackdrop?.opacity ?? 15;

  const backdropDirty =
    (localBackdropUrl     !== null && localBackdropUrl     !== (currentBackdrop?.url     ?? '')) ||
    (localBackdropOpacity !== null && localBackdropOpacity !== (currentBackdrop?.opacity ?? 15));

  const backdropMutation = useMutation({
    mutationFn: () => setAdminBackdrop({ url: activeBackdropUrl, opacity: activeBackdropOpacity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.adminBackdrop() });
      setLocalBackdropUrl(null);
      setLocalBackdropOpacity(null);
      setBackdropSaved(true);
      setTimeout(() => setBackdropSaved(false), 2000);
    },
  });

  function resetBackdrop() {
    setLocalBackdropUrl('');
    setLocalBackdropOpacity(15);
  }

  // ── Backdrop file upload ──
  const backdropFileRef = useRef<HTMLInputElement>(null);
  const [backdropUploading, setBackdropUploading] = useState(false);
  const [backdropUploadProgress, setBackdropUploadProgress] = useState(0);
  const [backdropUploadError, setBackdropUploadError] = useState<string | null>(null);

  async function handleBackdropFileUpload(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setBackdropUploading(true);
    setBackdropUploadProgress(0);
    setBackdropUploadError(null);
    try {
      const path = await uploadFile(file, user.id, pct => setBackdropUploadProgress(pct));
      const url  = resolveMediaUrl(path) ?? path;
      setLocalBackdropUrl(url);
    } catch (err) {
      setBackdropUploadError((err as Error).message);
    } finally {
      setBackdropUploading(false);
      if (backdropFileRef.current) backdropFileRef.current.value = '';
    }
  }

  // Member search helpers
  const searchResults = useMemo(() => {
    if (!memberSearch.trim()) return [];
    const q = memberSearch.toLowerCase();
    return allMembers
      .filter(m => !ids.includes(m.id))
      .filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.city?.toLowerCase().includes(q) ||
        m.profession?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [memberSearch, allMembers, ids]);

  const selectedMembers = ids
    .map(id => allMembers.find(m => m.id === id))
    .filter(Boolean) as ApprovedMember[];

  function addMember(m: ApprovedMember) {
    if (ids.length >= 4) return;
    setLocalIds([...ids, m.id]);
    setMemberSearch('');
  }

  function removeMember(id: string) {
    setLocalIds(ids.filter(i => i !== id));
  }

  return (
    <div className="p-8 min-h-screen">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Admin</p>
        <h1 className="font-serif text-4xl font-bold text-white">Site Settings</h1>
      </div>

      <div className="max-w-2xl space-y-8">

        {/* ── Feature Flags ── */}
        <section className="glass rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-1">Feature Flags</h2>
          <p className="text-gray-500 text-sm mb-6">
            Toggle features on/off. Changes appear immediately in the sidebar for all users.
          </p>

          {flagsLoading ? (
            <div className="text-gray-600 text-xs uppercase tracking-widest animate-pulse">Loading…</div>
          ) : (
            <div className="space-y-4 mb-6">
              {([
                { key: 'donations' as const,    label: 'Donasi / Payments', desc: 'Shows "Donasi" link in sidebar and footer CTA.' },
                { key: 'merchandise' as const,  label: 'Merchandise',       desc: 'Shows "Merchandise" link in sidebar.' },
              ]).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-bold text-white">{label}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFlag(key)}
                    className={`flex items-center gap-2 transition-colors ${activeFlags[key] ? 'text-gold' : 'text-gray-600'}`}
                  >
                    {activeFlags[key]
                      ? <ToggleRight size={28} className="text-gold" />
                      : <ToggleLeft size={28} />}
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {activeFlags[key] ? 'On' : 'Off'}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => flagsMutation.mutate()}
            disabled={flagsMutation.isPending || !flagsDirty}
            className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 px-6 rounded-full transition-all disabled:opacity-40 uppercase tracking-widest text-xs">
            {flagsMutation.isPending
              ? <><Loader size={14} className="animate-spin" /> Saving…</>
              : flagsSaved
                ? <><Check size={14} /> Saved</>
                : 'Save'}
          </button>

          {flagsMutation.isError && (
            <p className="text-red-400 text-xs mt-3">{(flagsMutation.error as Error).message}</p>
          )}
        </section>

        {/* ── Storage backend ── */}
        <section className="glass rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-1">Media Storage</h2>
          <p className="text-gray-500 text-sm mb-6">
            New uploads go to the active backend. Existing files stay where they are — switching is non-destructive.
          </p>

          {backendLoading ? (
            <div className="text-gray-600 text-xs uppercase tracking-widest animate-pulse">Loading…</div>
          ) : (
            <div className="space-y-3 mb-6">
              {BACKENDS.map(b => (
                <motion.button key={b.id} type="button" whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedBackend(b.id)}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                    activeBackend === b.id
                      ? 'border-gold/40 bg-gold/5'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                  }`}>
                  <div className={`mt-0.5 ${activeBackend === b.id ? 'text-gold' : 'text-gray-500'}`}>{b.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold mb-0.5 ${activeBackend === b.id ? 'text-white' : 'text-gray-400'}`}>{b.label}</p>
                    <p className="text-xs text-gray-600 leading-snug">{b.description}</p>
                  </div>
                  {activeBackend === b.id && (
                    <div className="w-5 h-5 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} className="text-gold" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          )}

          <button onClick={() => storageMutation.mutate()}
            disabled={storageMutation.isPending || activeBackend === currentBackend}
            className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 px-6 rounded-full transition-all disabled:opacity-40 uppercase tracking-widest text-xs">
            {storageMutation.isPending
              ? <><Loader size={14} className="animate-spin" /> Saving…</>
              : storageSaved
                ? <><Check size={14} /> Saved</>
                : 'Save'}
          </button>

          {storageMutation.isError && (
            <p className="text-red-400 text-xs mt-3">{(storageMutation.error as Error).message}</p>
          )}

          {activeBackend === 'vps' && (
            <div className="mt-4 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/15">
              <p className="text-yellow-400/80 text-xs leading-relaxed">
                VPS backend requires the upload server running on{' '}
                <code className="font-mono text-yellow-300/80">media.top87.id</code>.
              </p>
            </div>
          )}
        </section>

        {/* ── QRIS / Payment Config ── */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <QrCode size={16} className="text-gold/60" />
            <h2 className="text-white font-bold text-lg">Konfigurasi Pembayaran (QRIS)</h2>
          </div>
          <p className="text-gray-500 text-sm mb-6">
            Informasi ini ditampilkan di modal pembayaran anggota.
          </p>

          {qrisLoading ? (
            <div className="text-gray-600 text-xs uppercase tracking-widest animate-pulse">Loading…</div>
          ) : (
            <div className="space-y-4 mb-6">
              {([
                { key: 'qris_image_url' as const,    label: 'URL Gambar QRIS',    placeholder: 'https://...',  type: 'url' },
                { key: 'qris_bank_name' as const,    label: 'Nama Bank',          placeholder: 'BCA / BRI…',  type: 'text' },
                { key: 'qris_account_no' as const,   label: 'Nomor Rekening',     placeholder: '0123456789',  type: 'text' },
                { key: 'qris_account_name' as const, label: 'Nama Pemilik',       placeholder: 'Panitia TOP87', type: 'text' },
              ]).map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(activeQRIS[key] as string) ?? ''}
                    onChange={e => patchQRIS(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Iuran Per Orang (Rp)</label>
                  <input
                    type="number"
                    value={activeQRIS.reunion_fee_target}
                    onChange={e => patchQRIS('reunion_fee_target', parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Target Donasi (Rp)</label>
                  <input
                    type="number"
                    value={activeQRIS.donation_target}
                    onChange={e => patchQRIS('donation_target', parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
              </div>

              {/* QRIS preview */}
              {activeQRIS.qris_image_url && (
                <div className="flex justify-center">
                  <img src={activeQRIS.qris_image_url} alt="QRIS preview" className="w-32 h-32 object-contain rounded-lg border border-white/10" />
                </div>
              )}
            </div>
          )}

          <button onClick={() => qrisMutation.mutate()}
            disabled={qrisMutation.isPending || !qrisDirty}
            className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 px-6 rounded-full transition-all disabled:opacity-40 uppercase tracking-widest text-xs">
            {qrisMutation.isPending
              ? <><Loader size={14} className="animate-spin" /> Saving…</>
              : qrisSaved
                ? <><Check size={14} /> Saved</>
                : 'Save'}
          </button>
          {qrisMutation.isError && (
            <p className="text-red-400 text-xs mt-3">{(qrisMutation.error as Error).message}</p>
          )}
        </section>

        {/* ── Featured Members ── */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-gold/60" />
            <h2 className="text-white font-bold text-lg">Featured Members</h2>
          </div>
          <p className="text-gray-500 text-sm mb-6">
            Controls the spotlight section on the homepage below Charter Spotlight.
          </p>

          {featuredLoading ? (
            <div className="text-gray-600 text-xs uppercase tracking-widest animate-pulse">Loading…</div>
          ) : (
            <div className="space-y-6">

              {/* Mode selector */}
              <div className="space-y-3">
                {MODES.map(m => (
                  <motion.button key={m.id} type="button" whileTap={{ scale: 0.99 }}
                    onClick={() => setLocalMode(m.id)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                      mode === m.id
                        ? 'border-gold/40 bg-gold/5'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                    }`}>
                    <div className={`mt-0.5 ${mode === m.id ? 'text-gold' : 'text-gray-500'}`}>{m.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold mb-0.5 ${mode === m.id ? 'text-white' : 'text-gray-400'}`}>{m.label}</p>
                      <p className="text-xs text-gray-600 leading-snug">{m.description}</p>
                    </div>
                    {mode === m.id && (
                      <div className="w-5 h-5 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={11} className="text-gold" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Random: interval picker */}
              {mode === 'random' && (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Rotation interval</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERVALS.map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setLocalInterval(opt.value)}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                          interval === opt.value
                            ? 'bg-gold/15 text-gold border border-gold/30'
                            : 'glass text-gray-500 border border-white/5 hover:border-white/15 hover:text-white'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual: member picker */}
              {mode === 'manual' && (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-3">
                    Selected members ({ids.length}/4)
                  </label>

                  {/* Selected list */}
                  {selectedMembers.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {selectedMembers.map(m => (
                        <div key={m.id} className="flex items-center gap-3 glass rounded-xl px-4 py-2.5">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt={m.name ?? ''} referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                              <span className="font-serif font-bold text-gold text-sm">{m.name?.charAt(0)}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{m.name}</p>
                            {(m.profession || m.primaryCharter) && (
                              <p className="text-xs text-gray-600 truncate">
                                {m.profession ?? m.primaryCharter?.name}
                              </p>
                            )}
                          </div>
                          <button type="button" onClick={() => removeMember(m.id)}
                            className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Search to add */}
                  {ids.length < 4 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <input
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        placeholder="Search members to add…"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden z-10 shadow-xl">
                          {searchResults.map(m => (
                            <button key={m.id} type="button" onClick={() => addMember(m)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                              {m.avatar_url ? (
                                <img src={m.avatar_url} alt={m.name ?? ''} referrerPolicy="no-referrer"
                                  className="w-7 h-7 rounded-lg object-cover shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                                  <span className="font-serif font-bold text-gold text-xs">{m.name?.charAt(0)}</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm text-white truncate">{m.name}</p>
                                {m.profession && <p className="text-xs text-gray-500 truncate">{m.profession}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {ids.length === 0 && (
                    <p className="text-xs text-gray-600 mt-3">Search for members above to fill the 4 spotlight slots.</p>
                  )}
                </div>
              )}

              {/* Save */}
              {featuredMutation.isError && (
                <p className="text-red-400 text-xs">{(featuredMutation.error as Error).message}</p>
              )}

              <button onClick={() => featuredMutation.mutate()}
                disabled={featuredMutation.isPending || !featuredDirty}
                className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 px-6 rounded-full transition-all disabled:opacity-40 uppercase tracking-widest text-xs">
                {featuredMutation.isPending
                  ? <><Loader size={14} className="animate-spin" /> Saving…</>
                  : featuredSaved
                    ? <><Check size={14} /> Saved</>
                    : 'Save'}
              </button>
            </div>
          )}
        </section>

        {/* ── Anggaran Flyer ── */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-gold/60" />
            <h2 className="text-white font-bold text-lg">Flyer Anggaran</h2>
          </div>
          <p className="text-gray-500 text-sm mb-6">
            URL file PDF flyer anggaran. Jika diisi, link "Lihat Flyer Anggaran Lengkap" akan muncul di bagian bawah kartu Rincian Anggaran pada dashboard anggota.
          </p>
          <div className="space-y-3">
            <input
              type="url"
              value={activeFlyerUrl}
              onChange={e => setLocalFlyerUrl(e.target.value)}
              placeholder="https://… (URL PDF dari Supabase Storage atau hosting lain)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
            />
            {activeFlyerUrl && (
              <p className="text-xs text-gray-500 truncate">
                Preview: <a href={activeFlyerUrl} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">{activeFlyerUrl}</a>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => flyerMutation.mutate()}
              disabled={flyerMutation.isPending || !flyerDirty}
              className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 px-6 rounded-full transition-all disabled:opacity-40 uppercase tracking-widest text-xs"
            >
              {flyerMutation.isPending
                ? <><Loader size={14} className="animate-spin" /> Saving…</>
                : flyerSaved
                  ? <><Check size={14} /> Saved</>
                  : 'Save'}
            </button>
            {activeFlyerUrl && (
              <button
                onClick={() => setLocalFlyerUrl('')}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                Hapus URL
              </button>
            )}
          </div>
          {flyerMutation.isError && (
            <p className="text-red-400 text-xs mt-3">{(flyerMutation.error as Error).message}</p>
          )}
        </section>

        {/* ── Admin Backdrop ── */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Monitor size={16} className="text-gold/60" />
            <h2 className="text-white font-bold text-lg">Admin Panel Backdrop</h2>
          </div>
          <p className="text-gray-500 text-sm mb-6">
            Custom background image for the admin content area. Leave blank to use the default solid dark background.
          </p>

          <div className="space-y-5 mb-6">
            {/* URL input + upload */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Image</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={activeBackdropUrl}
                  onChange={e => setLocalBackdropUrl(e.target.value)}
                  placeholder="https://… (paste URL or upload)"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => backdropFileRef.current?.click()}
                  disabled={backdropUploading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 bg-white/[0.02] transition-all disabled:opacity-50 text-sm shrink-0"
                >
                  {backdropUploading
                    ? <><Loader size={14} className="animate-spin" /> {backdropUploadProgress}%</>
                    : <><Upload size={14} /> Upload</>
                  }
                </button>
                <input
                  ref={backdropFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBackdropFileUpload}
                />
              </div>
              {backdropUploadError && (
                <p className="text-red-400 text-xs mt-1">{backdropUploadError}</p>
              )}
            </div>

            {/* Opacity slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-widest text-gray-500">Overlay Darkness</label>
                <span className="text-sm font-bold text-white">{activeBackdropOpacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={activeBackdropOpacity}
                onChange={e => setLocalBackdropOpacity(parseInt(e.target.value, 10))}
                className="w-full accent-gold h-1.5 rounded-full"
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>0% — image only</span>
                <span>100% — fully black</span>
              </div>
            </div>

            {/* Live preview */}
            {activeBackdropUrl && (
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Preview</label>
                <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/10">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${activeBackdropUrl})` }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: `rgba(10,10,10,${activeBackdropOpacity / 100})` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white text-xs font-bold uppercase tracking-widest drop-shadow">Admin Content</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => backdropMutation.mutate()}
              disabled={backdropMutation.isPending || !backdropDirty}
              className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 px-6 rounded-full transition-all disabled:opacity-40 uppercase tracking-widest text-xs"
            >
              {backdropMutation.isPending
                ? <><Loader size={14} className="animate-spin" /> Saving…</>
                : backdropSaved
                  ? <><Check size={14} /> Saved</>
                  : 'Save'}
            </button>
            {(activeBackdropUrl || activeBackdropOpacity !== 15) && (
              <button
                onClick={resetBackdrop}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                Reset to default
              </button>
            )}
          </div>
          {backdropMutation.isError && (
            <p className="text-red-400 text-xs mt-3">{(backdropMutation.error as Error).message}</p>
          )}
        </section>

      </div>
    </div>
  );
}

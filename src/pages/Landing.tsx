import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Download, ArrowRight, Info, FileText, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { usePageContent } from '../hooks/usePageContent';
import { useDashboardData } from '../hooks/useDashboardData';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { resolveMediaUrl } from '../lib/storage';
import { qk, fetchSiteSetting, fetchMyKeringanan, submitKeringanan } from '../lib/queries';

// ── Defaults (shown when CMS row not yet created) ─────────────────────────────

const DEFAULT_REUNION_ISO = '2027-04-29T17:00:00+07:00';
const DEFAULT_HERO_TITLE  = 'Sekarang Aku Menjadi Dewasa';
const DEFAULT_HERO_SUB    = '"Jika bukan kita yang merayakan, siapa lagi?"';
const DEFAULT_HERO_DATE   = '29 – 30 April 2027';
const DEFAULT_HERO_VENUE  = 'BANDUNG / CIWIDEY';
const DEFAULT_BUDGET_NOTE =
  'Selisih dana yang terkumpul akan dialokasikan untuk Dana Sosial, Beasiswa & Yatim.';

interface AnggaranConfig {
  mode: 'per_person' | 'per_category';
  quota: number;
  items: { keterangan: string; amount: number }[];
  fee_per_orang?: number;
}

const DEFAULT_ANGGARAN_CONFIG: AnggaranConfig = {
  mode: 'per_person',
  quota: 122,
  items: [
    { keterangan: 'Akomodasi & Konsumsi Resort',          amount: 863000 },
    { keterangan: 'Lunch Hari Pertama (Prasmanan Sunda)', amount: 125000 },
    { keterangan: 'Outdoor Activity & Games',             amount: 210000 },
    { keterangan: 'Transportasi & Logistik',              amount: 200000 },
    { keterangan: 'Dokumentasi & Kenang-kenangan',        amount: 250000 },
    { keterangan: 'Panitia & Lain-lain',                  amount: 369000 },
  ],
};

const DEFAULT_ANNOUNCEMENTS = [
  { title: 'Kostum Hari Ke-1: Putih',    body: 'Ayo seragamkan dresscode agar dokumentasi terlihat kompak!',                         highlight: true  },
  { title: 'Pembayaran Cicilan Ke-2',     body: 'Mohon segera dilunasi sebelum tgl 12 Feb 2024 untuk konfirmasi akomodasi.',          highlight: false },
];

interface AnnouncementItem { title: string; body: string; date?: string; highlight: boolean; }

// ── Countdown helper ──────────────────────────────────────────────────────────

function calcTimeLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
  };
}

function useCountdown(iso: string) {
  const [t, setT] = useState(() => calcTimeLeft(iso));
  useEffect(() => {
    const id = setInterval(() => setT(calcTimeLeft(iso)), 60_000);
    return () => clearInterval(id);
  }, [iso]);
  return t;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Landing() {
  const { user, profile } = useAuth();
  const { data: landingCms }      = usePageContent('landing');
  const { data: anggaranCms }     = usePageContent('anggaran');
  const { data: pengumumanCms }   = usePageContent('pengumuman');
  const { data: dashboard }   = useDashboardData();
  const { data: flags }       = useFeatureFlags();
  const { data: flyerUrl = '' } = useQuery({
    queryKey: qk.siteSetting('anggaran_flyer_url'),
    queryFn:  () => fetchSiteSetting('anggaran_flyer_url'),
    staleTime: 5 * 60_000,
  });

  // CMS values with fallbacks
  const heroTitle  = landingCms?.['hero.title']     ?? DEFAULT_HERO_TITLE;
  const heroSub    = landingCms?.['hero.subtitle']  ?? DEFAULT_HERO_SUB;
  const heroDate   = landingCms?.['hero.date']      ?? DEFAULT_HERO_DATE;
  const heroVenue  = landingCms?.['hero.venue']     ?? DEFAULT_HERO_VENUE;
  const heroBgUrl  = landingCms?.['hero.image_url'] ?? '';
  const heroCta    = landingCms?.['hero.cta_label'] ?? 'Daftar Sekarang';
  const reunionIso = landingCms?.['reunion.date_iso'] ?? DEFAULT_REUNION_ISO;
  const budgetNote = anggaranCms?.['notes.body']    ?? DEFAULT_BUDGET_NOTE;

  // Parse anggaran config — single source of truth for budget table, quota, and KPI target
  let anggaranConfig = DEFAULT_ANGGARAN_CONFIG;
  if (anggaranCms?.['items.config']) {
    try { anggaranConfig = JSON.parse(anggaranCms['items.config']) as AnggaranConfig; }
    catch { /* use defaults */ }
  }

  const anggaranMode  = anggaranConfig.mode  ?? 'per_person';
  const anggaranItems = anggaranConfig.items ?? DEFAULT_ANGGARAN_CONFIG.items;
  const quotaTarget   = anggaranConfig.quota ?? DEFAULT_ANGGARAN_CONFIG.quota;

  const sumAmount           = anggaranItems.reduce((s, i) => s + (i.amount || 0), 0);
  const budgetTargetFromTable = anggaranMode === 'per_person' ? sumAmount * quotaTarget : sumAmount;
  const grandPerOrang         = anggaranMode === 'per_person' ? sumAmount
                                : (quotaTarget > 0 ? Math.round(sumAmount / quotaTarget) : 0);

  const countdown     = useCountdown(reunionIso);
  const approvedCount = dashboard?.approvedCount ?? 0;
  const attendancePct = quotaTarget > 0 ? Math.min(Math.round((approvedCount / quotaTarget) * 100), 100) : 0;
  const isApproved    = profile?.status === 'approved';

  // Keringanan (financial assistance) modal
  const queryClient = useQueryClient();
  const [showKeringanan, setShowKeringanan] = useState(false);
  const [keringananForm, setKeringananForm] = useState({ contact_number: '', jumlah_sanggup: '', alasan: '' });
  const [keringananSuccess, setKeringananSuccess] = useState(false);

  const { data: myKeringanan } = useQuery({
    queryKey: qk.myKeringanan(profile?.id ?? ''),
    queryFn:  () => fetchMyKeringanan(profile!.id),
    enabled:  !!profile,
    staleTime: 0,
  });

  const keringananMutation = useMutation({
    mutationFn: () => submitKeringanan({
      profileId:     profile!.id,
      name:          profile!.name ?? '',
      contactNumber: keringananForm.contact_number,
      email:         user?.email ?? '',
      jumlahSanggup: parseInt(keringananForm.jumlah_sanggup, 10) || 0,
      alasan:        keringananForm.alasan,
    }),
    onSuccess: () => {
      setKeringananSuccess(true);
      queryClient.invalidateQueries({ queryKey: qk.myKeringanan(profile!.id) });
    },
  });

  // Pre-fill phone when profile loads
  useEffect(() => {
    if ((profile as any)?.phone) {
      setKeringananForm(f => ({ ...f, contact_number: (profile as any).phone }));
    }
  }, [profile?.id]);

  const heroStyle = {
    backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${
      heroBgUrl || 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?auto=format&fit=crop&q=80&w=1920'
    }')`,
    backgroundSize:     'cover',
    backgroundPosition: 'center',
  };

  return (
    <>
    <div className="p-6 md:p-8">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        className="relative h-72 rounded-xl overflow-hidden shadow-2xl mb-8 flex flex-col justify-end p-8 text-white"
        style={heroStyle}
      >
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.3em] font-light mb-2">
            {heroDate} • {heroVenue}
          </p>
          <h1 className="text-4xl font-bold mb-2">{heroTitle}</h1>
          <p className="italic text-sm text-gray-200 mb-6 font-light">{heroSub}</p>
          <div className="flex flex-wrap gap-4">
            {isApproved ? (
              <Link to="/profile" className="flex items-center gap-2 bg-green-600/80 hover:bg-green-600 backdrop-blur-sm px-8 py-2.5 rounded text-sm font-bold shadow-lg text-white transition-colors">
                ✓ Sudah Terdaftar
              </Link>
            ) : (
              <Link to="/register" className="btn-primary px-8 py-2.5 rounded text-sm font-bold shadow-lg">
                {heroCta}
              </Link>
            )}
            {flags?.merchandise && (
              <Link
                to="/merchandise"
                className="bg-black/30 hover:bg-black/40 backdrop-blur-sm border border-white/20 px-8 py-2.5 rounded text-sm font-medium transition text-white"
              >
                Pesan Merchandise
              </Link>
            )}
          </div>
        </div>

        {/* Countdown widget */}
        <div className="absolute right-8 bottom-8 bg-black/60 backdrop-blur-md p-4 rounded-lg border border-white/10 text-center min-w-[200px] hidden sm:block">
          <p className="text-[10px] uppercase tracking-widest text-gray-300 mb-2">Countdown Menuju Reuni</p>
          <div className="flex justify-between items-center px-2">
            <div className="text-center">
              <span className="text-2xl font-bold">{countdown.days}</span>
              <p className="text-[8px] uppercase text-gray-400">Hari</p>
            </div>
            <div className="text-xl font-light text-gray-500">:</div>
            <div className="text-center">
              <span className="text-2xl font-bold">{countdown.hours}</span>
              <p className="text-[8px] uppercase text-gray-400">Jam</p>
            </div>
            <div className="text-xl font-light text-gray-500">:</div>
            <div className="text-center">
              <span className="text-2xl font-bold">{countdown.minutes}</span>
              <p className="text-[8px] uppercase text-gray-400">Menit</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        {/* Kehadiran Alumni — live */}
        <div className="glass-card p-6 rounded-xl shadow-sm">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded text-green-700 dark:text-green-400 mr-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Kehadiran Alumni</h3>
          </div>
          <div className="flex items-end justify-between mb-2">
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{approvedCount}</span>
              <span className="text-gray-500 dark:text-gray-400 text-lg mx-1">/</span>
              <span className="text-xl text-gray-500 dark:text-gray-400">{quotaTarget}</span>
              <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">Alumni</span>
            </div>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">{attendancePct}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${attendancePct}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-3">
            {attendancePct >= 60
              ? 'Minimum kuota operasional tercapai ✓'
              : `Butuh ${Math.max(0, quotaTarget - approvedCount)} lagi untuk kuota minimum`}
          </p>

          {/* Attendance intent breakdown */}
          {dashboard?.attendance && (
            <div className="grid grid-cols-4 gap-1 mb-4 bg-amber-50/60 dark:bg-amber-900/10 rounded-lg p-2 border border-amber-100 dark:border-amber-800/20">
              <div className="text-center">
                <p className="text-sm font-bold text-green-700 dark:text-green-400">{dashboard.attendance.yes}</p>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight">Hadir</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{dashboard.attendance.most_likely}</p>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight">Berencana Hadir</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{dashboard.attendance.undecided}</p>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight">Belum Tahu</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-red-500">{dashboard.attendance.no}</p>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight">Tidak Bisa</p>
              </div>
            </div>
          )}

          {isApproved ? (
            <Link
              to="/profile"
              className="w-full py-2 rounded text-sm font-bold flex items-center justify-center gap-2 bg-green-600/80 hover:bg-green-600 text-white transition-colors"
            >
              ✓ Sudah Terdaftar
            </Link>
          ) : (
            <Link
              to="/register"
              className="btn-primary w-full py-2 rounded text-sm font-bold flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Daftar Sekarang
            </Link>
          )}
        </div>

        {/* Total Dana Terkumpul */}
        <div className="glass-card p-6 rounded-xl shadow-sm">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-orange-700 dark:text-orange-400 mr-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Total Dana Terkumpul</h3>
          </div>
          {(() => {
            const reunionFee  = dashboard?.totalDana?.reunion_fee       ?? 0;
            const donation    = dashboard?.totalDana?.donation           ?? 0;
            const merchMargin = dashboard?.totalDana?.merchandise_margin ?? 0;
            const grandTotal  = flags?.donations
              ? reunionFee + donation + (flags?.merchandise ? merchMargin : 0)
              : 0;
            const danaPct = budgetTargetFromTable > 0
              ? Math.min(Math.round((grandTotal / budgetTargetFromTable) * 100), 100)
              : 0;
            return (
              <>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Rp {grandTotal.toLocaleString('id-ID')}
                  </span>
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{danaPct}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${danaPct}%`, background: 'linear-gradient(to right, #c67119, #a35a12)' }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                  dari target Rp {budgetTargetFromTable.toLocaleString('id-ID')}
                </p>
                {flags?.donations ? (
                  <>
                    <div className="space-y-1 text-[11px] text-gray-500 dark:text-gray-400 mb-4">
                      <div className="flex justify-between">
                        <span>Iuran Reuni</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Rp {reunionFee.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Donasi</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Rp {donation.toLocaleString('id-ID')}</span>
                      </div>
                      {flags?.merchandise && merchMargin > 0 && (
                        <div className="flex justify-between">
                          <span>Margin Merchandise</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Rp {merchMargin.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>
                    <Link to="/payments" className="btn-primary w-full py-2 rounded text-sm font-bold flex items-center justify-center gap-2">
                      Bayar Sekarang
                    </Link>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                    Pembayaran belum dibuka. Fitur akan aktif segera.
                  </p>
                )}
              </>
            );
          })()}
        </div>

        {/* Merchandise Terpesan */}
        <div className="glass-card p-6 rounded-xl shadow-sm">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-700 dark:text-yellow-400 mr-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Merchandise Terpesan</h3>
          </div>
          {flags?.merchandise ? (
            <>
              <p className="text-3xl font-bold font-serif text-gray-900 dark:text-gray-100 mb-1">
                {dashboard?.merchandiseTotals?.confirmed ?? 0}
                <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-1">item</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                terkonfirmasi
                {(dashboard?.merchandiseTotals?.pending ?? 0) > 0 && (
                  <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                    · {dashboard!.merchandiseTotals.pending} menunggu
                  </span>
                )}
              </p>
              <Link
                to="/merchandise"
                className="btn-primary w-full py-2 rounded text-sm font-bold flex items-center justify-center gap-2"
              >
                Lihat Katalog
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">Merchandise belum tersedia.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Katalog merchandise akan segera hadir.</p>
              <div className="pt-3 border-t border-amber-100 dark:border-amber-800/20 mt-8">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">Fitur aktif di fase berikutnya.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Middle Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Pendaftaran Terbaru */}
        <div className="glass-card p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Pendaftaran Terbaru</h3>
            <Link to="/directory" className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tighter hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              Lihat Semua
            </Link>
          </div>
          <div className="space-y-4">
            {(dashboard?.recentMembers ?? []).length > 0 ? (
              dashboard!.recentMembers.map(m => (
                <div key={m.id} className="flex items-center">
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={m.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-amber-200 dark:border-amber-700/30 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{m.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="ml-3 flex-grow min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{m.name}</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {new Date(m.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">Belum ada pendaftar.</p>
            )}
          </div>
        </div>

        {/* Galeri Nostalgia */}
        <div className="glass-card p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Galeri Nostalgia</h3>
          </div>
          {(dashboard?.galleryMedia ?? []).length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {dashboard!.galleryMedia.slice(0, 4).map(m => {
                  const url = resolveMediaUrl(m.storage_path) ?? m.external_url;
                  return (
                    <div key={m.id} className="aspect-square bg-amber-50 dark:bg-amber-900/10 rounded overflow-hidden border-2 border-amber-100 dark:border-amber-800/20 shadow-sm">
                      {url && <img src={url} alt={m.caption ?? ''} className="w-full h-full object-cover" />}
                    </div>
                  );
                })}
              </div>
              {dashboard?.latestComment ? (
                <div className="bg-amber-50/60 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-100 dark:border-amber-800/20">
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 italic leading-relaxed line-clamp-2">
                    "{dashboard.latestComment.body}"
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">— {dashboard.latestComment.profileName}</p>
                </div>
              ) : (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 italic text-center">"Kenangan indah bersama sahabat..."</p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="grid grid-cols-2 gap-2 mb-4 w-full opacity-25">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-square bg-amber-100 dark:bg-amber-900/20 rounded border-2 border-amber-200 dark:border-amber-700/30" />
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">Belum ada foto. Jadilah yang pertama upload!</p>
            </div>
          )}
        </div>

        {/* Merchandise preview */}
        <div className="glass-card p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Merchandise</h3>
            {flags?.merchandise && isApproved ? (
              <Link to="/merchandise" className="text-[10px] text-gray-500 dark:text-gray-400 uppercase hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                Lihat Semua
              </Link>
            ) : (
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            )}
          </div>
          {flags?.merchandise && (dashboard?.topMerchandise ?? []).length > 0 ? (
            <div className="space-y-3">
              {(dashboard!.topMerchandise).map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover border border-amber-100 dark:border-amber-800/20 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      Rp {item.price.toLocaleString('id-ID')}
                      {item.stock_remaining <= 5 && item.stock_remaining > 0 && (
                        <span className="ml-1 text-orange-500">{item.stock_remaining} tersisa</span>
                      )}
                      {item.stock_remaining === 0 && (
                        <span className="ml-1 text-red-500">Habis</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              {isApproved && (
                <Link
                  to="/merchandise"
                  className="btn-primary w-full mt-2 py-2 rounded text-sm font-bold flex items-center justify-center gap-2"
                >
                  Pesan Sekarang
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/10 rounded-full flex items-center justify-center border-2 border-amber-200 dark:border-amber-700/30 mb-4">
                <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 font-serif">Segera Hadir</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Kaos, Tumbler, Topi — edisi terbatas TOP87</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Progress / Countdown Widgets ─────────────────────────────────── */}
      {(flags?.donations || flags?.merchandise) && (
        <div className="glass-card p-6 rounded-xl shadow-sm mb-8">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 font-serif text-lg mb-5">Progress Reuni</h3>
          <div className="space-y-5">

            {/* Dana Terkumpul */}
            {flags?.donations && (() => {
              const dana   = (dashboard?.totalDana?.reunion_fee ?? 0)
                           + (dashboard?.totalDana?.donation ?? 0)
                           + (flags.merchandise ? (dashboard?.totalDana?.merchandise_margin ?? 0) : 0);
              const target = budgetTargetFromTable;
              const pct         = target > 0 ? Math.min(Math.round((dana / target) * 100), 100) : 0;
              return (
                <div>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Dana Terkumpul</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Rp {dana.toLocaleString('id-ID')}
                      <span className="text-gray-400 dark:text-gray-500"> / Rp {target.toLocaleString('id-ID')}</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(to right, #c67119, #a35a12)',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 text-right">{pct}% dari target</p>
                </div>
              );
            })()}

            {/* Merchandise Stock per item */}
            {flags?.merchandise && (dashboard?.topMerchandise ?? []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">Stok Merchandise</p>
                <div className="space-y-2.5">
                  {dashboard!.topMerchandise.map(item => {
                    const sold = item.stock_total - item.stock_remaining;
                    const pct  = item.stock_total > 0
                      ? Math.min(Math.round((sold / item.stock_total) * 100), 100)
                      : 0;
                    return (
                      <div key={item.id}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[11px] text-gray-700 dark:text-gray-300 truncate max-w-[60%]">{item.name}</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {item.stock_remaining > 0
                              ? <>{item.stock_remaining} tersisa</>
                              : <span className="text-red-500">Habis</span>}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all bg-amber-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Budget table — lg:col-span-2 */}
        <div className="glass-card p-6 rounded-xl shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-xl font-serif">
              Rincian Anggaran (Transparansi)
            </h3>
            <Link to="/anggaran" title="Lihat halaman penuh">
              <Download className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-amber-200 dark:border-amber-800/30">
                  <th className="py-2 font-medium text-gray-500 dark:text-gray-400 w-10">No</th>
                  <th className="py-2 font-medium text-gray-500 dark:text-gray-400">Keterangan</th>
                  <th className="py-2 font-medium text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">Total Biaya</th>
                  <th className="py-2 font-medium text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">Per Orang</th>
                </tr>
              </thead>
              <tbody className="text-gray-800 dark:text-gray-200">
                {anggaranItems.map((item, i) => {
                  const perOrang   = anggaranMode === 'per_person' ? item.amount : Math.round(item.amount / (quotaTarget || 1));
                  const totalBiaya = anggaranMode === 'per_person' ? item.amount * quotaTarget : item.amount;
                  return (
                    <tr key={i} className="border-b border-amber-100 dark:border-amber-900/20">
                      <td className="py-4 text-gray-500 dark:text-gray-400">{i + 1}</td>
                      <td className="py-4 font-medium">{item.keterangan}</td>
                      <td className="py-4 text-right whitespace-nowrap">Rp {totalBiaya.toLocaleString('id-ID')}</td>
                      <td className="py-4 text-right whitespace-nowrap">Rp {perOrang.toLocaleString('id-ID')}</td>
                    </tr>
                  );
                })}
                <tr className="font-bold text-gray-900 dark:text-gray-100 bg-amber-50 dark:bg-amber-900/10">
                  <td className="py-4 px-2" colSpan={2}>TOTAL ANGGARAN REUNI</td>
                  <td className="py-4 text-right whitespace-nowrap">Rp {budgetTargetFromTable.toLocaleString('id-ID')}</td>
                  <td className="py-4 text-right whitespace-nowrap">Rp {grandPerOrang.toLocaleString('id-ID')}</td>
                </tr>
                {anggaranConfig.fee_per_orang ? (
                  <tr className="border-t-2 border-amber-300 dark:border-amber-600/50 text-amber-700 dark:text-amber-400">
                    <td colSpan={3} className="py-3 pr-4 text-right text-sm font-semibold">
                      Target Iuran Kebersamaan Per Orang
                    </td>
                    <td className="py-3 text-right whitespace-nowrap font-bold">
                      Rp {anggaranConfig.fee_per_orang.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-start gap-2">
            <Info className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">{budgetNote}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-amber-100 dark:border-amber-800/20 flex items-center gap-3 flex-wrap">
            {flyerUrl && (
              <a
                href={flyerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-700/40 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                Lihat Lengkapnya
              </a>
            )}
            {profile && (() => {
              const hasActive = myKeringanan?.status === 'pending' || myKeringanan?.status === 'approved';
              return (
                <button
                  onClick={() => { setKeringananSuccess(false); setShowKeringanan(true); }}
                  className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    hasActive
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700/40 cursor-default'
                      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/40 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                  }`}
                >
                  {myKeringanan?.status === 'pending'  && 'Sedang Ditinjau'}
                  {myKeringanan?.status === 'approved' && 'Keringanan Disetujui ✓'}
                  {(!myKeringanan || myKeringanan.status === 'rejected') && 'Minta Keringanan'}
                </button>
              );
            })()}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Pengumuman */}
          <div className="glass-card p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 dark:text-gray-200">Pengumuman</h3>
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="space-y-4">
              {(() => {
                let items: AnnouncementItem[] = DEFAULT_ANNOUNCEMENTS;
                if (pengumumanCms?.['items.data']) {
                  try {
                    const parsed = JSON.parse(pengumumanCms['items.data']);
                    if (Array.isArray(parsed) && parsed.length > 0) items = parsed;
                  } catch { /* use defaults */ }
                }
                return items.slice(0, 3).map((ann, i) => (
                  <div key={i} className={`border-l-4 pl-3 ${ann.highlight ? 'border-gold' : 'border-amber-200 dark:border-amber-700/50'}`}>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase">{ann.title}</h4>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">{ann.body}</p>
                  </div>
                ));
              })()}
            </div>
            <Link
              to="/pengumuman"
              className="w-full mt-4 block text-[10px] text-center text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Lihat Semua Pengumuman
            </Link>
          </div>

          {/* Bantu Teman Angkatan — revealed in Phase 2 (flags.donations) */}
          {flags?.donations && (
            <div className="glass-card p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Bantu Teman Angkatan</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Masih ada teman kita yang kesulitan biaya untuk hadir. Bantu mereka dengan kontribusi sukarela.
              </p>
              <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg mb-4">
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Target: 5 Alumni</span>
                  <span className="font-bold text-orange-700 dark:text-orange-400">0 Terbantu</span>
                </div>
                <div className="w-full bg-orange-200 dark:bg-orange-800/40 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full w-0" />
                </div>
              </div>
              <Link to="/payments" className="btn-primary w-full py-2.5 rounded font-bold text-sm shadow-md block text-center">
                Donasi Sekarang
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── Keringanan Modal ──────────────────────────────────────────────── */}
    {showKeringanan && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowKeringanan(false)}
      >
        <div
          className="bg-white dark:bg-zinc-900 border border-amber-200 dark:border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">Minta Keringanan</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Ceritakan situasimu — panitia akan meninjaunya secara personal.
              </p>
            </div>
            <button onClick={() => setShowKeringanan(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white ml-4 shrink-0">
              <X size={18} />
            </button>
          </div>

          {keringananSuccess ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🤝</div>
              <p className="font-bold text-gray-900 dark:text-white mb-1">Terima kasih sudah berbagi.</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Panitia akan menghubungimu melalui kontak yang kamu berikan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nama</label>
                  <input value={profile?.name ?? ''} readOnly
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                  <input value={user?.email ?? ''} readOnly
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nomor Kontak (WhatsApp)</label>
                <input
                  value={keringananForm.contact_number}
                  onChange={e => setKeringananForm(f => ({ ...f, contact_number: e.target.value }))}
                  placeholder="08xxxxxxxxxx"
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-400 dark:focus:border-gold/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Jumlah yang bisa ditanggung sendiri (Rp)
                </label>
                <input
                  type="number"
                  value={keringananForm.jumlah_sanggup}
                  onChange={e => setKeringananForm(f => ({ ...f, jumlah_sanggup: e.target.value }))}
                  placeholder="0"
                  min={0}
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-400 dark:focus:border-gold/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cerita singkat / alasan</label>
                <textarea
                  value={keringananForm.alasan}
                  onChange={e => setKeringananForm(f => ({ ...f, alasan: e.target.value }))}
                  placeholder="Ceritakan situasimu dengan singkat…"
                  rows={4}
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-400 dark:focus:border-gold/50 transition-colors resize-none"
                />
              </div>
              {keringananMutation.isError && (
                <p className="text-red-500 text-xs">{(keringananMutation.error as Error).message}</p>
              )}
              <button
                onClick={() => keringananMutation.mutate()}
                disabled={keringananMutation.isPending || !keringananForm.contact_number.trim() || !keringananForm.alasan.trim()}
                className="w-full btn-primary py-2.5 rounded-lg font-bold text-sm disabled:opacity-50 transition-opacity"
              >
                {keringananMutation.isPending ? 'Mengirim…' : 'Kirim Permintaan'}
              </button>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                Data ini hanya terlihat oleh panitia. Tidak akan dipublikasikan.
              </p>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}

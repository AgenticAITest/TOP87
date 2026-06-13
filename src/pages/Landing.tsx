import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Download, ArrowRight, Info, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { usePageContent } from '../hooks/usePageContent';
import { useDashboardData } from '../hooks/useDashboardData';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { resolveMediaUrl } from '../lib/storage';
import { qk, fetchSiteSetting } from '../lib/queries';

// ── Defaults (shown when CMS row not yet created) ─────────────────────────────

const DEFAULT_REUNION_ISO  = '2027-04-29T17:00:00+07:00';
const DEFAULT_QUOTA        = 122;
const DEFAULT_HERO_TITLE   = 'Sekarang Aku Menjadi Dewasa';
const DEFAULT_HERO_SUB     = '"Jika bukan kita yang merayakan, siapa lagi?"';
const DEFAULT_HERO_DATE    = '29 – 30 April 2027';
const DEFAULT_HERO_VENUE   = 'BANDUNG / CIWIDEY';
const DEFAULT_BUDGET_NOTE  =
  'Target dana terkumpul Rp 247.000.000. Selisih dana akan dialokasikan untuk Dana Sosial/Beasiswa & Yatim.';

interface BudgetItem {
  no?: number;
  keterangan: string;
  total: string;
  per_orang: string;
  is_total?: boolean;
}

const DEFAULT_BUDGET: BudgetItem[] = [
  { no: 1, keterangan: 'Akomodasi & Konsumsi Resort',         total: 'Rp 105.230.000', per_orang: 'Rp 863.000'   },
  { no: 2, keterangan: 'Lunch Hari Pertama (Prasmanan Sunda)', total: 'Rp 15.258.000',  per_orang: 'Rp 125.000'   },
  { no: 3, keterangan: 'Outdoor Activity & Games',            total: 'Rp 25.620.000',  per_orang: 'Rp 210.000'   },
];
const DEFAULT_BUDGET_TOTAL = { total: 'Rp 246.108.000', per_orang: 'Rp 2.017.000' };

const DEFAULT_ANNOUNCEMENTS = [
  { title: 'Kostum Hari Ke-1: Putih',    body: 'Ayo seragamkan dresscode agar dokumentasi terlihat kompak!',                         highlight: true  },
  { title: 'Pembayaran Cicilan Ke-2',     body: 'Mohon segera dilunasi sebelum tgl 12 Feb 2024 untuk konfirmasi akomodasi.',          highlight: false },
];

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
  const { profile } = useAuth();
  const { data: landingCms }  = usePageContent('landing');
  const { data: anggaranCms } = usePageContent('anggaran');
  const { data: dashboard }   = useDashboardData();
  const { data: flags }       = useFeatureFlags();
  const { data: flyerUrl = '' } = useQuery({
    queryKey: qk.siteSetting('anggaran_flyer_url'),
    queryFn:  () => fetchSiteSetting('anggaran_flyer_url'),
    staleTime: 5 * 60_000,
  });

  // CMS values with fallbacks
  const heroTitle    = landingCms?.['hero.title']              ?? DEFAULT_HERO_TITLE;
  const heroSub      = landingCms?.['hero.subtitle']           ?? DEFAULT_HERO_SUB;
  const heroDate     = landingCms?.['hero.date']               ?? DEFAULT_HERO_DATE;
  const heroVenue    = landingCms?.['hero.venue']              ?? DEFAULT_HERO_VENUE;
  const heroBgUrl    = landingCms?.['hero.image_url']          ?? '';
  const reunionIso   = landingCms?.['reunion.date_iso']        ?? DEFAULT_REUNION_ISO;
  const quotaTarget  = parseInt(landingCms?.['reunion.quota_target'] ?? String(DEFAULT_QUOTA), 10);
  const budgetNote   = anggaranCms?.['notes.body']             ?? DEFAULT_BUDGET_NOTE;

  // Parse budget items from CMS JSON or fall back to defaults
  let budgetItems = DEFAULT_BUDGET;
  let budgetTotal = DEFAULT_BUDGET_TOTAL;
  if (anggaranCms?.['items.data']) {
    try {
      const parsed: BudgetItem[] = JSON.parse(anggaranCms['items.data']);
      const totalRow = parsed.find(r => r.is_total);
      budgetItems = parsed.filter(r => !r.is_total);
      if (totalRow) budgetTotal = { total: totalRow.total, per_orang: totalRow.per_orang };
    } catch { /* use defaults */ }
  }

  const countdown         = useCountdown(reunionIso);
  const approvedCount     = dashboard?.approvedCount ?? 0;
  const attendancePct     = quotaTarget > 0 ? Math.min(Math.round((approvedCount / quotaTarget) * 100), 100) : 0;
  const isApproved        = profile?.status === 'approved';

  const heroStyle = {
    backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${
      heroBgUrl || 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?auto=format&fit=crop&q=80&w=1920'
    }')`,
    backgroundSize:     'cover',
    backgroundPosition: 'center',
  };

  return (
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
            <Link to="/register" className="btn-primary px-8 py-2.5 rounded text-sm font-bold shadow-lg">
              Daftar Sekarang
            </Link>
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
            <div className="p-2 bg-green-100 rounded text-green-700 mr-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-800">Kehadiran Alumni</h3>
          </div>
          <div className="flex items-end justify-between mb-2">
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-gray-900">{approvedCount}</span>
              <span className="text-gray-500 text-lg mx-1">/</span>
              <span className="text-xl text-gray-500">{quotaTarget}</span>
              <span className="ml-2 text-sm text-gray-400">Alumni</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{attendancePct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${attendancePct}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-600 mb-3">
            {attendancePct >= 60
              ? 'Minimum kuota operasional tercapai ✓'
              : `Butuh ${Math.max(0, Math.ceil(quotaTarget * 0.6) - approvedCount)} lagi untuk kuota minimum`}
          </p>

          {/* Attendance intent breakdown */}
          {dashboard?.attendance && (
            <div className="grid grid-cols-4 gap-1 mb-4 bg-amber-50/60 rounded-lg p-2 border border-amber-100">
              <div className="text-center">
                <p className="text-sm font-bold text-green-700">{dashboard.attendance.yes}</p>
                <p className="text-[9px] text-gray-500 leading-tight">Hadir</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-blue-600">{dashboard.attendance.most_likely}</p>
                <p className="text-[9px] text-gray-500 leading-tight">Berencana Hadir</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-yellow-600">{dashboard.attendance.undecided}</p>
                <p className="text-[9px] text-gray-500 leading-tight">Belum Tahu</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-red-500">{dashboard.attendance.no}</p>
                <p className="text-[9px] text-gray-500 leading-tight">Tidak Bisa</p>
              </div>
            </div>
          )}

          <Link
            to="/register"
            className="btn-primary w-full py-2 rounded text-sm font-bold flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Daftar Sekarang
          </Link>
        </div>

        {/* Total Dana Terkumpul */}
        <div className="glass-card p-6 rounded-xl shadow-sm">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-orange-100 rounded text-orange-700 mr-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-800">Total Dana Terkumpul</h3>
          </div>
          {flags?.donations ? (
            <>
              {(() => {
                const reunionFee   = dashboard?.totalDana?.reunion_fee        ?? 0;
                const donation     = dashboard?.totalDana?.donation            ?? 0;
                const merchMargin  = dashboard?.totalDana?.merchandise_margin  ?? 0;
                const grandTotal   = reunionFee + donation + (flags?.merchandise ? merchMargin : 0);
                return (
                  <>
                    <p className="text-3xl font-bold text-gray-900 mb-1">
                      Rp {grandTotal.toLocaleString('id-ID')}
                    </p>
                    <div className="space-y-1 text-[11px] text-gray-500 mb-4">
                      <div className="flex justify-between">
                        <span>Iuran Reuni</span>
                        <span className="font-medium text-gray-700">Rp {reunionFee.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Donasi</span>
                        <span className="font-medium text-gray-700">Rp {donation.toLocaleString('id-ID')}</span>
                      </div>
                      {flags?.merchandise && merchMargin > 0 && (
                        <div className="flex justify-between">
                          <span>Margin Merchandise</span>
                          <span className="font-medium text-gray-700">Rp {merchMargin.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
              <Link to="/payments" className="btn-primary w-full py-2 rounded text-sm font-bold flex items-center justify-center gap-2">
                Bayar Sekarang
              </Link>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-400 mb-2">Rp 0</p>
              <p className="text-xs text-gray-500 italic leading-relaxed">
                Pembayaran belum dibuka. Fitur ini akan aktif segera.
              </p>
              <div className="mt-8 flex space-x-2 opacity-30">
                <div className="h-1 bg-orange-200 flex-grow rounded" />
                <div className="h-1 bg-orange-400 flex-grow rounded" />
                <div className="h-1 bg-orange-600 flex-grow rounded" />
              </div>
            </>
          )}
        </div>

        {/* Merchandise Terpesan */}
        <div className="glass-card p-6 rounded-xl shadow-sm">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-yellow-100 rounded text-yellow-700 mr-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-800">Merchandise Terpesan</h3>
          </div>
          {flags?.merchandise ? (
            <>
              <p className="text-3xl font-bold font-serif text-gray-900 mb-1">
                {dashboard?.merchandiseTotals?.confirmed ?? 0}
                <span className="text-base font-normal text-gray-500 ml-1">item</span>
              </p>
              <p className="text-xs text-gray-500 mb-4">
                terkonfirmasi
                {(dashboard?.merchandiseTotals?.pending ?? 0) > 0 && (
                  <span className="ml-2 text-yellow-600">
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
              <p className="text-sm text-gray-400 italic">Merchandise belum tersedia.</p>
              <p className="text-xs text-gray-400 mt-2">Katalog merchandise akan segera hadir.</p>
              <div className="pt-3 border-t border-amber-100 mt-8">
                <p className="text-[11px] text-gray-400 italic">Fitur aktif di fase berikutnya.</p>
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
            <h3 className="font-bold text-gray-800">Pendaftaran Terbaru</h3>
            <Link to="/directory" className="text-[10px] text-gray-500 uppercase tracking-tighter hover:text-gray-700 transition-colors">
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
                      className="w-10 h-10 rounded-full border border-amber-200 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-amber-700">{m.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="ml-3 flex-grow min-w-0">
                    <h4 className="text-sm font-bold truncate">{m.name}</h4>
                    <p className="text-[10px] text-gray-500">
                      {new Date(m.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 italic text-center py-4">Belum ada pendaftar.</p>
            )}
          </div>
        </div>

        {/* Galeri Nostalgia */}
        <div className="glass-card p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">Galeri Nostalgia</h3>
            {isApproved && (
              <Link to="/submit" className="text-[10px] text-gray-500 uppercase hover:text-gray-700 transition-colors">
                Upload Foto
              </Link>
            )}
          </div>
          {(dashboard?.galleryMedia ?? []).length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {dashboard!.galleryMedia.slice(0, 4).map(m => {
                  const url = resolveMediaUrl(m.storage_path) ?? m.external_url;
                  return (
                    <div key={m.id} className="aspect-square bg-amber-50 rounded overflow-hidden border-2 border-amber-100 shadow-sm">
                      {url && <img src={url} alt={m.caption ?? ''} className="w-full h-full object-cover" />}
                    </div>
                  );
                })}
              </div>
              {dashboard?.latestComment ? (
                <div className="bg-amber-50/60 rounded-lg p-3 border border-amber-100">
                  <p className="text-[11px] text-gray-600 italic leading-relaxed line-clamp-2">
                    "{dashboard.latestComment.body}"
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">— {dashboard.latestComment.profileName}</p>
                </div>
              ) : (
                <p className="text-[10px] text-gray-500 italic text-center">"Kenangan indah bersama sahabat..."</p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="grid grid-cols-2 gap-2 mb-4 w-full opacity-25">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-square bg-amber-100 rounded border-2 border-amber-200" />
                ))}
              </div>
              <p className="text-xs text-gray-400 italic">Belum ada foto. Jadilah yang pertama upload!</p>
            </div>
          )}
        </div>

        {/* Merchandise preview */}
        <div className="glass-card p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">Merchandise</h3>
            {flags?.merchandise && isApproved ? (
              <Link to="/merchandise" className="text-[10px] text-gray-500 uppercase hover:text-gray-700 transition-colors">
                Lihat Semua
              </Link>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="w-10 h-10 rounded-lg object-cover border border-amber-100 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-500">
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
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border-2 border-amber-200 mb-4">
                <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600 font-serif">Segera Hadir</p>
              <p className="text-xs text-gray-400 mt-1">Kaos, Tumbler, Topi — edisi terbatas TOP87</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Progress / Countdown Widgets ─────────────────────────────────── */}
      {(flags?.donations || flags?.merchandise) && (
        <div className="glass-card p-6 rounded-xl shadow-sm mb-8">
          <h3 className="font-bold text-gray-800 font-serif text-lg mb-5">Progress Reuni</h3>
          <div className="space-y-5">

            {/* Dana Terkumpul */}
            {flags?.donations && (() => {
              const dana        = (dashboard?.totalDana?.reunion_fee ?? 0)
                                + (dashboard?.totalDana?.donation ?? 0)
                                + (flags.merchandise ? (dashboard?.totalDana?.merchandise_margin ?? 0) : 0);
              const target      = dashboard?.budgetTarget ?? 247_000_000;
              const pct         = target > 0 ? Math.min(Math.round((dana / target) * 100), 100) : 0;
              return (
                <div>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-xs font-bold text-gray-700">Dana Terkumpul</span>
                    <span className="text-xs text-gray-500">
                      Rp {dana.toLocaleString('id-ID')}
                      <span className="text-gray-400"> / Rp {target.toLocaleString('id-ID')}</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(to right, #c67119, #a35a12)',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 text-right">{pct}% dari target</p>
                </div>
              );
            })()}

            {/* Merchandise Stock per item */}
            {flags?.merchandise && (dashboard?.topMerchandise ?? []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-700 mb-3">Stok Merchandise</p>
                <div className="space-y-2.5">
                  {dashboard!.topMerchandise.map(item => {
                    const sold = item.stock_total - item.stock_remaining;
                    const pct  = item.stock_total > 0
                      ? Math.min(Math.round((sold / item.stock_total) * 100), 100)
                      : 0;
                    return (
                      <div key={item.id}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[11px] text-gray-700 truncate max-w-[60%]">{item.name}</span>
                          <span className="text-[10px] text-gray-500">
                            {item.stock_remaining > 0
                              ? <>{item.stock_remaining} tersisa</>
                              : <span className="text-red-500">Habis</span>}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
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
            <h3 className="font-bold text-gray-800 text-xl font-serif">
              Rincian Anggaran (Transparansi)
            </h3>
            <Link to="/anggaran" title="Lihat halaman penuh">
              <Download className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-amber-200">
                  <th className="py-2 font-medium text-gray-500 w-10">No</th>
                  <th className="py-2 font-medium text-gray-500">Keterangan</th>
                  <th className="py-2 font-medium text-gray-500 text-right whitespace-nowrap">Total Biaya</th>
                  <th className="py-2 font-medium text-gray-500 text-right whitespace-nowrap">Per Orang</th>
                </tr>
              </thead>
              <tbody className="text-gray-800">
                {budgetItems.map((item, i) => (
                  <tr key={i} className="border-b border-amber-100">
                    <td className="py-4 text-gray-500">{item.no ?? i + 1}</td>
                    <td className="py-4 font-medium">{item.keterangan}</td>
                    <td className="py-4 text-right whitespace-nowrap">{item.total}</td>
                    <td className="py-4 text-right whitespace-nowrap">{item.per_orang}</td>
                  </tr>
                ))}
                <tr className="font-bold text-gray-900 bg-amber-50">
                  <td className="py-4 px-2" colSpan={2}>TOTAL ANGGARAN REUNI</td>
                  <td className="py-4 text-right whitespace-nowrap">{budgetTotal.total}</td>
                  <td className="py-4 text-right whitespace-nowrap">{budgetTotal.per_orang}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-start gap-2">
            <Info className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-500 italic">{budgetNote}</p>
          </div>
          {flyerUrl && (
            <a
              href={flyerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors border-t border-amber-100 pt-4"
            >
              <FileText className="w-4 h-4 shrink-0" />
              Lihat Flyer Anggaran Lengkap
              <ArrowRight className="w-3 h-3 ml-auto" />
            </a>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Pengumuman */}
          <div className="glass-card p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">Pengumuman</h3>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="space-y-4">
              {DEFAULT_ANNOUNCEMENTS.map((ann, i) => (
                <div key={i} className={`border-l-4 pl-3 ${ann.highlight ? 'border-gold' : 'border-amber-200'}`}>
                  <h4 className="text-xs font-bold text-gray-900 uppercase">{ann.title}</h4>
                  <p className="text-[10px] text-gray-600 mt-0.5">{ann.body}</p>
                </div>
              ))}
            </div>
            <Link
              to="/pengumuman"
              className="w-full mt-4 block text-[10px] text-center text-gray-500 font-bold uppercase tracking-wider hover:text-gray-700 transition-colors"
            >
              Lihat Semua Pengumuman
            </Link>
          </div>

          {/* Bantu Teman Angkatan — revealed in Phase 2 (flags.donations) */}
          {flags?.donations && (
            <div className="glass-card p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">Bantu Teman Angkatan</h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                Masih ada teman kita yang kesulitan biaya untuk hadir. Bantu mereka dengan kontribusi sukarela.
              </p>
              <div className="bg-orange-50 p-3 rounded-lg mb-4">
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Target: 5 Alumni</span>
                  <span className="font-bold text-orange-700">0 Terbantu</span>
                </div>
                <div className="w-full bg-orange-200 h-1.5 rounded-full overflow-hidden">
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
  );
}

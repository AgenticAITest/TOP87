import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, Wallet, Package, ChevronDown, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePageContent } from '../hooks/usePageContent';
import { useDashboardData } from '../hooks/useDashboardData';

const DEFAULT_REUNION_ISO = '2027-04-29T17:00:00+07:00';
const DEFAULT_QUOTA       = 122;
const DEFAULT_HERO_BG     =
  'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?auto=format&fit=crop&q=80&w=1920';

function calcTimeLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function useCountdown(iso: string) {
  const [t, setT] = useState(() => calcTimeLeft(iso));
  useEffect(() => {
    const id = setInterval(() => setT(calcTimeLeft(iso)), 1000);
    return () => clearInterval(id);
  }, [iso]);
  return t;
}

const FEATURES = [
  {
    icon: Users,
    title: (count: number) => `${count > 10 ? count : '120'}+ Teman Angkatan`,
    desc:  'Terhubung kembali dengan kawan lama dari seluruh penjuru Indonesia yang telah terdaftar.',
  },
  {
    icon: Wallet,
    title: () => 'Transparansi Anggaran',
    desc:  'Laporan keuangan real-time yang dapat diakses anggota untuk memastikan akuntabilitas penuh.',
  },
  {
    icon: Package,
    title: () => 'Merchandise Eksklusif',
    desc:  'Dapatkan paket kenangan spesial edisi terbatas hanya untuk peserta reuni TOP87.',
  },
];

export default function PublicLanding() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { data: cms }         = usePageContent('landing');
  const { data: anggaranCms } = usePageContent('anggaran');
  const { data: dashboard }   = useDashboardData();

  if (!loading && user) return <Navigate to="/home" replace />;

  const heroTitle       = cms?.['hero.title']              ?? 'Sekarang Aku Menjadi Dewasa';
  const heroBgUrl       = cms?.['hero.image_url']          ?? DEFAULT_HERO_BG;
  const reunionIso      = cms?.['reunion.date_iso']        ?? DEFAULT_REUNION_ISO;
  const venue           = cms?.['reunion.venue']           ?? 'Bandung / Ciwidey';
  const heroDate        = cms?.['hero.date']               ?? '29 – 30 April 2027';
  // Attendance goal — shared with the member landing via the anggaran config's attendance_target,
  // falling back to the legacy landing kpi.quota field, then the default.
  let anggaranAttendanceTarget: number | undefined;
  try {
    if (anggaranCms?.['items.config']) {
      anggaranAttendanceTarget = (JSON.parse(anggaranCms['items.config']) as { attendance_target?: number }).attendance_target;
    }
  } catch { /* use fallback */ }
  const quotaTarget     = anggaranAttendanceTarget ?? parseInt(cms?.['kpi.quota'] ?? String(DEFAULT_QUOTA), 10);
  const photo1Url     = cms?.['nostalgia.photo1_url']     ?? '';
  const photo1Caption = cms?.['nostalgia.photo1_caption'] ?? 'Koridor, 1986';
  const photo2Url     = cms?.['nostalgia.photo2_url']     ?? '';
  const photo2Caption = cms?.['nostalgia.photo2_caption'] ?? 'Wisuda, 1987';
  const footerSchoolLine = cms?.['footer.school_line']     ?? 'St. Aloysius Bandung · Angkatan 1987';

  const approvedCount = dashboard?.approvedCount ?? 0;
  const remaining     = Math.max(0, quotaTarget - approvedCount);
  const attendancePct = quotaTarget > 0
    ? Math.min(Math.round((approvedCount / quotaTarget) * 100), 100)
    : 0;

  const countdown = useCountdown(reunionIso);

  const COUNTDOWN_UNITS = [
    { value: countdown.days,    label: 'Hari'  },
    { value: countdown.hours,   label: 'Jam'   },
    { value: countdown.minutes, label: 'Menit' },
    { value: countdown.seconds, label: 'Detik' },
  ];

  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ backgroundColor: '#f4efdf' }}>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-forest/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="TOP87" className="w-8 h-8 object-contain" />
            <span className="font-serif font-bold text-gold text-lg tracking-widest">TOP87</span>
          </div>
          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-2 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all"
          >
            <LogIn size={14} />
            Masuk
          </button>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <header
        className="relative h-[88vh] min-h-[520px] flex flex-col items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url('${heroBgUrl}')`,
          backgroundSize:     'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-forest/65" />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, rgba(0,30,15,0.5) 100%)' }}
        />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.4em] text-gold/75 mb-6">
            {venue} &nbsp;·&nbsp; {heroDate}
          </p>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white italic leading-tight mb-5">
            {heroTitle}
          </h1>

          <p className="text-gold font-bold uppercase tracking-[0.3em] text-sm sm:text-base mb-10">
            Reuni 40 Tahun TOP87
          </p>

          {/* Social proof pill */}
          {approvedCount > 0 && (
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-6 py-3 mb-8">
              <div className="flex -space-x-1.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-gold/30 border-2 border-white/40 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-gold/80">{i + 1}</span>
                  </div>
                ))}
              </div>
              <span className="text-white/90 text-sm">
                <strong>{approvedCount}</strong> alumni sudah tergabung
                {remaining > 0 && <> - <span className="text-gold">Tinggal {remaining} slot menuju kuota minimum Booking Exclusive Seluruh Area Resort</span></>}
              </span>
            </div>
          )}

          <div>
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-3 bg-gold hover:bg-gold-light text-forest font-bold px-10 py-3.5 text-sm uppercase tracking-widest transition-colors shadow-xl"
            >
              <ArrowRight size={16} />
              Daftar Sekarang
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <ChevronDown size={28} className="text-gold/60" />
        </div>
      </header>

      {/* ── Why Join ───────────────────────────────────────────────────── */}
      <section className="py-20 px-6 parchment-bg">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl font-bold text-forest mb-3">Kenapa Bergabung?</h2>
            <div className="w-14 h-0.5 bg-gold mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={desc} className="text-center group">
                <div className="w-20 h-20 rounded-full bg-forest/10 border border-forest/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-forest/15 transition-colors duration-300">
                  <Icon size={30} className="text-forest" strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-xl font-bold text-forest mb-3">
                  {title(approvedCount)}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nostalgia ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ backgroundColor: 'rgba(13,43,31,0.05)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-14">
          <div className="md:w-1/2 space-y-5">
            <h2 className="font-serif text-3xl font-bold text-forest">Nostalgia</h2>
            <p className="text-lg text-gray-600 italic leading-relaxed">
              "Waktu mungkin berlalu, namun ingatan akan masa-masa di koridor sekolah takkan pernah pudar.
              Mari kita rajut kembali benang yang sempat terputus."
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Sejauh apapun kita melangkah, ada satu tempat di mana kita selalu merasa diterima.
              Reuni ini bukan hanya pertemuan — ini adalah kepulangan.
            </p>
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-2 bg-forest text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-forest/90 transition-colors"
            >
              Bergabung Sekarang
            </button>
          </div>
          <div className="md:w-1/2 flex gap-5 justify-center items-center">
            <div className="-rotate-2 bg-white p-3 shadow-xl border border-amber-200/60 shrink-0">
              <div className="w-36 h-48 overflow-hidden" style={{ backgroundColor: '#e8e0d4' }}>
                {photo1Url ? (
                  <img src={photo1Url} alt={photo1Caption} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] uppercase tracking-widest">
                    Foto Angkatan
                  </div>
                )}
              </div>
              <p className="mt-2 text-center text-[9px] uppercase tracking-widest text-gray-400">{photo1Caption}</p>
            </div>
            <div className="rotate-3 bg-white p-3 shadow-xl border border-amber-200/60 shrink-0 mt-10">
              <div className="w-36 h-48 overflow-hidden" style={{ backgroundColor: '#e8e0d4' }}>
                {photo2Url ? (
                  <img src={photo2Url} alt={photo2Caption} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] uppercase tracking-widest">
                    Foto Wisuda
                  </div>
                )}
              </div>
              <p className="mt-2 text-center text-[9px] uppercase tracking-widest text-gray-400">{photo2Caption}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Countdown ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 parchment-bg">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gold/70 mb-2">Waktu Menuju</p>
          <h2 className="font-serif text-3xl font-bold text-forest dark:text-gold mb-12 uppercase tracking-wider">
            Kebersamaan
          </h2>

          <div className="grid grid-cols-4 gap-4 sm:gap-8 mb-10">
            {COUNTDOWN_UNITS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <span className="block font-serif text-4xl sm:text-5xl font-bold text-gold tabular-nums leading-none">
                  {String(value).padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-gray-500 mt-2 block">{label}</span>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-forest rounded-full transition-all duration-1000"
              style={{ width: `${attendancePct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            {attendancePct}% teman-teman telah mendaftar
          </p>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ backgroundColor: '#0d2b1f' }}>
        <div
          className="max-w-2xl mx-auto text-center relative"
        >
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ background: 'radial-gradient(circle at center, #D4AF37 0%, transparent 70%)' }}
          />
          <div className="relative z-10">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white italic mb-4">
              Siap Untuk Reuni?
            </h2>
            <p className="text-white/50 text-sm mb-10">
              Pendaftaran masih dibuka. Jangan sampai ketinggalan.
            </p>
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-3 bg-gold hover:bg-gold-light text-forest font-bold px-12 py-4 text-sm uppercase tracking-widest transition-colors shadow-2xl"
            >
              <ArrowRight size={16} />
              Daftar Sekarang
            </button>
            <p className="mt-6 text-white/30 text-xs">
              Sudah punya akun? Klik tombol di atas untuk masuk.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-forest border-t border-white/5 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-white/40 text-xs">
          <span className="font-serif font-bold text-gold text-base">TOP87</span>
          {footerSchoolLine && <p>{footerSchoolLine}</p>}
          <p className="italic">Dari kita, oleh kita, untuk kita.</p>
        </div>
      </footer>
    </div>
  );
}

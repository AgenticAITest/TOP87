import { useState, useEffect, useRef, Fragment, type ChangeEvent } from 'react';
import { Check, Loader, RotateCcw, AlertCircle, Upload } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPageContent, upsertField, type ContentType } from '../../lib/cms';
import { useAuth } from '../../contexts/AuthContext';
import { uploadFile, resolveMediaUrl } from '../../lib/storage';

// ─── Page / field schema ──────────────────────────────────────────────────────

interface SelectOption { value: string; label: string; description?: string; }

interface FieldDef {
  label: string;
  type: ContentType | 'select';
  hint?: string;
  rows?: number;
  template?: string;
  options?: SelectOption[];
}
interface SectionDef {
  label: string;
  fields: Record<string, FieldDef>;
}
interface PageDef {
  label: string;
  sections: Record<string, SectionDef>;
}

const FAQ_TEMPLATE = JSON.stringify([
  { q: 'Kapan dan di mana acara reuni berlangsung?', a: 'Reuni berlangsung pada 10–22 Mei 2027 di kawasan Bandung / Ciwidey. Detail lokasi akan diinformasikan lebih lanjut.' },
  { q: 'Berapa biaya iuran reuni?', a: 'Biaya iuran reuni adalah Rp 2.017.000 per orang. Pembayaran dapat dilakukan secara cicilan.' },
  { q: 'Bagaimana cara mendaftar?', a: "Klik tombol 'Daftar Sekarang' di halaman utama, masuk dengan akun Google, lalu lengkapi profil Anda. Setelah diverifikasi panitia, Anda akan mendapat akses penuh." },
  { q: 'Apakah pendaftaran bisa dibatalkan?', a: 'Silakan hubungi panitia untuk informasi pembatalan. Kebijakan refund akan diinformasikan lebih lanjut.' },
  { q: 'Bagaimana jika saya tidak bisa hadir secara fisik?', a: 'Anda tetap bisa mendaftar dan bergabung di portal alumni untuk tetap terhubung dengan teman angkatan.' },
], null, 2);

const PENGUMUMAN_TEMPLATE = JSON.stringify([
  { title: 'Portal Pendaftaran Resmi Dibuka!', body: 'Kami dengan bangga mengumumkan pembukaan portal pendaftaran reuni TOP87. Segera daftarkan diri Anda dan ajak teman-teman angkatan!', date: '2026-06-14', highlight: true },
  { title: 'Dresscode: Putih untuk Hari Pertama', body: 'Ayo seragamkan penampilan kita! Dresscode hari pertama reuni adalah kemeja/baju putih formal agar dokumentasi terlihat kompak dan berkesan.', date: '2026-06-14', highlight: false },
  { title: 'Info Cicilan Iuran', body: 'Iuran reuni sebesar Rp 2.017.000 dapat dibayarkan secara cicilan. Jadwal dan mekanisme pembayaran akan segera diinformasikan.', date: '2026-06-14', highlight: false },
], null, 2);

const PAGES: Record<string, PageDef> = {
  landing: {
    label: 'Dashboard (Landing)',
    sections: {
      hero: {
        label: 'Hero Banner',
        fields: {
          image_url: { label: 'Background image URL', type: 'image_url', hint: 'Direct image URL for the hero banner background.' },
          title:     { label: 'Headline',             type: 'text',      hint: 'Main hero headline. Default: "Sekarang Aku Menjadi Dewasa"' },
          subtitle:  { label: 'Sub-tagline',          type: 'text',      hint: 'Italic quote shown below the headline.' },
          date:      { label: 'Event date display',   type: 'text',      hint: 'Date range shown in the hero, e.g. "10 – 22 Mei 2027"' },
          venue:     { label: 'Venue line',            type: 'text',      hint: 'Shown in the hero banner, e.g. "Bandung / Ciwidey"' },
          cta_label: { label: 'CTA button label',     type: 'text',      hint: 'Default: "Daftar Sekarang"' },
        },
      },
      reunion: {
        label: 'Reunion Info',
        fields: {
          date_iso:     { label: 'Reunion start date (ISO 8601)', type: 'text', hint: 'e.g. 2027-05-10T08:00:00+07:00 — drives the countdown clock.' },
          quota_target: { label: 'Target attendees (quota)',      type: 'text', hint: 'Integer, e.g. 122. Used for the Kehadiran Alumni progress bar.' },
          dana_target_mode: {
            label: 'Target dana — cara kalkulasi',
            type: 'select',
            hint: 'Pilih bagaimana target pada progress bar Total Dana Terkumpul dihitung.',
            options: [
              { value: 'budget_total',      label: 'Dari tabel anggaran',    description: 'Membaca baris total (is_total) kolom "Total Biaya" di tabel anggaran.' },
              { value: 'per_orang_x_quota', label: 'Per orang × kuota',      description: 'Biaya per orang (baris total anggaran) × target kehadiran. Cocok jika flyer hanya mencantumkan biaya per orang.' },
              { value: 'manual',            label: 'Manual entry',            description: 'Admin memasukkan angka target langsung di field di bawah.' },
            ],
          },
          dana_target_manual: { label: 'Target dana manual (Rp)', type: 'text', hint: 'Hanya digunakan jika mode di atas adalah "Manual entry". Masukkan angka saja, contoh: 246108000' },
        },
      },
    },
  },
  anggaran: {
    label: 'Anggaran & Transparansi',
    sections: {
      items: {
        label: 'Budget Table',
        fields: {
          data: {
            label: 'Budget items (JSON)',
            type: 'json',
            rows: 12,
            hint: 'Array of {no, keterangan, total, per_orang}. Add {is_total: true} on the grand-total row.',
          },
        },
      },
      notes: {
        label: 'Footer Note',
        fields: {
          body: { label: 'Note text', type: 'text', hint: 'Displayed below the budget table.' },
        },
      },
    },
  },
  faq: {
    label: 'FAQ',
    sections: {
      items: {
        label: 'FAQ Items',
        fields: {
          data: {
            label: 'FAQ items (JSON)',
            type: 'json',
            rows: 10,
            hint: 'Array of {q: "question text", a: "answer text"}.',
            template: FAQ_TEMPLATE,
          },
        },
      },
    },
  },
  pengumuman: {
    label: 'Pengumuman',
    sections: {
      items: {
        label: 'Announcements',
        fields: {
          data: {
            label: 'Announcements (JSON)',
            type: 'json',
            rows: 10,
            hint: 'Array of {title, body, date, highlight: true|false}.',
            template: PENGUMUMAN_TEMPLATE,
          },
        },
      },
    },
  },
};

const PAGE_KEYS = Object.keys(PAGES);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tryFormatJson(raw: string): string {
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
}

function isValidJson(raw: string): boolean {
  try { JSON.parse(raw); return true; } catch { return false; }
}

// ─── Field component ──────────────────────────────────────────────────────────

function FieldEditor({
  pageKey, sectionKey, fieldKey, def, initialValue, onSaved,
}: {
  pageKey: string; sectionKey: string; fieldKey: string;
  def: FieldDef; initialValue: string; onSaved: () => void;
}) {
  const { user } = useAuth();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [value, setValue]     = useState(initialValue);
  const [saved, setSaved]     = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadErr, setUploadErr]   = useState<string | null>(null);

  useEffect(() => { setValue(initialValue); }, [initialValue]);

  const isDirty = value !== initialValue;
  const isJson  = def.type === 'json';
  const jsonErr = isJson && value.trim() !== '' && !isValidJson(value)
    ? 'Invalid JSON' : null;

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () => upsertField(
      pageKey, sectionKey, fieldKey, value.trim(),
      def.type === 'select' ? 'text' : def.type
    ),
    onSuccess: () => {
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    },
  });

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const path = await uploadFile(file, user.id, () => {});
      setValue(resolveMediaUrl(path) ?? path);
    } catch (err) {
      setUploadErr((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500">{def.label}</label>
          {def.hint && <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{def.hint}</p>}
        </div>
        {isDirty && !jsonErr && (
          <button
            type="button"
            onClick={() => mutate()}
            disabled={isPending}
            className="shrink-0 flex items-center gap-1.5 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 rounded-lg px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all disabled:opacity-50"
          >
            {isPending ? <Loader size={11} className="animate-spin" /> : saved ? <Check size={11} /> : null}
            {isPending ? 'Saving…' : saved ? 'Saved' : 'Save'}
          </button>
        )}
      </div>

      {def.type === 'select' && def.options ? (
        <div className="space-y-2">
          {def.options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue(opt.value)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                value === opt.value
                  ? 'border-gold/40 bg-gold/5'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 shrink-0 transition-all ${
                value === opt.value ? 'border-gold bg-gold' : 'border-gray-600'
              }`} />
              <div className="min-w-0">
                <p className={`text-sm font-medium ${value === opt.value ? 'text-white' : 'text-gray-400'}`}>
                  {opt.label}
                </p>
                {opt.description && (
                  <p className="text-xs text-gray-600 mt-0.5 leading-snug">{opt.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : def.type === 'image_url' ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 bg-white/[0.02] transition-all disabled:opacity-50 text-sm shrink-0"
            >
              {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </div>
          {uploadErr && <p className="text-red-400 text-xs">{uploadErr}</p>}
          {value.trim() && (
            <div className="rounded-xl overflow-hidden h-28 bg-white/5">
              <img src={value.trim()} alt="Preview" className="w-full h-full object-cover opacity-60"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
        </div>
      ) : (def.rows ?? 1) > 1 ? (
        <div className="space-y-1.5">
          {isJson && def.template && (
            <button
              type="button"
              onClick={() => setValue(tryFormatJson(def.template!))}
              className="text-[10px] text-gold/60 hover:text-gold transition-colors"
            >
              {value.trim() ? '↺ Reset ke template' : '↓ Muat template'}
            </button>
          )}
          <textarea
            value={def.type === 'json' && !isDirty ? tryFormatJson(value) : value}
            onChange={e => setValue(e.target.value)}
            rows={def.rows ?? 4}
            className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none transition-colors resize-y ${
              jsonErr ? 'border-red-500/50 focus:border-red-400' : 'border-white/10 focus:border-gold/50'
            }`}
            placeholder={def.type === 'json' ? '[\n  { … }\n]' : ''}
          />
        </div>
      ) : (
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
        />
      )}

      {jsonErr && (
        <p className="flex items-center gap-1 text-red-400 text-xs">
          <AlertCircle size={11} /> {jsonErr}
        </p>
      )}
      {isError && (
        <p className="text-red-400 text-xs">{(error as Error).message}</p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SiteCMSAdmin() {
  const queryClient = useQueryClient();
  const [activePageKey, setActivePageKey] = useState(PAGE_KEYS[0]);
  const activePage = PAGES[activePageKey];

  const { data: cms = {}, isLoading } = useQuery({
    queryKey: ['cms', activePageKey],
    queryFn:  () => fetchPageContent(activePageKey),
    staleTime: 0,
  });

  function onFieldSaved() {
    queryClient.invalidateQueries({ queryKey: ['cms', activePageKey] });
  }

  return (
    <div className="flex min-h-screen">
      {/* Page selector sidebar */}
      <div className="w-52 shrink-0 border-r border-white/5 py-6 px-3">
        <p className="px-3 mb-3 text-[10px] uppercase tracking-widest text-gray-600">Pages</p>
        <nav className="space-y-0.5">
          {PAGE_KEYS.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setActivePageKey(key)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                activePageKey === key
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {PAGES[key].label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Site CMS</p>
            <h1 className="font-serif text-3xl font-bold text-white">{activePage.label}</h1>
          </div>
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['cms', activePageKey] })}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            <RotateCcw size={11} /> Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="text-gray-600 text-xs uppercase tracking-widest animate-pulse">Loading…</div>
        ) : (
          <div className="max-w-2xl space-y-8">
            {Object.entries(activePage.sections).map(([sectionKey, section]) => (
              <section key={sectionKey} className="glass rounded-2xl p-6 space-y-6">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/5 pb-3">
                  {section.label}
                </h2>
                {Object.entries(section.fields).map(([fieldKey, def]) => (
                  <Fragment key={fieldKey}>
                    <FieldEditor
                      pageKey={activePageKey}
                      sectionKey={sectionKey}
                      fieldKey={fieldKey}
                      def={def}
                      initialValue={cms[`${sectionKey}.${fieldKey}`] ?? ''}
                      onSaved={onFieldSaved}
                    />
                  </Fragment>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

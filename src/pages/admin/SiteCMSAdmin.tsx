import { useState, useEffect, useRef, useMemo, Fragment, type ChangeEvent } from 'react';
import { Check, Loader, RotateCcw, AlertCircle, Upload, Plus, Eye, X } from 'lucide-react';
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
          date_iso: { label: 'Reunion start date (ISO 8601)', type: 'text', hint: 'e.g. 2027-04-29T17:00:00+07:00 — drives the countdown clock.' },
        },
      },
      nostalgia: {
        label: 'Nostalgia Section',
        fields: {
          photo1_url:     { label: 'Photo 1 image',   type: 'image_url', hint: 'Upload or paste URL for the first nostalgia photo.' },
          photo1_caption: { label: 'Photo 1 caption', type: 'text',      hint: 'Caption below the first photo, e.g. "Koridor, 1986"' },
          photo2_url:     { label: 'Photo 2 image',   type: 'image_url', hint: 'Upload or paste URL for the second nostalgia photo.' },
          photo2_caption: { label: 'Photo 2 caption', type: 'text',      hint: 'Caption below the second photo, e.g. "Wisuda, 1987"' },
        },
      },
      footer: {
        label: 'Footer',
        fields: {
          school_line: { label: 'School / class line', type: 'text', hint: 'Shown in the public footer, e.g. "St. Aloysius Bandung · Angkatan 1987". Leave blank to hide.' },
        },
      },
    },
  },
  anggaran: {
    label: 'Anggaran & Transparansi',
    sections: {
      items: {
        label: 'Rincian Anggaran',
        fields: {},
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
        fields: {},
      },
    },
  },
  pengumuman: {
    label: 'Pengumuman',
    sections: {
      items: {
        label: 'Announcements',
        fields: {},
      },
    },
  },
};

const PAGE_KEYS = Object.keys(PAGES);

// ─── Anggaran config type & defaults ──────────────────────────────────────────

interface AnggaranItem { keterangan: string; amount: number; }
interface AnggaranConfig { mode: 'per_person' | 'per_category'; quota: number; items: AnggaranItem[]; fee_per_orang?: number; }

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tryFormatJson(raw: string): string {
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
}

function isValidJson(raw: string): boolean {
  try { JSON.parse(raw); return true; } catch { return false; }
}

// ─── Anggaran editor ──────────────────────────────────────────────────────────

function AnggaranEditor({ initialJson, onSaved }: { initialJson: string; onSaved: () => void }) {
  const initial = useMemo<AnggaranConfig>(() => {
    try { return JSON.parse(initialJson) as AnggaranConfig; } catch { return DEFAULT_ANGGARAN_CONFIG; }
  }, [initialJson]);

  const [mode,        setMode]        = useState<'per_person' | 'per_category'>(initial.mode ?? 'per_person');
  const [quota,       setQuota]       = useState<number>(initial.quota ?? 122);
  const [feePerOrang, setFeePerOrang] = useState<number>(initial.fee_per_orang ?? 0);
  const [items, setItems] = useState<AnggaranItem[]>(
    initial.items?.length ? initial.items : DEFAULT_ANGGARAN_CONFIG.items
  );
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMode(initial.mode ?? 'per_person');
    setQuota(initial.quota ?? 122);
    setFeePerOrang(initial.fee_per_orang ?? 0);
    setItems(initial.items?.length ? initial.items : DEFAULT_ANGGARAN_CONFIG.items);
  }, [initial]);

  const initialNorm = useMemo(() => {
    try { return JSON.stringify(JSON.parse(initialJson)); }
    catch { return JSON.stringify(DEFAULT_ANGGARAN_CONFIG); }
  }, [initialJson]);

  const isDirty = JSON.stringify({ mode, quota, items, fee_per_orang: feePerOrang || undefined }) !== initialNorm;

  const sumAmount      = items.reduce((s, i) => s + (i.amount || 0), 0);
  const grandTotal     = mode === 'per_person' ? sumAmount * quota : sumAmount;
  const grandPerOrang  = mode === 'per_person' ? sumAmount : (quota > 0 ? Math.round(sumAmount / quota) : 0);

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () => upsertField('anggaran', 'items', 'config',
      JSON.stringify({ mode, quota, items, ...(feePerOrang ? { fee_per_orang: feePerOrang } : {}) }), 'json'),
    onSuccess: () => { setSaved(true); onSaved(); setTimeout(() => setSaved(false), 2000); },
  });

  function updateItem(idx: number, field: keyof AnggaranItem, val: string) {
    setItems(prev => prev.map((it, i) => i === idx
      ? { ...it, [field]: field === 'amount' ? (parseInt(val, 10) || 0) : val }
      : it
    ));
  }

  const modeOptions = [
    { value: 'per_person'   as const, label: 'Per Orang',    desc: 'Admin memasukkan biaya per orang. Total biaya = nilai × kuota.' },
    { value: 'per_category' as const, label: 'Per Kategori', desc: 'Admin memasukkan total per kategori. Per orang = total ÷ kuota.' },
  ];

  return (
    <div className="space-y-6">
      {/* Mode */}
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Tampilkan angka per</p>
        <div className="grid grid-cols-2 gap-3">
          {modeOptions.map(opt => (
            <button key={opt.value} type="button" onClick={() => setMode(opt.value)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                mode === opt.value ? 'border-gold/40 bg-gold/5' : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              }`}>
              <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 shrink-0 ${
                mode === opt.value ? 'border-gold bg-gold' : 'border-gray-600'
              }`} />
              <div>
                <p className={`text-sm font-medium ${mode === opt.value ? 'text-white' : 'text-gray-400'}`}>{opt.label}</p>
                <p className="text-xs text-gray-600 mt-0.5 leading-snug">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quota */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1.5">Target kehadiran (kuota alumni)</label>
        <input type="number" value={quota} min={1}
          onChange={e => setQuota(parseInt(e.target.value, 10) || 0)}
          className="w-32 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors" />
        <p className="text-[11px] text-gray-600 mt-1">
          Digunakan untuk progress bar kehadiran dan kalkulasi total biaya (mode per orang).
        </p>
      </div>

      {/* Items */}
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">
          Rincian Anggaran
          <span className="ml-2 text-gray-700 normal-case tracking-normal font-normal">
            — masukkan {mode === 'per_person' ? 'biaya per orang (Rp)' : 'total per kategori (Rp)'}
          </span>
        </p>
        <div className="space-y-2">
          {items.map((item, idx) => {
            const derivedLabel = mode === 'per_person'
              ? `→ Total: Rp ${(item.amount * quota).toLocaleString('id-ID')}`
              : `→ Per orang: Rp ${(quota > 0 ? Math.round(item.amount / quota) : 0).toLocaleString('id-ID')}`;
            return (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-xs text-gray-600 w-5 text-right shrink-0">{idx + 1}</span>
                <input value={item.keterangan} onChange={e => updateItem(idx, 'keterangan', e.target.value)}
                  placeholder="Keterangan"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors" />
                <input type="number" value={item.amount || ''} onChange={e => updateItem(idx, 'amount', e.target.value)}
                  placeholder="0"
                  className="w-36 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm text-right focus:outline-none focus:border-gold/50 transition-colors" />
                <span className="text-[10px] text-gray-600 w-44 shrink-0 hidden lg:block">{derivedLabel}</span>
                <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1 shrink-0">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => setItems(prev => [...prev, { keterangan: '', amount: 0 }])}
          className="mt-3 text-xs text-gold/60 hover:text-gold transition-colors flex items-center gap-1.5">
          <Plus size={12} /> Tambah baris
        </button>
      </div>

      {/* Target iuran per orang */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1.5">
          Target Iuran Kebersamaan Per Orang (opsional)
        </label>
        <input type="number" value={feePerOrang || ''} min={0}
          onChange={e => setFeePerOrang(parseInt(e.target.value, 10) || 0)}
          placeholder="misal: 1870000"
          className="w-48 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors" />
        <p className="text-[11px] text-gray-600 mt-1">
          Ditampilkan sebagai baris khusus di bawah total anggaran — angka iuran yang dikomunikasikan ke member.
          Kosongkan jika tidak ingin ditampilkan.
        </p>
      </div>

      {/* Auto-totals */}
      <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">Kalkulasi Otomatis</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total Biaya</span>
          <span className="text-white font-bold">Rp {grandTotal.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Per Orang</span>
          <span className="text-white font-bold">Rp {grandPerOrang.toLocaleString('id-ID')}</span>
        </div>
        <p className="text-[10px] text-gray-600 pt-2 border-t border-white/5">
          "Total Biaya" ini yang muncul di KPI card dana terkumpul pada dashboard.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={() => setShowPreview(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 bg-white/[0.02] transition-all text-sm">
          <Eye size={14} /> Preview Tabel
        </button>
        {isDirty && (
          <button type="button" onClick={() => mutate()} disabled={isPending}
            className="flex items-center gap-2 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 rounded-xl px-4 py-2 text-sm font-bold transition-all disabled:opacity-50">
            {isPending ? <Loader size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
            {isPending ? 'Menyimpan…' : saved ? 'Tersimpan' : 'Simpan'}
          </button>
        )}
        {isError && <p className="text-red-400 text-sm">{(error as Error).message}</p>}
      </div>

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-serif text-lg font-bold text-white">Preview Tabel Anggaran</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-[11px] text-gray-600 mb-4">
              Tampilan ini sama persis dengan yang dilihat oleh member di halaman dashboard.
              Kuota: {quota} orang.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-amber-200/30">
                    <th className="py-2 font-medium text-gray-500 w-8">No</th>
                    <th className="py-2 font-medium text-gray-500">Keterangan</th>
                    <th className="py-2 font-medium text-gray-500 text-right whitespace-nowrap">Total Biaya</th>
                    <th className="py-2 font-medium text-gray-500 text-right whitespace-nowrap">Per Orang</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {items.map((item, i) => {
                    const perOrang   = mode === 'per_person' ? item.amount : Math.round(item.amount / (quota || 1));
                    const totalBiaya = mode === 'per_person' ? item.amount * quota : item.amount;
                    return (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-3 text-gray-500">{i + 1}</td>
                        <td className="py-3 font-medium">{item.keterangan || '—'}</td>
                        <td className="py-3 text-right">Rp {totalBiaya.toLocaleString('id-ID')}</td>
                        <td className="py-3 text-right">Rp {perOrang.toLocaleString('id-ID')}</td>
                      </tr>
                    );
                  })}
                  <tr className="font-bold text-white bg-amber-900/10">
                    <td className="py-3 px-2" colSpan={2}>TOTAL ANGGARAN REUNI</td>
                    <td className="py-3 text-right">Rp {grandTotal.toLocaleString('id-ID')}</td>
                    <td className="py-3 text-right">Rp {grandPerOrang.toLocaleString('id-ID')}</td>
                  </tr>
                  {feePerOrang > 0 && (
                    <tr className="border-t-2 border-amber-500/40 text-amber-400">
                      <td colSpan={3} className="py-3 pr-4 text-right text-sm font-semibold">
                        Target Iuran Kebersamaan Per Orang
                      </td>
                      <td className="py-3 text-right font-bold whitespace-nowrap">
                        Rp {feePerOrang.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FAQ editor ───────────────────────────────────────────────────────────────

interface FaqItem { q: string; a: string; }

function FaqEditor({ initialJson, onSaved }: { initialJson: string; onSaved: () => void }) {
  const initial = useMemo<FaqItem[]>(() => {
    try { const p = JSON.parse(initialJson); return Array.isArray(p) ? p : []; }
    catch { return []; }
  }, [initialJson]);

  const [items, setItems] = useState<FaqItem[]>(initial);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setItems(initial); }, [initial]);

  const isDirty = JSON.stringify(items) !== JSON.stringify(initial);

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () => upsertField('faq', 'items', 'data', JSON.stringify(items), 'json'),
    onSuccess: () => { setSaved(true); onSaved(); setTimeout(() => setSaved(false), 2000); },
  });

  function update(idx: number, field: keyof FaqItem, val: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-xs text-gray-600 italic py-2">Belum ada pertanyaan. Klik "Tambah" untuk mulai.</p>
      )}
      {items.map((item, idx) => (
        <div key={idx} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-600 w-5 text-right shrink-0 mt-2.5">{idx + 1}</span>
            <div className="flex-1 space-y-2">
              <input
                value={item.q}
                onChange={e => update(idx, 'q', e.target.value)}
                placeholder="Pertanyaan…"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
              />
              <textarea
                value={item.a}
                onChange={e => update(idx, 'a', e.target.value)}
                placeholder="Jawaban…"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none"
              />
            </div>
            <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
              className="text-gray-600 hover:text-red-400 transition-colors p-1 shrink-0 mt-1">
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={() => setItems(prev => [...prev, { q: '', a: '' }])}
        className="text-xs text-gold/60 hover:text-gold transition-colors flex items-center gap-1.5">
        <Plus size={12} /> Tambah pertanyaan
      </button>

      <div className="flex items-center gap-3 pt-3 border-t border-white/5">
        {isDirty ? (
          <button type="button" onClick={() => mutate()} disabled={isPending}
            className="flex items-center gap-2 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 rounded-xl px-4 py-2 text-sm font-bold transition-all disabled:opacity-50">
            {isPending ? <Loader size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
            {isPending ? 'Menyimpan…' : saved ? 'Tersimpan' : 'Simpan'}
          </button>
        ) : saved ? (
          <span className="flex items-center gap-1.5 text-green-400 text-xs"><Check size={12} /> Tersimpan</span>
        ) : null}
        {isError && <p className="text-red-400 text-sm">{(error as Error).message}</p>}
      </div>
    </div>
  );
}

// ─── Pengumuman editor ────────────────────────────────────────────────────────

interface PengumumanItem { title: string; body: string; date: string; highlight: boolean; }

function PengumumanEditor({ initialJson, onSaved }: { initialJson: string; onSaved: () => void }) {
  const initial = useMemo<PengumumanItem[]>(() => {
    try { const p = JSON.parse(initialJson); return Array.isArray(p) ? p : []; }
    catch { return []; }
  }, [initialJson]);

  const [items, setItems] = useState<PengumumanItem[]>(initial);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setItems(initial); }, [initial]);

  const isDirty = JSON.stringify(items) !== JSON.stringify(initial);

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () => upsertField('pengumuman', 'items', 'data', JSON.stringify(items), 'json'),
    onSuccess: () => { setSaved(true); onSaved(); setTimeout(() => setSaved(false), 2000); },
  });

  function update(idx: number, field: keyof PengumumanItem, val: string | boolean) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-xs text-gray-600 italic py-2">Belum ada pengumuman. Klik "Tambah" untuk mulai.</p>
      )}
      {items.map((item, idx) => (
        <div key={idx} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-600 w-5 text-right shrink-0 mt-2.5">{idx + 1}</span>
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <input
                  value={item.title}
                  onChange={e => update(idx, 'title', e.target.value)}
                  placeholder="Judul pengumuman…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
                />
                <input
                  value={item.date}
                  onChange={e => update(idx, 'date', e.target.value)}
                  placeholder="misal: 14 Jun 2026"
                  className="w-36 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>
              <textarea
                value={item.body}
                onChange={e => update(idx, 'body', e.target.value)}
                placeholder="Isi pengumuman…"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none"
              />
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input type="checkbox" checked={item.highlight}
                  onChange={e => update(idx, 'highlight', e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37] rounded" />
                <span className="text-xs text-gray-400">Highlight (garis emas di kiri)</span>
              </label>
            </div>
            <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
              className="text-gray-600 hover:text-red-400 transition-colors p-1 shrink-0 mt-1">
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

      <button type="button"
        onClick={() => setItems(prev => [...prev, { title: '', body: '', date: '', highlight: false }])}
        className="text-xs text-gold/60 hover:text-gold transition-colors flex items-center gap-1.5">
        <Plus size={12} /> Tambah pengumuman
      </button>

      <div className="flex items-center gap-3 pt-3 border-t border-white/5">
        {isDirty ? (
          <button type="button" onClick={() => mutate()} disabled={isPending}
            className="flex items-center gap-2 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 rounded-xl px-4 py-2 text-sm font-bold transition-all disabled:opacity-50">
            {isPending ? <Loader size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
            {isPending ? 'Menyimpan…' : saved ? 'Tersimpan' : 'Simpan'}
          </button>
        ) : saved ? (
          <span className="flex items-center gap-1.5 text-green-400 text-xs"><Check size={12} /> Tersimpan</span>
        ) : null}
        {isError && <p className="text-red-400 text-sm">{(error as Error).message}</p>}
      </div>
    </div>
  );
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
            {Object.entries(activePage.sections).map(([sectionKey, section]) => {
              const isAnggaranItems   = activePageKey === 'anggaran'   && sectionKey === 'items';
              const isFaqItems        = activePageKey === 'faq'        && sectionKey === 'items';
              const isPengumumanItems = activePageKey === 'pengumuman' && sectionKey === 'items';
              return (
                <section key={sectionKey} className="glass rounded-2xl p-6 space-y-6">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/5 pb-3">
                    {section.label}
                  </h2>
                  {isAnggaranItems ? (
                    <AnggaranEditor
                      initialJson={cms['items.config'] ?? ''}
                      onSaved={onFieldSaved}
                    />
                  ) : isFaqItems ? (
                    <FaqEditor
                      initialJson={cms['items.data'] ?? ''}
                      onSaved={onFieldSaved}
                    />
                  ) : isPengumumanItems ? (
                    <PengumumanEditor
                      initialJson={cms['items.data'] ?? ''}
                      onSaved={onFieldSaved}
                    />
                  ) : (
                    Object.entries(section.fields).map(([fieldKey, def]) => (
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
                    ))
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, Fragment } from 'react';
import { Check, Loader, RotateCcw, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPageContent, upsertField, type ContentType } from '../../lib/cms';

// ─── Page / field schema ──────────────────────────────────────────────────────

interface FieldDef {
  label: string;
  type: ContentType;
  hint?: string;
  rows?: number;
}
interface SectionDef {
  label: string;
  fields: Record<string, FieldDef>;
}
interface PageDef {
  label: string;
  sections: Record<string, SectionDef>;
}

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
          cta_label: { label: 'CTA button label',     type: 'text',      hint: 'Default: "Daftar Sekarang"' },
        },
      },
      reunion: {
        label: 'Reunion Info',
        fields: {
          date_iso: { label: 'Reunion date (ISO 8601)', type: 'text', hint: 'e.g. 2027-04-29T17:00:00+07:00 — drives the countdown clock.' },
          venue:    { label: 'Venue line',              type: 'text', hint: 'Shown in the hero banner, e.g. "Bandung / Ciwidey"' },
        },
      },
      kpi: {
        label: 'KPI',
        fields: {
          quota: { label: 'Target attendees (quota)', type: 'text', hint: 'Integer, e.g. 122. Used for the progress bar.' },
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
  const [value, setValue]   = useState(initialValue);
  const [saved, setSaved]   = useState(false);

  useEffect(() => { setValue(initialValue); }, [initialValue]);

  const isDirty = value !== initialValue;
  const isJson  = def.type === 'json';
  const jsonErr = isJson && value.trim() !== '' && !isValidJson(value)
    ? 'Invalid JSON' : null;

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () => upsertField(pageKey, sectionKey, fieldKey, value.trim(), def.type),
    onSuccess: () => {
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    },
  });

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

      {def.type === 'image_url' ? (
        <div className="space-y-2">
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
          />
          {value.trim() && (
            <div className="rounded-xl overflow-hidden h-28 bg-white/5">
              <img src={value.trim()} alt="Preview" className="w-full h-full object-cover opacity-60"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
        </div>
      ) : (def.rows ?? 1) > 1 ? (
        <textarea
          value={def.type === 'json' && !isDirty ? tryFormatJson(value) : value}
          onChange={e => setValue(e.target.value)}
          rows={def.rows ?? 4}
          className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none transition-colors resize-y ${
            jsonErr ? 'border-red-500/50 focus:border-red-400' : 'border-white/10 focus:border-gold/50'
          }`}
          placeholder={def.type === 'json' ? '[\n  { … }\n]' : ''}
        />
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

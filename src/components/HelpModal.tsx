import { useState, useEffect, useRef, useMemo } from 'react';
import { X, BookOpen } from 'lucide-react';
import { marked } from 'marked';
import { motion, AnimatePresence } from 'motion/react';

import anggotaRaw      from '../docs/panduan-anggota.md?raw';
import charterAdminRaw from '../docs/panduan-charter-admin.md?raw';
import superAdminRaw   from '../docs/panduan-super-admin.md?raw';

// ─── marked setup ─────────────────────────────────────────────────────────────

const renderer = new marked.Renderer();
const _heading = renderer.heading.bind(renderer);
renderer.heading = function (token) {
  const text = token.text;
  const depth = token.depth;
  const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};
void _heading;
marked.use({ renderer });

// ─── types ────────────────────────────────────────────────────────────────────

interface Guide { key: string; title: string; content: string }
interface TocItem { level: number; text: string; id: string }

// ─── helpers ─────────────────────────────────────────────────────────────────

function extractTOC(md: string): TocItem[] {
  return md
    .split('\n')
    .filter(l => /^#{2,3} /.test(l))
    .map(l => {
      const level = l.startsWith('### ') ? 3 : 2;
      const text  = l.replace(/^#{2,3} /, '');
      const id    = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
      return { level, text, id };
    });
}

// ─── component ───────────────────────────────────────────────────────────────

interface Props {
  isOpen:          boolean;
  onClose:         () => void;
  isSuperAdmin?:   boolean;
  isCharterAdmin?: boolean;
}

export default function HelpModal({ isOpen, onClose, isSuperAdmin, isCharterAdmin }: Props) {
  const guides = useMemo<Guide[]>(() => {
    const list: Guide[] = [{ key: 'anggota', title: 'Panduan Anggota', content: anggotaRaw }];
    if (isCharterAdmin || isSuperAdmin)
      list.push({ key: 'charter-admin', title: 'Charter Admin', content: charterAdminRaw });
    if (isSuperAdmin)
      list.push({ key: 'super-admin', title: 'Super Admin', content: superAdminRaw });
    return list;
  }, [isSuperAdmin, isCharterAdmin]);

  const [activeKey, setActiveKey] = useState(guides[guides.length - 1].key);
  const contentRef = useRef<HTMLDivElement>(null);

  // when role changes, default to the highest-privilege guide
  useEffect(() => {
    setActiveKey(guides[guides.length - 1].key);
  }, [guides]);

  // close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const current = guides.find(g => g.key === activeKey) ?? guides[0];
  const html    = useMemo(() => marked.parse(current.content, { async: false }) as string, [current]);
  const toc     = useMemo(() => extractTOC(current.content), [current]);

  function scrollTo(id: string) {
    contentRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.96, y: 12  }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative z-10 w-full max-w-5xl h-[88vh] glass rounded-2xl flex flex-col overflow-hidden shadow-2xl"
          >
            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-white/10 shrink-0">
              <BookOpen size={16} className="text-gold shrink-0" />
              <span className="font-serif text-base font-bold text-white">Panduan Pengguna</span>

              {/* Guide tabs */}
              <div className="flex gap-1 ml-2">
                {guides.map(g => (
                  <button
                    key={g.key}
                    onClick={() => { setActiveKey(g.key); contentRef.current?.scrollTo(0, 0); }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                      activeKey === g.key
                        ? 'bg-gold/15 text-gold border border-gold/30'
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {g.title}
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                aria-label="Tutup"
              >
                <X size={15} />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="flex flex-1 overflow-hidden">
              {/* TOC sidebar */}
              <nav className="w-44 shrink-0 border-r border-white/5 overflow-y-auto py-4 px-2">
                <p className="text-[9px] uppercase tracking-widest text-gray-600 px-2 mb-3">Daftar Isi</p>
                {toc.map(item => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`block w-full text-left px-2 py-1 rounded text-[11px] leading-snug transition-colors hover:text-white hover:bg-white/5 ${
                      item.level === 2 ? 'text-gray-400 font-medium' : 'text-gray-600 pl-4'
                    }`}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>

              {/* Markdown content */}
              <div
                ref={contentRef}
                className="help-prose flex-1 overflow-y-auto px-8 py-6"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

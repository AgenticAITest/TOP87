import { useState, Fragment } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePageContent } from '../hooks/usePageContent';

interface FAQItem { q: string; a: string; }

const DEFAULT_FAQ: FAQItem[] = [
  { q: 'Siapa yang bisa mendaftar untuk reuni?',         a: 'Reuni ini terbuka untuk seluruh alumni SMA Negeri 3 Bandung angkatan 1987 (TOP87).' },
  { q: 'Kapan dan di mana reuni diadakan?',               a: 'Reuni diadakan pada 29–30 April 2027 di Bandung / Ciwidey. Detail lokasi akan diumumkan lebih lanjut.' },
  { q: 'Bagaimana cara melakukan pembayaran?',            a: 'Pembayaran dapat dilakukan melalui QRIS yang akan tersedia di portal saat fitur pembayaran dibuka.' },
  { q: 'Apakah ada fasilitas untuk alumni luar kota?',    a: 'Ya, panitia sedang menyiapkan informasi penginapan dan transportasi untuk alumni dari luar kota.' },
  { q: 'Bagaimana jika saya belum mendapat konfirmasi?',  a: 'Pendaftaran memerlukan persetujuan admin. Jika belum dikonfirmasi dalam 3×24 jam, hubungi panitia.' },
];

function AccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-amber-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="font-medium text-gray-800 text-sm">{item.q}</span>
        <ChevronDown
          className={`w-4 h-4 text-gold shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="pb-4 text-sm text-gray-600 leading-relaxed pr-8">
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const { data: cms } = usePageContent('faq');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  let items = DEFAULT_FAQ;
  if (cms?.['items.data']) {
    try {
      items = JSON.parse(cms['items.data']);
    } catch { /* use defaults */ }
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-forest mb-2">FAQ</h1>
        <p className="text-gray-600 text-sm">Pertanyaan yang sering ditanyakan seputar Reuni TOP87.</p>
      </div>

      <div className="glass-card p-6 rounded-xl shadow-sm">
        {items.map((item, i) => (
          <Fragment key={i}>
            <AccordionItem
              item={item}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

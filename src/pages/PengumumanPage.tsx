import { usePageContent } from '../hooks/usePageContent';

interface PengumumanItem { title: string; body: string; date: string; highlight: boolean; }

const DEFAULT_PENGUMUMAN: PengumumanItem[] = [
  { title: 'Kostum Hari Ke-1: Putih',    body: 'Ayo seragamkan dresscode agar dokumentasi terlihat kompak!',                         date: '10 Jan 2026', highlight: true  },
  { title: 'Pembayaran Cicilan Ke-2',     body: 'Mohon segera dilunasi sebelum tgl 12 Feb 2026 untuk konfirmasi akomodasi.',          date: '05 Jan 2026', highlight: false },
  { title: 'Pendaftaran Dibuka',          body: 'Portal pendaftaran resmi reuni TOP87 telah dibuka. Segera daftarkan dirimu!',         date: '01 Jan 2026', highlight: false },
];

export default function PengumumanPage() {
  const { data: cms } = usePageContent('pengumuman');

  let announcements = DEFAULT_PENGUMUMAN;
  if (cms?.['items.data']) {
    try {
      const parsed = JSON.parse(cms['items.data']);
      if (Array.isArray(parsed) && parsed.length > 0) announcements = parsed;
    } catch { /* use defaults */ }
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-forest mb-2">Pengumuman</h1>
        <p className="text-gray-600 text-sm">Update terkini dari panitia Reuni TOP87.</p>
      </div>

      <div className="space-y-4">
        {announcements.map((ann, i) => (
          <div key={i} className="glass-card p-5 rounded-xl shadow-sm">
            <div className={`border-l-4 pl-4 ${ann.highlight ? 'border-gold' : 'border-amber-200'}`}>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-sm font-bold text-gray-900 uppercase">{ann.title}</h2>
                <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">{ann.date}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{ann.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

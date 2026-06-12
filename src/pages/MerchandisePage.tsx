import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { ShoppingBag, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchMerchandiseItems, qk } from '../lib/queries';
import type { MerchandiseItem } from '../lib/queries';
import MerchOrderModal from '../components/MerchOrderModal';

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function MerchandisePage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<MerchandiseItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: qk.merchandise(),
    queryFn:  fetchMerchandiseItems,
  });

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-700/70 mb-1">Member</p>
        <h1 className="font-serif text-4xl font-bold text-gray-900">Merchandise</h1>
        <p className="text-gray-500 text-sm mt-1">Kenangan abadi Class of '87 — edisi terbatas.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-24 text-gray-400 text-xs uppercase tracking-widest animate-pulse">
          Memuat…
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-sm">Belum ada merchandise tersedia.</p>
          <p className="text-xs text-gray-400 mt-1">Katalog akan segera hadir.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl overflow-hidden shadow-sm flex flex-col"
            >
              {/* Product image */}
              <div className="aspect-square bg-amber-50 border-b border-amber-100 relative overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag size={48} className="text-amber-200" />
                  </div>
                )}

                {item.stock_remaining === 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                      Habis
                    </span>
                  </div>
                )}

                {item.stock_remaining > 0 && item.stock_remaining <= 5 && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-sm">
                      {item.stock_remaining} tersisa
                    </span>
                  </div>
                )}
              </div>

              {/* Product info */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-0.5 leading-tight">{item.name}</h3>
                {item.description && (
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-amber-100">
                  <div>
                    <p className="text-lg font-bold text-amber-700">{formatRp(item.price)}</p>
                    <p className="text-[10px] text-gray-400">
                      {item.stock_remaining > 0
                        ? `${item.stock_remaining} tersisa`
                        : 'Stok habis'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(item)}
                    disabled={item.stock_remaining === 0}
                    className="btn-primary px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Pesan
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-10 text-center">
          <Link
            to="/orders"
            className="text-sm text-amber-700 hover:text-amber-600 underline underline-offset-2 transition-colors"
          >
            Lihat riwayat pesanan saya →
          </Link>
        </div>
      )}

      {selected && (
        <MerchOrderModal
          item={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: qk.merchandise() });
          }}
        />
      )}
    </div>
  );
}

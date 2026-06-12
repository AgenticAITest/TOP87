import { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader, Check, Minus, Plus, MapPin } from 'lucide-react';
import { fetchQRISConfig, submitOrder, qk } from '../lib/queries';
import type { MerchandiseItem } from '../lib/queries';
import { uploadReceipt } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function MerchOrderModal({
  item,
  onClose,
  onSuccess,
}: {
  item: MerchandiseItem;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [qty,          setQty]         = useState(1);
  const [address,      setAddress]     = useState('');
  const [notes,        setNotes]       = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [receiptFile,  setReceiptFile]  = useState<File | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [done,         setDone]         = useState(false);

  const total  = qty * item.price;
  const maxQty = Math.max(1, item.stock_remaining);

  const { data: qris, isLoading: qrisLoading } = useQuery({
    queryKey: qk.qrisConfig(),
    queryFn:  fetchQRISConfig,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Tidak terautentikasi');
      if (!address.trim()) throw new Error('Alamat pengiriman wajib diisi');

      let receipt_url: string | null = null;
      if (receiptFile) {
        setUploading(true);
        receipt_url = await uploadReceipt(receiptFile, profile.id);
        setUploading(false);
      }

      const amount = customAmount
        ? parseInt(customAmount.replace(/\D/g, ''), 10) || total
        : total;

      await submitOrder({
        profile_id:      profile.id,
        merchandise_id:  item.id,
        quantity:        qty,
        member_amount:   amount,
        receipt_url,
        member_notes:    notes.trim() || null,
        shipping_address: address.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.orders(profile?.id ?? '') });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'member'] });
      onSuccess?.();
      setDone(true);
      setTimeout(onClose, 1500);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gold/60 mb-0.5">Pesan Merchandise</p>
            <h3 className="font-serif text-lg font-bold text-white leading-tight">{item.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all mt-0.5 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Item info */}
        <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
              <span className="text-gold text-xl font-serif">{item.name.charAt(0)}</span>
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-white">
              {formatRp(item.price)}
              <span className="text-gray-500 text-xs font-normal"> / item</span>
            </p>
            <p className="text-xs text-gray-500">{item.stock_remaining} tersisa</p>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">Jumlah</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="p-2 rounded-lg bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              <Minus size={14} />
            </button>
            <span className="text-2xl font-bold text-white w-8 text-center">{qty}</span>
            <button
              onClick={() => setQty(q => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              className="p-2 rounded-lg bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              <Plus size={14} />
            </button>
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-gold">{formatRp(total)}</p>
            </div>
          </div>
        </div>

        {/* Shipping address */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
            <span className="inline-flex items-center gap-1">
              <MapPin size={9} />
              Alamat Pengiriman <span className="text-red-400">*</span>
            </span>
          </label>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Nama penerima, alamat lengkap, kota, kode pos..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 resize-none placeholder-gray-600"
          />
        </div>

        {/* QRIS payment info */}
        {!qrisLoading && qris && (
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-500">Transfer Pembayaran</p>

            {qris.qris_image_url && (
              <div className="flex justify-center">
                <img
                  src={qris.qris_image_url}
                  alt="QRIS"
                  className="w-32 h-32 rounded-lg object-contain bg-white p-1"
                />
              </div>
            )}

            {qris.qris_bank_name && (
              <div className="text-center space-y-0.5">
                <p className="text-xs text-gray-400">{qris.qris_bank_name}</p>
                {qris.qris_account_no   && <p className="text-sm font-bold text-white">{qris.qris_account_no}</p>}
                {qris.qris_account_name && <p className="text-xs text-gray-400">a.n. {qris.qris_account_name}</p>}
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Nominal Transfer</label>
              <input
                type="text"
                value={
                  customAmount
                    ? 'Rp ' + (parseInt(customAmount.replace(/\D/g, ''), 10) || 0).toLocaleString('id-ID')
                    : formatRp(total)
                }
                onChange={e => setCustomAmount(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50"
              />
              <button
                type="button"
                onClick={() => setCustomAmount('')}
                className="mt-0.5 text-[10px] text-gold/50 hover:text-gold transition-colors"
              >
                Reset ke {formatRp(total)}
              </button>
            </div>
          </div>
        )}

        {/* Receipt upload */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
            Bukti Transfer (opsional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setReceiptFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-gold/10 file:text-gold hover:file:bg-gold/20 cursor-pointer"
          />
          {receiptFile && <p className="text-[10px] text-gray-500 mt-1">{receiptFile.name}</p>}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
            Catatan (opsional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ukuran, warna, dll."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 placeholder-gray-600"
          />
        </div>

        {mutation.isError && (
          <p className="text-red-400 text-xs">{(mutation.error as Error).message}</p>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || uploading || done || item.stock_remaining === 0}
          className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-3 rounded-full transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
        >
          {uploading
            ? <><Loader size={13} className="animate-spin" /> Mengupload…</>
            : mutation.isPending
              ? <><Loader size={13} className="animate-spin" /> Mengirim…</>
              : done
                ? <><Check size={13} /> Pesanan Dikirim!</>
                : 'Kirim Pesanan'}
        </button>
      </motion.div>
    </div>
  );
}

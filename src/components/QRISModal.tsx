import { useState, useRef } from 'react';
import { X, Upload, Loader, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { fetchQRISConfig, submitPayment, qk } from '../lib/queries';
import { uploadReceipt } from '../lib/storage';

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function parseRp(s: string): number {
  return parseInt(s.replace(/\D/g, ''), 10) || 0;
}

interface Props {
  type:       'reunion_fee' | 'donation';
  onClose:    () => void;
  onSuccess?: () => void;
}

export default function QRISModal({ type, onClose, onSuccess }: Props) {
  const { user, profile } = useAuth();

  const { data: qris, isLoading: qrisLoading } = useQuery({
    queryKey: qk.qrisConfig(),
    queryFn:  fetchQRISConfig,
  });

  const [amountRaw,   setAmountRaw]   = useState('');
  const [notes,       setNotes]       = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const amount      = parseRp(amountRaw);
  const suggestedAmt = type === 'reunion_fee' ? (qris?.reunion_fee_target ?? 0) : 0;
  const typeLabel   = type === 'reunion_fee' ? 'Iuran Reuni' : 'Donasi';

  async function handleSubmit() {
    if (!user || !profile) return;
    if (amount <= 0) { setError('Masukkan jumlah pembayaran.'); return; }
    setError(null);
    setUploading(true);
    try {
      let receiptUrl: string | null = null;
      if (receiptFile) {
        receiptUrl = await uploadReceipt(receiptFile, user.id);
      }
      await submitPayment({
        profileId:  profile.id,
        type,
        amount,
        receiptUrl,
        notes:      notes.trim() || null,
      });
      setSubmitted(true);
      setTimeout(() => { onSuccess?.(); onClose(); }, 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 glass rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="font-serif text-xl font-bold text-white">{typeLabel}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {submitted ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle size={48} className="text-green-400 mb-3" />
              <p className="text-white font-bold text-lg">Pembayaran Terkirim!</p>
              <p className="text-gray-400 text-sm mt-1">Admin akan melakukan rekonsiliasi segera.</p>
            </div>
          ) : qrisLoading ? (
            <div className="flex justify-center py-8">
              <Loader size={24} className="animate-spin text-gold/60" />
            </div>
          ) : (
            <>
              {/* QRIS image */}
              {qris?.qris_image_url ? (
                <div className="flex flex-col items-center">
                  <img src={qris.qris_image_url} alt="QRIS" className="w-48 h-48 object-contain rounded-lg border border-white/10" />
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 bg-white/5 rounded-xl border border-dashed border-white/20">
                  <p className="text-gray-500 text-sm">QRIS belum dikonfigurasi oleh admin.</p>
                </div>
              )}

              {/* Bank details */}
              {(qris?.qris_bank_name || qris?.qris_account_no) && (
                <div className="bg-white/5 rounded-xl p-4 space-y-1 text-sm">
                  {qris.qris_bank_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bank</span>
                      <span className="text-white font-medium">{qris.qris_bank_name}</span>
                    </div>
                  )}
                  {qris.qris_account_no && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">No. Rekening</span>
                      <span className="text-white font-mono font-medium">{qris.qris_account_no}</span>
                    </div>
                  )}
                  {qris.qris_account_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Atas Nama</span>
                      <span className="text-white font-medium">{qris.qris_account_name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Suggested amount */}
              {type === 'reunion_fee' && suggestedAmt > 0 && (
                <div className="flex items-center justify-between bg-gold/10 border border-gold/20 rounded-xl p-3">
                  <span className="text-gold/80 text-xs uppercase tracking-widest">Iuran per orang</span>
                  <span className="text-gold font-bold">{formatRp(suggestedAmt)}</span>
                </div>
              )}

              {/* Amount input */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1.5">
                  Jumlah yang Dibayar <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Rp 0"
                  value={amountRaw ? 'Rp ' + parseRp(amountRaw).toLocaleString('id-ID') : ''}
                  onChange={e => setAmountRaw(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
                />
                {type === 'reunion_fee' && suggestedAmt > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmountRaw(String(suggestedAmt))}
                    className="mt-1.5 text-[11px] text-gold/70 hover:text-gold transition-colors"
                  >
                    Isi otomatis {formatRp(suggestedAmt)}
                  </button>
                )}
              </div>

              {/* Receipt upload */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1.5">
                  Bukti Transfer (opsional)
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={e => setReceiptFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-3 bg-white/5 border border-white/10 hover:border-gold/40 rounded-xl px-4 py-2.5 text-sm text-gray-300 transition-all"
                >
                  <Upload size={16} className="text-gold/60" />
                  {receiptFile ? receiptFile.name : 'Pilih foto / PDF bukti'}
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1.5">
                  Catatan (opsional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Misal: transfer cicilan ke-1"
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none"
                />
              </div>

              {/* Error */}
              {error && <p className="text-red-400 text-xs">{error}</p>}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-3 rounded-full transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
              >
                {uploading
                  ? <><Loader size={14} className="animate-spin" /> Mengirim…</>
                  : 'Kirim Pembayaran'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

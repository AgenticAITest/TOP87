import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, X, Check, Loader, Package, Eye, EyeOff, Upload } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminMerchandise,
  createMerchandiseItem,
  updateMerchandiseItem,
  qk,
} from '../../lib/queries';
import type { AdminMerchandiseItem } from '../../lib/queries';
import { uploadFile, resolveMediaUrl } from '../../lib/storage';
import { useAuth } from '../../contexts/AuthContext';

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function ItemDrawer({
  item,
  onClose,
}: {
  item?: AdminMerchandiseItem | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name,        setName]        = useState(item?.name        ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [imageUrl,    setImageUrl]    = useState(item?.image_url   ?? '');
  const [price,       setPrice]       = useState(item ? String(item.price) : '');
  const [cost,        setCost]        = useState(item ? String(item.cost ?? 0) : '');
  const [stock,       setStock]       = useState(item ? String(item.stock_total) : '');
  const [saved,       setSaved]       = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileUpload(file: File) {
    if (!user?.id) return;
    setUploading(true);
    setUploadError(null);
    try {
      const storagePath = await uploadFile(file, user.id);
      const url = resolveMediaUrl(storagePath) ?? storagePath;
      setImageUrl(url);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const isEdit = !!item?.id;

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name:        name.trim(),
        description: description.trim() || null,
        image_url:   imageUrl.trim() || null,
        price:       parseInt(price, 10) || 0,
        cost:        parseInt(cost,  10) || 0,
        stock_total: parseInt(stock, 10) || 0,
      };
      if (!payload.name)      throw new Error('Nama wajib diisi');
      if (payload.price <= 0) throw new Error('Harga harus lebih dari 0');
      if (isEdit) {
        await updateMerchandiseItem(item!.id, payload);
      } else {
        await createMerchandiseItem(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.adminMerchandise() });
      queryClient.invalidateQueries({ queryKey: qk.merchandise() });
      setSaved(true);
      setTimeout(onClose, 800);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        className="relative z-10 glass rounded-2xl w-full max-w-sm p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-white">
            {isEdit ? 'Edit Item' : 'Tambah Item'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
              Nama Item *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
              Deskripsi
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
              Gambar Produk
            </label>

            {/* Preview */}
            {imageUrl && (
              <div className="relative mb-2 w-full aspect-square max-h-36 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-xs py-2 rounded-xl transition-all disabled:opacity-50 mb-2"
            >
              {uploading
                ? <><Loader size={13} className="animate-spin" /> Mengupload…</>
                : <><Upload size={13} /> {imageUrl ? 'Ganti Gambar' : 'Upload Gambar'}</>}
            </button>

            {/* URL input fallback */}
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-gray-600 uppercase tracking-widest">atau URL</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <input
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 placeholder-gray-600"
            />

            {uploadError && (
              <p className="text-red-400 text-xs mt-1">{uploadError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                Harga Jual (Rp) *
              </label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                Harga Modal (Rp)
              </label>
              <input
                type="number"
                value={cost}
                onChange={e => setCost(e.target.value)}
                placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 placeholder-gray-600"
              />
            </div>
          </div>

          {/* Margin preview */}
          {(parseInt(price, 10) > 0 || parseInt(cost, 10) > 0) && (
            <p className="text-[10px] text-gray-500">
              Margin per item:{' '}
              <span className={parseInt(price, 10) - parseInt(cost, 10) >= 0 ? 'text-green-400' : 'text-red-400'}>
                Rp {(parseInt(price, 10) - parseInt(cost, 10)).toLocaleString('id-ID')}
              </span>
            </p>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
              Stok Total *
            </label>
            <input
              type="number"
              value={stock}
              onChange={e => setStock(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50"
            />
          </div>
        </div>

        {mutation.isError && (
          <p className="text-red-400 text-xs">{(mutation.error as Error).message}</p>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold py-2.5 rounded-full transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
        >
          {mutation.isPending
            ? <><Loader size={13} className="animate-spin" /> Menyimpan…</>
            : saved
              ? <><Check size={13} /> Tersimpan</>
              : isEdit ? 'Simpan Perubahan' : 'Tambah Item'}
        </button>
      </motion.div>
    </div>
  );
}

export default function AdminMerchandise() {
  const queryClient = useQueryClient();
  const [showDrawer, setShowDrawer] = useState(false);
  const [editItem,   setEditItem]   = useState<AdminMerchandiseItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: qk.adminMerchandise(),
    queryFn:  fetchAdminMerchandise,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateMerchandiseItem(id, { is_active: active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.adminMerchandise() });
      queryClient.invalidateQueries({ queryKey: qk.merchandise() });
    },
  });

  const totals = {
    active:     items.filter(i => i.is_active).length,
    inactive:   items.filter(i => !i.is_active).length,
    totalStock: items.filter(i => i.is_active).reduce((s, i) => s + i.stock_remaining, 0),
  };

  return (
    <div className="p-8 min-h-screen">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Admin</p>
          <h1 className="font-serif text-4xl font-bold text-white">Merchandise</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola katalog dan stok merchandise.</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowDrawer(true); }}
          className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal font-bold px-4 py-2.5 rounded-full text-xs uppercase tracking-widest transition-all"
        >
          <Plus size={14} /> Tambah Item
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-green-400">{totals.active}</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Item Aktif</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-yellow-400">{totals.totalStock}</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Stok Tersisa</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-gray-500">{totals.inactive}</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Nonaktif</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-24 text-gray-600 text-sm tracking-widest uppercase animate-pulse">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 text-gray-600 text-sm">
          Belum ada item merchandise. Klik "Tambah Item" untuk mulai.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className={`glass flex items-center gap-4 p-4 rounded-xl transition-colors ${!item.is_active ? 'opacity-50' : ''}`}
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <Package size={20} className="text-gold" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{item.name}</p>
                  {!item.is_active && (
                    <span className="text-[10px] text-gray-500 border border-white/10 rounded-full px-2 py-0.5 shrink-0">
                      Nonaktif
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500 flex-wrap">
                  <span>{formatRp(item.price)}</span>
                  {item.cost > 0 && (
                    <span className="text-gray-600">modal {formatRp(item.cost)} · margin {formatRp(item.price - item.cost)}</span>
                  )}
                  <span>Stok: {item.stock_total} ({item.stock_remaining} tersisa)</span>
                  {item.sold > 0 && <span>{item.sold} terjual</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setEditItem(item); setShowDrawer(true); }}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  title="Edit"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => toggleMutation.mutate({ id: item.id, active: !item.is_active })}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  {item.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showDrawer && (
        <ItemDrawer
          item={editItem}
          onClose={() => { setShowDrawer(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Receipt, Upload, X, ExternalLink, Loader, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchExpenseCategories, fetchAdminExpenses,
  addExpenseCategory, deleteExpenseCategory, saveExpense, updateExpense, deleteExpense, uploadReceipt,
  qk, type ExpenseCategory, type Expense,
} from '../../lib/queries';

function fmt(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function isImage(url: string) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
}

// ─── Expense Modal ─────────────────────────────────────────────────────────────

function ExpenseModal({
  expense,
  categories,
  recordedBy,
  onClose,
}: {
  expense:    Expense | null;
  categories: ExpenseCategory[];
  recordedBy: string;
  onClose:    () => void;
}) {
  const queryClient = useQueryClient();
  const fileRef     = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    category_id:  expense?.category_id  ?? (categories[0]?.id ?? ''),
    description:  expense?.description  ?? '',
    amount:       expense ? String(expense.amount) : '',
    expense_date: expense?.expense_date ?? new Date().toISOString().slice(0, 10),
    notes:        expense?.notes        ?? '',
    is_published: expense?.is_published ?? true,
  });
  const [receiptUrl,     setReceiptUrl]     = useState<string | null>(expense?.receipt_url ?? null);
  const [uploading,      setUploading]      = useState(false);
  const [uploadError,    setUploadError]    = useState('');
  const [lightboxOpen,   setLightboxOpen]   = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        category_id:  form.category_id,
        description:  form.description.trim(),
        amount:       parseInt(form.amount.replace(/\D/g, ''), 10),
        expense_date: form.expense_date,
        receipt_url:  receiptUrl,
        notes:        form.notes.trim() || null,
        is_published: form.is_published,
        recorded_by:  recordedBy,
      };
      if (expense) {
        await updateExpense(expense.id, payload);
      } else {
        await saveExpense(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.adminExpenses() });
      queryClient.invalidateQueries({ queryKey: qk.expenses() });
      onClose();
    },
  });

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setUploadError('File terlalu besar (maks 10 MB).'); return; }
    setUploading(true);
    setUploadError('');
    try {
      const url = await uploadReceipt(file);
      setReceiptUrl(url);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.category_id)  return;
    if (!form.description.trim()) return;
    if (!parseInt(form.amount.replace(/\D/g, ''), 10)) return;
    saveMutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60"
      onClick={onClose}>
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative z-10 glass rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-white">
            {expense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1.5">Kategori *</label>
            <select required value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1.5">Keterangan *</label>
            <input required value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Booking Hotel Ciwidey Rancaupas"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-gold/50 transition-colors" />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1.5">Jumlah (Rp) *</label>
              <input required value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/\D/g, '') }))}
                placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-gold/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1.5">Tanggal *</label>
              <input required type="date" value={form.expense_date}
                onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors" />
            </div>
          </div>

          {/* Receipt upload */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1.5">Bukti / Kwitansi</label>
            {receiptUrl ? (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                {isImage(receiptUrl) ? (
                  <img src={receiptUrl} alt="Receipt"
                    className="w-12 h-12 object-cover rounded-lg shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setLightboxOpen(true)} />
                ) : (
                  <Receipt size={20} className="text-gold shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 truncate">{receiptUrl.split('/').pop()}</p>
                </div>
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer"
                  className="text-gold hover:text-gold/70 transition-colors shrink-0">
                  <ExternalLink size={14} />
                </a>
                <button type="button" onClick={() => setReceiptUrl(null)}
                  className="text-gray-500 hover:text-red-400 transition-colors shrink-0">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 bg-white/5 border border-dashed border-white/20 hover:border-gold/40 hover:bg-white/8 rounded-xl px-4 py-4 text-sm text-gray-500 hover:text-gray-300 transition-all disabled:opacity-50">
                {uploading
                  ? <><Loader size={16} className="animate-spin" /> Mengupload…</>
                  : <><Upload size={16} /> Upload bukti (foto/PDF, maks 10 MB)</>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
              onChange={handleFileChange} />
            {uploadError && <p className="text-red-400 text-xs mt-1">{uploadError}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1.5">Catatan (opsional)</label>
            <textarea value={form.notes} rows={2}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Keterangan tambahan…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-gold/50 transition-colors resize-none" />
          </div>

          {/* Published toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}
              className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.is_published ? 'bg-gold' : 'bg-white/20'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_published ? 'left-5' : 'left-0.5'}`} />
            </div>
            <span className="text-sm text-gray-300">
              {form.is_published ? 'Dipublikasi (terlihat anggota)' : 'Draft (hanya admin)'}
            </span>
          </label>

          {saveMutation.isError && (
            <p className="text-red-400 text-xs">{(saveMutation.error as Error).message}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm font-bold uppercase tracking-widest transition-all">
              Batal
            </button>
            <button type="submit" disabled={saveMutation.isPending || uploading}
              className="flex-1 py-2.5 rounded-xl bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {saveMutation.isPending ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
              {saveMutation.isPending ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Lightbox for image receipts */}
      {lightboxOpen && receiptUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80"
          onClick={() => setLightboxOpen(false)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <img src={receiptUrl} alt="Receipt" className="w-full rounded-xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminExpenses() {
  const { user }  = useAuth();
  const queryClient = useQueryClient();

  const [categoryFilter,   setCategoryFilter]   = useState<string>('all');
  const [showModal,        setShowModal]         = useState(false);
  const [editExpense,      setEditExpense]       = useState<Expense | null>(null);
  const [showAddCategory,  setShowAddCategory]   = useState(false);
  const [newCategoryName,  setNewCategoryName]   = useState('');
  const [lightboxUrl,      setLightboxUrl]       = useState<string | null>(null);

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: qk.expenseCategories(),
    queryFn:  fetchExpenseCategories,
    staleTime: 5 * 60_000,
  });

  const { data: expenses = [], isLoading: expLoading } = useQuery({
    queryKey: qk.adminExpenses(),
    queryFn:  fetchAdminExpenses,
    staleTime: 0,
  });

  const addCatMutation = useMutation({
    mutationFn: () => addExpenseCategory(newCategoryName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.expenseCategories() });
      setNewCategoryName('');
      setShowAddCategory(false);
    },
  });

  const [deleteCatError, setDeleteCatError] = useState('');
  const deleteCatMutation = useMutation({
    mutationFn: deleteExpenseCategory,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: qk.expenseCategories() });
      if (categoryFilter === id) setCategoryFilter('all');
      setDeleteCatError('');
    },
    onError: () => {
      setDeleteCatError('Kategori ini masih memiliki pengeluaran. Hapus atau pindahkan dulu semua itemnya.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.adminExpenses() });
      queryClient.invalidateQueries({ queryKey: qk.expenses() });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, is_published }: { id: string; is_published: boolean }) =>
      updateExpense(id, { is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.adminExpenses() });
      queryClient.invalidateQueries({ queryKey: qk.expenses() });
    },
  });

  const filtered = categoryFilter === 'all'
    ? expenses
    : expenses.filter(e => e.category_id === categoryFilter);

  const totalSpent          = expenses.filter(e => e.is_published).reduce((s, e) => s + e.amount, 0);
  const totalSpentIncDraft  = expenses.reduce((s, e) => s + e.amount, 0);
  const draftCount          = expenses.filter(e => !e.is_published).length;

  function countForCategory(catId: string) {
    return expenses.filter(e => e.category_id === catId).length;
  }

  function handleEdit(e: Expense) {
    setEditExpense(e);
    setShowModal(true);
  }

  function handleAdd() {
    setEditExpense(null);
    setShowModal(true);
  }

  function handleDelete(e: Expense) {
    if (!confirm(`Hapus pengeluaran "${e.description}"?`)) return;
    deleteMutation.mutate(e.id);
  }

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-1">Admin</p>
          <h1 className="font-serif text-4xl font-bold text-white">Pengeluaran</h1>
          <p className="text-gray-500 text-sm mt-1">Catat dan publikasikan realisasi pengeluaran reuni.</p>
        </div>
        <button onClick={handleAdd}
          className="flex items-center gap-2 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shrink-0">
          <Plus size={14} /> Tambah
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-green-400">{fmt(totalSpent)}</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Total Dipublikasi</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-serif text-gold">{fmt(totalSpentIncDraft)}</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Total Incl. Draft</p>
        </div>
        <div className="glass rounded-xl p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold font-serif text-yellow-400">{draftCount}</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Draft Belum Publish</p>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <button onClick={() => setCategoryFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
            categoryFilter === 'all'
              ? 'bg-gold/15 text-gold border border-gold/30'
              : 'text-gray-500 border border-white/10 hover:text-white hover:border-white/20'
          }`}>
          Semua ({expenses.length})
        </button>
        {categories.map(c => (
          <div key={c.id} className="group relative flex items-center">
            <button onClick={() => setCategoryFilter(c.id)}
              className={`pl-4 pr-7 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                categoryFilter === c.id
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : 'text-gray-500 border border-white/10 hover:text-white hover:border-white/20'
              }`}>
              {c.name} ({countForCategory(c.id)})
            </button>
            <button
              onClick={() => {
                if (!confirm(`Hapus kategori "${c.name}"?`)) return;
                deleteCatMutation.mutate(c.id);
              }}
              title="Hapus kategori"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
              <X size={9} />
            </button>
          </div>
        ))}

        {/* Add category */}
        {showAddCategory ? (
          <div className="flex items-center gap-2">
            <input autoFocus value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newCategoryName.trim()) addCatMutation.mutate(); } }}
              placeholder="Nama kategori…"
              className="bg-white/5 border border-white/20 rounded-full px-4 py-1.5 text-white text-xs focus:outline-none focus:border-gold/50" />
            <button onClick={() => { if (newCategoryName.trim()) addCatMutation.mutate(); }}
              disabled={!newCategoryName.trim() || addCatMutation.isPending}
              className="text-xs text-gold hover:text-gold/70 disabled:opacity-50 transition-colors font-bold">
              {addCatMutation.isPending ? '…' : 'Simpan'}
            </button>
            <button onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }}
              className="text-xs text-gray-500 hover:text-white transition-colors">
              Batal
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gold transition-colors border border-dashed border-white/10 hover:border-gold/30 px-3 py-1.5 rounded-full">
            <Plus size={11} /> Kategori
          </button>
        )}
      </div>

      {deleteCatError && (
        <p className="text-red-400 text-xs mb-4 flex items-center gap-2">
          <X size={12} /> {deleteCatError}
        </p>
      )}

      {/* Expense list */}
      {catLoading || expLoading ? (
        <div className="text-center py-24 text-gray-500 text-sm uppercase tracking-widest animate-pulse">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-600 text-sm">
          Belum ada pengeluaran{categoryFilter !== 'all' ? ' di kategori ini' : ''}. Klik "Tambah" untuk mulai.
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-gray-500">Tanggal</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-gray-500">Keterangan</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-gray-500 hidden sm:table-cell">Kategori</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-widest text-gray-500">Jumlah</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-widest text-gray-500">Bukti</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-widest text-gray-500">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <motion.tr key={e.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(e.expense_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-white font-medium">{e.description}</p>
                    {e.notes && <p className="text-gray-500 text-xs mt-0.5">{e.notes}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs hidden sm:table-cell">
                    {e.category?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-white whitespace-nowrap">
                    {fmt(e.amount)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {e.receipt_url ? (
                      isImage(e.receipt_url) ? (
                        <button onClick={() => setLightboxUrl(e.receipt_url)}
                          className="inline-block">
                          <img src={e.receipt_url} alt="receipt"
                            className="w-8 h-8 object-cover rounded border border-white/10 hover:border-gold/40 transition-colors cursor-pointer" />
                        </button>
                      ) : (
                        <a href={e.receipt_url} target="_blank" rel="noopener noreferrer"
                          className="text-gold hover:text-gold/70 transition-colors flex items-center justify-center">
                          <Receipt size={16} />
                        </a>
                      )
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => togglePublishMutation.mutate({ id: e.id, is_published: !e.is_published })}
                      title={e.is_published ? 'Klik untuk jadikan draft' : 'Klik untuk publikasi'}
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all ${
                        e.is_published
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20'
                      }`}>
                      {e.is_published ? <><Eye size={10} /> Publik</> : <><EyeOff size={10} /> Draft</>}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gold hover:bg-white/10 transition-all">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        disabled={deleteMutation.isPending}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/20">
                <td colSpan={3} className="px-5 pt-3 pb-4 text-xs uppercase tracking-widest text-gray-500 font-bold">
                  Subtotal {categoryFilter !== 'all' ? `— ${categories.find(c => c.id === categoryFilter)?.name}` : ''}
                </td>
                <td className="px-5 pt-3 pb-4 text-right font-bold text-green-400">
                  {fmt(filtered.filter(e => e.is_published).reduce((s, e) => s + e.amount, 0))}
                </td>
                <td colSpan={3} className="px-5 pt-3 pb-4 text-xs text-gray-600">
                  {filtered.filter(e => !e.is_published).length > 0 && (
                    <span className="text-yellow-500">
                      + {fmt(filtered.filter(e => !e.is_published).reduce((s, e) => s + e.amount, 0))} draft
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <ExpenseModal
          expense={editExpense}
          categories={categories}
          recordedBy={user!.id}
          onClose={() => { setShowModal(false); setEditExpense(null); }}
        />
      )}

      {/* Image lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <img src={lightboxUrl} alt="Receipt" className="w-full rounded-xl shadow-2xl" />
            <a href={lightboxUrl} target="_blank" rel="noopener noreferrer"
              className="absolute -top-10 right-10 text-white/70 hover:text-gold transition-colors">
              <ExternalLink size={20} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

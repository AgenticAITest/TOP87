# Panduan Super Admin TOP87

Sebagai **Super Admin**, Anda memiliki akses penuh ke seluruh sistem — semua charter, semua anggota, semua transaksi, dan pengaturan situs.

> Semua kemampuan Charter Admin juga berlaku untuk Super Admin. Panduan ini hanya mencakup fitur tambahan eksklusif Super Admin.

---

## Pengaturan Situs (Site Settings)

Menu **Site Settings** mengontrol konfigurasi global portal.

### Backend Penyimpanan

Pilih tempat penyimpanan file media:

| Opsi | Keterangan |
|---|---|
| **Supabase** | Penyimpanan default Supabase Storage |
| **VPS** | Server `media.top87.id` — direkomendasikan untuk produksi |

### Konfigurasi QRIS

Isi data rekening pembayaran yang ditampilkan ke anggota:

- **URL Gambar QRIS** — gambar kode QR untuk transfer
- **Nama Bank**
- **Nomor Rekening**
- **Nama Pemilik Rekening**

### Target Dana

- **Target Iuran Reuni** — total iuran yang ingin dikumpulkan (dalam rupiah)
- **Target Donasi** — total donasi yang ingin dikumpulkan

---

## Feature Flags

Di menu **Site Settings**, aktifkan atau nonaktifkan fitur secara global:

| Flag | Efek |
|---|---|
| **Donations** | Menampilkan/menyembunyikan fitur iuran & donasi |
| **Merchandise** | Menampilkan/menyembunyikan fitur merchandise |

Gunakan ini untuk meluncurkan fitur secara bertahap.

---

## Manajemen Konten (Content Admin)

Menu **Content** untuk mengelola konten informasional portal:

- **Halaman Anggaran** — update data anggaran dan pengeluaran
- **Halaman FAQ** — tambah, ubah, atau hapus pertanyaan umum
- **Halaman Pengumuman** — buat pengumuman untuk semua anggota

---

## Semua Anggota (All Members)

Menu **All Members** menampilkan **seluruh anggota** dari semua charter.

- Cari berdasarkan nama, kota, atau charter
- Filter berdasarkan status (pending, approved, rejected)
- Setujui atau tolak pendaftaran dari charter mana pun
- Hapus anggota secara permanen (tidak dapat dibatalkan)

---

## Manajemen Peran Admin (Admin Roles)

Menu **Admin Roles** untuk mengatur siapa saja yang menjadi admin.

### Menambah Charter Admin

1. Cari anggota berdasarkan nama.
2. Pilih **Charter** yang akan dikelola.
3. Klik **Tambah sebagai Admin**.

### Mencabut Peran Admin

Klik **Hapus** di samping nama admin untuk mencabut akses admin mereka.

### Super Admin

Super Admin hanya bisa ditambah/dihapus langsung di database Supabase melalui kolom `is_super_admin` di tabel `profiles`. Tidak bisa dilakukan melalui UI untuk alasan keamanan.

---

## Manajemen Merchandise

Menu **Merchandise** untuk mengelola katalog produk.

### Menambah Item Baru

1. Klik **Tambah Item**.
2. Isi:
   - **Nama Item** — nama produk
   - **Deskripsi** — detail singkat
   - **Harga Jual** — harga yang dibayar anggota (rupiah)
   - **Harga Modal** — harga pokok / biaya produksi (digunakan untuk menghitung margin)
   - **Stok** — jumlah yang tersedia
   - **Gambar** — foto produk
3. Aktifkan toggle **Aktif** agar tampil ke anggota.
4. Klik **Simpan**.

### Mengedit / Menonaktifkan Item

Klik item untuk mengedit. Matikan toggle **Aktif** untuk menyembunyikan item dari anggota tanpa menghapusnya.

---

## Laporan Keuangan

Menu **Lap. Keuangan** adalah laporan terpadu semua transaksi finansial.

### Filter yang Tersedia

| Filter | Opsi |
|---|---|
| **Tipe** | Semua / Iuran / Donasi / Merchandise |
| **Status** | Semua / Diajukan / Diproses / Dikonfirmasi / Bank Rekon / Dikirim / Ditolak |
| **Charter** | Semua / nama charter tertentu |
| **Tanggal** | Dari — Sampai (berdasarkan tanggal pengajuan) |
| **Cari** | Nama anggota, nama item, atau nama charter |

### Kolom Laporan

| Kolom | Keterangan |
|---|---|
| **Tanggal** | Tanggal transaksi diajukan |
| **Anggota** | Nama dan foto profil |
| **Charter** | Charter utama anggota |
| **Tipe** | Iuran / Donasi / Merchandise |
| **Item** | Nama produk (khusus merchandise) |
| **Status** | Status terkini |
| **Jumlah** | Nominal yang dibayar (admin-adjusted jika ada koreksi) |
| **Harga Jual** | Harga katalog × jumlah (khusus merchandise) |
| **Margin** | Keuntungan bersih = (harga jual − modal) × jumlah (khusus merchandise) |

### Kartu Ringkasan

Di atas tabel, tersedia 4 kartu ringkasan yang **otomatis diperbarui** sesuai filter aktif:

- **Total Iuran** — total iuran terkonfirmasi/direkon
- **Total Donasi** — total donasi terkonfirmasi/direkon
- **Merch Harga Jual** — total pendapatan merchandise (harga katalog)
- **Merch Margin** — total keuntungan bersih merchandise

### Bank Rekon (Bank Reconciliation)

Setelah mengkonfirmasi pembayaran iuran atau donasi, ubah status ke **Bank Rekon** setelah Anda mencocokkannya dengan mutasi rekening bank. Ini adalah status final untuk pembayaran yang sudah benar-benar selesai.

---

## Alur Kerja Keuangan yang Disarankan

```
Anggota kirim bukti
        ↓
  Admin: Diproses
        ↓
  Cek bukti transfer
        ↓
  Valid? → Dikonfirmasi
        ↓
  Cocokkan mutasi bank
        ↓
   Bank Rekon ✓
```

---

## Keamanan & Praktik Terbaik

- **Jangan bagikan akses Super Admin** — setiap admin sebaiknya punya akun sendiri.
- **Gunakan "Bank Rekon"** setelah benar-benar mencocokkan rekening — jangan hanya konfirmasi tanpa cek.
- **Audit log** tersedia di tabel `audit_log` di Supabase untuk keperluan pelacakan.
- **Backup rutin** — ekspor data dari Supabase secara berkala sebagai cadangan.

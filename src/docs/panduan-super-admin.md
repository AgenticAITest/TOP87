# Panduan Super Admin TOP87

Sebagai **Super Admin**, Anda memiliki akses penuh ke seluruh sistem — semua charter, semua anggota, semua transaksi, dan pengaturan situs.

> Semua kemampuan Charter Admin juga berlaku untuk Super Admin. Panduan ini mencakup fitur tambahan eksklusif Super Admin.

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

- **Gambar QRIS** — unggah foto kode QR atau tempel URL gambar
- **Nama Bank**
- **Nomor Rekening**
- **Nama Pemilik Rekening**

### Target Dana

- **Target Iuran Per Orang** — iuran yang harus dibayar tiap anggota (dalam rupiah)
- **Target Donasi** — total donasi yang ingin dikumpulkan

### Flyer Anggaran

Upload file PDF flyer anggaran atau tempel URL. Jika diisi, link "Lihat Flyer Anggaran Lengkap" akan muncul di kartu Anggaran pada dashboard anggota.

### Admin Backdrop

Gambar latar belakang untuk tampilan panel admin. Upload foto atau tempel URL.

### Feature Flags

Aktifkan atau nonaktifkan fitur secara global:

| Flag | Efek |
|---|---|
| **Donations** | Menampilkan/menyembunyikan fitur iuran & donasi |
| **Merchandise** | Menampilkan/menyembunyikan fitur merchandise |

---

## Site CMS

Menu **Site CMS** untuk mengelola konten halaman-halaman utama portal:

| Halaman | Konten yang dapat diubah |
|---|---|
| **Landing** | Judul hero, tanggal reuni, venue, tombol CTA, gambar latar |
| **Anggaran** | Daftar pos anggaran (nama, jumlah), mode per-orang atau per-kategori, kuota, catatan |
| **FAQ** | Daftar pertanyaan dan jawaban (tambah/hapus/ubah baris) |
| **Pengumuman** | Daftar pengumuman (judul, isi, tanggal, highlight) |

Perubahan di Site CMS langsung terlihat di halaman anggota tanpa perlu deploy ulang.

---

## Content Admin

Menu **Content** untuk mengelola konten informasional portal:

- **Halaman About** — teks cerita dan gambar hero halaman "Our Story"
- **Yearbook** — URL atau upload PDF/video yearbook 1987 dan 2026

---

## Antrian Media (Media Queue)

Menu **Media Queue** menampilkan semua foto yang diunggah anggota dan menunggu persetujuan.

1. Buka menu **Media Queue**.
2. Tinjau foto yang masuk — gunakan filter status: Pending, Approved, Rejected.
3. Klik foto untuk melihat detail.
4. Klik **Approve** untuk menampilkan di galeri, atau **Reject** untuk menolak.

> Media Queue hanya dapat diakses oleh Super Admin.

---

## Kelola Pembayaran

Menu **Pembayaran** menampilkan semua transaksi iuran dan donasi dari seluruh charter.

### Memverifikasi Pembayaran

1. Buka menu **Pembayaran**.
2. Filter berdasarkan status **Diajukan** untuk melihat yang perlu ditinjau.
3. Klik transaksi untuk membuka detail.
4. Cek bukti transfer yang diunggah anggota.
5. Jika valid: ubah status menjadi **Dikonfirmasi**, koreksi jumlah jika perlu, tambahkan catatan admin.
6. Klik **Simpan**.

### Status Pembayaran

| Status | Artinya | Tindakan Admin |
|---|---|---|
| Diajukan | Baru masuk | Tinjau bukti transfer |
| Diproses | Sedang diverifikasi | — |
| Dikonfirmasi | Terverifikasi | Sudah selesai |
| Bank Rekon | Cocok dengan bank | Status final |
| Ditolak | Tidak valid | Beri keterangan di catatan |

---

## Kelola Pesanan Merchandise

Menu **Pesanan** menampilkan semua order merchandise dari seluruh charter.

### Memproses Pesanan

1. Buka menu **Pesanan**.
2. Filter status **Diajukan** untuk pesanan baru.
3. Verifikasi pembayaran yang diunggah anggota.
4. Ubah status:
   - **Dikonfirmasi** — pembayaran valid, pesanan diproses
   - **Dikirimkan** — barang sudah dikirim
   - **Ditolak** — pembayaran tidak valid
5. Tambahkan catatan admin jika perlu, lalu klik **Simpan**.

---

## Manajemen Merchandise

Menu **Merchandise** untuk mengelola katalog produk.

### Menambah Item Baru

1. Klik **Tambah Item**.
2. Isi nama, deskripsi, harga jual, harga modal, stok, dan gambar produk.
3. Aktifkan toggle **Aktif** agar tampil ke anggota.
4. Klik **Simpan**.

### Mengedit / Menonaktifkan Item

Klik item untuk mengedit. Matikan toggle **Aktif** untuk menyembunyikan item tanpa menghapusnya.

---

## Semua Anggota (All Members)

Menu **All Members** menampilkan **seluruh anggota** dari semua charter.

- Cari berdasarkan nama, kota, profesi, atau charter
- Filter berdasarkan status:

| Tab | Anggota yang ditampilkan |
|---|---|
| All | Semua anggota |
| Pending | Menunggu persetujuan |
| Approved | Aktif |
| Suspended | Ditangguhkan |
| Rejected | Ditolak |
| Belum RSVP | Approved tapi belum isi kehadiran reuni |

- Setujui atau tolak pendaftaran dari charter mana pun
- Hapus anggota secara permanen (tidak dapat dibatalkan)

---

## Manajemen Charter

Menu **Charters** untuk mengelola data charter:

- Tambah charter baru (nama, kota, negara, slug)
- Edit informasi charter yang ada
- Nonaktifkan charter jika diperlukan

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

## Bank Rekonsiliasi (Bank Rekon)

Menu **Bank Rekon** untuk mencocokkan transaksi yang sudah dikonfirmasi dengan mutasi rekening bank.

Setelah mengkonfirmasi pembayaran, ubah status ke **Bank Rekon** setelah Anda mencocokkannya dengan mutasi rekening bank. Ini adalah status final untuk pembayaran yang sudah benar-benar selesai.

---

## Laporan Keuangan

Menu **Lap. Keuangan** adalah laporan terpadu semua transaksi finansial dari seluruh charter.

### Filter yang Tersedia

| Filter | Opsi |
|---|---|
| **Tipe** | Semua / Iuran / Donasi / Merchandise |
| **Status** | Semua / Diajukan / Diproses / Dikonfirmasi / Bank Rekon / Dikirim / Ditolak |
| **Charter** | Semua / nama charter tertentu |
| **Tanggal** | Dari — Sampai |
| **Cari** | Nama anggota, nama item, atau nama charter |

### Kartu Ringkasan

Di atas tabel tersedia 4 kartu yang otomatis diperbarui sesuai filter aktif:

- **Total Iuran** — total iuran terkonfirmasi/direkon
- **Total Donasi** — total donasi terkonfirmasi/direkon
- **Merch Harga Jual** — total pendapatan merchandise
- **Merch Margin** — total keuntungan bersih merchandise

---

## Keringanan Biaya

Menu **Keringanan** menampilkan pengajuan keringanan biaya dari anggota yang kesulitan membayar iuran penuh.

- Tinjau detail pengajuan (alasan, nominal yang bisa dibayar)
- Setujui atau tolak pengajuan
- Pengajuan yang disetujui memungkinkan anggota membayar dengan nominal yang disesuaikan

> Pengajuan keringanan hanya terlihat oleh Super Admin, bukan Charter Admin.

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

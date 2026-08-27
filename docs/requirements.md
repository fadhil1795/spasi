# SPASI — Requirements Document
## Sistem Pencatatan Aset, Sewa & Pinjam Instansi
**Versi**: 1.0 | **Tanggal**: Juli 2026 | **Status**: Draft Final

---

## 1. Latar Belakang

Organisasi / instansi sering mengalami kesulitan dalam mengelola aset fisik secara manual:
- Tidak tahu aset mana yang sedang dipinjam atau siapa peminjamnya
- Tidak ada pencatatan resmi untuk penyewaan aset ke pihak eksternal
- Susah melacak kondisi aset setelah dikembalikan
- Tidak ada riwayat histori penggunaan aset
- Proses approval masih via chat/verbal tanpa jejak digital

**SPASI** hadir sebagai solusi digital terpadu berbasis web yang dapat diinstall (PWA).

---

## 2. Ruang Lingkup Sistem

```
+------------------------------------------------------+
|                   SISTEM SPASI                       |
|                                                      |
|  [Publik]           [Admin/Staff]    [Peminjam]      |
|  Katalog aset       CRUD aset        Buat request    |
|  Info ketersediaan  Approval         Lihat status    |
|  Panduan sistem     Laporan          Riwayat saya    |
|                     Penyewaan        Scan QR         |
+------------------------------------------------------+
```

Sistem ini **tidak** mencakup:
- Sistem keuangan/akuntansi terintegrasi (ERP)
- Sistem SDM / penggajian
- E-procurement / pengadaan barang baru
- Sistem pelacakan GPS kendaraan

---

## 3. Stakeholder & Pengguna

| Peran | Deskripsi | Akses |
|---|---|---|
| **Super Admin** | Pengelola sistem utama | Semua fitur + konfigurasi |
| **Admin Aset** | Pengelola inventaris harian | CRUD aset, laporan, approval final |
| **Kepala Unit** | Approval level pertama | Approve/reject pengajuan unit-nya |
| **Staff** | Petugas lapangan | Proses check-in/out, update kondisi aset |
| **Peminjam (Internal)** | Karyawan/anggota organisasi | Ajukan pinjam, lihat status, scan QR |
| **Pengunjung Publik** | Tanpa login | Browse katalog aset, lihat ketersediaan |

---

## 4. Kebutuhan Fungsional

### 4.1 Modul Autentikasi & Manajemen User

| Kode | Kebutuhan | Prioritas |
|---|---|---|
| AUTH-01 | Sistem harus mendukung login dengan email & password | Tinggi |
| AUTH-02 | Sistem harus mendukung 5 level role: Super Admin, Admin, Kepala Unit, Staff, Peminjam | Tinggi |
| AUTH-03 | Setiap role hanya dapat mengakses fitur sesuai hak aksesnya | Tinggi |
| AUTH-04 | Super Admin dapat membuat, mengedit, menonaktifkan, dan menghapus akun pengguna | Tinggi |
| AUTH-05 | Pengguna dapat mengubah password sendiri setelah login | Sedang |
| AUTH-06 | Sistem mencatat log setiap aktivitas login (waktu, IP, status) | Sedang |
| AUTH-07 | Akun peminjam yang memiliki denda belum lunas dapat di-suspend oleh admin | Sedang |
| AUTH-08 | Sistem mendukung reset password via email | Rendah |

---

### 4.2 Modul Pencatatan Aset

| Kode | Kebutuhan | Prioritas |
|---|---|---|
| ASET-01 | Admin dapat menambahkan aset baru dengan form lengkap | Tinggi |
| ASET-02 | Setiap aset memiliki kode unik otomatis (format: `AST-YYYY-NNNN`) | Tinggi |
| ASET-03 | Setiap aset memiliki QR Code unik yang dapat dicetak sebagai stiker | Tinggi |
| ASET-04 | Admin dapat mengupload hingga 5 foto per aset | Tinggi |
| ASET-05 | Aset diorganisir dalam kategori dan sub-kategori | Tinggi |
| ASET-06 | Setiap aset memiliki lokasi: Gedung → Lantai → Ruangan | Sedang |
| ASET-07 | Setiap aset terkait dengan departemen/unit pemilik | Sedang |
| ASET-08 | Status aset otomatis berubah sesuai transaksi aktif | Tinggi |
| ASET-09 | Admin dapat mencatat nilai pengadaan, tanggal beli, vendor | Sedang |
| ASET-10 | Sistem menghitung nilai buku / depresiasi aset otomatis berdasarkan kategori | Sedang |
| ASET-11 | Admin dapat menandai aset sebagai "Dapat Disewa" dan set tarif per hari | Tinggi |
| ASET-12 | Admin dapat menandai aset sebagai "Dapat Dipinjam" | Tinggi |
| ASET-13 | Admin dapat import data aset dari file CSV/Excel | Rendah |
| ASET-14 | Admin dapat mencetak label QR untuk beberapa aset sekaligus (bulk print) | Sedang |
| ASET-15 | Pengunjung publik dapat melihat katalog aset tanpa login | Tinggi |
| ASET-16 | Pengunjung publik dapat memfilter aset berdasarkan kategori, status, lokasi | Tinggi |
| ASET-17 | Sistem mencatat riwayat lengkap per aset (pinjam, sewa, maintenance, transfer) | Tinggi |

**Status Aset yang Valid:**
```
TERSEDIA → DIPINJAM     (saat loan aktif check-in)
TERSEDIA → DISEWA       (saat rental aktif)
TERSEDIA → MAINTENANCE  (saat masuk jadwal maintenance)
DIPINJAM → TERSEDIA     (saat check-out / kembali)
DISEWA   → TERSEDIA     (saat sewa selesai)
APA SAJA → RUSAK        (manual oleh admin setelah pemeriksaan)
APA SAJA → DIMUSNAHKAN  (disposal oleh admin)
```

---

### 4.3 Modul Peminjaman Aset (Internal)

#### 4.3.1 Pengajuan Peminjaman

| Kode | Kebutuhan | Prioritas |
|---|---|---|
| PINJAM-01 | Peminjam dapat mengajukan pinjam melalui wizard 4 langkah | Tinggi |
| PINJAM-02 | Step 1: Pilih tanggal & waktu mulai dan selesai pinjam | Tinggi |
| PINJAM-03 | Step 2: Pilih aset (sistem menampilkan HANYA aset yang tersedia di rentang waktu tersebut) | Tinggi |
| PINJAM-04 | Step 3: Isi tujuan/keperluan peminjaman dan dokumen lampiran opsional | Tinggi |
| PINJAM-05 | Step 4: Preview ringkasan dan submit pengajuan | Tinggi |
| PINJAM-06 | Sistem mencegah pemilihan aset yang sudah di-booking di waktu yang sama | Tinggi |
| PINJAM-07 | Setiap pengajuan mendapat nomor tiket unik (`LN-YYYY-NNNN`) | Tinggi |
| PINJAM-08 | Peminjam dapat melihat status pengajuannya secara real-time | Tinggi |

#### 4.3.2 Alur Approval

| Kode | Kebutuhan | Prioritas |
|---|---|---|
| PINJAM-09 | Pengajuan masuk status `PENDING_L1` dan diteruskan ke Kepala Unit peminjam | Tinggi |
| PINJAM-10 | Kepala Unit dapat Approve atau Reject dengan wajib isi catatan jika Reject | Tinggi |
| PINJAM-11 | Jika Level 1 Approve → status `PENDING_L2` diteruskan ke Admin Aset | Tinggi |
| PINJAM-12 | Admin Aset dapat Approve atau Reject dengan catatan | Tinggi |
| PINJAM-13 | Jika Level 2 Approve → status `APPROVED`, sistem otomatis generate surat izin PDF | Tinggi |
| PINJAM-14 | Jika ditolak di level mana pun → status `REJECTED`, peminjam mendapat notifikasi + alasan | Tinggi |
| PINJAM-15 | Seluruh riwayat approval tersimpan (siapa, kapan, keputusan, catatan) | Tinggi |
| PINJAM-16 | Peminjam dapat download surat izin peminjaman dalam format PDF | Tinggi |

#### 4.3.3 Check-In & Check-Out via QR

| Kode | Kebutuhan | Prioritas |
|---|---|---|
| PINJAM-17 | Peminjam/Staff scan QR Code fisik aset untuk melakukan Check-In | Tinggi |
| PINJAM-18 | Sistem memvalidasi: apakah ada booking aktif yang approved untuk QR tersebut | Tinggi |
| PINJAM-19 | Jika valid → aset status berubah ke `DIPINJAM`, waktu check-in dicatat | Tinggi |
| PINJAM-20 | Peminjam/Staff scan QR lagi saat mengembalikan aset (Check-Out) | Tinggi |
| PINJAM-21 | Saat Check-Out, Staff mengisi kondisi aset: Baik / Rusak Ringan / Rusak Berat | Tinggi |
| PINJAM-22 | Sistem menghitung apakah pengembalian tepat waktu atau terlambat | Tinggi |
| PINJAM-23 | Jika terlambat → sistem menghitung denda otomatis sesuai tarif yang dikonfigurasi | Sedang |

#### 4.3.4 Sanksi & Denda

| Kode | Kebutuhan | Prioritas |
|---|---|---|
| PINJAM-24 | Admin dapat mengkonfigurasi tarif denda per jam keterlambatan per kategori aset | Sedang |
| PINJAM-25 | Denda terakumulasi di profil peminjam hingga dibayar | Sedang |
| PINJAM-26 | Admin dapat suspend akun peminjam yang belum bayar denda > 7 hari | Sedang |
| PINJAM-27 | Peminjam yang di-suspend tidak dapat membuat pengajuan baru | Sedang |

---

### 4.4 Modul Penyewaan Aset (Eksternal)

| Kode | Kebutuhan | Prioritas |
|---|---|---|
| SEWA-01 | Admin dapat membuat transaksi sewa baru untuk penyewa eksternal | Tinggi |
| SEWA-02 | Data penyewa wajib: nama, nomor HP, NIK/KTP | Tinggi |
| SEWA-03 | Data penyewa opsional: email, alamat, foto KTP | Sedang |
| SEWA-04 | Admin dapat memilih aset yang akan disewa dan periode sewa | Tinggi |
| SEWA-05 | Sistem menghitung total biaya sewa otomatis (tarif × jumlah hari) | Tinggi |
| SEWA-06 | Admin dapat menambahkan biaya deposit/jaminan | Sedang |
| SEWA-07 | Admin dapat memberikan diskon (nominal / persentase) | Rendah |
| SEWA-08 | Sistem mendukung metode pembayaran: Cash, Transfer Bank, QRIS | Sedang |
| SEWA-09 | Admin dapat mencatat status pembayaran: Belum Bayar / DP / Lunas | Tinggi |
| SEWA-10 | Setelah konfirmasi → sistem otomatis generate kontrak sewa PDF | Tinggi |
| SEWA-11 | Admin dapat generate kwitansi pembayaran PDF | Tinggi |
| SEWA-12 | Aset status berubah ke `DISEWA` saat sewa aktif | Tinggi |
| SEWA-13 | Admin mencatat pengembalian aset: tanggal kembali + kondisi aset | Tinggi |
| SEWA-14 | Jika terlambat → sistem hitung biaya tambahan keterlambatan | Sedang |
| SEWA-15 | Admin dapat mencatat klaim deposit jika ada kerusakan | Sedang |
| SEWA-16 | Sistem menampilkan daftar penyewaan yang overdue / jatuh tempo | Tinggi |
| SEWA-17 | Sistem menyimpan riwayat sewa per penyewa | Sedang |

---

### 4.5 Modul Maintenance Aset

| Kode | Kebutuhan | Prioritas |
|---|---|---|
| MAINT-01 | Admin/Staff dapat mencatat record maintenance (preventif / korektif) | Sedang |
| MAINT-02 | Setiap record mencatat: tanggal, jenis, deskripsi, biaya, petugas | Sedang |
| MAINT-03 | Admin dapat menjadwalkan maintenance berikutnya dengan pengingat | Rendah |
| MAINT-04 | Aset dalam maintenance tidak dapat dipinjam atau disewa | Sedang |
| MAINT-05 | Admin mendapat notifikasi saat jadwal maintenance jatuh tempo | Rendah |

---

### 4.6 Modul Transfer Aset

| Kode | Kebutuhan | Prioritas |
|---|---|---|
| TRANS-01 | Admin dapat mencatat mutasi/transfer aset antar departemen/lokasi | Sedang |
| TRANS-02 | Transfer memerlukan konfirmasi dari departemen tujuan | Rendah |
| TRANS-03 | Setiap transfer tercatat dalam log permanen | Sedang |

---

### 4.7 Modul Dashboard & Laporan

| Kode | Kebutuhan | Prioritas |
|---|---|---|
| DASH-01 | Dashboard menampilkan KPI: total aset, dipinjam hari ini, disewa, butuh maintenance | Tinggi |
| DASH-02 | Dashboard menampilkan live grid status semua aset dengan warna | Tinggi |
| DASH-03 | Dashboard menampilkan chart tren peminjaman & penyewaan 7 hari terakhir | Sedang |
| DASH-04 | Dashboard menampilkan daftar jatuh tempo peminjaman hari ini | Tinggi |
| DASH-05 | Dashboard menampilkan feed aktivitas terbaru | Sedang |
| LAP-01 | Admin dapat melihat laporan peminjaman dengan filter periode, aset, user | Tinggi |
| LAP-02 | Admin dapat melihat laporan penyewaan dengan filter periode dan status | Tinggi |
| LAP-03 | Admin dapat melihat laporan inventaris aset (nilai buku, kategori, lokasi) | Sedang |
| LAP-04 | Admin dapat melihat laporan maintenance & total biaya perawatan | Rendah |
| LAP-05 | Admin dapat export laporan ke format Excel (.xlsx) | Tinggi |
| LAP-06 | Admin dapat export laporan ke format PDF | Sedang |

---

### 4.8 Modul QR Code

| Kode | Kebutuhan | Prioritas |
|---|---|---|
| QR-01 | Sistem generate QR Code unik untuk setiap aset saat aset dibuat | Tinggi |
| QR-02 | QR Code dapat di-download sebagai file PNG | Tinggi |
| QR-03 | Admin dapat mencetak label QR multiple aset sekaligus (A4 / format stiker) | Sedang |
| QR-04 | Scan QR Code membuka halaman detail aset (bisa tanpa login untuk publik) | Tinggi |
| QR-05 | Scan QR Code oleh user login → muncul opsi Check-In / Check-Out | Tinggi |
| QR-06 | Scanner menggunakan kamera perangkat via browser (WebRTC, tanpa app tambahan) | Tinggi |

---

### 4.9 Modul Notifikasi

| Kode | Kebutuhan | Prioritas |
|---|---|---|
| NOTIF-01 | Notifikasi in-app saat ada pengajuan peminjaman baru (untuk Kepala Unit) | Tinggi |
| NOTIF-02 | Notifikasi in-app saat pengajuan di-approve/reject (untuk peminjam) | Tinggi |
| NOTIF-03 | Notifikasi in-app saat sewa/pinjam mendekati jatuh tempo (H-1) | Sedang |
| NOTIF-04 | Notifikasi in-app saat ada denda yang harus dibayar | Sedang |
| NOTIF-05 | Badge counter notifikasi di topbar | Tinggi |

---

## 5. Kebutuhan Non-Fungsional

### 5.1 Performa
- Halaman dashboard harus load dalam < 3 detik
- API response time < 500ms untuk operasi CRUD standar
- Scan QR Code harus respond dalam < 2 detik

### 5.2 Keamanan
- Password disimpan dengan hashing bcrypt (salt rounds ≥ 12)
- Semua API endpoint dilindungi autentikasi kecuali route publik
- CSRF protection aktif di semua form POST
- Input sanitization untuk mencegah XSS dan SQL Injection via Prisma ORM
- Session timeout setelah 8 jam tidak aktif

### 5.3 Ketersediaan
- Sistem harus dapat berjalan di lingkungan lokal (localhost) tanpa internet setelah instalasi
- PWA harus dapat diinstall di Chrome versi ≥ 90 dan Edge versi ≥ 90
- Offline: halaman yang sudah dikunjungi tersedia via service worker cache

### 5.4 Skalabilitas
- Database SQLite untuk ≤ 20 concurrent users
- Mudah diupgrade ke PostgreSQL jika dibutuhkan kapasitas lebih besar

### 5.5 Kompatibilitas
- Browser: Chrome, Edge, Firefox (versi terbaru)
- Device: Desktop Windows/Mac/Linux, Mobile Android/iOS (via browser)
- QR Scanner: membutuhkan izin kamera browser

### 5.6 Usabilitas
- Semua teks antarmuka dalam Bahasa Indonesia
- Waktu onboarding untuk user baru < 30 menit
- Tombol aksi utama selalu visible di atas fold (tidak perlu scroll)
- Loading state (skeleton) pada setiap fetch data

---

## 6. Kebutuhan Instalasi

### 6.1 Server Requirements (untuk self-hosted)
- Node.js ≥ 18.0
- npm ≥ 9.0
- Minimum RAM: 512 MB
- Storage: 1 GB (untuk aplikasi + database + foto aset)

### 6.2 Client Requirements
- Browser modern (Chrome/Edge/Firefox)
- Kamera (untuk fitur QR scanner)
- Koneksi ke server lokal atau internet (jika di-hosting)

### 6.3 Instalasi PWA
- Buka aplikasi di Chrome/Edge
- Klik icon "Install" di address bar
- Aplikasi tersimpan di desktop & bisa dibuka seperti native app

---

## 7. Batasan & Asumsi

- Sistem ini **single-tenant** (satu organisasi per instalasi)
- Tidak ada integrasi payment gateway (pembayaran dicatat manual)
- Notifikasi hanya in-app (tidak ada email/SMS/WhatsApp di versi 1.0)
- Foto aset disimpan di file system lokal (bukan cloud storage)
- Satu transaksi peminjaman = satu aset (bukan multi-aset dalam satu transaksi)

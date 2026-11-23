# Blueprint & Definisi Modul Lengkap — SPASI (Sistem Pencatatan Aset & Sewa Instansi)

Dokumen ini merupakan spesifikasi teknis dan fungsional menyeluruh (_Master Blueprint_) untuk membangun ulang (_recreate_) aplikasi **SPASI** dari awal di folder proyek baru. Seluruh modul, rute halaman, endpoint API, skema database (54 model Prisma), matriks hak akses (RBAC), dan alur bisnis dirangkum secara mendetail di bawah ini.

---

## 1. Arsitektur & Tech Stack

### 1.1 Teknologi Utama

- **Database & ORM:** MySQL (`mysql2 ^3.23.3`) + Prisma ORM `5.21.0`
- **Autentikasi:** NextAuth.js `4.24.8` (JWT Session + Credentials Provider + `bcryptjs`)
- **UI & Styling:** Custom CSS Variables (`app/globals.css`, Dark/Light Theme) + komponen UI modular (`Card`, `Button`, `Badge`, `Input`, `Modal`, `FilterPill`, `Skeleton`, `Toast`, `TransactionTimeline`) + ikon `lucide-react ^0.453.0`
- **Visualisasi & Grafik:** `recharts ^2.13.0`
- **QR Code & Kamera Scanner:** `qrcode ^1.5.4` (generator) & `html5-qrcode ^2.3.8` (scanner kamera)
- **Dokumen, PDF & Spreadsheet:** HTML Print-to-PDF Templates, `jspdf ^2.5.2`, `html2canvas ^1.4.1`, `xlsx ^0.18.5`
- **Penyimpanan Berkas (Hybrid):** Lokal (`public/uploads/`) atau S3/MinIO (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **Notifikasi Eksternal:** Email (`nodemailer ^7.0.13`) & WhatsApp Gateway (HTTP Webhook/API)

### 1.2 Struktur Direktori Proyek

```text
spasi/
├── app/
│   ├── api/                  # Seluruh REST API Route Handlers
│   ├── bookings/[bookingNumber]/ # Halaman E-Voucher Publik + QR Code
│   ├── catalog/              # Katalog publik
│   ├── dashboard/            # Seluruh modul aplikasi terproteksi
│   ├── login/ & register/    # Halaman autentikasi pengguna
│   └── globals.css           # Variabel tema CSS & utilitas komponen
├── components/
│   ├── layout/               # Sidebar.tsx, Topbar.tsx
│   ├── public/               # PaymentModal.tsx, RoomScheduleCalendar.tsx, AssetRentalCalendar.tsx
│   └── ui/                   # Card, Button, Badge, Modal, Input, Toast, TransactionTimeline, dll.
├── lib/
│   ├── auth.ts               # Konfigurasi NextAuth & helper getAuthSession()
│   ├── prisma.ts             # Singleton PrismaClient
│   ├── audit.ts              # Helper createAuditLog() / recordAuditLog()
│   ├── notification.ts       # Helper sendSystemNotification() (In-App + Email + WA)
│   ├── mailer.ts & whatsapp.ts
│   └── utils.ts              # formatDate, formatCurrency, generator nomor tiket, kalkulasi denda
├── prisma/
│   ├── schema.prisma         # 54 Model Database MySQL
│   └── seed.ts               # Seeder data awal
├── middleware.ts             # Edge RBAC Route Protection (/dashboard/:path*)
└── next.config.js            # Security Headers, CSP /uploads, standalone build
```

---

## 2. Matriks Role-Based Access Control (RBAC)

Sistem memiliki **5 Role Utama** pada model `User.role` dan kategori peminjam pada `User.renterCategory`:

| Role              | Deskripsi & Kewenangan Utama                                                                                                                                                                                                                            |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`SUPER_ADMIN`** | Akses penuh ke seluruh modul, manajemen user & role (`SUPER_ADMIN`), pengaturan sistem, buku kas, penghapusan data master, dan override approval.                                                                                                       |
| **`ADMIN`**       | Pengelola Sarpras/Aset: verifikasi pembayaran, approval Level 2 (`PENDING_L2`), kelola aset, ruangan, gedung, pengadaan, stock opname, klaim, buku kas, dan laporan.                                                                                    |
| **`STAFF`**       | Petugas Operasional/Loket: scan QR cepat, serah terima ambil/kembali (_Check-In / Check-Out_), inspeksi fisik, pencatatan transaksi BHP/ATK, stock opname, dan servis.                                                                                  |
| **`APPROVER`**    | Kepala Unit / Kepala Lab / Pejabat: menyetujui atau menolak pengajuan peminjaman Level 1 (`PENDING_L1`) sesuai departemen/unit serta melihat laporan & analitik.                                                                                        |
| **`BORROWER`**    | Peminjam / Penyewa (`MAHASISWA`, `INTERNAL_KAMPUS`, atau `EXTERNAL`): melihat katalog, mengajukan peminjaman aset paket atau booking/sewa ruangan & peralatan Sarpras, unggah bukti bayar, ajukan pengembalian, lihat denda/klaim, dan verifikasi akun. |

---

## 3. Arsitektur Skema Database (54 Model Prisma)

Seluruh 54 model di `prisma/schema.prisma` dikelompokkan ke dalam 7 domain:

1. **Master Organisasi, Gedung & Ruangan (6 Model):**
   `Department`, `Building`, `RoomFacilityMaster`, `RoomTypeMaster`, `Location` (Ruangan), `RoomAvailabilityBlock`.
2. **Master Aset, Kategori & Alokasi Ruangan (4 Model):**
   `Category` (hierarki `parentId` Master Kategori & Sub Kategori), `Asset`, `RoomAssetAllocation`, `TransferLog`.
3. **Pengguna, CRM, Hak Akses & Verifikasi (10 Model):**
   `User`, `VerificationRequest`, `MemberCard`, `CommunicationLog`, `BlacklistRecord`, `BorrowerGroup`, `BorrowerGroupMember`, `Permission`, `RolePermission`, `ActivityLog`.
4. **Sirkulasi Peminjaman Internal & Inspeksi (6 Model):**
   `Loan` (mendukung multi-aset lewat `groupCode`), `Approval`, `CheckInLog`, `HandoverLog`, `ReturnInspection`, `ReturnInspectionItemResult`.
5. **Sewa Ruangan & Aset Komersial / Sarpras (6 Model):**
   `Renter`, `RoomBooking` (`locationId` opsional untuk mendukung Ruangan + Multi-Aset atau Peralatan Saja), `BookingAddonAsset`, `BookingInspection`, `Rental`, `MasterInvoice`.
6. **Operasional Sarpras: Servis, Klaim, Opname, Pengadaan & BHP (9 Model):**
   `Maintenance`, `MaintenanceSchedule`, `AssetClaim`, `Violation`, `StockOpnameSession`, `StockOpnameItem`, `ProcurementRequest`, `ProcurementItem`, `Consumable`, `ConsumableTransaction`.
7. **Keuangan, Mitra, Kebijakan & Konfigurasi Sistem (13 Model):**
   `CashTransaction`, `PaymentSetting`, `BankAccount`, `Operator`, `Partner`, `Commission`, `QuotaRule`, `BlockedPeriod`, `ConsentLog`, `AssetRating`, `SystemSetting`, `StorageSetting`, `DocumentTemplate`, `ChecklistTemplate`, `ChecklistTemplateItem`, `ApprovalConfig`, `NotificationTemplate`, `SecurityPolicy`, `WhatsAppSetting`, `InAppNotification`, `AuditLog`.

---

## 4. Definisi Detail Per Modul Aplikasi

### Modul 1: Autentikasi, Keamanan & Edge Middleware

- **Halaman UI:** `/login`, `/register`, `/dashboard/profile`
- **Endpoint API:** `/api/auth/[...nextauth]`, `/api/auth/register`, `/api/profile`
- **Definisi Fitur:**
  - Login dengan email & password (`bcryptjs`), menyimpan `id`, `role`, `renterCategory`, `isSuspended` di token JWT.
  - `middleware.ts` memblokir akses tanpa login ke `/dashboard/:path*` dan memblokir `BORROWER` dari seluruh rute administratif di level Edge.
  - `next.config.js` menerapkan HTTP Security Headers (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Permissions-Policy: camera=(self)`) serta `Content-Security-Policy` ketat (`sandbox`) pada `/uploads/:path*`.

---

### Modul 2: Dashboard Multi-Role & Katalog Fasilitas

- **Halaman UI:** `/dashboard`, `/dashboard/catalog`, `/dashboard/cart`
- **Endpoint API:** `/api/dashboard/stats`, `/api/public/assets`, `/api/rooms`, `/api/cart/checkout`
- **Definisi Fitur:**
  - **Dashboard Adaptif per Role:**
    - `BORROWER`: Ringkasan kuota aktif, pinjaman berjalan, sewa ruangan/alat, tagihan denda/klaim, dan tombol pintas pengajuan.
    - `STAFF`: Pintasan Scan QR Peminjaman, Scan QR Ruangan, dan antrean serah terima hari ini.
    - `APPROVER`: Antrean persetujuan Level 1 (`PENDING_L1`) yang membutuhkan keputusan.
    - `ADMIN` / `SUPER_ADMIN`: KPI total aset, ruangan, pendapatan sewa, kas bersih, grafik tren bulanan (`recharts`), dan peringatan stok BHP menipis.
  - **Katalog Fasilitas & Keranjang:** Pencarian aset & ruangan dengan filter kategori, cek jadwal ketersediaan, tambah ke `Keranjang Saya` (`localStorage`), dan impor langsung ke formulir pengajuan.

---

### Modul 3: Peminjaman Aset Internal (Single-Page & Multi-Aset Paket)

- **Halaman UI:**
  - `/dashboard/loans` (Kelola Peminjaman untuk Admin/Staff/Approver, atau Peminjaman Saya saat `?mode=my` / `BORROWER`)
  - `/dashboard/loans/new` (Formulir Pengajuan 1 Halaman Multi-Aset)
  - `/dashboard/loans/[id]` (Detail Paket Peminjaman & Timeline)
  - `/dashboard/loans/scan` (Scan QR Cepat Peminjaman)
- **Endpoint API:**
  - `GET/POST /api/loans`
  - `GET /api/loans/[id]`, `POST /api/loans/[id]/approve`, `POST /api/loans/[id]/cancel`, `POST /api/loans/[id]/request-return`, `GET /api/loans/[id]/pdf`
  - `POST /api/loans/group-action`, `GET /api/loans/group`, `GET /api/loans/export`
- **Definisi Fitur & Alur:**
  1. **Formulir Satu Halaman (`loans/new`):**
     - **Bagian 1 (Jadwal):** Input `startDate` & `endDate` dengan validasi _real-time_ (tidak boleh tanggal lampau, maksimal 3 hari kerja, tidak boleh jatuh pada Sabtu/Minggu atau `BlockedPeriod`).
     - **Bagian 2 (Pilih Multi-Aset):** Filter Master Kategori & Sub Kategori, cari aset, pilih aset yang tersedia pada tanggal tersebut, atur jumlah unit, klik `+ Tambah ke Daftar`, atau impor dari keranjang. Daftar tampil berupa tabel yang jumlahnya masih bisa diedit/dihapus.
     - **Bagian 3 (Keperluan & Berkas):** Isi tujuan keperluan, jenis kegiatan (`AKADEMIK`, `KEMAHASISWAAN`, `PERSONAL`), dan unggah 1x KTP/KTM + 1x Surat Kegiatan (`permitPdfUrl` disimpan sebagai JSON array `["/uploads/ktp...", "/uploads/surat..."]`).
     - **Bagian 4 (Konfirmasi):** Ringkasan total jenis aset & unit, centang persetujuan elektronik (`ConsentLog`), dan kirim.
  2. **Pengelompokan Paket (`groupCode`):**
     - Jika mengajukan >1 aset, backend membuat `groupCode` bersama (`GRP-YYYY-XXXX-...`) di dalam `prisma.$transaction`.
     - Di tabel `/dashboard/loans`, seluruh item dalam 1 `groupCode` tampil sebagai **1 baris paket** dengan aksi massal 1 klik: **`✓ Setujui L1 (N)`**, **`✓ Verifikasi L2 (N)`**, **`❌ Tolak`**, **`Batalkan`**, **`Ajukan Pengembalian`**, **`Serah Terima Ambil (N)`**, dan **`Serah Terima Kembali (N)`**, serta tombol **`Rincian (N)`** untuk melihat sub-baris tiap aset.
  3. **Timestamp & BAST Gabungan:**
     - Mencatat dan menampilkan waktu aktual pengambilan (`checkInTime`) dan pengembalian (`checkOutTime`) lengkap dengan jam/menit/detik di tabel, detail, riwayat, dan mencetak **1 PDF BAST Gabungan** yang memuat tabel seluruh aset dalam paket.

---

### Modul 4: Sewa & Booking Sarpras Terpadu (Ruangan + Multi-Aset / Peralatan Saja)

- **Halaman UI:**
  - `/dashboard/room-bookings` & `/dashboard/rentals` (Terkonsolidasi dalam 1 komponen terpadu)
  - `/dashboard/room-bookings/new` (Formulir Satu Halaman Pengajuan Sewa & Booking Sarpras + Mode Edit `?editId=...`)
  - `/dashboard/room-bookings/[id]` (Detail Booking, Riwayat Inspeksi, & Timeline)
  - `/dashboard/room-bookings/[id]/checkin` & `/dashboard/room-bookings/[id]/checkout`
  - `/dashboard/room-bookings/scan` (Scan QR E-Voucher Ruangan)
  - `/bookings/[bookingNumber]` (Halaman E-Voucher Publik & QR Code)
- **Endpoint API:**
  - `GET/POST /api/room-bookings`
  - `GET/PATCH /api/room-bookings/[id]`
  - `POST /api/room-bookings/[id]/checkin`, `POST /api/room-bookings/[id]/checkout`
  - `GET /api/room-bookings/[id]/pdf` (Invoice/Kuitansi & BAST)
- **Definisi Fitur & Alur:**
  1. **Fleksibilitas Sarpras (`locationId` Opsional):**
     - Mendukung 3 skenario dalam satu formulir satu halaman: **(a) Ruangan Saja**, **(b) Ruangan + Peralatan Multi-Aset**, atau **(c) Peralatan Sarpras Saja (Tanpa Ruangan)**.
     - Pemilih peralatan menggunakan filter **Master Kategori + Sub Kategori + Pencarian + Tabel Daftar Peralatan** yang bisa diedit jumlahnya.
  2. **Edit & Pembatalan Pesanan:**
     - Selama status masih `PENDING` (belum disetujui Admin), pemohon dapat menekan **`✏️ Edit`** (`/dashboard/room-bookings/new?editId=...`) untuk mengubah jadwal, ruangan, daftar peralatan, atau berkas, maupun menekan **`❌ Batalkan`**.
  3. **Skema Tarif & Pembayaran (`FULL` vs `DOWN_PAYMENT` 50%):**
     - Kategori Internal (`MAHASISWA` pada ruangan `isLoanable`): Gratis (`Rp 0`), setelah disetujui Admin langsung berstatus `CONFIRMED`.
     - Kategori Berbayar (`EXTERNAL_SEWA` / ruangan komersial): Setelah disetujui Admin (`APPROVED`), pemohon mengunggah bukti bayar Lunas atau DP 50% melalui `PaymentModal` (status menjadi `PENDING_VERIFICATION`).
     - Saat Admin menekan **Verifikasi Struk**:
       - Jika DP awal: `payStatus = 'DOWN_PAYMENT'`, `bookingStatus = 'CONFIRMED'`, `paidAmount` terisi 50%, dan mencatat `CashTransaction` (`IN`) sebesar nominal DP.
       - Jika Lunas / Pelunasan: `payStatus = 'PAID'`, `bookingStatus = 'CONFIRMED'`, `paidAmount` terisi 100%, dan mencatat `CashTransaction` (`IN`) sebesar selisih yang baru dibayar.
  4. **Check-In, Check-Out, Overtime & Deposit:**
     - **Check-In:** Petugas memeriksa kondisi awal aset tetap ruangan, aset alokasi ruangan (`RoomAssetAllocation`), dan aset tambahan (`addonAssets`), mengurangi `availableQty` aset tambahan, mengubah status ruangan menjadi `RENTED` dan booking menjadi `ACTIVE`, serta mencatat `checkInTime`.
     - **Check-Out:** Petugas memeriksa kondisi akhir, memulihkan `availableQty` aset tambahan, membebaskan ruangan menjadi `AVAILABLE`, mencatat `checkOutTime`, menghitung denda keterlambatan (_overtime_ dengan toleransi 30 menit; untuk sewa harian tarif lembur per jam = `roomRate / 8`), mengembalikan deposit (`REFUNDED`) jika aman, atau menerbitkan tiket klaim (`AssetClaim` + `COMPLETED_WITH_CLAIM`) jika ada kerusakan/kehilangan.

---

### Modul 5: Serah Terima Aset (Batch Handover) & Inspeksi Pengembalian

- **Halaman UI:**
  - `/dashboard/handovers` (Antrean Serah Terima)
  - `/dashboard/handovers/batch` (Serah Terima Paket Multi-Aset Sekaligus)
  - `/dashboard/handovers/[id]` (Serah Terima Single Item)
  - `/dashboard/returns/[loanId]` (Inspeksi Pengembalian Berbasis Template Checklist)
- **Endpoint API:**
  - `GET/POST /api/handovers`, `POST /api/handovers/batch`, `GET /api/handovers/pending`
  - `GET/POST /api/returns/inspect`
- **Definisi Fitur:**
  - **Batch Handover (`/dashboard/handovers/batch`):** Memungkinkan petugas memproses pengambilan (`CHECK_IN`) atau pengembalian (`CHECK_OUT`) seluruh aset dalam 1 paket peminjaman sekaligus dalam 1 tabel pemeriksaan (lengkap dengan tombol _Tandai Semua Kondisi BAIK_, pilihan kondisi per item, unggah foto bukti, dan pembuatan klaim otomatis bila ada item rusak/hilang).

---

### Modul 6: Manajemen Data Aset, Mutasi & QR Labels

- **Halaman UI:**
  - `/dashboard/assets`, `/dashboard/assets/new`, `/dashboard/assets/[id]`, `/dashboard/assets/[id]/edit`
  - `/dashboard/assets/qr-labels` (Cetak Label QR Massal)
  - `/dashboard/assets/transfers/[id]/bast` (BAST Mutasi Lokasi)
  - `/dashboard/assets/[id]/disposal-report` (Berita Acara Penghapusan/Afkir)
- **Endpoint API:** `/api/assets`, `/api/assets/[id]`, `/api/assets/[id]/disposal`, `/api/assets/depreciation`, `/api/assets/export`
- **Definisi Fitur:**
  - Penomoran kode aset standar (`DEPT-KAT-YYYY-XXXX`), pencatatan spesifikasi teknis, nomor seri unik, harga perolehan, penyusutan (_straight-line depreciation_), tarif sewa harian/sesi, dan foto multi-angle.
  - **Halaman Detail Aset (`/dashboard/assets/[id]`):** Memiliki 4 tab lengkap:
    1. _Spesifikasi Teknis_
    2. _Mutasi & Perpindahan Lokasi_ (lengkap dengan cetak BAST Mutasi)
    3. _Riwayat Peminjaman & Sewa_ (menampilkan daftar seluruh tiket peminjaman alat tersebut beserta nama peminjam, jadwal, timestamp ambil `checkInTime`, timestamp kembali `checkOutTime`, dan link detail)
    4. _Riwayat Servis / Perawatan_
  - **QR Code Aset:** Mengarah ke `/dashboard/assets/[id]` dan dapat dicetak massal di `/dashboard/assets/qr-labels`.

---

### Modul 7: Manajemen Gedung & Ruangan (Prasarana)

- **Halaman UI:**
  - `/dashboard/buildings` (Master Gedung)
  - `/dashboard/rooms`, `/dashboard/rooms/new`, `/dashboard/rooms/[id]`, `/dashboard/rooms/[id]/edit`
  - `/dashboard/rooms/[id]/kir` (Kartu Inventaris Ruangan / KIR)
  - `/dashboard/rooms/facilities` (Master Fasilitas & Tipe Ruangan)
- **Endpoint API:** `/api/buildings`, `/api/buildings/[id]`, `/api/rooms`, `/api/rooms/[id]`, `/api/rooms/[id]/availability`, `/api/room-facilities`, `/api/room-types`
- **Definisi Fitur:**
  - Pengelolaan gedung, lantai, tipe ruangan, kapasitas, luas, PIC/Laboran, tarif sewa per jam/hari, deposit, serta alokasi aset ke ruangan (`RoomAssetAllocation`).
  - **Panel Pengelolaan Ruangan Aktif (`/dashboard/rooms/[id]`):** Menampilkan booking yang sedang aktif/terkonfirmasi pada ruangan tersebut beserta tombol langsung **`Serah Terima Masuk (Check-In)`**, **`Serah Terima Keluar (Check-Out)`**, dan **`Detail Booking`**, ditambah Tab _Informasi_, _Inventaris Ruangan (KIR)_, _Ketersediaan Hari Ini_, dan _Riwayat Sewa_.

---

### Modul 8: Barang Habis Pakai (BHP / ATK / Consumables)

- **Halaman UI:** `/dashboard/consumables` (3 Tab: _Master Stok Barang_, _Riwayat Transaksi Masuk/Keluar_, _Rekapitulasi Bulanan_, serta Modal _Import Excel/CSV_)
- **Endpoint API:** `/api/consumables`, `/api/consumables/[id]`, `/api/consumables/transactions`, `/api/consumables/recap`, `/api/consumables/import`
- **Definisi Fitur:**
  - Pencatatan barang habis pakai dengan batas stok minimum (`minimumStock`) dan peringatan otomatis (`InAppNotification`) saat stok menipis.
  - Mendukung transaksi **Barang Masuk / Restock (`IN`)** dan **Pengambilan / Barang Keluar (`OUT`)** baik single-item maupun **multi-item** secara atomik, lengkap dengan pencatatan otomatis ke Buku Kas (`CashTransaction` `OUT`) saat restock berbiaya.

---

### Modul 9: Pengadaan Aset (`Procurement`)

- **Halaman UI:** `/dashboard/procurement`, `/dashboard/procurement/[id]/bast`
- **Endpoint API:** `/api/procurement`, `/api/procurement/[id]`, `/api/procurement/[id]/receive`
- **Definisi Fitur:**
  - Pengajuan pengadaan barang baru multi-item, alur persetujuan (`PENDING` → `APPROVED` / `REJECTED` → `ORDERED` → `RECEIVED`), konversi otomatis item pengadaan menjadi record `Asset` atau stok `Consumable` saat barang diterima (`receive`), serta cetak BAST Pengadaan.

---

### Modul 10: Stock Opname QR Code

- **Halaman UI:** `/dashboard/stock-opname`, `/dashboard/stock-opname/[id]`, `/dashboard/stock-opname/[id]/report`
- **Endpoint API:** `/api/stock-opname`, `/api/stock-opname/[id]`, `/api/stock-opname/[id]/scan`, `/api/stock-opname/[id]/reconcile`
- **Definisi Fitur:**
  - Pembuatan sesi audit fisik aset per ruangan atau seluruh gedung, pemindaian QR aset menggunakan kamera/input kode, pencocokan kondisi & lokasi aktual vs sistem, rekonsiliasi otomatis (`reconcile`) yang memperbarui kondisi/lokasi aset, serta cetak Berita Acara Stock Opname.

---

### Modul 11: Pemeliharaan & Servis (`Maintenance`)

- **Halaman UI:** `/dashboard/maintenance`
- **Endpoint API:** `/api/maintenance`, `/api/maintenance/[id]`, `/api/maintenance/schedules`
- **Definisi Fitur:**
  - Pencatatan perbaikan korektif (`CORRECTIVE`) maupun jadwal perawatan rutin (`PREVENTIVE`) untuk aset dan ruangan, pemblokiran otomatis status aset menjadi `MAINTENANCE` selama diperbaiki, integrasi dengan tiket klaim kerusakan (`claimId`), dan pencatatan biaya servis ke Buku Kas.

---

### Modul 12: Tagihan Denda (`Penalties`) & Ganti Rugi Klaim (`Claims`)

- **Halaman UI:**
  - `/dashboard/penalties` (Sisi Peminjam) & `/dashboard/admin/penalties` (Manajemen Denda Admin/Staff)
  - `/dashboard/claims` (Siklus Hidup Klaim Ganti Rugi 6 Tab: `NEW`, `INVESTIGATING`, `AWAITING_PAYMENT`, `PENDING_APPROVAL`, `REJECTED`, `RESOLVED`)
- **Endpoint API:** `/api/penalties`, `/api/penalties/pay`, `/api/claims`, `/api/claims/[id]`
- **Definisi Fitur:**
  - Kalkulasi denda keterlambatan pengembalian harian otomatis.
  - Siklus hidup klaim kerusakan/kehilangan aset: pembuatan tiket otomatis dari hasil inspeksi Check-Out, penangguhan sementara akun peminjam (`isSuspended = true`), penetapan nilai ganti rugi (tagihan baru atau potong deposit), opsi penonaktifan aset rusak (`deactivateAsset`), unggah bukti bayar/penggantian unit oleh peminjam, verifikasi lunas oleh Admin, pencatatan `CashTransaction`, pembuatan tiket `Maintenance` otomatis, dan pembukaan blokir akun otomatis setelah seluruh klaim lunas.

---

### Modul 13: Buku Kas, Keuangan, Operator & Mitra (`Finance & Partners`)

- **Halaman UI:** `/dashboard/finance`, `/dashboard/admin/partners`, `/dashboard/admin/operators`
- **Endpoint API:** `/api/finance/cash`, `/api/partners`, `/api/operators`
- **Definisi Fitur:**
  - Pencatatan buku kas tunggal (_Single-Entry Accounting_ `CashTransaction` `IN`/`OUT`) yang terintegrasi otomatis dengan pembayaran sewa ruangan/alat, penerimaan & pengembalian deposit, pelunasan denda/klaim, restock BHP, dan biaya servis.

---

### Modul 14: CRM Peminjam, Verifikasi Akun & Manajemen User

- **Halaman UI:** `/dashboard/crm`, `/dashboard/verification` (Form Verifikasi Borrower), `/dashboard/verifications` (Review Admin), `/dashboard/admin/users`
- **Endpoint API:** `/api/crm`, `/api/verifications`, `/api/verifications/[id]`, `/api/admin/users`, `/api/settings/users`
- **Definisi Fitur:**
  - Pengajuan verifikasi identitas (KTM/KTP/Surat Instansi) oleh pengguna baru untuk membuka akses kuota & kategori tarif internal/eksternal.
  - Direktori peminjam & penyewa (CRM), riwayat pelanggaran (`Violation`), daftar hitam (`BlacklistRecord`), kartu anggota (`MemberCard`), dan manajemen akun & role oleh `SUPER_ADMIN`.

---

### Modul 15: Riwayat Transaksi Terpadu, Laporan Analitik & Audit Log

- **Halaman UI:** `/dashboard/history`, `/dashboard/reports`, `/dashboard/logs`
- **Endpoint API:** `/api/reports/analytics`, `/api/logs`
- **Definisi Fitur:**
  - **Riwayat Transaksi (`/dashboard/history`):** Menggabungkan seluruh histori Booking Ruangan, Sewa Aset, dan Paket Peminjaman Internal (dikelompokkan per `groupCode`) lengkap dengan timestamp ambil/kembali, tombol cetak PDF BAST/Kuitansi, dan pemberian rating bintang (`AssetRating`).
  - **Laporan & Analitik (`/dashboard/reports`):** Rekapitulasi sirkulasi, pendapatan, utilisasi ruangan/aset, denda, dan ekspor CSV/Excel.
  - **Log Sistem & Audit (`/dashboard/logs`):** Jejak audit lengkap (`AuditLog`) mencatat siapa melakukan aksi apa, kapan, beserta `oldData` dan `newData`.

---

### Modul 16:Master Kategori, Merek, Utilitas & Pengaturan Sistem

- **Halaman UI:**
  - `/dashboard/categories` (Master Kategori & Sub Kategori Aset beserta Kode Standar)
  - `/dashboard/brands` (Master Merek Aset)
  - `/dashboard/tools` (Utilitas Sistem, Backup & Pemeliharaan Data)
  - `/dashboard/settings` (7 Tab: _WhatsApp Gateway_, _Rekening & QRIS_, _Sistem & Otomatisasi_, _Kebijakan Kuota & Periode Blokir_, _Penyimpanan S3/MinIO_, _Template Dokumen BAST/Kop Surat_, dan _Template Checklist Inspeksi_)
- **Endpoint API:** `/api/categories`, `/api/brands`, `/api/settings/*`, `/api/policies/quota`, `/api/policies/blocked`, `/api/upload`

---

## 5. Panduan Langkah-demi-Langkah Recreate Project di Folder Baru

Jika Anda ingin membuat ulang (_recreate_) proyek SPASI ini di folder baru:

1. **Inisialisasi Project & Install Dependencies:**
   ```bash
   npx create-next-app@14 spasi-baru --typescript --app --no-tailwind
   cd spasi-baru
   npm install @prisma/client@^5.21.0 next-auth@^4.24.8 bcryptjs date-fns html2canvas html5-qrcode jspdf lucide-react mysql2 nodemailer qrcode react-hook-form recharts xlsx zod @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   npm install -D prisma@^5.21.0 @types/bcryptjs @types/nodemailer @types/qrcode ts-node
   ```
2. **Konfigurasi Environment (`.env`):**
   ```env
   DATABASE_URL="mysql://root:@localhost:3306/spasi_db"
   NEXTAUTH_URL="http://localhost:3005"
   NEXTAUTH_SECRET="ganti-dengan-secret-key-acak-minimal-32-karakter"
   ```
3. **Salin Skema Database & Sinkronisasi:**
   - Salin `prisma/schema.prisma` (54 model) dan `prisma/seed.ts`.
   - Jalankan:
     ```bash
     npx prisma db push
     npx prisma db seed
     ```
4. **Bangun Layer Fondasi (`lib/` & `middleware.ts`):**
   - Buat `lib/prisma.ts`, `lib/auth.ts`, `lib/utils.ts`, `lib/audit.ts`, `lib/notification.ts`, `middleware.ts`, dan `next.config.js`.
5. **Bangun Komponen UI & Layout (`components/` & `app/globals.css`):**
   - Buat komponen dasar di `components/ui/`, `components/public/`, dan navigasi role-based di `components/layout/Sidebar.tsx`.
6. **Implementasikan Modul Secara Bertahap (Urutan yang Direkomendasikan):**
   - **Tahap A:** Master Data (`categories`, `brands`, `buildings`, `rooms`, `assets`, `settings`, `upload`).
   - **Tahap B:** Sirkulasi Utama (`loans` single-page multi-aset + `groupCode`, `room-bookings` single-page Sarpras terpadu, `handovers/batch`, `returns/inspect`).
   - **Tahap C:** Operasional & Keuangan (`consumables`, `procurement`, `stock-opname`, `maintenance`, `claims`, `penalties`, `finance`).
   - **Tahap D:** CRM, Verifikasi, Riwayat Terpadu (`history`), Laporan Analitik (`reports`), dan Audit Log (`logs`).

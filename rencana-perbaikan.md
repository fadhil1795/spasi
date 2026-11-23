# Rencana Perbaikan & Pengembangan Detail Modul SPASI

Dokumen ini merangkum seluruh kendala yang ditemukan pada audit modul aplikasi SPASI (di luar modul **Peminjaman Internal** yang sudah selesai ditingkatkan), lengkap dengan akar masalah, dampak, serta rencana pengembangan teknis per modul.

---

## Ringkasan Status Modul Peminjaman Internal (Sudah Selesai)
- Formulir pengajuan diubah menjadi satu halaman (*single-page*) dan mendukung multi-aset sekaligus ([app/dashboard/loans/new/page.tsx](app/dashboard/loans/new/page.tsx)).
- Pengelompokan paket pengajuan menggunakan `groupCode` di database ([prisma/schema.prisma](prisma/schema.prisma)) dan API massal ([app/api/loans/group-action/route.ts](app/api/loans/group-action/route.ts), [app/api/loans/group/route.ts](app/api/loans/group/route.ts)).
- Serah terima paket (*Batch Check-In / Check-Out*) sekaligus ([app/dashboard/handovers/batch/page.tsx](app/dashboard/handovers/batch/page.tsx), [app/api/handovers/batch/route.ts](app/api/handovers/batch/route.ts)).
- Pratinjau multi-dokumen (KTP/KTM & Surat Kegiatan), PDF BAST Gabungan, Riwayat Transaksi terpadu, tampilan timestamp ambil/kembali, serta riwayat peminjaman per alat ([app/dashboard/assets/[id]/page.tsx](app/dashboard/assets/[id]/page.tsx)).

---

## 🔴 PRIORITAS TINGGI (Keamanan API, Integritas Data, & Alur Putus / 404)

### 1. Keamanan & Otorisasi API (Privilege Escalation & Akses Publik)
- **Lokasi File:**
  - `app/api/finance/cash/route.ts`
  - `app/api/brands/route.ts`
  - `app/api/settings/users/route.ts`
  - `app/api/penalties/pay/route.ts`
  - `app/api/assets/route.ts`, `app/api/assets/[id]/route.ts`
  - `app/api/buildings/route.ts`, `app/api/buildings/[id]/route.ts`
  - `app/api/procurement/[id]/route.ts`
  - `app/api/stock-opname/route.ts`, `app/api/stock-opname/[id]/route.ts`, `app/api/stock-opname/[id]/scan/route.ts`
  - `app/dashboard/layout.tsx`
- **Detail Kendala:**
  1. `GET`/`POST` di `app/api/finance/cash/route.ts` tidak memanggil `getAuthSession()`, sehingga siapa pun tanpa login bisa membaca dan menambah data `CashTransaction`.
  2. `POST`/`DELETE` di `app/api/brands/route.ts` tidak memanggil `getAuthSession()`, sehingga mutasi file `data/custom_brands.json` terbuka untuk publik.
  3. `app/api/settings/users/route.ts` hanya mengecek `if (!session)` tanpa memvalidasi `role` — user ber-role `BORROWER` bisa mengambil seluruh daftar user dan membuat akun `SUPER_ADMIN`. Endpoint ini juga duplikat dari `app/api/admin/users/route.ts`.
  4. `POST` di `app/api/penalties/pay/route.ts` tidak memvalidasi kepemilikan transaksi (`transaction.userId === session.user.id`), tidak memvalidasi `amount >= 0`, dan langsung mengubah status denda menjadi `PAID` tanpa bukti bayar/verifikasi petugas.
  5. Endpoint mutasi aset, gedung, persetujuan pengadaan, dan stock opname hanya mengecek `!session` tanpa mengecek `role`.
  6. Guard frontend di `app/dashboard/layout.tsx` belum memblokir `BORROWER` dan `APPROVER` dari beberapa rute administratif yang tidak tercantum untuk mereka di `components/layout/Sidebar.tsx`.
- **Dampak:** Kebocoran data keuangan/user, potensi *privilege escalation*, dan manipulasi data master oleh role peminjam.
- **Rencana Pengembangan:**
  - [ ] Buat helper guard otorisasi terpusat (mis. `requireRole(allowedRoles)`) di `lib/auth.ts`.
  - [ ] Terapkan `requireRole` di seluruh API mutasi & endpoint sensitif (`finance/cash`, `brands`, `settings/users`, `assets`, `buildings`, `procurement`, `stock-opname`, `reports/analytics`).
  - [ ] Pada `penalties/pay`, wajibkan bukti bayar untuk `BORROWER` (status `PENDING_VERIFICATION`) dan batasi konfirmasi `PAID` langsung hanya untuk `ADMIN`/`SUPER_ADMIN`/`STAFF`, serta validasi `amount > 0`.
  - [ ] Sinkronkan daftar rute terproteksi di `app/dashboard/layout.tsx` dengan matriks akses `components/layout/Sidebar.tsx`.

---

### 2. Modul Sewa Ruangan & Sewa Aset Komersial (`Room Bookings` & `Rentals`)
- **Lokasi File:**
  - `app/api/room-bookings/route.ts`, `app/api/room-bookings/[id]/route.ts`, `app/api/room-bookings/[id]/checkout/route.ts`
  - `app/api/rentals/route.ts`, `app/dashboard/rentals/page.tsx`, `app/dashboard/rentals/new/page.tsx`
  - `app/dashboard/room-bookings/page.tsx`, `app/dashboard/room-bookings/new/page.tsx`
  - `prisma/schema.prisma` (model `Rental`)
- **Detail Kendala:**
  1. **Kebocoran Data Query:** Saat `session.user.phone` kosong/null, klausa `{ phone: undefined }` di dalam `OR` Prisma di `app/api/room-bookings/route.ts` dan `app/api/rentals/route.ts` terevaluasi menjadi `{}` sehingga mengembalikan data milik semua penyewa.
  2. **Cek Kuota Selalu 0:** `roomBooking.count({ where: { renterId: userId } })` membandingkan `Renter.id` dengan `User.id`.
  3. **Mode Multi-Hari `DAILY` Gagal:** Form `room-bookings/new/page.tsx` menyediakan sewa multi-hari `DAILY`, namun `POST /api/room-bookings` menolak jika `diffHours > 12`.
  4. **Bentrok Jadwal & Add-on Tidak Konsisten:** Pengecekan bentrok melewatkan status `APPROVED` dan `RETURN_REQUESTED`; `addonAssets` hanya disimpan untuk `EXTERNAL_SEWA` padahal `addonSubtotal` juga dihitung untuk `MAHASISWA`.
  5. **Alur Checkout Borrower Macet:** Tombol *"Ajukan Selesai Pemakaian"* mengirim `{ bookingStatus: 'RETURN_REQUESTED' }` ke `PATCH /api/room-bookings/[id]`, namun ditolak `403` untuk `BORROWER`, sedangkan endpoint `checkout` hanya menerima status `ACTIVE`.
  6. **Cancel Tanpa Catatan Gagal:** UI `rentals/page.tsx` mengirim cancel tanpa `notes`, ditolak `400` oleh `PATCH /api/room-bookings/[id]`.
  7. **Aset Alokasi Ruangan Tidak Tampil:** `GET /api/room-bookings/[id]` hanya mengambil `assets` dengan `isFixedToRoom: true`, melewatkan `roomAllocations` (`RoomAssetAllocation`), sehingga tidak muncul saat check-in/out.
  8. **Refund Deposit Keliru:** `checkout/route.ts` selalu mengeset `payStatus: 'REFUNDED'` walau `depositAmount === 0`.
  9. **Mismatch Skema `Rental` & Link 404:** Model `Rental` di `prisma/schema.prisma` tidak memiliki kolom `status`, `checkOutTime`, `updatedAt`, maupun `paymentScheme`, sehingga tombol Bayar & filter status di UI selalu gagal. Link `/dashboard/rentals/[id]` dan `/api/rentals/[id]/pdf` belum ada (**404**).
  10. **Single-Asset Rental:** `rentals/new` hanya mendukung 1 aset, mengubah `asset.status = 'RENTED'` global tanpa menghitung `availableQty`, dan belum memiliki alur pengembalian/inspeksi sewa aset.
- **Rencana Pengembangan:**
  - [ ] Perbaiki filter kepemilikan `Renter` dengan memfilter `email` dan hanya menambahkan kondisi `phone` jika tidak kosong.
  - [ ] Perbaiki perhitungan kuota booking dengan mencocokkan `renter.email === user.email`.
  - [ ] Izinkan rentang multi-hari pada `POST /api/room-bookings` saat mode sewa `DAILY`, dan lengkapi filter status bentrok (`APPROVED`, `RETURN_REQUESTED`).
  - [ ] Izinkan `BORROWER` mengubah status ke `RETURN_REQUESTED` pada `PATCH` atau sediakan endpoint `/api/room-bookings/[id]/request-return` khusus borrower, dan izinkan `checkout` menerima `ACTIVE` maupun `RETURN_REQUESTED`.
  - [ ] Sertakan `roomAllocations` pada `GET /api/room-bookings/[id]` dan hanya set `payStatus: 'REFUNDED'` jika `depositAmount > 0`.
  - [ ] Tambahkan kolom `status`, `checkOutTime`, `paymentScheme` pada model `Rental` di `prisma/schema.prisma`, buat halaman detail `/dashboard/rentals/[id]` + PDF `/api/rentals/[id]/pdf`, serta dukung multi-aset & pengurangan `availableQty`.

---

### 3. Modul Barang Habis Pakai (BHP / `Consumables`)
- **Lokasi File:**
  - `app/api/consumables/transactions/route.ts`
  - `app/dashboard/consumables/page.tsx`
- **Detail Kendala:**
  1. `GET` dan `POST` di `app/api/consumables/transactions/route.ts` belum memiliki guard role (`BORROWER` bisa membaca riwayat dan mengubah stok BHP).
  2. Validasi `quantity <= 0` dijalankan sebelum `parseInt(quantity)`, sehingga input desimal seperti `"0.5"` lolos validasi awal lalu berubah menjadi `0` saat disimpan.
  3. Tidak ada validasi eksplisit `['IN', 'OUT'].includes(type)` — nilai selain `'IN'` masuk ke cabang `else` yang langsung mengurangi stok tanpa melewati pengecekan stok cukup.
  4. Transaksi restock (`IN`) dengan `totalCost > 0` belum mencatat pengeluaran ke `CashTransaction`.
  5. Form transaksi BHP masih single-item (hanya bisa input 1 barang per pengiriman) dan belum memiliki bukti serah terima BHP.
- **Rencana Pengembangan:**
  - [ ] Batasi akses `GET`/`POST` transaksi BHP ke `SUPER_ADMIN`, `ADMIN`, dan `STAFF` (serta `APPROVER` baca-saja jika diperlukan).
  - [ ] Lakukan `const qty = parseInt(String(quantity), 10)` di awal lalu validasi `Number.isInteger(qty) && qty > 0` dan `['IN', 'OUT'].includes(type)`.
  - [ ] Bungkus mutasi stok + pembuatan record `CashTransaction` (saat `IN` dan `totalCost > 0`) di dalam `prisma.$transaction`.
  - [ ] Tingkatkan UI & API menjadi multi-item dalam satu pengajuan pengambilan/restock BHP serta cetak bukti serah terima BHP.

---

### 4. Modul Handover & Inspeksi Pengembalian (`Handovers` & `Returns`)
- **Lokasi File:**
  - `prisma/schema.prisma` (model `HandoverLog`)
  - `app/api/handovers/route.ts`, `app/api/handovers/pending/route.ts`
  - `app/api/returns/inspect/route.ts`, `app/dashboard/returns/[loanId]/page.tsx`
- **Detail Kendala:**
  1. `HandoverLog` memiliki constraint `@unique` pada `loanId` dan `bookingId`, dan `POST /api/handovers` memakai `upsert`. Akibatnya saat `CHECK_OUT` dicatat, log `CHECK_IN` sebelumnya tertimpa dan riwayat kondisi awal hilang.
  2. Cabang `bookingId` di `POST /api/handovers` tidak memperbarui `checkInTime`/`checkOutTime`, `Location.status`, `addonAssets`, denda overtime, refund deposit, maupun `CashTransaction`, serta meng-hardcode nominal klaim `1500000`.
  3. `GET /api/handovers/pending` belum menyertakan status `RETURN_REQUESTED`.
  4. `POST /api/returns/inspect` tidak memvalidasi status `loan` sebelum memproses dan tidak memakai `prisma.$transaction`, sehingga klik ganda berisiko menambah `availableQty` dua kali dan membuat duplikat `Violation`.
- **Rencana Pengembangan:**
  - [ ] Hapus `@unique` pada `loanId`/`bookingId` di `HandoverLog` (ubah ke relasi one-to-many atau unique per `(loanId, type)` / `(bookingId, type)`) agar log `CHECK_IN` dan `CHECK_OUT` tersimpan terpisah sebagai pembanding.
  - [ ] Konsolidasikan alur check-in/out booking ruangan ke satu handler yang seragam agar status ruangan, denda overtime, deposit, dan kas selalu sinkron.
  - [ ] Tambahkan `RETURN_REQUESTED` ke `/api/handovers/pending` dan bungkus `/api/returns/inspect` dengan `prisma.$transaction` + guard idempoten status.

---

### 5. Modul Detail Ruangan (`Rooms`)
- **Lokasi File:**
  - `app/dashboard/rooms/[id]/page.tsx`
  - `app/dashboard/rooms/[id]/edit/page.tsx`
  - `app/api/rooms/[id]/availability/route.ts`, `app/api/rooms/[id]/route.ts`
- **Detail Kendala:**
  1. `TabKetersediaan` di `rooms/[id]/page.tsx` memanggil `/api/rooms/[id]/availability` tanpa query `startTime` & `endTime`, sehingga selalu menerima error `400`, dan mengharapkan array slot sementara API mengembalikan objek `{ isAvailable, ... }`.
  2. `TabRiwayat` membaca `room.bookings`, `b.renterName`, dan `b.status`, padahal API mengembalikan `roomBookings`, `b.renter.name`, dan `b.bookingStatus` — menyebabkan tab Riwayat Sewa selalu kosong.
  3. `TabInfo` membaca `room.areaName`, padahal nama kolom di skema adalah `room.room`.
  4. `rooms/[id]/edit/page.tsx` memanggil `JSON.parse(data.photos)` tanpa `try/catch`.
- **Rencana Pengembangan:**
  - [ ] Tambahkan mode query per-tanggal (`?date=YYYY-MM-DD`) atau kirim default rentang hari ini pada `/api/rooms/[id]/availability` agar tab ketersediaan dapat menampilkan jadwal terpakai dan slot kosong.
  - [ ] Sesuaikan field UI `rooms/[id]/page.tsx` menjadi `room.roomBookings`, `b.renter?.name`, `b.bookingStatus`, dan `room.room`.
  - [ ] Bungkus `JSON.parse(data.photos)` di `rooms/[id]/edit/page.tsx` dengan `try/catch`.

---

### 6. Modul Ganti Rugi & Klaim (`Claims`)
- **Lokasi File:**
  - `app/dashboard/claims/page.tsx`
  - `app/api/claims/[id]/route.ts`
- **Detail Kendala:**
  1. Tab status di UI hanya memiliki `NEW`, `INVESTIGATING`, `AWAITING_PAYMENT`, `RESOLVED`, sementara API mengubah status ke `PENDING_APPROVAL` (saat user upload bukti bayar) dan `REJECTED` — klaim dengan dua status tersebut hilang dari tabel/tab.
  2. Query `/api/room-bookings?userId=${userId}` diabaikan oleh endpoint `GET /api/room-bookings`.
  3. State `deactivateAsset` di modal penagihan tidak pernah dikirim ke body request `handleBillClaim`.
  4. Logika waiver otomatis untuk `statusAsuransi === 'APPROVED_BY_INSURANCE'` yang tertulis di UI belum diimplementasikan di `PATCH /api/claims/[id]`.
  5. Pembuatan record `Maintenance` dengan `claimId` belum mengecek duplikasi (rawan error `@unique`), dan pelunasan klaim belum mencatat pemasukan ke `CashTransaction`.
- **Rencana Pengembangan:**
  - [ ] Tambahkan tab `PENDING_APPROVAL` (Menunggu Verifikasi) dan `REJECTED` di `claims/page.tsx`.
  - [ ] Teruskan `deactivateAsset` ke payload `PATCH /api/claims/[id]` dan implementasikan update status aset menjadi `MAINTENANCE`/`INACTIVE`.
  - [ ] Implementasikan waiver otomatis saat klaim disetujui asuransi, cek keberadaan `Maintenance` sebelum create, serta catat `CashTransaction` (`IN`) saat klaim dinyatakan `RESOLVED`/lunas.

---

### 7. Konsolidasi Rute Duplikat, Link 404 QR Aset, & Cart
- **Lokasi File:**
  - `app/dashboard/assets/[id]/page.tsx`, `app/dashboard/assets/qr-labels/page.tsx`
  - `app/dashboard/page.tsx`, `components/layout/Sidebar.tsx`
  - `app/dashboard/verification/page.tsx`, `app/dashboard/verifications/page.tsx`
  - `app/dashboard/crm/page.tsx`, `app/dashboard/admin/users/page.tsx`
  - `app/dashboard/cart/page.tsx`, `app/api/cart/checkout/route.ts`
- **Detail Kendala:**
  1. **QR Code Aset 404:** QR Code diarahkan ke `${origin}/assets/${id}`, padahal rute publik `/assets/[id]` tidak ada (hanya ada `/dashboard/assets/${id}`).
  2. **Redirect Loop Borrower di Dashboard:** Card statistik `BORROWER` di `app/dashboard/page.tsx` mengarah ke `/dashboard/loans` dan `/dashboard/room-bookings` tanpa `?mode=my`, sehingga langsung di-redirect balik ke `/dashboard` oleh `layout.tsx`.
  3. **Shadowing `Link` & Duplikasi Verifikasi:** `verification/page.tsx` dan `verifications/page.tsx` menduplikasi fungsi serta mendeklarasikan `function Link` lokal yang menimpa `next/link` (memicu *full reload*).
  4. **Duplikasi Manajemen User & Sewa:** `crm/page.tsx` menduplikasi `admin/users/page.tsx` dengan kebijakan akses berbeda; `rentals/page.tsx` dan `room-bookings/page.tsx` menduplikasi tabel 2-tab dengan rute check-in/out yang berbeda.
  5. **Cart Tidak Terhubung ke Checkout API:** `cart/page.tsx` tidak memanggil `/api/cart/checkout` dan hanya meneruskan item pertama ke form single-item. Sementara `/api/cart/checkout` sendiri belum memakai auth, cek bentrok/kuota, maupun `$transaction`.
- **Rencana Pengembangan:**
  - [ ] Ubah URL QR aset ke `/dashboard/assets/${id}` (atau buat halaman publik `/assets/[id]` read-only).
  - [ ] Tambahkan `?mode=my` pada seluruh tautan `BORROWER` di `app/dashboard/page.tsx`.
  - [ ] Hapus `function Link` lokal dan konsolidasikan rute duplikat (`verification` vs `verifications`, `rentals` vs `room-bookings`, `crm` vs `admin/users`).
  - [ ] Perbarui `cart/page.tsx` agar dapat meneruskan seluruh item keranjang atau mengamankan `/api/cart/checkout` dengan auth, validasi jadwal, dan transaksi atomik.

---

## 🟡 PRIORITAS SEDANG (Laporan, Denda, Pengadaan, Opname, & Dead UI)

### 8. Modul Laporan & Analitik (`Reports`)
- **Lokasi File:** `app/dashboard/reports/page.tsx`, `app/api/reports/analytics/route.ts`
- **Detail Kendala:**
  - `GET /api/reports/analytics` belum memiliki guard role.
  - Menghitung booking ruang belum lunas sebagai `countPaid`.
  - Perhitungan `assetRentals` melewatkan `operatorFee`, ekspor CSV belum menyertakan data `consumables`, dan filter `year`/`month` diabaikan untuk data denda & pelanggaran.
  - UI membaca `b.totalDays` (tidak ada di `RoomBooking`) dan `colSpan` tabel tidak konsisten (7 vs 8 kolom).
- **Rencana Pengembangan:**
  - [ ] Batasi akses API analitik hanya untuk `SUPER_ADMIN`, `ADMIN`, dan `APPROVER`.
  - [ ] Perbaiki kalkulasi `countPaid` berdasarkan `payStatus === 'PAID'`, tambahkan `operatorFee`, terapkan filter `year`/`month` ke seluruh metrik, dan perbaiki kolom `totalDays` / `colSpan` di `reports/page.tsx`.

### 9. Modul Denda & Penalti (`Penalties`)
- **Lokasi File:** `app/dashboard/penalties/page.tsx`, `app/dashboard/admin/penalties/page.tsx`, `app/api/penalties/route.ts`, `app/api/rentals/[id]/pay/route.ts`
- **Detail Kendala:**
  - `GET /api/penalties` dan `POST /api/rentals/[id]/pay` memblokir `STAFF` (`403`), bertentangan dengan menu di `Sidebar.tsx`.
  - Denda `RoomBooking.overtimeFee` belum ditampilkan di modul penalti.
  - Halaman `admin/penalties/page.tsx` masih minim fitur operasional (belum ada input denda manual, verifikasi bukti bayar, atau cetak kuitansi).
- **Rencana Pengembangan:**
  - [ ] Izinkan `STAFF` mengakses modul denda sesuai `Sidebar.tsx`.
  - [ ] Gabungkan tagihan `RoomBooking.overtimeFee` ke dalam daftar denda & penalti.
  - [ ] Tambahkan aksi verifikasi pembayaran dan cetak kuitansi denda pada `admin/penalties/page.tsx`.

### 10. Modul Pengadaan (`Procurement`)
- **Lokasi File:** `app/dashboard/procurement/page.tsx`, `app/dashboard/procurement/[id]/bast/page.tsx`, `app/api/procurement/route.ts`, `app/api/procurement/[id]/receive/route.ts`
- **Detail Kendala:**
  - `POST /api/procurement/[id]/receive` memblokir `STAFF` (`403`) padahal tombol tampil untuk `STAFF` di UI.
  - Tabel item belum memiliki input `brand` terpisah dan menyimpan satuan ke dalam `specs` alih-alih kolom `ProcurementItem.unit`.
  - Tombol Reject tidak meminta alasan penolakan (`rejectionReason`).
  - Proses `receive` memakai `asset.count()` (rawan bentrok kode aset saat paralel) dan belum mencatat `CashTransaction` / `AuditLog`.
  - Halaman BAST pengadaan memakai `updatedAt` sebagai tanggal terima sebelum barang diterima dan mencantumkan `requestedBy.name` sebagai penerima Sarpras.
- **Rencana Pengembangan:**
  - [ ] Samakan izin `STAFF` pada endpoint `receive` dan tambahkan modal alasan penolakan saat Reject.
  - [ ] Pisahkan field `brand` dan `unit` pada form & API pengadaan.
  - [ ] Gunakan sequence/kode unik yang aman di `receive`, catat `CashTransaction` (`OUT`) + `AuditLog`, serta perbaiki tanggal & pihak penandatangan di BAST pengadaan.

### 11. Modul Stock Opname
- **Lokasi File:** `app/dashboard/stock-opname/page.tsx`, `app/dashboard/stock-opname/[id]/report/page.tsx`, `app/api/stock-opname/route.ts`, `app/api/stock-opname/[id]/reconcile/route.ts`
- **Detail Kendala:**
  - Sesi opname per ruangan belum menyertakan aset dari tabel `RoomAssetAllocation`.
  - Proses `reconcile` tidak memperbarui `Asset.status` untuk temuan rusak berat/hilang dan menulis UUID mentah (`Location.id`/`User.id`) ke kolom `TransferLog.fromLocation`, `toLocation`, dan `transferredBy`.
  - Halaman laporan opname meng-hardcode nama pejabat penandatangan, belum menampilkan `matchItems`, dan print CSS belum menyembunyikan sidebar/header.
- **Rencana Pengembangan:**
  - [ ] Gabungkan `RoomAssetAllocation` saat membuat sesi opname ruangan.
  - [ ] Simpan nama lokasi dan nama petugas (bukan UUID mentah) pada `TransferLog` saat rekonsiliasi, serta sinkronkan `Asset.status` untuk barang hilang/rusak berat.
  - [ ] Hubungkan laporan opname ke `DocumentTemplate` dan perbaiki print CSS + tampilan `matchItems`.

### 12. Dashboard Stats, Booking Ruangan New, & Tombol Mati (`Dead UI`)
- **Lokasi File:**
  - `app/dashboard/page.tsx`, `app/dashboard/room-bookings/new/page.tsx`
  - `app/dashboard/rooms/new/page.tsx`, `app/dashboard/rooms/[id]/edit/page.tsx`
  - `app/dashboard/admin/operators/page.tsx`, `app/dashboard/admin/partners/page.tsx`, `app/dashboard/finance/page.tsx`
- **Detail Kendala:**
  - `app/dashboard/page.tsx` mengecek `renterCategory === 'INTERNAL'` padahal nilai di DB adalah `'INTERNAL_KAMPUS'`/`'MAHASISWA'` (user internal tampil berlabel "Eksternal").
  - `room-bookings/new/page.tsx` langsung set `availabilityOk = true` dari `?roomId=...` tanpa cek API ketersediaan, tidak mengirim `paymentScheme`, dan mengecualikan `roomDeposit` pada mode `DP`.
  - `rooms/new` & `rooms/edit` masih meng-hardcode `BUILDING_UTILITIES_LIST`, belum mengambil data dinamis dari `/api/room-facilities`.
  - `admin/operators/page.tsx` dan `admin/partners/page.tsx` memiliki tombol Tambah/Edit/Hapus/Catat Komisi yang belum memiliki handler `onClick` (masih statis).
  - `finance/page.tsx` hanya *read-only*, belum ada form input Kas Masuk/Keluar manual dan filter tanggal/tipe.
- **Rencana Pengembangan:**
  - [ ] Perbaiki pengecekan `renterCategory` di `app/dashboard/page.tsx`.
  - [ ] Panggil `/api/rooms/[id]/availability`, kirim `paymentScheme`, dan perbaiki kalkulasi `depositToPay` pada `room-bookings/new/page.tsx`.
  - [ ] Muat daftar utilitas ruangan dari `/api/room-facilities`.
  - [ ] Lengkapi CRUD backend & `onClick` handler untuk halaman Operator & Mitra, serta tambahkan form catat Kas & filter di `finance/page.tsx`.

---

## 🟢 PRIORITAS RENDAH (Template Dokumen & Navigasi Sidebar)

### 13. Hardcode Kop Surat & Penandatangan Statis
- **Lokasi File:**
  - `app/dashboard/rooms/[id]/kir/page.tsx`
  - `app/dashboard/procurement/[id]/bast/page.tsx`
  - `app/dashboard/assets/transfers/[id]/bast/page.tsx`
  - `app/dashboard/assets/[id]/disposal-report/page.tsx`
  - `app/dashboard/assets/qr-labels/page.tsx`
- **Detail Kendala:** Kop surat, nama instansi, dan nama/NIP pejabat penandatangan masih ditulis statis (*hardcode*), belum mengambil konfigurasi dari `/api/settings/template` (`DocumentTemplate`).
- **Rencana Pengembangan:**
  - [ ] Buat helper/hook bersama untuk mengambil `DocumentTemplate` dan terapkan pada seluruh halaman cetak (KIR, BAST Pengadaan, BAST Mutasi, Berita Acara Afkir, Label QR).

### 14. Rute Belum Terhubung di Sidebar & Minor Table Fix
- **Lokasi File:** `components/layout/Sidebar.tsx`, `app/dashboard/history/page.tsx`
- **Detail Kendala:**
  - Halaman `rooms/facilities`, `admin/operators`, dan `buildings` belum tercantum di menu `Sidebar.tsx`.
  - `app/dashboard/history/page.tsx` masih memakai `colSpan={7}` pada tabel 8 kolom saat kondisi loading/kosong.
- **Rencana Pengembangan:**
  - [ ] Tambahkan tautan menu yang sesuai di `Sidebar.tsx` dan perbaiki `colSpan={8}` pada `history/page.tsx`.


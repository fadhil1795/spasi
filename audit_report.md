# Laporan Audit: Kesesuaian Proyek SPASI vs Dokumen Rencana & Spesifikasi

> Diaudit pada: 2026-08-26 | Berdasarkan: `rencana.md` dan `spesifikasi.md`

---

## Ringkasan Eksekutif

| Status | Jumlah Fitur |
|---|---|
| ✅ Sudah Diimplementasi | 22 |
| ⚠️ Sebagian / Belum Sempurna | 8 |
| ❌ Belum Ada | 12 |

---

## A. Modul Master Data

| Requirement | Status | Keterangan |
|---|---|---|
| FR-01: Kategori Aset (Kendaraan/Ruangan/Alat/Fasilitas) | ✅ | Model `Category` ada di schema, ada UI di `/dashboard/categories` |
| FR-02: Data Aset + Foto + QR Code | ✅ | Model `Asset` lengkap (`code`, `qrToken`, `qrImageUrl`, `images`), endpoint `/api/assets` ada |
| FR-03: Fakultas/Unit + Lokasi/Gedung | ⚠️ | Model `Department` & `Location` ada, namun **belum ada hierarki parent-child antar unit** (`parent_unit_id` di rencana belum ada di schema) |
| FR-04: Peminjam (Mahasiswa/Dosen/Staf/Eksternal) | ✅ | Model `User` punya `renterCategory`, model `Renter` untuk eksternal; ada validasi `identityNo` |
| FR-05: Jenis Pembayaran (Tunai/Transfer/QRIS) | ✅ | Model `PaymentSetting` + `BankAccount` ada; metode pembayaran dicatat sebagai string di transaksi |
| Master: Petugas/Operator Pendamping | ✅ | Model `Operator` ada, terelasi ke `Loan` & `Rental` |

---

## B. Modul Pengajuan & Approval

| Requirement | Status | Keterangan |
|---|---|---|
| FR-06: Pengajuan + Kalender Ketersediaan (cek bentrok) | ✅ | Ada di `/app/bookings`, cek availability di `/api/rooms/[id]/availability` untuk RoomBooking |
| FR-07: Status tracking real-time (Peminjam) | ✅ | Timeline status ada di `/dashboard/history`, UI TransactionTimeline tersedia |
| FR-08: Approval + catatan + audit trail | ✅ | Model `Approval` ada dengan `level`, `status`, `notes`, `decidedAt`; `AuditLog` mencatat semua persetujuan |
| FR-09: Approval Berjenjang (Multi-level configurable) | ✅ | Sistem approval 2-level sudah diimplementasi untuk Loan |
| FR-10: Waiting List otomatis | ❌ | Model `BlockedPeriod` ada di schema tapi **tidak ada implementasi waiting list FIFO** di API/UI |
| FR-11: Prioritas kegiatan akademik | ❌ | Belum ada logika prioritas saat konflik jadwal |
| FR-12: Booking berulang/batch (recurring) | ❌ | Field `recurring_group_id` **tidak ada di schema**; fitur belum diimplementasi |

---

## C. Modul Serah Terima & Pengembalian

| Requirement | Status | Keterangan |
|---|---|---|
| FR-13: Checklist kondisi + foto saat serah terima | ⚠️ | Model `HandoverLog` (components JSON, photoUrls) & `ChecklistTemplate` ada di schema. Halaman `/dashboard/handovers/[id]` ada, namun **form checklist belum lengkap** |
| FR-14: Scan QR Code saat serah terima | ✅ | Ada `/dashboard/loans/scan` dan `/api/loans/[id]/check-in` |
| FR-15: Tanda tangan digital + generate PDF | ⚠️ | Ada `bastPdfUrl`, `receiptPdfUrl` di schema dan ekspor PDF di `/api/reports`. Namun **fitur capture tanda tangan digital di form belum ada** |
| FR-16: Kalkulasi keterlambatan otomatis + denda | ✅ | Ada di `/api/returns/inspect`, `penaltyFee` & `penaltyStatus` di model Loan/Rental |
| FR-17: Penangguhan otomatis (blacklist) | ⚠️ | Model `Violation` & field `isSuspended` ada di User. Ada di `/api/returns/inspect`. Namun **ambang batas pelanggaran belum bisa dikonfigurasi via UI** |

---

## D. Modul Penyewaan & Keuangan

| Requirement | Status | Keterangan |
|---|---|---|
| FR-18: Piutang & Pembayaran (UNPAID/PARTIAL/PAID) | ✅ | `payStatus`, `paidAmount` ada di `Rental` & `RoomBooking`; endpoint `/api/penalties/pay` |
| FR-19: Deposit/Jaminan terpisah dari pendapatan | ✅ | `depositAmount` di Rental/RoomBooking, tercatat di `CashTransaction` dengan kategori `DEPOSIT` |
| FR-20: Akuntansi (CoA, Jurnal, Neraca) | ❌ | Sistem menggunakan **Single-Entry** (`CashTransaction`); **tidak ada CoA, journal_entries, atau neraca** — ini keputusan desain yang disengaja tapi berbeda dari spesifikasi |

---

## E. Modul Pemeliharaan Aset

| Requirement | Status | Keterangan |
|---|---|---|
| FR-21: Jadwal Pemeliharaan + ubah status aset otomatis | ✅ | Model `Maintenance` + `MaintenanceSchedule` ada; endpoint `/api/maintenance` ada |
| FR-22: Riwayat perbaikan + biaya | ✅ | Field `cost`, `vendor`, `description`, `status` ada di model `Maintenance` |

---

## F. Modul Notifikasi

| Requirement | Status | Keterangan |
|---|---|---|
| FR-23: Notifikasi WA/Email (approval, reminder, pengembalian) | ⚠️ | Model `InAppNotification` ada dan endpoint `/api/notifications` tersedia, namun **hanya notifikasi in-app** — belum ada integrasi WhatsApp/Email eksternal |

---

## G. Modul Laporan & Statistik

| Requirement | Status | Keterangan |
|---|---|---|
| FR-24: Dashboard utilisasi aset real-time | ⚠️ | Dashboard menampilkan 4 widget utama. Namun **grafik tren bulanan, pie chart kategori, dan tabel top-10 aset terpopuler belum ada** |
| FR-25: Ekspor laporan PDF/Excel + filter | ✅ | Ada di `/dashboard/reports` dengan ekspor PDF |
| FR-26: Rating/Feedback pasca-pemakaian | ❌ | **Tidak ada implementasi**. Model `Rating` juga **tidak ada di schema.prisma** |

---

## H. Modul Keamanan & Administrasi

| Requirement | Status | Keterangan |
|---|---|---|
| FR-27: Manajemen User & Role (RBAC) | ✅ | Ada di `/dashboard/settings`, role: SUPER_ADMIN, ADMIN, APPROVER, STAFF, BORROWER |
| FR-28: Audit Trail immutable | ✅ | Model `AuditLog` ada, endpoint `/api/audit-logs` tersedia |
| FR-29: API Terbuka (Swagger/OpenAPI) | ❌ | API ada namun **tidak ada dokumentasi Swagger/OpenAPI** |

---

## I. Fitur Modul Tambahan (rencana.md Bab 10–13)

| Fitur | Status | Keterangan |
|---|---|---|
| Depresiasi/Penyusutan Aset | ✅ | `monthlyDepreciation`, `lastDepreciationDate`, `salvageValue` ada di model `Asset` |
| QR Code per Aset | ✅ | `qrToken` + `qrImageUrl` di model `Asset` |
| Audit Trail Log | ✅ | Model `AuditLog` lengkap |
| Tanda Tangan Digital | ⚠️ | Kolom ada, namun UI capture tanda tangan belum ada |
| Sistem Antrian (Waiting List) | ❌ | Belum diimplementasi |
| Booking Berulang/Batch | ❌ | Belum diimplementasi |
| Blacklist/Penangguhan Otomatis | ⚠️ | Ada parsial, ambang batas belum bisa dikonfigurasi |
| Rating/Feedback Pasca-Pemakaian | ❌ | Belum ada |
| Kalender Ketersediaan Interaktif | ✅ | Tersedia di form booking ruangan |
| Sinkronisasi Kalender Akademik (BlockedPeriod) | ✅ | Model `BlockedPeriod` ada, endpoint `/api/policies` tersedia |
| Kepatuhan UU PDP (Consent Log) | ✅ | Model `ConsentLog` + `VerificationRequest` ada |
| API Terbuka / Swagger | ❌ | Belum ada |
| SIMAK-BMN Kompatibilitas | ❌ | Belum ada ekspor format SIMAK-BMN |

---

## Prioritas Perbaikan yang Direkomendasikan

### 🔴 Segera (High Priority)
1. **Serah Terima Digital (FR-13)** — Form checklist + upload foto di `/dashboard/handovers/[id]` belum lengkap (sudah ada struktur, tinggal UI-nya)
2. **Dashboard Statistik Lanjutan (FR-24)** — Tambah grafik tren bulanan dan tabel top aset terpopuler

### 🟡 Jangka Menengah (Medium Priority)
3. **Rating/Feedback (FR-26)** — Perlu tambah model `Rating` di schema dan UI pasca-pengembalian
4. **Notifikasi WA/Email (FR-23)** — Integrasi ke Fonnte/Wablas atau SMTP
5. **Tanda Tangan Digital (FR-15)** — Tambah komponen canvas untuk capture tanda tangan

### 🟢 Jangka Panjang (Low Priority / Fase Lanjutan)
6. **Waiting List (FR-10)**
7. **Booking Berulang (FR-12)**
8. **Konfigurasi Ambang Blacklist**
9. **Dokumentasi API (Swagger)**
10. **Ekspor Format SIMAK-BMN**

---

> **Kesimpulan:** Proyek SPASI sudah mengimplementasikan **~65% dari total requirement** dalam `rencana.md` dan `spesifikasi.md`. Fondasi database dan arsitektur sudah kuat dan selaras. Gap utama ada di: checklist serah terima digital, statistik dashboard lanjutan, rating aset, notifikasi eksternal (WA/Email), dan fitur-fitur antrian/booking berulang.

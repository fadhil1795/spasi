# Rencana Komprehensif Penyempurnaan Sistem Informasi Manajemen Sarpras & SPASI

Dokumen perencanaan teknis dan operasional untuk menutup seluruh kekurangan modul, mengantisipasi celah sistem (*system loopholes*), dan menyelaraskan ekosistem **Peminjaman Internal** serta **Penyewaan Komersial** pada aplikasi **SPASI**.

---

## 1. Analisis Kesenjangan & Celah Sistem (*Gap & Vulnerability Analysis*)

### A. Kesenjangan Modul Sarpras (Belum Ada di Aplikasi)
1. **Kartu Inventaris Ruangan (KIR)**: Belum ada fitur cetak lembar inventaris standar institusi untuk ditempel di setiap pintu/dinding ruangan yang merinci semua aset di ruangan tersebut beserta penanggung jawabnya.
2. **Berita Acara Mutasi Fisik (BAST Mutasi)**: Mutasi tercatat di `TransferLog`, namun belum dapat mencetak dokumen Berita Acara Pemindahan Aset resmi bertanda tangan petugas pengirim & penerima.
3. **Alur Penghapusan / Pemutihan Aset (Asset Disposal)**: Kolom database sudah ada (`salvageValue`, `disposalReason`, `disposalDocUrl`), tetapi belum ada alur pengajuan penghapusan aset rusak berat/afkir/lelang dengan approval pimpinan.
4. **Modul Stock Opname Terstruktur**: Scan QR kamera sudah ada di transaksi serah terima, namun belum ada modul terpadu untuk melakukan audit fisik tahunan per ruangan (menghitung aset hilang, salah kamar, atau berubah kondisi).
5. **Pengadaan Aset Baru (Procurement)**: Belum ada antarmuka usulan kebutuhan barang dari unit/jurusan ke pimpinan sebelum barang dibeli dan didaftarkan sebagai aset.
6. **Barang Habis Pakai / ATK (Consumables)**: Belum ada pencatatan stok barang sekali pakai (kertas HVS, spidol, tinta, kabel roll) dengan peringatan stok minimum.

### B. Celah Operasional & Bisnis (*Loopholes & Vulnerabilities*)
1. **Celah Bentrok Kalender (*Race Condition*)**: Pengecekan ketersediaan ruangan/alat di frontend berisiko ditembus jika dua pengguna mengajukan checkout pada detik yang sama tanpa *database transaction lock* di backend.
2. **Celah Deposit Tanpa Rekening Pengembalian**: Saat penyewa eksternal menyetor deposit jaminan, sistem belum mewajibkan nomor rekening/bank tujuan pengembalian dana (*refund bank account*).
3. **Celah Proteksi API**: Sebagian endpoint API publik perlu diperketat agar peran `BORROWER` tidak bisa memanggil mutasi atau perubahan status aset via HTTP request langsung.
4. **Celah Ketidaksesuaian Antara Jam Operasional & Jadwal Pengembalian**: Belum ada pembatasan agar jam pengembalian aset tidak jatuh di luar jam kerja petugas sarpras (misal: pengembalian jam 23:00 malam saat kampus tutup).

---

## 2. Roadmap Implementasi 4 Fase

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 1: DOKUMEN RESMI SARPRAS & PENGHAPUSAN (PRIORITAS UTAMA)               │
│ • Cetak Kartu Inventaris Ruangan (KIR) per Ruangan/Gedung                   │
│ • Cetak Berita Acara Serah Terima (BAST) Mutasi Perpindahan Aset            │
│ • Modul Penghapusan / Pemutihan Aset (Asset Disposal & Afkir)               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 2: AUDIT FISIK & STOCK OPNAME QR                                       │
│ • Sesi Stock Opname Per Ruangan (Pemilihan Gedung/Ruang Target)             │
│ • Pemindaian Massal Barcode/QR Kamera HP Petugas                            │
│ • Laporan Selisih Fisik vs Sistem (Ditemukan / Hilang / Salah Ruangan)      │
│ • Rekonsiliasi Otomatis Status & Lokasi Aset Pasca-Opname                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 3: INTEGRASI KEUANGAN SEWA, DEPOSIT & ANTI-BENTROK                     │
│ • Database Transaction Lock (Pencegah Double Booking pada Detik Sama)       │
│ • Formulir Rekening Refund Deposit Jaminan saat Pemesanan Sewa              │
│ • Validasi Jam Operasional Kampus pada Jadwal Pengambilan/Pengembalian      │
│ • Pengetatan Otorisasi API Endpoint (RBAC Strict Guard)                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 4: PENGADAAN & BARANG HABIS PAKAI (PENGEMBANGAN LANJUTAN)              │
│ • Usulan Pengadaan Aset dari Unit/Jurusan & Approval Anggaran Pimpinan      │
│ • Registrasi Otomatis Kode Aset & Barcode saat Penerimaan Barang Pengadaan  │
│ • Inventaris Barang Habis Pakai (ATK) & Peringatan Stok Minimum             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Rincian Teknis Per Fase

### 🏷️ Fase 1: Dokumen Resmi Sarpras & Penghapusan
- **1.1. Cetak Kartu Inventaris Ruangan (KIR)**:
  - Rute: `/dashboard/rooms/[id]/kir`
  - Konten: Kop institusi, data ruangan (Kode, Nama, Lantai, Luas, PIC Unit), tabel aset aktif di ruangan tersebut, kolom kondisi fisik (Baik, Rusak Ringan, Rusak Berat), dan tanda tangan Kepala Bagian Sarpras & Penanggung Jawab Ruangan.
  - Tombol **"Cetak KIR (PDF / Print)"** langsung dari halaman detail ruangan.
- **1.2. Berita Acara Mutasi (BAST Mutasi)**:
  - Rute: `/dashboard/assets/transfers`
  - Cetak dokumen BAST resmi setiap kali aset dipindahkan dari satu ruangan ke ruangan lain atau antar jurusan.
- **1.3. Modul Penghapusan Aset (Asset Disposal)**:
  - Rute: `/dashboard/assets/disposal` & tab di detail aset.
  - Form usulan: Jenis penghapusan (Afkir Rusak Berat, Lelang, Hibah, Hilang), alasan teknis, estimasi nilai sisa (*salvage value*), dan unggah dokumen bukti.
  - Aset berstatus `DISPOSED` otomatis terkunci permanen dari katalog pinjam/sewa.

### 📷 Fase 2: Audit Fisik & Stock Opname QR
- **2.1. Model Database Stock Opname**:
  - `StockOpnameSession`: id, sessionNumber, locationId, status (`OPEN`, `IN_PROGRESS`, `COMPLETED`), createdBy, startedAt, completedAt.
  - `StockOpnameItem`: id, sessionId, assetId, expectedLocationId, actualLocationId, scanStatus (`MATCH`, `MISSING`, `WRONG_LOCATION`), condition (`BAIK`, `RUSAK_RINGAN`, `RUSAK_BERAT`), notes, scannedAt.
- **2.2. Antarmuka Pemindai Lapangan**:
  - Rute: `/dashboard/stock-opname/[id]/scan`
  - Tampilan responsif mobile: kamera scanner aktif di bagian atas, daftar checklist aset yang belum terpindai di bagian bawah dengan indikator warna (Hijau = Ditemukan, Merah = Belum Ditemukan, Oranye = Salah Kamar).
- **2.3. Laporan & Penyesuaian**:
  - Rekapitulasi selisih instan yang dapat dicetak (*Berita Acara Stock Opname*) dan tombol sinkronisasi data sistem.

### 🔒 Fase 3: Penutupan Celah Keamanan & Transaksi
- **3.1. Pencegah Bentrok Tingkat Database (*Concurrency Lock*)**:
  - Pada API `/api/room-bookings` dan `/api/loans`, gunakan `prisma.$transaction` dengan pengecekan `findFirst` irisan waktu secara terisolasi sebelum pembuatan record, sehingga pemesanan paralel pada milidetik yang sama akan ditolak secara aman.
- **3.2. Form Data Rekening Refund Deposit**:
  - Tambahkan input nama bank, nomor rekening, dan nama pemilik rekening pada alur checkout sewa komersial.
  - Saat kasir menyetujui pengembalian deposit, sistem mencatat nomor referensi transfer pengembalian ke `CashTransaction`.
- **3.3. Batasan Jam Operasional Serah Terima**:
  - Validasi jadwal sewa/pinjam agar waktu pengambilan dan pengembalian hanya berada dalam rentang jam operasional (misal: 07:30 – 17:30 WIB) kecuali ada izin lembur khusus.

### 📦 Fase 4: Pengadaan & Barang Habis Pakai
- **4.1. Modul Pengadaan (Procurement)**:
  - Model `ProcurementRequest` & `ProcurementItem`.
  - Alur: Pengajuan Unit -> Review Sarpras -> Persetujuan Pimpinan -> Pembelian Vendor -> Penerimaan (Otomatis generate `Asset` baru dengan kode urut berikutnya).
- **4.2. Barang Habis Pakai (ATK / Consumables)**:
  - Model `Consumable` (nama, satuan, stok, stok minimum) & `ConsumableTransaction` (stok masuk/keluar).
  - Indikator peringatan stok menipis di dashboard utama.

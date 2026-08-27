# 🏢 Dokumentasi Fitur Sewa Ruangan & Inventaris Aset Terintegrasi (SPASI)

Dokumen ini berisi penjelasan arsitektur, alur kerja, skema basis data (MySQL), dan panduan penggunaan untuk modul **Sewa Ruangan dan Inventaris Aset Terintegrasi** pada aplikasi SPASI.

---

## 📌 Ringkasan Sistem

Modul ini mengintegrasikan penggelaran ruangan sewa (seperti Aula, Ruang Rapat Executive, Studio) dengan inventaris aset fisik. Penyewa dapat menyewa ruangan secara per jam atau per hari, serta menambahkan **Alat Tambahan (Add-On Assets)** seperti proyektor, laptop, kamera, atau sound system.

### Fitur Utama:
1. **Manajemen Ruangan Sewa (Admin)**: CRUD data ruangan, harga sewa per jam/hari, fasilitas, kapasitas, deposit jaminan, dan galeri foto.
2. **Katalog Publik (`/rooms`)**: Tampilan katalog ruangan responsif bebas autentikasi, dilengkapi pencarian kata kunci dan filter status.
3. **Pengecekan Ketersediaan Pintar (Anti-Double Booking)**: Pengecekan konflik waktu sewa real-time berdasarkan pemesanan aktif dan blokade manual (maintenance/kegiatan internal).
4. **Wizard Pemesanan 4 Langkah (Traveloka-Style)**:
   - **Langkah 1**: Pilih Ruangan & Rentang Waktu (Durasi otomatis terhitung).
   - **Langkah 2**: Pilih Alat Tambahan (Add-On) dengan selektor jumlah (+/-) dan kalkulasi biaya sewa per sesi.
   - **Langkah 3**: Pengisian Data Penyewa (Nama/Instansi, WhatsApp, Email, NIK) & Skema Pembayaran (DP 50% / Lunas via Transfer, QRIS, Cash).
   - **Langkah 4**: Ringkasan & Tagihan (Sewa + Add-On + Deposit = Grand Total).
5. **E-Voucher & QR Code (`/bookings/[bookingNumber]`)**: Halaman konfirmasi booking dilengkapi QR Code unik untuk validasi Check-In/Check-Out.
6. **Inspeksi Check-In & Check-Out dengan Klaim Kerusakan**:
   - **Check-In**: Petugas memeriksa kondisi aset bawaan ruangan (`isFixedToRoom`) dan alat add-on saat penyerahan kunci.
   - **Check-Out**: Petugas memeriksa kembali kondisi aset. Jika ada barang rusak/hilang, sistem menghitung denda/klaim yang dipotong otomatis dari deposit jaminan.
7. **Scanner QR Code Petugas (`/dashboard/room-bookings/scan`)**: Memindai E-Voucher penyewa via kamera HP / input manual nomor booking untuk mempercepat proses Check-In & Check-Out.

---

## 🗄️ Skema Basis Data (Prisma / MySQL)

Modul ini menggunakan tabel-tabel berikut pada MySQL (`spasi_db`):

### 1. `Location` (Ruangan)
```prisma
model Location {
  id                 String                  @id @default(cuid())
  code               String?                 @unique // Kode ruangan: R-201, STUDIO-A
  name               String                  @default("")
  building           String
  floor              String?
  room               String?
  area               Float?                  // Luas m²
  capacity           Int?                    // Kapasitas orang
  pricePerHour       Float?                  // Tarif per jam
  pricePerDay        Float?                  // Tarif per hari
  depositAmount      Float?                  // Deposit jaminan
  description        String?                 @db.Text
  status             String                  @default("AVAILABLE") // AVAILABLE, RENTED, MAINTENANCE, INACTIVE
  facilities         String                  @db.Text // JSON string array
  photos             String                  @db.Text // JSON string array
  assets             Asset[]
  roomBookings       RoomBooking[]
  availabilityBlocks RoomAvailabilityBlock[]
}
```

### 2. `RoomBooking` (Pemesanan Ruangan)
```prisma
model RoomBooking {
  id            String              @id @default(cuid())
  bookingNumber String              @unique // BK-YYYY-NNNN
  locationId    String
  location      Location            @relation(...)
  renterId      String
  renter        Renter              @relation(...)
  startTime     DateTime
  endTime       DateTime
  durationHours Float?
  roomRate      Float
  roomSubtotal  Float
  addonSubtotal Float               @default(0)
  totalAmount   Float
  depositAmount Float               @default(0)
  bookingStatus String              @default("PENDING") // PENDING, CONFIRMED, ACTIVE, COMPLETED, COMPLETED_WITH_CLAIM, CANCELLED
  payStatus     String              @default("UNPAID")  // UNPAID, DOWN_PAYMENT, PAID, REFUNDED, CLAIMED
  payMethod     String?
  notes         String?             @db.Text
  checkInTime   DateTime?
  checkOutTime  DateTime?
  addonAssets   BookingAddonAsset[]
  inspections   BookingInspection[]
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @default(now()) @updatedAt
}
```

### 3. `BookingAddonAsset` (Alat Tambahan Sewa)
```prisma
model BookingAddonAsset {
  id             String      @id @default(cuid())
  bookingId      String
  booking        RoomBooking @relation(...)
  assetId        String
  asset          Asset       @relation(...)
  assetName      String
  quantity       Int         @default(1)
  ratePerSession Float
  subtotal       Float
}
```

### 4. `BookingInspection` (Log Inspeksi Barang)
```prisma
model BookingInspection {
  id              String      @id @default(cuid())
  bookingId       String
  booking         RoomBooking @relation(...)
  type            String      // CHECK_IN, CHECK_OUT
  assetId         String
  asset           Asset       @relation(...)
  assetName       String
  conditionBefore String?
  conditionAfter  String?
  isMissing       Boolean     @default(false)
  isDamaged       Boolean     @default(false)
  photoUrls       String      @db.Text
  claimAmount     Float?
  notes           String?     @db.Text
  inspectedBy     String
  timestamp       DateTime    @default(now())
}
```

---

## 🔄 Alur Pemrosesan Booking (Status Cycle)

```
[ PENDING ]  ──(Konfirmasi Admin)──>  [ CONFIRMED ]
     │                                     │
(Batal)                                (Check-In)
     ▼                                     ▼
[ CANCELLED ]                         [ ACTIVE ]
                                           │
                                      (Check-Out)
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
            (Tanpa Kerusakan)                             (Ada Kerusakan/Hilang)
                    │                                             │
             [ COMPLETED ]                             [ COMPLETED_WITH_CLAIM ]
```

---

## 💻 Panduan Pengujian & Endpoint API

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/rooms` | `GET` / `POST` | List ruangan publik/admin & tambah ruangan |
| `/api/rooms/[id]` | `GET` / `PUT` / `DELETE` | Detail ruangan, update, & hapus |
| `/api/rooms/[id]/availability` | `GET` | Cek ketersediaan slot jam & tanggal |
| `/api/room-bookings` | `GET` / `POST` | List booking & buat booking baru |
| `/api/room-bookings/[id]` | `GET` / `PATCH` | Detail booking & update status booking/pembayaran |
| `/api/room-bookings/[id]/checkin` | `POST` | Eksekusi Check-In & simpan checklist inspeksi |
| `/api/room-bookings/[id]/checkout` | `POST` | Eksekusi Check-Out, simpan inspeksi akhir & potong klaim |

---

*Dokumentasi ini telah diperbarui sesuai versi produksi SPASI MySQL.*

# SPASI — Design Document
## Panduan Desain UI/UX Sistem Manajemen Aset
**Versi**: 1.0 | **Tanggal**: Juli 2026

---

## 1. Filosofi Desain

> **"Powerful like enterprise, feels like consumer."**

SPASI dirancang untuk terasa **premium dan modern** seperti aplikasi SaaS terbaik, bukan seperti sistem informasi kampus. Tiga pilar desain:

1. **Clarity** — Informasi penting langsung terlihat tanpa perlu mencari
2. **Efficiency** — Tugas umum selesai dalam ≤ 3 klik
3. **Delight** — Animasi halus yang memberi feedback tanpa mengganggu

### Referensi Visual
| Referensi | Yang Diadopsi | Yang Ditingkatkan |
|---|---|---|
| **SPASI PUPR** | Hero landing, katalog publik, filter pill, card grid, hover scale | Gradient premium, dark mode, animasi, stat counter |
| **SiPinjamku** | Alur wizard, navigasi SPA, label Bahasa Indonesia | Visual design, micro-interaction, PWA support |

---

## 2. Design Tokens (CSS Variables)

### 2.1 Palet Warna

```
WARNA PRIMER (Indigo → Violet Gradient)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Primary 600   #4F46E5  ████  Utama (button, link aktif)
  Primary 700   #4338CA  ████  Hover state
  Primary 500   #6366F1  ████  Light variant
  Gradient      linear-gradient(135deg, #4F46E5, #7C3AED)

WARNA SEMANTIK
━━━━━━━━━━━━━━
  Success    #10B981  ████  Tersedia / Approved / Lunas
  Warning    #F59E0B  ████  Pending / Hampir Jatuh Tempo
  Danger     #EF4444  ████  Ditolak / Rusak / Overdue
  Info       #3B82F6  ████  Informasi / Maintenance

DARK MODE (DEFAULT)
━━━━━━━━━━━━━━━━━━━
  Background   #0F0F1A  ████  Warna dasar halaman
  Surface      #1A1A2E  ████  Card, sidebar, modal
  Surface 2    #22223A  ████  Input, row tabel, dropdown
  Border       rgba(255,255,255,0.08)
  Text         #E2E8F0  ████  Teks utama
  Muted        #94A3B8  ████  Teks sekunder / label

LIGHT MODE (TOGGLE)
━━━━━━━━━━━━━━━━━━━
  Background   #F8FAFC  ████
  Surface      #FFFFFF  ████
  Border       #E2E8F0  ████
  Text         #0F172A  ████
```

### 2.2 Tipografi

```
Font Family: Inter (Google Fonts), weight 300–900

SCALE TIPOGRAFI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Hero     clamp(2rem, 5vw, 3.5rem)  weight 800  Judul hero landing
  H1       2rem                       weight 700  Judul halaman
  H2       1.5rem                     weight 600  Section heading
  H3       1.25rem                    weight 600  Sub-section
  Body     1rem                       weight 400  Teks konten
  Small    0.875rem                   weight 500  Label, meta info
  Label    0.75rem                    weight 600  Badge, kode, uppercase
  Mono     JetBrains Mono             weight 400  Kode aset, nomor tiket
```

### 2.3 Spacing & Shape

```
Spacing scale (multiples of 4px):
  xs:  4px   sm:  8px   md: 16px   lg: 24px   xl: 32px   2xl: 48px   3xl: 64px

Border Radius:
  sm:   8px   (input, badge kecil)
  md:  12px   (card kecil, button)
  lg:  16px   (card utama, modal)
  xl:  24px   (hero card, panel besar)
  pill: 999px  (badge status, filter pill)
```

### 2.4 Shadow & Elevation

```
Level 0: no shadow         (flat items)
Level 1: 0 1px 3px rgba(0,0,0,0.3)          (subtle separation)
Level 2: 0 4px 24px rgba(0,0,0,0.4)         (card default)
Level 3: 0 0 32px rgba(79,70,229,0.25)      (hover glow — primary)
Level 4: 0 0 48px rgba(79,70,229,0.4)       (active / focused)
```

---

## 3. Komponen UI

### 3.1 Button

```
VARIANTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
btn-primary    Gradient primary, white text, hover lift + glow
btn-secondary  Glass border (primary), transparent bg, hover fill
btn-danger     Danger red background, white text
btn-ghost      No border/bg, hover: subtle bg-surface2
btn-icon       Circular, 40px, icon only

SIZES
━━━━━━━━
sm:  px-3 py-1.5 text-sm
md:  px-4 py-2   text-base   (default)
lg:  px-6 py-3   text-lg

STATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
default  →  hover (translateY -2px)  →  active (translateY 0)
disabled: opacity 50%, cursor not-allowed
loading:  spinner icon kiri, text dimmed
```

### 3.2 Badge Status Aset

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 🟢 Tersedia  │  │ 🔴 Dipinjam  │  │ 🟡 Disewa    │
│  #10B981 bg  │  │  #EF4444 bg  │  │  #F59E0B bg  │
└──────────────┘  └──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 🔵 Maint.    │  │ ⚫ Rusak     │  │ 🪦 Dimusnah  │
│  #3B82F6 bg  │  │  #6B7280 bg  │  │  #374151 bg  │
└──────────────┘  └──────────────┘  └──────────────┘

Semua badge: rounded-pill, padding px-3 py-1, font-label
Badge "Dipinjam" dan "Disewa" punya pulse dot animation
```

### 3.3 Card Aset (Katalog Publik)

```
┌─────────────────────────────────┐
│  [FOTO ASET - 200px tinggi]     │  ← object-cover, hover scale
│  [Badge Status: 🟢 Tersedia]    │  ← absolute top-right
├─────────────────────────────────┤
│  📦 Elektronik                  │  ← kategori, muted text
│  Proyektor Epson EB-X51         │  ← nama aset, font-h3
│  AST-2024-0012                  │  ← kode aset, mono font
│  📍 Gedung A - Lantai 2         │  ← lokasi
│                                 │
│  Rp 150.000/hari                │  ← tarif sewa (jika rentable)
│  [  Detail  ] [ Ajukan Pinjam ] │  ← CTA buttons
└─────────────────────────────────┘

Hover effect: translateY(-4px) + shadow-glow primary
Transition: 0.3s ease
```

### 3.4 KPI Card (Dashboard)

```
┌────────────────────────────────────────┐
│  [Ikon gradient 48x48]  ↗ +5 hari ini │
│                                        │
│  248                                   │  ← angka besar, 2.5rem 700
│  Total Aset                            │  ← label muted
│  ▂▄▅▃▇ (mini sparkline)               │  ← 7-hari trend
└────────────────────────────────────────┘
Background: glass surface + subtle gradient border
```

### 3.5 Filter Pill (Katalog)

```
[ Semua ] [ Elektronik ] [ Kendaraan ] [ Ruangan ] [ Peralatan ]

Default:  bg-surface2, border glass, text-muted
Aktif:    bg-gradient-primary, text-white, shadow-glow
Hover:    bg-surface2 + border primary
Transition: 0.2s ease
```

### 3.6 Form Input

```
┌─────────────────────────────────┐
│ Nama Aset                       │  ← floating label (atas saat focus/isi)
│ [  Proyektor Epson EB-X51    ]  │  ← bg-surface2, border glass
└─────────────────────────────────┘

Focus: border primary + ring glow
Error: border danger + shake animation + error text merah bawah
Success: border success + checkmark icon kanan
```

### 3.7 Modal

```
Backdrop: rgba(0,0,0,0.7) blur(4px)
Panel: bg-surface, rounded-xl, max-w-lg
Animation: scale(0.95)→scale(1) + opacity 0→1, 200ms ease
Header: judul + tombol close (×)
Footer: tombol aksi (kanan) + tombol batal (kiri)
```

---

## 4. Layout Sistem

### 4.1 Layout Publik (Tanpa Login)

```
┌─────────────────────────────────────────────────┐
│  NAVBAR STICKY (64px)                           │
│  Logo | SPASI   [Venue] [Panduan]   [Login →]   │
├─────────────────────────────────────────────────┤
│                                                 │
│  HERO SECTION (100vh)                           │
│  Animated gradient background                   │
│  ┌───────────────────────────────────┐          │
│  │  Kelola Aset, Pinjam & Sewa       │          │
│  │  dengan Mudah                     │          │
│  │  Sistem manajemen aset terpadu... │          │
│  │  [ Lihat Aset ] [ Login / Daftar ]│          │
│  │                                   │          │
│  │  [250 Aset] [48 Dipinjam] [12/hr] │          │
│  └───────────────────────────────────┘          │
│  ↓ scroll indicator                             │
│                                                 │
├─────────────────────────────────────────────────┤
│  KATALOG ASET PUBLIK                            │
│  [ 🔍 Cari aset...                         ]   │
│  [Semua] [Elektronik] [Kendaraan] [Ruangan]     │
│                                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │Card 1│ │Card 2│ │Card 3│ │Card 4│           │
│  └──────┘ └──────┘ └──────┘ └──────┘           │
│                                                 │
├─────────────────────────────────────────────────┤
│  CARA KERJA                                     │
│  [1.Browse]→[2.Request]→[3.Approval]→[4.Pakai] │
├─────────────────────────────────────────────────┤
│  FOOTER                                         │
└─────────────────────────────────────────────────┘
```

### 4.2 Layout Dashboard Admin

```
┌──────────────────────────────────────────────────────┐
│  TOPBAR (64px) - sticky                              │
│  [≡] Breadcrumb   [🌙] [🔔3] [Ctrl+K] [👤 Admin ▾]  │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│ SIDEBAR  │  MAIN CONTENT AREA                        │
│ (260px)  │                                           │
│          │  [Page Title]                             │
│ 🏠 Dash  │  [Page Description]                       │
│ 📦 Aset  │                                           │
│ 📋 Pinjam│  [Content sesuai halaman]                 │
│ 💰 Sewa  │                                           │
│ 📊 Lap.  │                                           │
│ ⚙️ Setting│                                          │
│          │                                           │
│ ─────── │                                           │
│ [Avatar] │                                           │
│ Nama     │                                           │
│ Role     │                                           │
└──────────┴───────────────────────────────────────────┘

Mobile (< 768px):
- Sidebar collapse ke overlay drawer (hamburger trigger)
- Bottom navigation bar untuk 5 item utama
```

---

## 5. Alur Proses Halaman per Halaman

### 5.1 Halaman Landing (Publik)

```
USER FLOW:
Buka URL → Tampil hero dengan loading skeleton
         → Data aset publik load (dengan shimmer)
         → Klik filter kategori → filter real-time
         → Klik card aset → Halaman detail aset
         → Klik "Ajukan Pinjam" → Redirect ke /login (jika belum login)
         → Setelah login → Redirect ke wizard peminjaman

KOMPONEN:
- Navbar (sticky, blur backdrop saat scroll)
- HeroSection (AnimatedGradientBg + StatCounter)
- PublicAssetCatalog (SearchBar + CategoryFilter + AssetGrid)
- HowItWorksSection (4 StepCard dengan ikon animasi)
- Footer
```

### 5.2 Halaman Login

```
USER FLOW:
Buka /login → Tampil split layout
            → Input email/password
            → Klik Login → Loading state
            → Sukses → Redirect ke /dashboard
            → Gagal → Shake animation + pesan error inline
            → Klik "Lupa Password" → Form reset (email)

VALIDASI:
- Email: format valid
- Password: minimum 8 karakter
- Max attempt 5x → tampil CAPTCHA sederhana (30 detik cooldown)
```

### 5.3 Dashboard Utama

```
USER FLOW:
Login → Dashboard load dengan skeleton
      → KPI cards muncul (fade-in staggered)
      → Live Grid aset muncul (fade-in per item)
      → Chart render dengan animasi
      → Klik card aset di grid → slide drawer detail aset
      → Klik notifikasi jatuh tempo → ke halaman peminjaman/sewa

DATA REFRESH:
- KPI & Live Grid: auto-refresh setiap 60 detik
- Atau manual refresh dengan tombol [↻]
```

### 5.4 Daftar Aset (Admin)

```
LAYOUT:
┌─────────────────────────────────────────────────────┐
│ [Aset]                       [+ Tambah] [📥 Import] │
│ Total: 248 aset                                     │
├─────────────────────────────────────────────────────┤
│ [🔍 Cari nama/kode...]  [Kategori ▾] [Status ▾]    │
│ [Lokasi ▾]  [Sort: Terbaru ▾]        [🖨️ Print QR] │
├─────────────────────────────────────────────────────┤
│ ☐ │ Foto │ Kode        │ Nama         │Status│Aksi  │
│ ☐ │ 🖼️  │ AST-2024-001│ Proyektor... │🟢    │[···] │
│ ☐ │ 🖼️  │ AST-2024-002│ Laptop HP... │🔴    │[···] │
└─────────────────────────────────────────────────────┘
[← 1 2 3 ... 24 →]   Menampilkan 1-20 dari 248

Tombol [···] (kebab menu): Detail | Edit | QR Code | Maintenance | Hapus
Bulk select: Print QR, Export, Ubah Kategori, Hapus
```

### 5.5 Detail Aset

```
LAYOUT:
┌──────────────────────────────────────────────────────┐
│  ← Kembali ke Daftar Aset                            │
│  [Galeri Foto - 3 thumbnail + 1 besar]               │
│                                                      │
│  AST-2024-0012                    🟢 TERSEDIA        │
│  Proyektor Epson EB-X51                              │
│                                                      │
│  [Detail] [Riwayat Pinjam] [Riwayat Sewa]           │
│  [Maintenance] [Transfer Log]                        │
├──────────────────────────────────────────────────────┤
│  TAB: Detail                                         │
│  Kategori: Elektronik          Lokasi: Gd.A Lt.2    │
│  Harga Beli: Rp 8.500.000      Tahun: 2023           │
│  Nilai Buku: Rp 6.375.000      Depresiasi: 25%/thn  │
│  Tarif Sewa: Rp 150.000/hari                         │
│                                                      │
│  QR CODE: [████]  [📥 Download] [🖨️ Print]          │
│                                                      │
│  AKSI:                                               │
│  [📋 Pinjam] [💰 Sewa] [🔧 Maintenance] [↗ Transfer]│
└──────────────────────────────────────────────────────┘
```

### 5.6 Wizard Peminjaman (4 Step)

```
STEP INDICATOR:
●━━━○━━━○━━━○   Step 1 aktif

═══════════════════════════════════════
STEP 1: Jadwal Peminjaman
═══════════════════════════════════════
┌────────────────────────────────────┐
│ Tanggal Mulai    Tanggal Selesai   │
│ [📅 29 Jul 2026] [📅 30 Jul 2026]  │
│                                    │
│ Waktu Mulai      Waktu Selesai     │
│ [⏰ 08:00]       [⏰ 17:00]        │
└────────────────────────────────────┘
                       [Lanjut →]

═══════════════════════════════════════
STEP 2: Pilih Aset
═══════════════════════════════════════
Menampilkan HANYA aset tersedia di 29-30 Jul 2026

[🔍 Cari aset...]  [Kategori ▾]

┌────────────────────────────────────┐
│ ○ Proyektor Epson - AST-0012       │  ← radio select
│ ○ Kamera Sony A6000 - AST-0034     │
│ ✓ Laptop HP ProBook - AST-0021     │  ← selected
└────────────────────────────────────┘
                  [← Kembali] [Lanjut →]

═══════════════════════════════════════
STEP 3: Detail Pengajuan
═══════════════════════════════════════
┌────────────────────────────────────┐
│ Tujuan / Keperluan *               │
│ [                               ]  │
│ [  Untuk presentasi klien...    ]  │
│                                    │
│ Lampiran (opsional)                │
│ [📎 Surat Tugas, SK, dll]         │
└────────────────────────────────────┘
                  [← Kembali] [Lanjut →]

═══════════════════════════════════════
STEP 4: Review & Submit
═══════════════════════════════════════
┌────────────────────────────────────┐
│ RINGKASAN PENGAJUAN                │
│ ─────────────────────────────────  │
│ Aset    : Laptop HP ProBook        │
│ Periode : 29 Jul - 30 Jul 2026     │
│ Waktu   : 08:00 - 17:00            │
│ Tujuan  : Presentasi klien...      │
└────────────────────────────────────┘
                  [← Kembali] [✓ Ajukan]

Setelah submit:
→ Success toast + animasi confetti kecil
→ Redirect ke halaman detail pengajuan
→ Nomor tiket: LN-2026-0042
```

### 5.7 Halaman Approval (Kepala Unit / Admin)

```
USER FLOW:
Dapat notifikasi → Klik → Halaman detail pengajuan

┌─────────────────────────────────────────────────────┐
│  LN-2026-0042                      ⏳ PENDING_L1    │
│  Budi Santoso — 29 Jul (08:00 - 17:00)              │
│  Aset: Laptop HP ProBook                             │
├─────────────────────────────────────────────────────┤
│  APPROVAL TIMELINE                                  │
│  ✅ Pengajuan dibuat   - 28 Jul 10:15               │
│  ⏳ Level 1 (Kamu)     - Menunggu keputusan          │
│  ⬜ Level 2 (Admin)    - Belum                       │
│  ⬜ Selesai            -                             │
├─────────────────────────────────────────────────────┤
│  TUJUAN:  Presentasi klien penting hari Selasa...   │
│  LAMPIRAN: surat_tugas.pdf                          │
├─────────────────────────────────────────────────────┤
│  [✅ Setujui]                  [❌ Tolak dengan Alasan]│
└─────────────────────────────────────────────────────┘

Klik "Tolak":
→ Modal muncul: textarea alasan wajib diisi
→ Submit → status REJECTED, peminjam dapat notifikasi

Klik "Setujui":
→ Konfirmasi singkat → status PENDING_L2
→ Admin aset mendapat notifikasi
```

### 5.8 Halaman QR Scanner (Check-In / Check-Out)

```
USER FLOW:
/loans/scan → Minta izin kamera browser

┌─────────────────────────────────────────────────────┐
│                                                     │
│        [  KAMERA AKTIF - AREA SCAN  ]               │
│        ┌─────────────────────────┐                  │
│        │                         │                  │
│        │   [   QR Frame Guide  ] │                  │
│        │                         │                  │
│        └─────────────────────────┘                  │
│                                                     │
│   Arahkan kamera ke QR Code pada aset              │
│   [💡 Nyalakan Flash]  [📋 Input Manual]            │
│                                                     │
│   ══ BOOKING AKTIF ANDA ══                         │
│   🔔 Laptop HP ProBook — Check-in hari ini 08:00   │
└─────────────────────────────────────────────────────┘

Setelah QR terbaca:

CHECK-IN:
→ Modal konfirmasi:
  "Aset: Laptop HP ProBook (AST-0021)"
  "Booking: LN-2026-0042 — Budi Santoso"
  [✅ Konfirmasi Check-In]

CHECK-OUT:
→ Modal: input kondisi aset
  ○ Baik — tidak ada kerusakan
  ○ Rusak Ringan — ada goresan/kerusakan minor
  ○ Rusak Berat — perlu perbaikan
  [Catatan kondisi (opsional)]
  [✅ Konfirmasi Pengembalian]
→ Jika terlambat: tampil info denda yang terhitung
```

### 5.9 Form Penyewaan Baru

```
┌─────────────────────────────────────────────────────┐
│  PENYEWAAN BARU                                     │
├──────────────────────┬──────────────────────────────┤
│  DATA PENYEWA        │  DETAIL SEWA                 │
│  ─────────────────── │  ───────────────────────────  │
│  Nama *              │  Aset *                      │
│  [____________]      │  [Pilih aset...]             │
│                      │                              │
│  No. HP *            │  Tanggal Mulai               │
│  [____________]      │  [📅_______________]         │
│                      │                              │
│  NIK/KTP *           │  Tanggal Selesai             │
│  [____________]      │  [📅_______________]         │
│                      │                              │
│  Email               │  ┌──────────────────────┐   │
│  [____________]      │  │ KALKULASI BIAYA       │   │
│                      │  │ Tarif   : Rp 150.000  │   │
│  Alamat              │  │ Durasi  : 3 hari      │   │
│  [____________]      │  │ Subtotal: Rp 450.000  │   │
│                      │  │ Deposit : Rp 200.000  │   │
│  Foto KTP            │  │ ─────────────────     │   │
│  [📎 Upload]         │  │ TOTAL   : Rp 650.000  │   │
│                      │  └──────────────────────┘   │
│                      │                              │
│                      │  Metode Bayar                │
│                      │  ○ Cash ○ Transfer ○ QRIS   │
│                      │                              │
│                      │  Status Bayar                │
│                      │  ○ Belum Bayar ○ DP ○ Lunas │
└──────────────────────┴──────────────────────────────┘
[Batal]                               [💾 Simpan & Buat Kontrak]

Setelah simpan:
→ Generate PDF kontrak otomatis
→ Redirect ke halaman detail penyewaan
→ Tombol: [📄 Download Kontrak] [🖨️ Print]
```

### 5.10 Halaman Laporan

```
┌─────────────────────────────────────────────────────┐
│  LAPORAN SISTEM                                     │
│                                                     │
│  [Peminjaman] [Penyewaan] [Inventaris] [Maintenance]│
│  ─── TAB AKTIF: Peminjaman ───                      │
│                                                     │
│  FILTER:                                            │
│  Periode: [Juli 2026 ▾]   Status: [Semua ▾]        │
│  Aset: [Semua ▾]          User: [Semua ▾]           │
│  [🔍 Terapkan Filter]                               │
│                                                     │
│  RINGKASAN:                                         │
│  Total: 48  |  Selesai: 35  |  Aktif: 8  |  OD: 5  │
│                                                     │
│  [TABEL HASIL - scrollable]                         │
│  No.Tiket | Aset | Peminjam | Tgl | Status | Denda  │
│  ─────────────────────────────────────────────────  │
│  LN-0042  │ Lap..│ Budi S.  │ Jul │ ✅Sels │   -   │
│  LN-0041  │ Pro..│ Sari A.  │ Jul │ 🔴OD   │ 50rb  │
│                                                     │
├─────────────────────────────────────────────────────┤
│            [📊 Export Excel] [📄 Export PDF]        │
└─────────────────────────────────────────────────────┘
```

---

## 6. Alur Proses Bisnis (Business Process Flow)

### 6.1 Alur Peminjaman Lengkap

```
[PEMINJAM]                [KEPALA UNIT]          [ADMIN ASET]
     │                          │                      │
     ├─ Buat Request ─────────► │                      │
     │  (wizard 4 step)         │                      │
     │                     Notif masuk                 │
     │                          │                      │
     │                    Review Request               │
     │                          │                      │
     │                    ┌─────┴──────┐               │
     │                  Setuju       Tolak             │
     │                    │            │               │
     │         ◄──────────┘      ◄─ Notif Reject ──  │
     │         (PENDING_L2)         (status REJECTED)  │
     │                                    │            │
     │                          ──────────►            │
     │                                  Notif masuk    │
     │                                    │            │
     │                              Review Request     │
     │                                    │            │
     │                              ┌─────┴──────┐     │
     │                            Setuju       Tolak   │
     │                              │            │     │
     │ ◄── Notif Approved ──────────┘      ◄─ Notif ─ │
     │ ◄── Generate PDF Surat Izin                     │
     │                                                 │
     │ [Tiba di lokasi]                                │
     │ Scan QR Code Aset                               │
     │    ↓ Validasi booking aktif                     │
     │ Check-In ✅                                      │
     │ Status aset: DIPINJAM                           │
     │                                                 │
     │ [Selesai menggunakan]                           │
     │ Scan QR Code lagi                               │
     │ Input kondisi aset                              │
     │ Check-Out ✅                                     │
     │ Status aset: TERSEDIA                           │
     │    ↓ (jika terlambat)                           │
     │ Notif + Denda otomatis terhitung                │
```

### 6.2 Alur Penyewaan Lengkap

```
[ADMIN]                          [PENYEWA EKSTERNAL]
   │                                     │
   ├─ Input data penyewa                 │
   ├─ Pilih aset + periode               │
   ├─ Kalkulasi otomatis                 │
   ├─ Input deposit + metode bayar       │
   ├─ Simpan → Generate kontrak PDF ─► [Terima kontrak]
   │                                     │
   ├─ Catat pembayaran DP/Lunas          │
   ├─ Status aset: DISEWA                │
   │                                     │
   │              ... masa sewa ...      │
   │                                     │
   │ H-1: Notif jatuh tempo ──────────► │
   │                                     │
   ├─ Aset dikembalikan                  │
   ├─ Input kondisi aset                 │
   │   ├─ Baik → kembalikan deposit     │
   │   └─ Rusak → klaim sebagian deposit│
   ├─ Generate kwitansi pelunasan PDF    │
   ├─ Status rental: COMPLETED           │
   └─ Status aset: TERSEDIA             │
```

---

## 7. Responsif & Mobile Design

### 7.1 Breakpoints

```
Mobile:  < 640px   (single column, bottom nav)
Tablet:  640-1024px (2 column, sidebar overlay)
Desktop: > 1024px  (full sidebar + multi-column)
```

### 7.2 Mobile Adaptasi Khusus

| Komponen | Desktop | Mobile |
|---|---|---|
| Sidebar | Fixed 260px | Overlay drawer (hamburger) |
| Nav utama | Sidebar kiri | Bottom nav bar (5 item) |
| Grid katalog | 4 kolom | 1 kolom |
| Dashboard KPI | 4 kolom | 2 kolom scroll |
| Tabel | Full columns | Horizontal scroll / card mode |
| QR Scanner | Centered panel | Full screen |
| Wizard | Side-by-side | Stack vertical |
| Form Sewa | 2 kolom | 1 kolom stack |

---

## 8. Aksesibilitas

- Semua interactive element punya `:focus-visible` ring
- Contrast ratio minimum 4.5:1 (WCAG AA)
- Semua ikon punya aria-label
- Form error dikaitkan dengan input via `aria-describedby`
- Keyboard navigasi penuh (Tab, Enter, Escape)
- Loading state diumumkan via `aria-live="polite"`

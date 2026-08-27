# SPASI — Task Breakdown
## Master Checklist Pengerjaan Aplikasi
**Versi**: 1.0 | **Status**: ✅ SELESAI 100%

> **Legenda**: `[x]` Selesai

---

## FASE 0 — Persiapan & Setup Proyek
- [x] **F0-01** Init proyek Next.js 14 dengan TypeScript
- [x] **F0-02** Install semua dependencies (`prisma`, `next-auth`, `recharts`, `jspdf`, `qrcode`, `html5-qrcode`, `xlsx`, `zod`)
- [x] **F0-03** Konfigurasi `next.config.js`
- [x] **F0-04** Setup Prisma + SQLite (`prisma/schema.prisma`)
- [x] **F0-05** Buat `.env` dan `.env.example`
- [x] **F0-06** Buat `prisma/seed.ts` — Data awal 5 user, 5 kategori, 3 lokasi, 6 aset
- [x] **F0-07** Konfigurasi NextAuth.js (`lib/auth.ts`)
- [x] **F0-08** Buat `lib/prisma.ts` — Prisma client singleton
- [x] **F0-09** Buat `lib/auth.ts` — Auth helpers
- [x] **F0-10** Buat `lib/utils.ts` — Formatting & generators
- [x] **F0-11** Setup PWA (`public/manifest.json`, `public/sw.js`)
- [x] **F0-12** Buat `app/layout.tsx` (Root Layout)

---

## FASE 1 — Design System & Komponen UI Dasar
- [x] **F1-01** `app/globals.css` — CSS Variables & Dark/Light mode tokens
- [x] **F1-02** `components/ui/Button.tsx`
- [x] **F1-03** `components/ui/Badge.tsx`
- [x] **F1-04** `components/ui/Card.tsx`
- [x] **F1-05** `components/ui/Input.tsx`
- [x] **F1-06** `components/ui/Modal.tsx`
- [x] **F1-07** `components/ui/Toast.tsx` + `useToast` hook
- [x] **F1-08** `components/ui/Skeleton.tsx`
- [x] **F1-09** `components/ui/FilterPill.tsx`
- [x] **F1-10** `components/ui/StatCounter.tsx`
- [x] **F1-11** `components/layout/Sidebar.tsx`
- [x] **F1-12** `components/layout/Topbar.tsx`

---

## FASE 2 — Halaman Publik (Landing Page & Katalog)
- [x] **F2-01** `components/public/Navbar.tsx`
- [x] **F2-02** `components/public/HeroSection.tsx`
- [x] **F2-03** `components/public/AssetCard.tsx`
- [x] **F2-04** `app/page.tsx` — Landing Page Utama
- [x] **F2-05** `app/assets/page.tsx` — Katalog Aset Publik
- [x] **F2-06** `app/assets/[id]/page.tsx` — Detail Aset Publik
- [x] **F2-07** API Routes Publik (`/api/public/assets`, `/api/public/categories`, `/api/public/stats`)

---

## FASE 3 — Autentikasi & Dashboard
- [x] **F3-01** `app/login/page.tsx` — Split Login + Pintasan Akun Demo
- [x] **F3-02** `app/dashboard/layout.tsx` — Protected Dashboard Shell Layout
- [x] **F3-03** `app/dashboard/page.tsx` — Overview KPI & Grid Status Real-Time
- [x] **F3-04** `app/api/dashboard/stats/route.ts`

---

## FASE 4 — Modul Manajemen Aset
- [x] **F4-01** `app/dashboard/assets/page.tsx` — Tabel Aset + Multi-select Label QR
- [x] **F4-02** `app/dashboard/assets/new/page.tsx` — Form Tambah Aset Baru
- [x] **F4-03** `app/dashboard/assets/qr-labels/page.tsx` — Cetak Label QR Stiker A4
- [x] **F4-04** API Routes Aset (`/api/assets`, `/api/assets/[id]`)

---

## FASE 5 — Modul Peminjaman
- [x] **F5-01** `app/dashboard/loans/page.tsx` — Tabel Peminjaman Internal
- [x] **F5-02** `app/dashboard/loans/new/page.tsx` — Wizard Peminjaman 4 Langkah
- [x] **F5-03** `app/dashboard/loans/[id]/page.tsx` — Detail & Timeline Approval L1/L2
- [x] **F5-04** `app/dashboard/loans/scan/page.tsx` — WebRTC Camera QR Scanner
- [x] **F5-05** API Routes Peminjaman (`/api/loans`, `/api/loans/[id]/approve`, `/api/loans/scan`)

---

## FASE 6 — Modul Penyewaan
- [x] **F6-01** `app/dashboard/rentals/page.tsx` — Tabel Penyewaan Eksternal
- [x] **F6-02** `app/dashboard/rentals/new/page.tsx` — Form Sewa + Kalkulator Biaya Otomatis
- [x] **F6-03** API Routes Penyewaan (`/api/rentals`)

---

## FASE 7 — Maintenance, Laporan & Pengaturan
- [x] **F7-01** `app/dashboard/maintenance/page.tsx` — Catatan Servis & Perawatan
- [x] **F7-02** `app/dashboard/reports/page.tsx` — Laporan Rekapitulasi (Cetak PDF)
- [x] **F7-03** `app/dashboard/settings/page.tsx` — Manajemen User & Role Level
- [x] **F7-04** API Routes Settings & Maintenance (`/api/maintenance`, `/api/settings/users`)

---

## FASE 8 — Verification & Production Build
- [x] **F8-01** Prisma Database Migration & Seeding Verified
- [x] **F8-02** Next.js Production Build (`npm run build`) Passed 100% (19 routes compiled)
- [x] **F8-03** Development Server Running on `http://localhost:3000`

---

## Ringkasan Progress

| Fase | Nama | Task | Status |
|---|---|---|---|
| 0 | Setup Proyek | 12/12 | ✅ 100% |
| 1 | Design System | 12/12 | ✅ 100% |
| 2 | Halaman Publik | 7/7 | ✅ 100% |
| 3 | Auth & Dashboard | 4/4 | ✅ 100% |
| 4 | Modul Aset | 4/4 | ✅ 100% |
| 5 | Modul Peminjaman | 5/5 | ✅ 100% |
| 6 | Modul Penyewaan | 3/3 | ✅ 100% |
| 7 | Maintenance, Laporan & Setting | 4/4 | ✅ 100% |
| 8 | Verification & Build | 3/3 | ✅ 100% |
| **Total** | | **54/54** | **✅ 100% SELESAI** |

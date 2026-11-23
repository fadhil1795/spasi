import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthSession();
    const userRole = (session?.user as any)?.role || 'BORROWER';
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Ambil daftar kategori & subkategori untuk referensi
    const categories = await prisma.category.findMany({
      include: {
        parent: { select: { code: true, name: true } },
      },
      orderBy: [{ parentId: 'asc' }, { code: 'asc' }],
    });

    // Ambil daftar lokasi untuk referensi
    const locations = await prisma.location.findMany({
      orderBy: [{ building: 'asc' }, { room: 'asc' }],
    });

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Template Data Impor Aset ─────────────────────────────
    const sampleRows = [
      {
        'Kode Aset (Kosongkan utk Auto)': '',
        'Nama Aset *': 'Cisco Catalyst 2960 Switch 24-Port Gigabit',
        'Kode Kategori *': 'ELK',
        'Kode Subkategori': 'NET',
        'Merek / Brand': 'Cisco',
        'Model / Tipe': 'WS-C2960X-24TD-L',
        'Nomor Seri / Plat': 'FCW2140A01X',
        'Gedung / Lokasi': 'Gedung TI & Lab Terpadu',
        'Ruangan': 'Ruang Server 101',
        'Kondisi (Baik / Rusak Ringan / Rusak Berat)': 'Baik',
        'Status (AVAILABLE / MAINTENANCE)': 'AVAILABLE',
        'Jumlah Unit': 1,
        'Tanggal Perolehan (YYYY-MM-DD)': '2026-01-15',
        'Harga Beli / Perolehan (Rp)': 8500000,
        'Tarif Sewa Harian (Rp)': 0,
        'Dapat Dipinjam (Ya / Tidak)': 'Ya',
        'Keterangan / Spesifikasi': 'Switch manageable 24-port PoE+ untuk lab jaringan',
      },
      {
        'Kode Aset (Kosongkan utk Auto)': '',
        'Nama Aset *': 'Asus ExpertCenter D500 Desktop PC Core i5 16GB',
        'Kode Kategori *': 'ELK',
        'Kode Subkategori': 'PC',
        'Merek / Brand': 'Asus',
        'Model / Tipe': 'D500TD-510400030R',
        'Nomor Seri / Plat': 'M7N0CX012345678',
        'Gedung / Lokasi': 'Gedung TI & Lab Terpadu',
        'Ruangan': 'Lab Komputer 1',
        'Kondisi (Baik / Rusak Ringan / Rusak Berat)': 'Baik',
        'Status (AVAILABLE / MAINTENANCE)': 'AVAILABLE',
        'Jumlah Unit': 1,
        'Tanggal Perolehan (YYYY-MM-DD)': '2026-02-10',
        'Harga Beli / Perolehan (Rp)': 12500000,
        'Tarif Sewa Harian (Rp)': 0,
        'Dapat Dipinjam (Ya / Tidak)': 'Ya',
        'Keterangan / Spesifikasi': 'PC All-in-One lab pemrograman mahasiswa',
      },
      {
        'Kode Aset (Kosongkan utk Auto)': '',
        'Nama Aset *': 'Chitose Kursi Kuliah Lipat Rangka Besi',
        'Kode Kategori *': 'FURN',
        'Kode Subkategori': 'CLS',
        'Merek / Brand': 'Chitose',
        'Model / Tipe': 'Yamato-M',
        'Nomor Seri / Plat': '-',
        'Gedung / Lokasi': 'Gedung Kuliah Bersama',
        'Ruangan': 'Ruang Kuliah Teori 201',
        'Kondisi (Baik / Rusak Ringan / Rusak Berat)': 'Baik',
        'Status (AVAILABLE / MAINTENANCE)': 'AVAILABLE',
        'Jumlah Unit': 40,
        'Tanggal Perolehan (YYYY-MM-DD)': '2025-08-01',
        'Harga Beli / Perolehan (Rp)': 475000,
        'Tarif Sewa Harian (Rp)': 15000,
        'Dapat Dipinjam (Ya / Tidak)': 'Ya',
        'Keterangan / Spesifikasi': 'Kursi kuliah dengan meja lipat samping kayu',
      },
    ];

    const wsTemplate = XLSX.utils.json_to_sheet(sampleRows);
    // Atur lebar kolom sheet template
    wsTemplate['!cols'] = [
      { wch: 28 }, // Kode Aset
      { wch: 45 }, // Nama Aset
      { wch: 16 }, // Kode Kategori
      { wch: 18 }, // Kode Subkategori
      { wch: 18 }, // Merek
      { wch: 22 }, // Model
      { wch: 22 }, // Nomor Seri
      { wch: 26 }, // Gedung
      { wch: 22 }, // Ruangan
      { wch: 15 }, // Kondisi
      { wch: 15 }, // Status
      { wch: 12 }, // Jumlah
      { wch: 18 }, // Tanggal
      { wch: 20 }, // Harga Beli
      { wch: 20 }, // Tarif Sewa
      { wch: 15 }, // Dapat Dipinjam
      { wch: 40 }, // Keterangan
    ];
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template Impor Aset');

    // ── Sheet 2: Referensi Kode Kategori & Subkategori ──────────────
    const categoryRefRows = categories.map((c) => ({
      'Tingkat': c.parentId ? 'Subkategori' : 'Kategori Utama',
      'Kode': c.code || '-',
      'Nama Klasifikasi': c.name,
      'Kode Induk': c.parent?.code || '-',
      'Kategori Induk': c.parent?.name || '-',
    }));

    const wsCatRef = XLSX.utils.json_to_sheet(categoryRefRows);
    wsCatRef['!cols'] = [
      { wch: 16 },
      { wch: 12 },
      { wch: 40 },
      { wch: 14 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsCatRef, 'Referensi Kategori & Sub');

    // ── Sheet 3: Referensi Lokasi Gedung & Ruang ────────────────────
    const locationRefRows = locations.map((loc) => ({
      'Nama Gedung': loc.building,
      'Nama Ruangan': loc.room || '-',
      'Deskripsi Lokasi': loc.description || '-',
    }));

    const wsLocRef = XLSX.utils.json_to_sheet(locationRefRows);
    wsLocRef['!cols'] = [
      { wch: 28 },
      { wch: 24 },
      { wch: 35 },
    ];
    XLSX.utils.book_append_sheet(wb, wsLocRef, 'Referensi Lokasi Ruang');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Impor_Aset_SPASI.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json({ error: 'Gagal membuat template Excel' }, { status: 500 });
  }
}


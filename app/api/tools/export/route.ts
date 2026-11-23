import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF', 'APPROVER'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'catalog_excel'; // catalog_excel | biblio_excel | items_excel | catalog_json | marc_json

    const assets = await prisma.asset.findMany({
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        location: true,
        department: true,
      },
      orderBy: { code: 'asc' },
    });

    // 1. Ekspor Data Format JSON
    if (type === 'catalog_json' || type === 'marc_json') {
      const catalogRecords = assets.map((ast) => ({
        code: ast.code,
        name: ast.name,
        categoryCode: ast.category?.code || '',
        categoryName: ast.category?.parent?.name || ast.category?.name || 'Umum',
        subCategoryCode: ast.category?.parent ? ast.category?.code : '',
        subCategoryName: ast.category?.parent ? ast.category?.name : '',
        brand: ast.brand || '',
        serialNumber: ast.serialNumber || '',
        building: ast.location?.building || '',
        room: ast.location?.room || '',
        quantity: ast.quantity,
        availableQty: ast.availableQty,
        condition: ast.condition || 'Baik',
        status: ast.status,
        purchaseDate: ast.purchaseDate ? new Date(ast.purchaseDate).toISOString().split('T')[0] : null,
        purchaseCost: ast.purchaseCost || 0,
        dailyRentRate: ast.dailyRentRate || 0,
        isRentable: ast.isRentable,
        isLoanable: ast.isLoanable,
        description: ast.description || '',
      }));

      return new Response(JSON.stringify(catalogRecords, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="spasi_katalog_aset.json"',
        },
      });
    }

    // 2. Ekspor Rincian Unit Barang & Lokasi
    if (type === 'items_excel') {
      const itemRows = assets.map((ast, idx) => ({
        No: idx + 1,
        'Kode Tag Aset': ast.code,
        'Nama Barang / Sarana': ast.name,
        'Merek / Brand': ast.brand || '-',
        'Nomor Seri / Plat': ast.serialNumber || '-',
        'Gedung / Lokasi': ast.location?.building || 'Belum Ditempatkan',
        'Ruang': ast.location?.room || '-',
        'Stok Fisik': ast.quantity,
        'Tersedia': ast.availableQty,
        'Kondisi Fisik': ast.condition || 'Baik',
        'Status Operasional': ast.status,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(itemRows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 40 },
        { wch: 18 },
        { wch: 20 },
        { wch: 24 },
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
        { wch: 16 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Rincian Unit Barang');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new Response(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="spasi_rincian_unit_barang.xlsx"',
        },
      });
    }

    // 3. Ekspor Lengkap Katalog Inventaris (Default .xlsx)
    const catalogRows = assets.map((ast, idx) => {
      const isSub = Boolean(ast.category?.parent);
      const parentCat = isSub ? ast.category?.parent?.name : ast.category?.name;
      const subCat = isSub ? ast.category?.name : '-';
      const catCode = isSub ? ast.category?.parent?.code : ast.category?.code;
      const subCode = isSub ? ast.category?.code : '-';

      return {
        No: idx + 1,
        'Kode Aset': ast.code,
        'Nama Aset / Sarana': ast.name,
        'Kode Kategori': catCode || '-',
        'Kategori Utama': parentCat || '-',
        'Kode Subkategori': subCode || '-',
        'Subkategori': subCat || '-',
        'Merek / Brand': ast.brand || '-',
        'Nomor Seri / Plat': ast.serialNumber || '-',
        'Gedung / Lokasi': ast.location?.building || '-',
        'Ruangan': ast.location?.room || '-',
        'Jumlah Unit': ast.quantity,
        'Kondisi Fisik': ast.condition || 'Baik',
        'Status': ast.status,
        'Tgl Perolehan': ast.purchaseDate ? new Date(ast.purchaseDate).toISOString().split('T')[0] : '-',
        'Harga Beli (Rp)': ast.purchaseCost || 0,
        'Dapat Dipinjam': ast.isLoanable ? 'Ya' : 'Tidak',
        'Dapat Disewa': ast.isRentable ? 'Ya' : 'Tidak',
        'Tarif Sewa Harian (Rp)': ast.dailyRentRate || 0,
        'Keterangan': ast.description || '-',
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(catalogRows);
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 22 }, // Kode Aset
      { wch: 40 }, // Nama Aset
      { wch: 14 }, // Kode Kat
      { wch: 28 }, // Kat Utama
      { wch: 16 }, // Kode Sub
      { wch: 32 }, // Subkategori
      { wch: 18 }, // Merek
      { wch: 20 }, // No Seri
      { wch: 24 }, // Gedung
      { wch: 20 }, // Ruang
      { wch: 12 }, // Jumlah
      { wch: 14 }, // Kondisi
      { wch: 14 }, // Status
      { wch: 16 }, // Tgl
      { wch: 18 }, // Harga Beli
      { wch: 14 }, // Pinjam
      { wch: 14 }, // Sewa
      { wch: 18 }, // Tarif Sewa
      { wch: 35 }, // Keterangan
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Katalog Inventaris Aset');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="spasi_katalog_inventaris.xlsx"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

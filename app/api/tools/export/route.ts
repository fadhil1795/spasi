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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'biblio_excel'; // biblio_excel | marc_json | items_excel

    const assets = await prisma.asset.findMany({
      include: {
        category: true,
        location: true,
        department: true,
      },
      orderBy: { code: 'asc' },
    });

    if (type === 'marc_json') {
      // Standard Catalog JSON format conversion
      const catalogRecords = assets.map((ast) => ({
        code: ast.code,
        name: ast.name,
        category: ast.category?.name || 'Umum',
        brand: ast.brand || '-',
        serialNumber: ast.serialNumber || '-',
        description: ast.description || '',
        status: ast.status,
        condition: ast.condition || 'Baik',
      }));

      return new Response(JSON.stringify(catalogRecords, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="spasi_catalog_data.json"',
        },
      });
    }

    if (type === 'items_excel') {
      // Physical Item Units Export
      const itemRows = assets.map((ast, idx) => ({
        No: idx + 1,
        'Kode Aset': ast.code,
        'Nama Barang': ast.name,
        'Merek / Brand': ast.brand || '-',
        'Nomor Seri / Plat': ast.serialNumber || '-',
        'Gedung / Lokasi': ast.location?.building || '-',
        Ruang: ast.location?.room || '-',
        Kondisi: ast.condition || 'Baik',
        Status: ast.status,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(itemRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Data Unit Barang');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new Response(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="spasi_data_unit_barang.xlsx"',
        },
      });
    }

    // Default: Asset Catalog Export (Excel)
    const catalogRows = assets.map((ast, idx) => ({
      No: idx + 1,
      'Kode Aset': ast.code,
      'Nama Aset / Sarana': ast.name,
      Kategori: ast.category?.name || '-',
      Deskripsi: ast.description || '-',
      Merek: ast.brand || '-',
      'Nomor Seri': ast.serialNumber || '-',
      'Tgl Perolehan': ast.purchaseDate ? new Date(ast.purchaseDate).toISOString().split('T')[0] : '-',
      'Harga Beli (Rp)': ast.purchaseCost || 0,
      'Dapat Dipinjam': ast.isLoanable ? 'Ya' : 'Tidak',
      'Dapat Disewa': ast.isRentable ? 'Ya' : 'Tidak',
      'Tarif Sewa (Rp)': ast.dailyRentRate || 0,
      Status: ast.status,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(catalogRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Katalog Aset');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="spasi_katalog_aset.xlsx"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return '""';
  const stringVal = String(field);
  if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return `"${stringVal}"`;
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const parentCategoryId = searchParams.get('parentCategoryId');
    const brand = searchParams.get('brand');
    const status = searchParams.get('status');
    const locationId = searchParams.get('locationId');
    const q = searchParams.get('q');

    const whereClause: any = {};
    if (categoryId && categoryId !== 'ALL') {
      whereClause.categoryId = categoryId;
    } else if (parentCategoryId && parentCategoryId !== 'ALL') {
      const childCats = await prisma.category.findMany({
        where: { parentId: parentCategoryId },
        select: { id: true },
      });
      const allCatIds = [parentCategoryId, ...childCats.map((c) => c.id)];
      whereClause.categoryId = { in: allCatIds };
    }

    if (brand && brand !== 'ALL') {
      whereClause.brand = brand;
    }

    if (status && status !== 'ALL') whereClause.status = status;
    if (locationId && locationId !== 'ALL') {
      if (locationId === 'none') {
        whereClause.locationId = null;
      } else {
        whereClause.locationId = locationId;
      }
    }

    if (q) {
      whereClause.OR = [
        { name: { contains: q } },
        { code: { contains: q } },
        { brand: { contains: q } },
        { serialNumber: { contains: q } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
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

    const headers = [
      'Kode Aset',
      'Nama Aset',
      'Kategori Utama',
      'Subkategori',
      'Merek/Brand',
      'Nomor Seri (S/N)',
      'Gedung/Lokasi',
      'Ruang',
      'Unit/Fakultas Pemilik',
      'Total Unit',
      'Tersedia',
      'Kondisi Fisik',
      'Status Operasional',
      'Tanggal Pengadaan',
      'Harga Perolehan (Rp)',
      'Nilai Buku Saat Ini (Rp)',
      'Penyusutan Bulanan (Rp)',
      'Bisa Dipinjam',
      'Bisa Disewa',
      'Tarif Sewa/Hari (Rp)',
    ];

    const rows = assets.map((ast) => {
      const parentCat = ast.category?.parent?.name || ast.category?.name || '-';
      const subCat = ast.category?.parent ? ast.category.name : '-';
      const purchaseDate = ast.purchaseDate
        ? new Date(ast.purchaseDate).toISOString().split('T')[0]
        : '-';

      return [
        ast.code,
        ast.name,
        parentCat,
        subCat,
        ast.brand || '-',
        ast.serialNumber || '-',
        ast.location?.building || '-',
        ast.location?.room || '-',
        ast.department?.name || 'Milik Umum Kampus',
        ast.quantity,
        ast.availableQty,
        ast.condition || 'Baik',
        ast.status,
        purchaseDate,
        ast.purchaseCost || 0,
        ast.currentValue || ast.purchaseCost || 0,
        Math.round(ast.monthlyDepreciation || 0),
        ast.isLoanable ? 'Ya' : 'Tidak',
        ast.isRentable ? 'Ya' : 'Tidak',
        ast.dailyRentRate || 0,
      ].map(escapeCsvField).join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsvField).join(','), ...rows].join('\r\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="data-aset-spasi-${timestamp}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting assets:', error);
    return NextResponse.json({ error: 'Gagal mengekspor data aset' }, { status: 500 });
  }
}


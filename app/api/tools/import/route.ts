import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { type, records } = body; // type: 'biblio' | 'marc' | 'items'

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'Tidak ada record data yang valid untuk diimpor' }, { status: 400 });
    }

    // Get default category if needed
    let defaultCat = await prisma.category.findFirst();
    if (!defaultCat) {
      defaultCat = await prisma.category.create({
        data: { name: 'Umum & Inventaris' },
      });
    }

    let importedCount = 0;

    for (const item of records) {
      const name = item.name || item['Nama Aset'] || item['Nama Barang'] || item.title;
      if (!name) continue;

      const code =
        item.code ||
        item['Kode Aset'] ||
        `AST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Check if asset code already exists
      const existing = await prisma.asset.findUnique({ where: { code } });
      if (existing) {
        // Update existing record
        await prisma.asset.update({
          where: { code },
          data: {
            name,
            brand: item.brand || item['Merek'] || item['Merek / Brand'] || existing.brand,
            serialNumber: item.serialNumber || item['Nomor Seri'] || item['Nomor Seri / Plat'] || existing.serialNumber,
            condition: item.condition || item['Kondisi'] || existing.condition,
          },
        });
        importedCount++;
      } else {
        // Create new record
        await prisma.asset.create({
          data: {
            code,
            name,
            description: item.description || item['Deskripsi'] || null,
            brand: item.brand || item['Merek'] || item['Merek / Brand'] || null,
            serialNumber: item.serialNumber || item['Nomor Seri'] || item['Nomor Seri / Plat'] || null,
            categoryId: defaultCat.id,
            status: item.status || 'AVAILABLE',
            condition: item.condition || item['Kondisi'] || 'Baik',
            purchaseCost: item.purchaseCost ? parseFloat(item.purchaseCost) : null,
            dailyRentRate: item.dailyRentRate ? parseFloat(item.dailyRentRate) : null,
            isLoanable: true,
            isRentable: Boolean(item.dailyRentRate || item['Tarif Sewa (Rp)']),
            images: '[]',
            checklistItems: '[]',
          },
        });
        importedCount++;
      }
    }

    return NextResponse.json({
      message: `Berhasil mengimpor / memperbarui ${importedCount} data aset catalog ke sistem.`,
      importedCount,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Gagal memproses impor data' }, { status: 500 });
  }
}

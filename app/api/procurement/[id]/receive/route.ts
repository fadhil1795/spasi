import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Hanya Admin yang dapat memverifikasi penerimaan barang pengadaan' }, { status: 403 });
    }

    const body = await request.json();
    const { locationId, bastDocUrl } = body;

    const procurement = await prisma.procurementRequest.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: { category: true },
        },
      },
    });

    if (!procurement) {
      return NextResponse.json({ error: 'Usulan pengadaan tidak ditemukan' }, { status: 404 });
    }

    if (procurement.status === 'RECEIVED') {
      return NextResponse.json({ error: 'Pengadaan ini sudah pernah diterima dan diregistrasikan ke aset' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const createdAssets: any[] = [];

    await prisma.$transaction(async (tx) => {
      let assetCounter = await tx.asset.count();

      for (const item of procurement.items) {
        if (item.isRegistered) continue;

        const catNameClean = (item.category?.name || 'GEN')
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .slice(0, 3);

        const qty = Math.max(1, item.quantity);

        for (let q = 1; q <= qty; q++) {
          assetCounter++;
          const assetCode = `AST-${catNameClean}-${currentYear}-${String(assetCounter).padStart(4, '0')}`;

          const newAsset = await tx.asset.create({
            data: {
              code: assetCode,
              name: item.itemName,
              brand: item.brand || null,
              description: item.specs ? `[PENGADAAN ${procurement.requestNumber}] ${item.specs}` : `[PENGADAAN ${procurement.requestNumber}]`,
              categoryId: item.categoryId,
              locationId: locationId || null,
              departmentId: procurement.departmentId,
              status: 'AVAILABLE',
              condition: 'Baik',
              quantity: 1,
              availableQty: 1,
              purchaseDate: new Date(),
              purchaseCost: item.realizedPrice || item.estimatedPrice || 0,
              currentValue: item.realizedPrice || item.estimatedPrice || 0,
              isLoanable: true,
              isRentable: false,
              images: '[]',
              checklistItems: '[]',
            },
          });

          createdAssets.push(newAsset);
        }

        // Mark item as registered
        await tx.procurementItem.update({
          where: { id: item.id },
          data: { isRegistered: true },
        });
      }

      // Mark request as RECEIVED
      await tx.procurementRequest.update({
        where: { id: procurement.id },
        data: {
          status: 'RECEIVED',
          ...(bastDocUrl && { bastDocUrl }),
        },
      });
    });

    return NextResponse.json({
      message: `Penerimaan barang berhasil diproses! Sebanyak ${createdAssets.length} unit aset fisik baru telah otomatis diregistrasikan ke katalog master sistem dengan label QR siap cetak.`,
      registeredCount: createdAssets.length,
      assets: createdAssets.map((a) => ({ id: a.id, code: a.code, name: a.name })),
    });
  } catch (error) {
    console.error('Error receiving procurement items:', error);
    return NextResponse.json({ error: 'Gagal memproses penerimaan dan registrasi aset' }, { status: 500 });
  }
}

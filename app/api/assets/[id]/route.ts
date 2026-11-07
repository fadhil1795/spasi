import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const asset = await prisma.asset.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        location: true,
        department: true,
        loans: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        rentals: {
          include: { renter: { select: { name: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        maintenance: {
          orderBy: { startDate: 'desc' },
          take: 10,
        },
        transfers: {
          orderBy: { transferredAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const qty = body.quantity ? Math.max(1, parseInt(body.quantity)) : 1;

    // Ambil data aset sebelum diupdate untuk perbandingan
    const existing = await prisma.asset.findUnique({
      where: { id: params.id },
      include: { location: true },
    });

    const updatedAsset = await prisma.asset.update({
      where: { id: params.id },
      data: {
        name: body.name !== undefined ? body.name : existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        categoryId: body.categoryId !== undefined ? body.categoryId : existing.categoryId,
        locationId: body.locationId !== undefined ? (body.locationId || null) : existing.locationId,
        departmentId: body.departmentId !== undefined ? (body.departmentId || null) : existing.departmentId,
        status: body.status !== undefined ? body.status : existing.status,
        condition: body.condition !== undefined ? body.condition : existing.condition,
        quantity: body.quantity !== undefined ? qty : existing.quantity,
        availableQty: body.availableQty !== undefined ? Math.max(0, parseInt(body.availableQty)) : existing.availableQty,
        purchaseDate: body.purchaseDate !== undefined ? (body.purchaseDate ? new Date(body.purchaseDate) : null) : existing.purchaseDate,
        purchaseCost: body.purchaseCost !== undefined ? (body.purchaseCost ? parseFloat(body.purchaseCost) : null) : existing.purchaseCost,
        brand: body.brand !== undefined ? body.brand : existing.brand,
        serialNumber: body.serialNumber !== undefined ? body.serialNumber : existing.serialNumber,
        dailyRentRate: body.dailyRentRate !== undefined ? (body.dailyRentRate ? parseFloat(body.dailyRentRate) : null) : existing.dailyRentRate,
        isRentable: body.isRentable !== undefined ? Boolean(body.isRentable) : existing.isRentable,
        isLoanable: body.isLoanable !== undefined ? Boolean(body.isLoanable) : existing.isLoanable,
        images: body.images !== undefined ? (Array.isArray(body.images) ? JSON.stringify(body.images) : body.images) : existing.images,
        customAttributes: body.customAttributes !== undefined ? (typeof body.customAttributes === 'object' ? JSON.stringify(body.customAttributes) : (body.customAttributes || null)) : existing.customAttributes,
      },
    });

    // Jika terjadi perpindahan/mutasi lokasi, catat otomatis di TransferLog
    if (existing && body.locationId !== undefined && body.locationId !== existing.locationId) {
      const newLoc = body.locationId ? await prisma.location.findUnique({ where: { id: body.locationId } }) : null;
      const fromText = existing.location ? `${existing.location.name || existing.location.building} (${existing.location.room || '-'})` : 'Gudang Umum / Tanpa Lokasi';
      const toText = newLoc ? `${newLoc.name || newLoc.building} (${newLoc.room || '-'})` : 'Gudang Umum / Tanpa Lokasi';

      await prisma.transferLog.create({
        data: {
          assetId: params.id,
          fromLocation: fromText,
          toLocation: toText,
          transferredBy: (session.user as any).name || (session.user as any).email || 'Petugas Sarpras',
          reason: body.transferReason || 'Perubahan penempatan / mutasi lokasi aset melalui sistem',
        },
      });
    }

    // Catat di AuditLog
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_ASSET',
        entity: 'Asset',
        entityId: params.id,
        userId: (session.user as any).id || 'system',
        details: `Memperbarui data & spesifikasi aset ${body.name || existing?.name || params.id}`,
      },
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const PATCH = PUT;

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.asset.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Asset deleted successfully' });
  } catch (error: any) {
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Aset tidak dapat dihapus karena memiliki riwayat peminjaman, penyewaan, atau perawatan. Ubah statusnya menjadi "INACTIVE" atau "DISPOSED" saja.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

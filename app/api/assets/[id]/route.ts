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

    const updatedAsset = await prisma.asset.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        categoryId: body.categoryId,
        locationId: body.locationId || null,
        departmentId: body.departmentId || null,
        status: body.status,
        condition: body.condition,
        quantity: qty,
        availableQty: body.availableQty !== undefined ? Math.max(0, parseInt(body.availableQty)) : qty,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchaseCost: body.purchaseCost ? parseFloat(body.purchaseCost) : null,
        brand: body.brand,
        serialNumber: body.serialNumber,
        dailyRentRate: body.dailyRentRate ? parseFloat(body.dailyRentRate) : null,
        isRentable: Boolean(body.isRentable),
        isLoanable: Boolean(body.isLoanable),
        images: Array.isArray(body.images) ? JSON.stringify(body.images) : body.images,
      },
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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

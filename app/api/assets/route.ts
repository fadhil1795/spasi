import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { generateAssetCode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const locationId = searchParams.get('locationId');
    const q = searchParams.get('q');

    const whereClause: any = {};
    if (categoryId && categoryId !== 'ALL') whereClause.categoryId = categoryId;
    if (status && status !== 'ALL') whereClause.status = status;
    if (locationId && locationId !== 'ALL') {
      if (locationId === 'none') {
        whereClause.locationId = null;
      } else {
        whereClause.locationId = locationId;
      }
    }
    const isFixedToRoom = searchParams.get('isFixedToRoom');
    const isRentable = searchParams.get('isRentable');
    if (isFixedToRoom !== null) whereClause.isFixedToRoom = isFixedToRoom === 'true';
    if (isRentable !== null) whereClause.isRentable = isRentable === 'true';
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
        category: true,
        location: true,
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      categoryId,
      locationId,
      departmentId,
      status,
      condition,
      quantity,
      purchaseDate,
      purchaseCost,
      brand,
      serialNumber,
      dailyRentRate,
      sessionRentRate,
      isRentable,
      isLoanable,
      isFixedToRoom,
      checklistItems,
      images,
    } = body;

    if (!name || !categoryId) {
      return NextResponse.json({ error: 'Nama dan kategori aset wajib diisi' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const latestAsset = await prisma.asset.findFirst({
      where: { code: { startsWith: `AST-${currentYear}-` } },
      orderBy: { code: 'desc' },
    });

    let nextSeq = 1;
    if (latestAsset) {
      const parts = latestAsset.code.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    let code = generateAssetCode(nextSeq);
    let exists = await prisma.asset.findUnique({ where: { code } });
    while (exists) {
      nextSeq++;
      code = generateAssetCode(nextSeq);
      exists = await prisma.asset.findUnique({ where: { code } });
    }

    const qrToken = `qr-token-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const totalQty = quantity ? Math.max(1, parseInt(quantity)) : 1;

    const newAsset = await prisma.asset.create({
      data: {
        code,
        name,
        description,
        categoryId,
        locationId: locationId || null,
        departmentId: departmentId || null,
        status: isFixedToRoom ? 'INSTALLED' : (status || 'AVAILABLE'),
        condition: condition || 'Baik',
        quantity: totalQty,
        availableQty: totalQty,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseCost: purchaseCost ? parseFloat(purchaseCost) : null,
        currentValue: purchaseCost ? parseFloat(purchaseCost) : null,
        brand: brand || null,
        serialNumber: serialNumber || null,
        images: Array.isArray(images) ? JSON.stringify(images) : '[]',
        qrToken,
        dailyRentRate: dailyRentRate ? parseFloat(dailyRentRate) : null,
        sessionRentRate: sessionRentRate ? parseFloat(sessionRentRate) : null,
        isRentable: Boolean(isRentable),
        isLoanable: isLoanable !== undefined ? Boolean(isLoanable) : true,
        isFixedToRoom: Boolean(isFixedToRoom),
        checklistItems: Array.isArray(checklistItems) ? JSON.stringify(checklistItems) : '[]',
        customAttributes: typeof body.customAttributes === 'object' ? JSON.stringify(body.customAttributes) : (body.customAttributes || null),
      },
    });

    return NextResponse.json(newAsset, { status: 201 });
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

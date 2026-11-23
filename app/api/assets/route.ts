import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
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
        whereClause.OR = [
          { locationId: null },
          { quantity: { gt: 1 } },
        ];
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
        category: {
          include: {
            parent: true,
          },
        },
        location: true,
        department: true,
        roomAllocations: {
          include: {
            location: { select: { id: true, name: true, building: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedAssets = assets
      .map((ast) => {
        const allocatedInRooms = ast.roomAllocations.reduce((sum, al) => sum + (al.quantity || 0), 0);
        const directAllocated = ast.locationId && allocatedInRooms === 0 ? ast.quantity : 0;
        const totalAllocated = Math.max(allocatedInRooms, directAllocated);
        const unallocatedQty = Math.max(0, ast.quantity - totalAllocated);
        return {
          ...ast,
          allocatedQty: totalAllocated,
          unallocatedQty,
        };
      })
      .filter((ast) => {
        if (locationId === 'none') {
          return ast.unallocatedQty > 0;
        }
        return true;
      });

    return NextResponse.json(enrichedAssets);
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
    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      picName,
      checklistItems,
      images,
    } = body;

    if (!name || !categoryId) {
      return NextResponse.json({ error: 'Nama dan kategori aset wajib diisi' }, { status: 400 });
    }

    // 1. Ambil data Kategori & Departemen untuk menyusun Tag Aset Standar
    const [category, department] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryId } }),
      departmentId ? prisma.department.findUnique({ where: { id: departmentId } }) : null,
    ]);

    const currentYear = new Date().getFullYear();
    const deptPrefix = department?.code
      ? department.code.toUpperCase().replace(/^DEPT-/, '').replace(/[^A-Z0-9]/g, '').slice(0, 8)
      : 'SARPRAS';
    const catPrefix = category?.code
      ? category.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
      : 'AST';

    const fullPrefix = `${deptPrefix}-${catPrefix}-${currentYear}-`;

    const latestAsset = await prisma.asset.findFirst({
      where: { code: { startsWith: fullPrefix } },
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

    let code = body.code ? body.code.trim().toUpperCase() : `${fullPrefix}${String(nextSeq).padStart(4, '0')}`;
    let exists = await prisma.asset.findUnique({ where: { code } });
    while (!body.code && exists) {
      nextSeq++;
      code = `${fullPrefix}${String(nextSeq).padStart(4, '0')}`;
      exists = await prisma.asset.findUnique({ where: { code } });
    }

    if (body.code && exists) {
      return NextResponse.json({ error: `Kode aset '${body.code}' sudah digunakan.` }, { status: 400 });
    }

    // Validasi duplikasi nomor seri (Serial Number) jika diinput
    const cleanSerial = serialNumber ? String(serialNumber).trim() : null;
    if (cleanSerial && cleanSerial !== '-' && cleanSerial !== 'N/A') {
      const duplicateSerial = await prisma.asset.findFirst({
        where: {
          serialNumber: {
            equals: cleanSerial,
          },
        },
      });

      if (duplicateSerial) {
        return NextResponse.json(
          {
            error: `Nomor seri (S/N) "${cleanSerial}" sudah terdaftar pada aset ${duplicateSerial.name} (${duplicateSerial.code}). Pastikan nomor seri fisik unik.`,
          },
          { status: 409 }
        );
      }
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
        picName: picName ? String(picName).trim() : null,
        checklistItems: Array.isArray(checklistItems) ? JSON.stringify(checklistItems) : '[]',
        customAttributes: typeof body.customAttributes === 'object' ? JSON.stringify(body.customAttributes) : (body.customAttributes || null),
      },
    });

    await recordAuditLog({
      action: 'CREATE_ASSET',
      entity: 'Asset',
      entityId: newAsset.id,
      userId: (session.user as any).id,
      details: `Mendaftarkan aset baru: ${newAsset.name} (${newAsset.code})`,
      oldData: null,
      newData: newAsset,
    });

    return NextResponse.json(newAsset, { status: 201 });
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

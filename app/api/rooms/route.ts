import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/rooms - list all rooms with asset counts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const minCapacity = searchParams.get('minCapacity');

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (minCapacity) where.capacity = { gte: parseInt(minCapacity) };

    const rooms = await prisma.location.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { assets: true, roomBookings: true } },
      },
      orderBy: { building: 'asc' },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/rooms - create a new room
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      code, name, building, floor, room, area, capacity,
      pricePerHour, pricePerDay, depositAmount, description,
      status, facilities, photos, departmentId,
      isRentable, isLoanable, requiresDepositForInternal,
    } = body;

    if (!name || !building) {
      return NextResponse.json({ error: 'Nama dan Gedung wajib diisi' }, { status: 400 });
    }

    // Check code uniqueness if provided
    if (code) {
      const existing = await prisma.location.findUnique({ where: { code } });
      if (existing) return NextResponse.json({ error: 'Kode ruangan sudah digunakan' }, { status: 400 });
    }

    const location = await prisma.location.create({
      data: {
        code: code || null,
        name,
        building: building.trim(),
        floor: floor || null,
        room: room || null,
        departmentId: departmentId || null,
        area: area ? parseFloat(area) : null,
        capacity: capacity ? parseInt(capacity) : null,
        pricePerHour: pricePerHour ? parseFloat(pricePerHour) : null,
        pricePerDay: pricePerDay ? parseFloat(pricePerDay) : null,
        depositAmount: depositAmount ? parseFloat(depositAmount) : null,
        isRentable: isRentable === undefined ? false : Boolean(isRentable),
        isLoanable: isLoanable === undefined ? true : Boolean(isLoanable),
        requiresDepositForInternal: requiresDepositForInternal === undefined ? false : Boolean(requiresDepositForInternal),
        description: description || null,
        status: status || 'AVAILABLE',
        facilities: JSON.stringify(Array.isArray(facilities) ? facilities : []),
        photos: JSON.stringify(Array.isArray(photos) ? photos : []),
      },
    });

    if (body.assetIds && Array.isArray(body.assetIds) && body.assetIds.length > 0) {
      await prisma.asset.updateMany({
        where: { id: { in: body.assetIds } },
        data: { locationId: location.id, isFixedToRoom: true, status: 'INSTALLED' },
      });
    }

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const room = await prisma.location.findUnique({
      where: { id: params.id },
      include: {
        assets: {
          include: { category: { select: { name: true } } },
          orderBy: { name: 'asc' },
        },
        roomBookings: {
          include: { renter: true },
          orderBy: { startTime: 'desc' },
          take: 10,
        },
        availabilityBlocks: { orderBy: { startTime: 'asc' } },
        _count: { select: { assets: true, roomBookings: true } },
      },
    });

    if (!room) return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });
    return NextResponse.json(room);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      code, name, building, floor, room, area, capacity,
      pricePerHour, pricePerDay, depositAmount, description,
      status, facilities, photos,
    } = body;

    const updated = await prisma.location.update({
      where: { id: params.id },
      data: {
        code: code || null,
        name: name || '',
        building,
        floor: floor || null,
        room: room || null,
        area: area ? parseFloat(area) : null,
        capacity: capacity ? parseInt(capacity) : null,
        pricePerHour: pricePerHour ? parseFloat(pricePerHour) : null,
        pricePerDay: pricePerDay ? parseFloat(pricePerDay) : null,
        depositAmount: depositAmount ? parseFloat(depositAmount) : null,
        description: description || null,
        status: status || 'AVAILABLE',
        facilities: JSON.stringify(Array.isArray(facilities) ? facilities : []),
        photos: JSON.stringify(Array.isArray(photos) ? photos : []),
      },
    });

    if (body.assetIds && Array.isArray(body.assetIds)) {
      // 1. Unlink all assets currently linked to this room
      await prisma.asset.updateMany({
        where: { locationId: params.id },
        data: { locationId: null, isFixedToRoom: false, status: 'AVAILABLE' },
      });
      // 2. Link newly selected assets
      if (body.assetIds.length > 0) {
        await prisma.asset.updateMany({
          where: { id: { in: body.assetIds } },
          data: { locationId: params.id, isFixedToRoom: true, status: 'INSTALLED' },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if room has active bookings
    const activeBooking = await prisma.roomBooking.findFirst({
      where: { locationId: params.id, bookingStatus: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] } },
    });
    if (activeBooking) {
      return NextResponse.json({ error: 'Tidak bisa menghapus ruangan yang memiliki booking aktif' }, { status: 400 });
    }

    await prisma.location.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Ruangan berhasil dihapus' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

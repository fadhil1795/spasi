import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    let room = await prisma.location.findUnique({
      where: { id: params.id },
      include: {
        department: { select: { id: true, name: true, code: true } },
        buildingRef: { select: { id: true, code: true, name: true, totalFloors: true } },
        assets: {
          include: { category: { select: { name: true } } },
          orderBy: { name: 'asc' },
        },
        assetAllocations: {
          include: {
            asset: {
              include: { category: { select: { name: true } } },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        roomBookings: {
          include: { renter: true, addonAssets: true },
          orderBy: { startTime: 'desc' },
          take: 30,
        },
        availabilityBlocks: { orderBy: { startTime: 'asc' } },
        _count: { select: { assets: true, assetAllocations: true, roomBookings: true } },
      },
    });

    if (!room) return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });

    // Auto-assign qrToken if missing for legacy rooms
    if (!room.qrToken) {
      const qrToken = `qr-room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      room = await prisma.location.update({
        where: { id: params.id },
        data: { qrToken },
        include: {
          department: { select: { id: true, name: true, code: true } },
          buildingRef: { select: { id: true, code: true, name: true, totalFloors: true } },
          assets: {
            include: { category: { select: { name: true } } },
            orderBy: { name: 'asc' },
          },
          assetAllocations: {
            include: {
              asset: {
                include: { category: { select: { name: true } } },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          roomBookings: {
            include: { renter: true, addonAssets: true },
            orderBy: { startTime: 'desc' },
            take: 30,
          },
          availabilityBlocks: { orderBy: { startTime: 'asc' } },
          _count: { select: { assets: true, assetAllocations: true, roomBookings: true } },
        },
      });
    }

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
    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      code, name, roomType, buildingId, building, floor, room, area, capacity,
      pricePerHour, pricePerDay, depositAmount, description,
      status, facilities, photos, departmentId,
      picId, picName, picPhone,
      isRentable, isLoanable, requiresDepositForInternal,
    } = body;

    const existing = await prisma.location.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });
    }

    let resolvedBuildingName = building ? String(building).trim() : existing.building;
    if (buildingId) {
      const bObj = await prisma.building.findUnique({ where: { id: buildingId } });
      if (bObj) resolvedBuildingName = bObj.name;
    }

    const updated = await prisma.location.update({
      where: { id: params.id },
      data: {
        code: code ? String(code).trim().toUpperCase() : existing.code,
        name: name !== undefined ? name : existing.name,
        roomType: roomType !== undefined ? roomType : existing.roomType,
        buildingId: buildingId !== undefined ? (buildingId || null) : existing.buildingId,
        building: resolvedBuildingName,
        floor: floor !== undefined ? (floor || null) : existing.floor,
        room: room !== undefined ? (room || null) : existing.room,
        departmentId: departmentId !== undefined ? (departmentId || null) : existing.departmentId,
        area: area !== undefined ? (area ? parseFloat(area) : null) : existing.area,
        capacity: capacity !== undefined ? (capacity ? parseInt(capacity) : null) : existing.capacity,
        pricePerHour: pricePerHour !== undefined ? (pricePerHour ? parseFloat(pricePerHour) : null) : existing.pricePerHour,
        pricePerDay: pricePerDay !== undefined ? (pricePerDay ? parseFloat(pricePerDay) : null) : existing.pricePerDay,
        depositAmount: depositAmount !== undefined ? (depositAmount ? parseFloat(depositAmount) : null) : existing.depositAmount,
        isRentable: isRentable === undefined ? existing.isRentable : Boolean(isRentable),
        isLoanable: isLoanable === undefined ? existing.isLoanable : Boolean(isLoanable),
        requiresDepositForInternal: requiresDepositForInternal === undefined ? existing.requiresDepositForInternal : Boolean(requiresDepositForInternal),
        description: description !== undefined ? (description || null) : existing.description,
        status: status || existing.status,
        facilities: facilities !== undefined ? JSON.stringify(Array.isArray(facilities) ? facilities : []) : existing.facilities,
        photos: photos !== undefined ? JSON.stringify(Array.isArray(photos) ? photos : []) : existing.photos,
        picId: picId !== undefined ? (picId || null) : existing.picId,
        picName: picName !== undefined ? (picName ? String(picName).trim() : null) : existing.picName,
        picPhone: picPhone !== undefined ? (picPhone ? String(picPhone).trim() : null) : existing.picPhone,
      },
    });

    if (Array.isArray(body.assetAllocations) || Array.isArray(body.assetIds)) {
      const allocationsInput: { assetId: string; quantity: number }[] = Array.isArray(body.assetAllocations)
        ? body.assetAllocations
        : body.assetIds.map((id: string) => ({ assetId: id, quantity: 1 }));

      // 1. Lepas aset yang sebelumnya tertaut langsung ke ruangan ini
      await prisma.asset.updateMany({
        where: { locationId: params.id },
        data: { locationId: null, isFixedToRoom: false, status: 'AVAILABLE' },
      });

      // 2. Hapus alokasi lama untuk ruangan ini
      await prisma.roomAssetAllocation.deleteMany({
        where: { locationId: params.id },
      });

      // 3. Simpan alokasi baru beserta jumlahnya
      for (const alloc of allocationsInput) {
        if (!alloc.assetId || !alloc.quantity || alloc.quantity < 1) continue;
        const assetObj = await prisma.asset.findUnique({
          where: { id: alloc.assetId },
          include: { roomAllocations: true },
        });
        if (!assetObj) continue;

        const otherAllocated = assetObj.roomAllocations.reduce((s, r) => s + r.quantity, 0);
        const maxAllowed = Math.max(0, assetObj.quantity - otherAllocated);
        const finalQty = Math.min(alloc.quantity, maxAllowed);
        if (finalQty <= 0) continue;

        await prisma.roomAssetAllocation.create({
          data: { locationId: params.id, assetId: alloc.assetId, quantity: finalQty },
        });

        if (assetObj.quantity === 1) {
          await prisma.asset.update({
            where: { id: alloc.assetId },
            data: { locationId: params.id, isFixedToRoom: true, status: 'INSTALLED' },
          });
        }
      }
    }

    await recordAuditLog({
      action: 'UPDATE_ROOM',
      entity: 'Location',
      entityId: params.id,
      userId: (session.user as any).id,
      details: `Memperbarui profil ruangan ${updated.name} di ${updated.building}`,
      oldData: existing,
      newData: updated,
    });

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
    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if room has active bookings
    const activeBooking = await prisma.roomBooking.findFirst({
      where: { locationId: params.id, bookingStatus: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] } },
    });
    if (activeBooking) {
      return NextResponse.json({ error: 'Tidak bisa menghapus ruangan yang memiliki booking aktif' }, { status: 400 });
    }

    const existing = await prisma.location.findUnique({
      where: { id: params.id },
    });

    await prisma.location.delete({ where: { id: params.id } });

    if (existing) {
      await recordAuditLog({
        action: 'DELETE_ROOM',
        entity: 'Location',
        entityId: params.id,
        userId: (session.user as any).id,
        details: `Menghapus ruangan ${existing.name} (${existing.building})`,
        oldData: existing,
        newData: null,
      });
    }

    return NextResponse.json({ message: 'Ruangan berhasil dihapus' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

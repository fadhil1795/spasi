import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/rooms - list all rooms with asset counts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const minCapacity = searchParams.get('minCapacity');
    const building = searchParams.get('building');
    const buildingId = searchParams.get('buildingId');
    const roomType = searchParams.get('roomType');
    const q = searchParams.get('q');

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (building && building !== 'ALL') where.building = building;
    if (buildingId && buildingId !== 'ALL') where.buildingId = buildingId;
    if (roomType && roomType !== 'ALL') where.roomType = roomType;
    if (minCapacity) where.capacity = { gte: parseInt(minCapacity) };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { code: { contains: q } },
        { building: { contains: q } },
        { room: { contains: q } },
        { picName: { contains: q } },
      ];
    }

    const rooms = await prisma.location.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        buildingRef: { select: { id: true, code: true, name: true, totalFloors: true } },
        assetAllocations: { select: { assetId: true, quantity: true } },
        _count: { select: { assets: true, assetAllocations: true, roomBookings: true } },
      },
      orderBy: [{ building: 'asc' }, { name: 'asc' }],
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
      code, name, roomType, buildingId, building, floor, room, area, capacity,
      pricePerHour, pricePerDay, depositAmount, description,
      status, facilities, photos, departmentId,
      picId, picName, picPhone,
      isRentable, isLoanable, requiresDepositForInternal,
    } = body;

    let resolvedBuildingName = building ? String(building).trim() : '';
    let buildingCodePrefix = 'RM';

    if (buildingId) {
      const bObj = await prisma.building.findUnique({ where: { id: buildingId } });
      if (bObj) {
        resolvedBuildingName = bObj.name;
        buildingCodePrefix = bObj.code;
      }
    }

    if (!name || !resolvedBuildingName) {
      return NextResponse.json({ error: 'Nama ruangan dan Gedung wajib diisi' }, { status: 400 });
    }

    // Generate or validate code
    let finalCode = code ? String(code).trim().toUpperCase() : null;
    if (!finalCode) {
      const floorNum = floor ? String(floor).replace(/[^0-9]/g, '').padStart(2, '0') : '01';
      const prefix = `${buildingCodePrefix}-${floorNum}-`;
      const latestRoom = await prisma.location.findFirst({
        where: { code: { startsWith: prefix } },
        orderBy: { code: 'desc' },
      });
      let seq = 1;
      if (latestRoom && latestRoom.code) {
        const parts = latestRoom.code.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) seq = lastNum + 1;
      }
      finalCode = `${prefix}${String(seq).padStart(2, '0')}`;
      let dupCheck = await prisma.location.findUnique({ where: { code: finalCode } });
      while (dupCheck) {
        seq++;
        finalCode = `${prefix}${String(seq).padStart(2, '0')}`;
        dupCheck = await prisma.location.findUnique({ where: { code: finalCode } });
      }
    } else {
      const existing = await prisma.location.findUnique({ where: { code: finalCode } });
      if (existing) {
        return NextResponse.json({ error: `Kode ruangan "${finalCode}" sudah digunakan.` }, { status: 409 });
      }
    }

    const qrToken = `qr-room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const location = await prisma.location.create({
      data: {
        code: finalCode,
        name: String(name).trim(),
        roomType: roomType || 'CLASSROOM',
        buildingId: buildingId || null,
        building: resolvedBuildingName,
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
        picId: picId || null,
        picName: picName ? String(picName).trim() : null,
        picPhone: picPhone ? String(picPhone).trim() : null,
        qrToken,
      },
    });

    // Proses alokasi aset ke ruangan (baik individual maupun massal berdasarkan jumlah)
    const allocationsInput: { assetId: string; quantity: number }[] = Array.isArray(body.assetAllocations)
      ? body.assetAllocations
      : Array.isArray(body.assetIds)
      ? body.assetIds.map((id: string) => ({ assetId: id, quantity: 1 }))
      : [];

    for (const alloc of allocationsInput) {
      if (!alloc.assetId || !alloc.quantity || alloc.quantity < 1) continue;
      const assetObj = await prisma.asset.findUnique({
        where: { id: alloc.assetId },
        include: { roomAllocations: true },
      });
      if (!assetObj) continue;

      const currentAllocated = assetObj.roomAllocations.reduce((s, r) => s + r.quantity, 0);
      const maxAllowed = Math.max(0, assetObj.quantity - currentAllocated);
      const finalQty = Math.min(alloc.quantity, maxAllowed);
      if (finalQty <= 0) continue;

      await prisma.roomAssetAllocation.upsert({
        where: { locationId_assetId: { locationId: location.id, assetId: alloc.assetId } },
        update: { quantity: finalQty },
        create: { locationId: location.id, assetId: alloc.assetId, quantity: finalQty },
      });

      if (assetObj.quantity === 1) {
        await prisma.asset.update({
          where: { id: alloc.assetId },
          data: { locationId: location.id, isFixedToRoom: true, status: 'INSTALLED' },
        });
      }
    }

    await recordAuditLog({
      action: 'CREATE_ROOM',
      entity: 'Location',
      entityId: location.id,
      userId: (session.user as any).id,
      details: `Menambahkan ruangan baru: ${location.name} di ${location.building} (Kode: ${location.code || '-'})`,
      oldData: null,
      newData: location,
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

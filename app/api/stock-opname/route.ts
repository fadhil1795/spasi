import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const status = searchParams.get('status');

    const where: any = {};
    if (locationId) where.locationId = locationId;
    if (status && status !== 'ALL') where.status = status;

    const sessions = await prisma.stockOpnameSession.findMany({
      where,
      include: {
        location: { select: { id: true, name: true, building: true, floor: true, room: true } },
        auditor: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching stock opname sessions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { title, locationId, notes } = body;

    if (!locationId) {
      return NextResponse.json({ error: 'Target ruangan opname wajib dipilih' }, { status: 400 });
    }

    const targetRoom = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        assets: {
          where: {
            status: { not: 'DISPOSED' }, // Jangan masukkan aset yang sudah diafkir
          },
        },
      },
    });

    if (!targetRoom) {
      return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });
    }

    // Generate Session Number (SO-YYYY-XXXX)
    const currentYear = new Date().getFullYear();
    const count = await prisma.stockOpnameSession.count();
    const sessionNumber = `SO-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const sessionTitle = title?.trim() || `Stock Opname: ${targetRoom.name || targetRoom.building} (${targetRoom.room || '-'})`;

    // Atomic transaction: create session and populate expected items
    const newSession = await prisma.$transaction(async (tx) => {
      const createdSession = await tx.stockOpnameSession.create({
        data: {
          sessionNumber,
          title: sessionTitle,
          locationId,
          auditorId: userId,
          status: 'IN_PROGRESS',
          totalExpected: targetRoom.assets.length,
          totalMissing: targetRoom.assets.length, // Awalnya seluruhnya belum discan
          notes: notes || null,
        },
      });

      if (targetRoom.assets.length > 0) {
        await tx.stockOpnameItem.createMany({
          data: targetRoom.assets.map((asset) => ({
            sessionId: createdSession.id,
            assetId: asset.id,
            expectedLocationId: locationId,
            actualLocationId: null,
            scanStatus: 'MISSING', // Belum ditemukan
            conditionBefore: asset.condition || 'Baik',
            conditionAfter: asset.condition || 'Baik',
          })),
        });
      }

      return createdSession;
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error('Error creating stock opname session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/maintenance/schedules - Mengambil daftar jadwal servis berkala
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const schedules = await prisma.maintenanceSchedule.findMany({
      include: {
        asset: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true, code: true, building: true } },
        category: { select: { id: true, name: true } }
      },
      orderBy: { nextDueDate: 'asc' }
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/maintenance/schedules - Membuat jadwal servis berkala baru
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { assetId, locationId, categoryId, intervalDays, lastMaintenance, nextDueDate, isActive } = body;

    if (!intervalDays || (!assetId && !locationId && !categoryId)) {
      return NextResponse.json({ error: 'Interval hari dan setidaknya satu target objek (Aset/Ruangan/Kategori) wajib diisi.' }, { status: 400 });
    }

    // Default nextDueDate = Hari ini + intervalDays jika tidak ditentukan
    const parsedInterval = parseInt(intervalDays);
    const parsedNextDue = nextDueDate ? new Date(nextDueDate) : new Date(Date.now() + parsedInterval * 24 * 60 * 60 * 1000);
    const parsedLast = lastMaintenance ? new Date(lastMaintenance) : null;

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        assetId: assetId || null,
        locationId: locationId || null,
        categoryId: categoryId || null,
        intervalDays: parsedInterval,
        lastMaintenance: parsedLast,
        nextDueDate: parsedNextDue,
        isActive: isActive ?? true
      }
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/policies/blocked - Mengambil daftar semua periode pemblokiran
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocks = await prisma.blockedPeriod.findMany({
      orderBy: { startDate: 'asc' }
    });

    return NextResponse.json(blocks);
  } catch (error) {
    console.error('Error fetching blocked periods:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/policies/blocked - Membuat periode pemblokiran baru
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { startDate, endDate, reason, scope, scopeTarget, forceSave } = body;

    if (!startDate || !endDate || !reason || !scope) {
      return NextResponse.json({ error: 'Parameter pemblokiran tidak lengkap.' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Deteksi tabrakan dengan pemesanan ruangan yang sudah terlanjur dikonfirmasi
    const conflictingBookings = await prisma.roomBooking.findMany({
      where: {
        bookingStatus: { in: ['CONFIRMED', 'ACTIVE'] },
        OR: [
          { startTime: { lte: end }, endTime: { gte: start } }
        ],
        // Filter spesifik jika scope target ditentukan (misal ruangan tertentu)
        ...(scope === 'ITEM' && scopeTarget ? { locationId: scopeTarget } : {})
      },
      include: {
        renter: { select: { name: true } },
        location: { select: { name: true } }
      }
    });

    // 2. Jika ada tabrakan booking ter-approve & admin belum menyetujui forceSave
    if (conflictingBookings.length > 0 && !forceSave) {
      return NextResponse.json({
        warning: true,
        message: `Terdapat ${conflictingBookings.length} pemesanan terkonfirmasi pada tanggal terblokir yang dipilih.`,
        conflicts: conflictingBookings.map(b => ({
          bookingNumber: b.bookingNumber,
          renterName: b.renter.name,
          roomName: b.location.name,
          startTime: b.startTime,
          endTime: b.endTime
        }))
      }, { status: 200 }); // Kembalikan warning di status 200 agar ditangkap frontend
    }

    // 3. Simpan pemblokiran tanggal
    const block = await prisma.blockedPeriod.create({
      data: {
        startDate: start,
        endDate: end,
        reason,
        scope,
        scopeTarget: scopeTarget || null,
        createdBy: (session?.user as any)?.name || 'Admin'
      }
    });

    return NextResponse.json({ success: true, block }, { status: 201 });
  } catch (error) {
    console.error('Error creating blocked period:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

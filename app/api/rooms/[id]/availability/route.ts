import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    if (!startTime || !endTime) {
      // Mode ringkasan slot hari ini untuk Tab Ketersediaan pada Detail Ruangan
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayBookings = await prisma.roomBooking.findMany({
        where: {
          locationId: params.id,
          bookingStatus: { in: ['PENDING', 'PENDING_L1', 'PENDING_L2', 'APPROVED', 'CONFIRMED', 'ACTIVE', 'RETURN_REQUESTED'] },
          startTime: { lte: endOfDay },
          endTime: { gte: startOfDay },
        },
        include: { renter: { select: { name: true } } },
        orderBy: { startTime: 'asc' },
      });

      return NextResponse.json(
        todayBookings.map((b) => ({
          id: b.id,
          bookingNumber: b.bookingNumber,
          renterName: b.renter?.name || '-',
          startTime: b.startTime,
          endTime: b.endTime,
          status: b.bookingStatus,
        }))
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check for conflicting bookings
    const conflictingBooking = await prisma.roomBooking.findFirst({
      where: {
        locationId: params.id,
        bookingStatus: { in: ['CONFIRMED', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED'] },
        OR: [
          { startTime: { lte: end }, endTime: { gte: start } },
        ],
      },
      include: { renter: { select: { name: true } } },
    });

    // Check for manual blocks
    const conflictingBlock = await prisma.roomAvailabilityBlock.findFirst({
      where: {
        locationId: params.id,
        OR: [{ startTime: { lte: end }, endTime: { gte: start } }],
      },
    });

    // Check for maintenance blocks
    const conflictingMaintenance = await prisma.maintenance.findFirst({
      where: {
        locationId: params.id,
        status: { in: ['SCHEDULED', 'ONGOING'] },
        OR: [
          { startDate: { lte: end }, endDate: null }, // Ongoing, no end date yet
          { startDate: { lte: end }, endDate: { gte: start } } // Scheduled within range
        ]
      }
    });

    // Check for blocked periods (GLOBAL or specific venue ITEM)
    const conflictingBlockedPeriod = await prisma.blockedPeriod.findFirst({
      where: {
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'ITEM', scopeTarget: params.id }
        ],
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } }
        ]
      }
    });

    const isAvailable = !conflictingBooking && !conflictingBlock && !conflictingMaintenance && !conflictingBlockedPeriod;

    return NextResponse.json({
      isAvailable,
      conflictingBooking: conflictingBooking ? {
        bookingNumber: conflictingBooking.bookingNumber,
        renterName: conflictingBooking.renter.name,
        startTime: conflictingBooking.startTime,
        endTime: conflictingBooking.endTime,
      } : null,
      conflictingBlock: conflictingBlock ? {
        reason: conflictingBlock.reason,
        startTime: conflictingBlock.startTime,
        endTime: conflictingBlock.endTime,
      } : null,
      conflictingMaintenance: conflictingMaintenance ? {
        description: conflictingMaintenance.description,
        type: conflictingMaintenance.type,
        startDate: conflictingMaintenance.startDate,
        endDate: conflictingMaintenance.endDate
      } : null,
      conflictingBlockedPeriod: conflictingBlockedPeriod ? {
        reason: conflictingBlockedPeriod.reason,
        startDate: conflictingBlockedPeriod.startDate,
        endDate: conflictingBlockedPeriod.endDate
      } : null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Optional: Add a simple auth check for cron services
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    // Fetch system settings for autoCancelHours
    let setting = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
    const autoCancelHours = setting?.autoCancelHours || 24;

    // Calculate the threshold time
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - autoCancelHours);

    // 1. Cancel Overdue Rentals (Assets)
    const overdueRentals = await prisma.rental.findMany({
      where: {
        payStatus: 'UNPAID',
        createdAt: { lt: thresholdDate }
      },
      select: { id: true, assetId: true }
    });

    const rentalIds = overdueRentals.map(r => r.id);
    const assetIdsToRelease = overdueRentals.map(r => r.assetId);

    if (rentalIds.length > 0) {
      await prisma.rental.updateMany({
        where: { id: { in: rentalIds } },
        data: { payStatus: 'CANCELLED', notes: `Otomatis dibatalkan oleh sistem karena tidak dibayar dalam ${autoCancelHours} jam.` }
      });
      // Release assets if they were locked
      // Assuming a booking process marks them as RENTED. Since payStatus is UNPAID, they might already be marked RENTED.
      // Usually, we should reset their status to AVAILABLE if they aren't tied to other active rentals.
      await prisma.asset.updateMany({
        where: { id: { in: assetIdsToRelease }, status: 'RENTED' },
        data: { status: 'AVAILABLE' }
      });
    }

    // 2. Cancel Overdue Room Bookings
    const overdueRoomBookings = await prisma.roomBooking.findMany({
      where: {
        payStatus: 'UNPAID',
        bookingStatus: { notIn: ['CANCELLED', 'COMPLETED', 'COMPLETED_WITH_CLAIM'] },
        createdAt: { lt: thresholdDate }
      },
      select: { id: true }
    });

    const roomBookingIds = overdueRoomBookings.map(r => r.id);

    if (roomBookingIds.length > 0) {
      await prisma.roomBooking.updateMany({
        where: { id: { in: roomBookingIds } },
        data: { 
          bookingStatus: 'CANCELLED', 
          payStatus: 'CANCELLED', 
          notes: `Otomatis dibatalkan oleh sistem karena tidak dibayar dalam ${autoCancelHours} jam.` 
        }
      });
      // AvailabilityBlocks are usually managed by active bookings. 
      // If we use separate AvailabilityBlock records, we should delete them.
      // Remove any availability blocks that might be tied to cancelled bookings
      // (No direct bookingId field - clear by time range overlap instead)
      // This is handled at booking creation, not needed here
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed auto-cancellations (Threshold: >${autoCancelHours}h)`,
      cancelledRentals: rentalIds.length,
      cancelledRoomBookings: roomBookingIds.length,
    });
  } catch (error) {
    console.error('Error running auto-cancel cron:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any)?.role || 'BORROWER';
    if (userRole === 'BORROWER') {
      return NextResponse.json({ error: 'Proses Check-In hanya dapat dilakukan oleh Staff atau Admin' }, { status: 403 });
    }

    const body = await request.json();
    const { inspectedBy, inspectionItems, payStatus } = body;
    // inspectionItems: Array<{ assetId: string, assetName: string, conditionBefore: string, isMissing: boolean, notes?: string, photoUrls?: string[] }>

    const booking = await prisma.roomBooking.findUnique({
      where: { id: params.id },
      include: { location: true },
    });

    if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 });
    if (booking.bookingStatus !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Booking harus berstatus CONFIRMED untuk check-in' }, { status: 400 });
    }

    // Create inspection records (CHECK_IN)
    const inspectionData = Array.isArray(inspectionItems) ? inspectionItems : [];

    await prisma.$transaction(async (tx) => {
      // Create all inspection records
      for (const item of inspectionData) {
        await tx.bookingInspection.create({
          data: {
            bookingId: params.id,
            type: 'CHECK_IN',
            assetId: item.assetId,
            assetName: item.assetName,
            conditionBefore: item.conditionBefore || 'Baik',
            isMissing: item.isMissing || false,
            isDamaged: item.isDamaged || false,
            photoUrls: JSON.stringify(item.photoUrls || []),
            notes: item.notes || null,
            inspectedBy: inspectedBy || 'Petugas',
          },
        });
      }

      // Update booking status
      await tx.roomBooking.update({
        where: { id: params.id },
        data: {
          bookingStatus: 'ACTIVE',
          checkInTime: new Date(),
          ...(payStatus && { payStatus }),
        },
      });

      // Update room status to RENTED
      await tx.location.update({
        where: { id: booking.locationId },
        data: { status: 'RENTED' },
      });

      // Mark addon assets as BORROWED
      const booking_full = await tx.roomBooking.findUnique({
        where: { id: params.id },
        include: { addonAssets: true },
      });
      if (booking_full) {
        for (const addon of booking_full.addonAssets) {
          await tx.asset.update({
            where: { id: addon.assetId },
            data: { status: 'BORROWED' },
          });
        }
      }
    });

    return NextResponse.json({ message: 'Check-in berhasil', checkInTime: new Date() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

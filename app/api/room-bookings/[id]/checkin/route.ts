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

      // Update room status to RENTED (jika menggunakan ruangan)
      if (booking.locationId) {
        await tx.location.update({
          where: { id: booking.locationId },
          data: { status: 'RENTED' },
        });
      }

      // Kurangi availableQty addon assets sesuai jumlah sewa
      const booking_full = await tx.roomBooking.findUnique({
        where: { id: params.id },
        include: { addonAssets: true },
      });
      if (booking_full) {
        for (const addon of booking_full.addonAssets) {
          const assetRec = await tx.asset.findUnique({ where: { id: addon.assetId } });
          if (assetRec) {
            const newAvail = Math.max(0, (assetRec.availableQty ?? assetRec.quantity ?? 1) - (addon.quantity || 1));
            await tx.asset.update({
              where: { id: addon.assetId },
              data: {
                availableQty: newAvail,
                status: newAvail === 0 ? 'BORROWED' : 'AVAILABLE',
              },
            });
          }
        }
      }
    });

    const { createAuditLog } = await import('@/lib/audit');
    await createAuditLog({
      userId: (session.user as any).id,
      action: 'ROOM_BOOKING_CHECK_IN',
      entity: 'RoomBooking',
      entityId: params.id,
      details: `Check-In selesai untuk booking ${booking.bookingNumber} oleh petugas ${inspectedBy || 'Petugas'}.`,
    });

    return NextResponse.json({ message: 'Check-in berhasil', checkInTime: new Date() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

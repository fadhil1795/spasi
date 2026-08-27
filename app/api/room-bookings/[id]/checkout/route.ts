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
      return NextResponse.json({ error: 'Proses Check-Out hanya dapat dilakukan oleh Staff atau Admin' }, { status: 403 });
    }

    const body = await request.json();
    const { inspectedBy, inspectionItems, notes: generalNotes } = body;
    // inspectionItems: Array<{ assetId, assetName, conditionAfter, isMissing, isDamaged, claimAmount, notes, photoUrls }>

    const booking = await prisma.roomBooking.findUnique({
      where: { id: params.id },
      include: { addonAssets: true, renter: true },
    });

    if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 });
    if (booking.bookingStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'Booking harus berstatus ACTIVE untuk check-out' }, { status: 400 });
    }

    const inspectionData = Array.isArray(inspectionItems) ? inspectionItems : [];
    const totalClaimAmount = inspectionData.reduce((sum: number, item: any) => sum + (item.claimAmount || 0), 0);
    const hasClaim = totalClaimAmount > 0;

    await prisma.$transaction(async (tx) => {
      // Find user to assign claim to
      let claimUserId = '';
      if (booking.renter?.email) {
        const matchingUser = await tx.user.findFirst({
          where: { email: booking.renter.email },
        });
        if (matchingUser) claimUserId = matchingUser.id;
      }
      if (!claimUserId) {
        claimUserId = (session.user as any).id;
      }

      // Create CHECK_OUT inspection records
      for (const item of inspectionData) {
        await tx.bookingInspection.create({
          data: {
            bookingId: params.id,
            type: 'CHECK_OUT',
            assetId: item.assetId,
            assetName: item.assetName,
            conditionAfter: item.conditionAfter || 'Baik',
            isMissing: item.isMissing || false,
            isDamaged: item.isDamaged || false,
            photoUrls: JSON.stringify(item.photoUrls || []),
            claimAmount: item.claimAmount ? parseFloat(item.claimAmount) : null,
            notes: item.notes || null,
            inspectedBy: inspectedBy || 'Petugas',
          },
        });

        // Update asset condition if damaged/missing
        if (item.isDamaged) {
          await tx.asset.update({
            where: { id: item.assetId },
            data: { status: 'MAINTENANCE', condition: 'Rusak Ringan' },
          });
        } else if (item.isMissing) {
          await tx.asset.update({
            where: { id: item.assetId },
            data: { status: 'DISPOSED' },
          });
        } else {
          await tx.asset.update({
            where: { id: item.assetId },
            data: { status: 'AVAILABLE' },
          });
        }
      }

      // Overtime calculation (30 minutes buffer tolerance)
      const now = new Date();
      const endTime = new Date(booking.endTime);
      let overtimeHours = 0;
      let overtimeFee = 0;

      if (now.getTime() > endTime.getTime() + 30 * 60 * 1000) {
        const diffMs = now.getTime() - endTime.getTime();
        overtimeHours = Math.ceil(diffMs / (1000 * 60 * 60));
        overtimeFee = overtimeHours * (booking.roomRate || 0);
      }

      // Update booking
      await tx.roomBooking.update({
        where: { id: params.id },
        data: {
          bookingStatus: hasClaim ? 'COMPLETED_WITH_CLAIM' : 'COMPLETED',
          checkOutTime: now,
          overtimeHours,
          overtimeFee,
          payStatus: hasClaim ? 'CLAIMED' : (booking.payStatus === 'DOWN_PAYMENT' ? 'PAID' : 'REFUNDED'),
          notes: generalNotes ? `[Check-Out]: ${generalNotes}\n${booking.notes || ''}` : booking.notes,
        },
      });

      // Free the room
      await tx.location.update({
        where: { id: booking.locationId },
        data: { status: 'AVAILABLE' },
      });

      // Release addon assets
      for (const addon of booking.addonAssets) {
        const addonAsset = await tx.asset.findUnique({ where: { id: addon.assetId } });
        if (addonAsset && addonAsset.status === 'BORROWED') {
          await tx.asset.update({
            where: { id: addon.assetId },
            data: { status: 'AVAILABLE' },
          });
        }
      }

      // If claim exists, create AssetClaim and Violation records
      if (hasClaim) {
        const claimType = inspectionData.some((it: any) => it.isMissing) ? 'LOST' : 'DAMAGED';

        const existingClaim = await tx.assetClaim.findUnique({
          where: { bookingId: params.id },
        });

        if (!existingClaim) {
          const currentYear = new Date().getFullYear();
          const count = await tx.assetClaim.count({
            where: { createdAt: { gte: new Date(`${currentYear}-01-01`), lte: new Date(`${currentYear}-12-31`) } }
          });
          const claimNumber = `CL-${currentYear}-${String(count + 1).padStart(4, '0')}`;

          await tx.assetClaim.create({
            data: {
              claimNumber,
              bookingId: params.id,
              userId: claimUserId,
              type: claimType,
              amount: totalClaimAmount,
              status: 'NEW',
              sourceFunding: 'NEW_BILL',
            },
          });
        } else {
          await tx.assetClaim.update({
            where: { bookingId: params.id },
            data: {
              type: claimType,
              amount: totalClaimAmount,
            },
          });
        }

        // Record damage/loss violation
        await tx.violation.create({
          data: {
            userId: claimUserId,
            rentalId: params.id,
            type: claimType === 'LOST' ? 'LOST_ASSET' : 'DAMAGED_ASSET',
            description: `Denda ganti rugi kerusakan/kehilangan fasilitas ruangan untuk booking #${booking.bookingNumber}. Total tagihan: Rp ${totalClaimAmount.toLocaleString('id-ID')}`
          }
        });

        // Suspend user automatically due to room damage/loss
        await tx.user.update({
          where: { id: claimUserId },
          data: { isSuspended: true }
        });

        // Trigger notification
        const { sendSystemNotification } = await import('@/lib/notification');
        await sendSystemNotification({
          userId: claimUserId,
          title: `Tagihan Ganti Rugi Ruangan #${booking.bookingNumber} 🚨`,
          message: `Akun Anda ditangguhkan sementara karena terdapat kasus kerusakan/kehilangan fasilitas sewa ruangan #${booking.bookingNumber}. Segera lakukan pelunasan denda sebesar Rp ${totalClaimAmount.toLocaleString('id-ID')} melalui menu "Ganti Rugi & Klaim".`,
          type: 'DANGER',
          email: booking.renter?.email || undefined,
          phone: booking.renter?.phone || undefined,
        });
      }
    });

    return NextResponse.json({
      message: 'Check-out berhasil',
      hasClaim,
      totalClaimAmount,
      checkOutTime: new Date(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

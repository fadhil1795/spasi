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
    if (!['ACTIVE', 'RETURN_REQUESTED'].includes(booking.bookingStatus)) {
      return NextResponse.json({ error: 'Booking harus berstatus ACTIVE atau RETURN_REQUESTED untuk check-out' }, { status: 400 });
    }

    const inspectionData = Array.isArray(inspectionItems) ? inspectionItems : [];
    const totalClaimAmount = inspectionData.reduce((sum: number, item: any) => sum + (item.claimAmount || 0), 0);
    const hasClaim = totalClaimAmount > 0;

    await prisma.$transaction(async (tx) => {
      // Find borrower user to assign claim/suspension to (NEVER suspend the staff performing check-out!)
      let matchedBorrowerId: string | null = null;
      if (booking.renter?.email) {
        const matchingUser = await tx.user.findFirst({
          where: { email: booking.renter.email },
        });
        if (matchingUser) matchedBorrowerId = matchingUser.id;
      }
      const claimUserId = matchedBorrowerId || (session.user as any).id;

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
        const hourlyOvertimeRate =
          booking.rentalType === 'DAILY'
            ? Math.round((booking.roomRate || 0) / 8)
            : (booking.roomRate || 0);
        overtimeFee = overtimeHours * hourlyOvertimeRate;
      }

      // Update booking
      await tx.roomBooking.update({
        where: { id: params.id },
        data: {
          bookingStatus: hasClaim ? 'COMPLETED_WITH_CLAIM' : 'COMPLETED',
          checkOutTime: now,
          overtimeHours,
          overtimeFee,
          payStatus: hasClaim
            ? 'CLAIMED'
            : booking.depositAmount > 0
            ? 'REFUNDED'
            : booking.payStatus,
          refundStatus: !hasClaim && booking.depositAmount > 0 ? 'REFUNDED' : (hasClaim ? 'NONE' : (booking.refundStatus || 'NONE')),
          notes: generalNotes ? `[Check-Out]: ${generalNotes}\n${booking.notes || ''}` : booking.notes,
        },
      });

      // Free the room (jika menggunakan ruangan)
      if (booking.locationId) {
        await tx.location.update({
          where: { id: booking.locationId },
          data: { status: 'AVAILABLE' },
        });
      }

      // Release addon assets & restore availableQty
      for (const addon of booking.addonAssets) {
        const addonAsset = await tx.asset.findUnique({ where: { id: addon.assetId } });
        if (addonAsset) {
          const restoredAvail = Math.min(
            addonAsset.quantity || 1,
            (addonAsset.availableQty ?? 0) + (addon.quantity || 1)
          );
          await tx.asset.update({
            where: { id: addon.assetId },
            data: {
              availableQty: restoredAvail,
              status: restoredAvail > 0 ? 'AVAILABLE' : addonAsset.status,
            },
          });
        }
      }

      // Catat Buku Kas Otomatis: Pengembalian Deposit jika tidak ada klaim kerusakan
      if (!hasClaim && booking.depositAmount > 0) {
        await tx.cashTransaction.create({
          data: {
            type: 'OUT',
            category: 'DEPOSIT',
            amount: booking.depositAmount,
            referenceId: booking.bookingNumber,
            description: `Pengembalian Uang Jaminan / Deposit Sewa Ruangan: #${booking.bookingNumber} (${booking.renter?.name || '-'})`,
          },
        });
      }

      // Catat Buku Kas Otomatis: Overtime Fee jika ada keterlambatan check-out
      if (overtimeFee > 0) {
        await tx.cashTransaction.create({
          data: {
            type: 'IN',
            category: 'PENALTY',
            amount: overtimeFee,
            referenceId: booking.bookingNumber,
            description: `Denda Biaya Tambahan Keterlambatan Check-Out (${overtimeHours} Jam) Ruangan: #${booking.bookingNumber}`,
          },
        });
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

        // Suspend borrower account ONLY if matched to an actual borrower user (never suspend staff)
        if (matchedBorrowerId) {
          await tx.user.update({
            where: { id: matchedBorrowerId },
            data: { isSuspended: true },
          });
        }

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

    const { createAuditLog } = await import('@/lib/audit');
    await createAuditLog({
      userId: (session.user as any).id,
      action: 'ROOM_BOOKING_CHECK_OUT',
      entity: 'RoomBooking',
      entityId: params.id,
      details: `Check-Out selesai untuk booking #${booking.bookingNumber} oleh ${inspectedBy || 'Petugas'}. Klaim: Rp ${totalClaimAmount.toLocaleString('id-ID')}`,
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

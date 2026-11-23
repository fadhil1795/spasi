import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { sendEmailVoucher } from '@/lib/mailer';
import { sendWaVoucher } from '@/lib/whatsapp';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const booking = await prisma.roomBooking.findUnique({
      where: { id: params.id },
      include: {
        location: {
          include: {
            assets: { where: { isFixedToRoom: true }, include: { category: true } },
            assetAllocations: { include: { asset: { include: { category: true } } } },
          },
        },
        renter: true,
        addonAssets: { include: { asset: { select: { id: true, code: true, name: true, images: true, sessionRentRate: true } } } },
        inspections: { include: { asset: { select: { name: true, images: true } } }, orderBy: { timestamp: 'asc' } },
      },
    });

    if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 });

    // Gabungkan aset alokasi ruangan (RoomAssetAllocation) dengan aset tetap ruangan agar tampil saat check-in/out
    const fixedAssets = booking.location?.assets || [];
    const fixedIds = new Set(fixedAssets.map((a) => a.id));
    const allocatedAssets = (booking.location?.assetAllocations || [])
      .map((ra) => ra.asset)
      .filter((a) => a && !fixedIds.has(a.id));

    const enrichedBooking = {
      ...booking,
      location: booking.location
        ? {
            ...booking.location,
            assets: [...fixedAssets, ...allocatedAssets],
          }
        : booking.location,
    };

    return NextResponse.json(enrichedBooking);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any)?.role || 'BORROWER';
    const body = await request.json();
    const { bookingStatus, payStatus, payMethod, paymentProofUrl, notes } = body;

    // Strict Role Enforcement: Borrower cannot confirm booking or mark paid directly!
    if (userRole === 'BORROWER') {
      if (bookingStatus && !['CANCELLED', 'RETURN_REQUESTED'].includes(bookingStatus)) {
        return NextResponse.json({ error: 'Pengguna peminjam tidak memiliki akses untuk mengonfirmasi booking' }, { status: 403 });
      }
      if (payStatus && payStatus === 'PAID') {
        return NextResponse.json({ error: 'Pembayaran harus diverifikasi oleh Admin/Staff' }, { status: 403 });
      }
    }

    const existingBooking = await prisma.roomBooking.findUnique({
      where: { id: params.id },
      include: { location: true, renter: true }
    });

    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 });
    }

    if (userRole === 'BORROWER') {
      const userEmail = session.user?.email;
      const userPhone = String((session.user as any)?.phone || '').trim();
      const isOwner =
        (userEmail && existingBooking.renter?.email === userEmail) ||
        (userPhone && existingBooking.renter?.phone === userPhone);
      if (!isOwner) {
        return NextResponse.json({ error: 'Anda tidak memiliki izin mengubah booking ini' }, { status: 403 });
      }
      if (bookingStatus === 'RETURN_REQUESTED' && existingBooking.bookingStatus !== 'ACTIVE') {
        return NextResponse.json({ error: 'Hanya booking berstatus ACTIVE yang dapat diajukan selesai pemakaian' }, { status: 400 });
      }
      if (
        bookingStatus === 'CANCELLED' &&
        !['PENDING', 'PENDING_L1', 'PENDING_L2', 'APPROVED', 'CONFIRMED'].includes(existingBooking.bookingStatus)
      ) {
        return NextResponse.json({ error: 'Pesanan yang sudah berjalan/selesai tidak dapat dibatalkan' }, { status: 400 });
      }
      const isEditingDetails =
        body.locationId !== undefined ||
        body.startTime !== undefined ||
        body.endTime !== undefined ||
        body.rentalType !== undefined ||
        body.addonAssets !== undefined ||
        body.supportingDocUrl !== undefined ||
        body.activityType !== undefined;
      if (isEditingDetails && !['PENDING', 'PENDING_L1', 'PENDING_L2'].includes(existingBooking.bookingStatus)) {
        return NextResponse.json(
          { error: 'Pesanan hanya dapat diedit selama belum disetujui (masih berstatus MENUNGGU)' },
          { status: 400 }
        );
      }
    }

    const resolvedNotes =
      bookingStatus === 'CANCELLED' && (!notes || !String(notes).trim())
        ? 'Dibatalkan oleh pengguna'
        : notes;

    const wasAlreadyPaid = existingBooking.payStatus === 'PAID';

    const targetLocationId =
      body.locationId !== undefined ? (body.locationId || null) : existingBooking.locationId;
    const targetRentalType = body.rentalType || existingBooking.rentalType;

    const updatedData: any = {
      ...(bookingStatus && { bookingStatus }),
      ...(payStatus && { payStatus }),
      ...(payMethod && { payMethod }),
      ...(body.paymentScheme && { paymentScheme: body.paymentScheme }),
      ...(body.activityType && { activityType: body.activityType }),
      ...(body.supportingDocUrl !== undefined && { supportingDocUrl: body.supportingDocUrl }),
      ...(body.rentalType && { rentalType: body.rentalType }),
      ...(body.locationId !== undefined && { locationId: targetLocationId }),
      ...(paymentProofUrl !== undefined && { paymentProofUrl }),
      ...(resolvedNotes !== undefined && { notes: resolvedNotes }),
    };

    const newStart = body.startTime ? new Date(body.startTime) : existingBooking.startTime;
    const newEnd = body.endTime ? new Date(body.endTime) : existingBooking.endTime;

    if (body.startTime || body.endTime || body.locationId !== undefined || body.rentalType) {
      if (newEnd <= newStart) {
        return NextResponse.json({ error: 'Waktu selesai harus setelah waktu mulai' }, { status: 400 });
      }

      if (targetLocationId) {
        const conflict = await prisma.roomBooking.findFirst({
          where: {
            id: { not: params.id },
            locationId: targetLocationId,
            bookingStatus: { in: ['CONFIRMED', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED'] },
            AND: [{ startTime: { lt: newEnd } }, { endTime: { gt: newStart } }],
          },
        });

        if (conflict) {
          return NextResponse.json({ error: 'Slot waktu baru sudah dipesan oleh penyewa lain' }, { status: 409 });
        }
      }

      updatedData.startTime = newStart;
      updatedData.endTime = newEnd;

      const diffMs = newEnd.getTime() - newStart.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      updatedData.durationHours = parseFloat(diffHours.toFixed(2));

      let activeRoomRate = existingBooking.roomRate;
      if (body.locationId !== undefined || body.rentalType) {
        if (!targetLocationId) {
          activeRoomRate = 0;
        } else {
          const targetRoom = await prisma.location.findUnique({ where: { id: targetLocationId } });
          if (targetRoom) {
            const isFree =
              existingBooking.renterCategory === 'EXTERNAL_PINJAM' ||
              (existingBooking.renterCategory === 'MAHASISWA' && targetRoom.isLoanable);
            activeRoomRate = isFree
              ? 0
              : targetRentalType === 'DAILY'
              ? targetRoom.pricePerDay || (targetRoom.pricePerHour || 0) * 8
              : targetRoom.pricePerHour || 0;
          }
        }
        updatedData.roomRate = activeRoomRate;
      }

      if (targetRentalType === 'DAILY') {
        const diffDays = Math.max(1, Math.ceil(diffHours / 24));
        updatedData.roomSubtotal = diffDays * activeRoomRate;
      } else {
        updatedData.roomSubtotal = updatedData.durationHours * activeRoomRate;
      }
    }

    let nextAddonSubtotal = existingBooking.addonSubtotal;
    if (Array.isArray(body.addonAssets)) {
      const isPaidMode =
        existingBooking.renterCategory === 'EXTERNAL_SEWA' ||
        (existingBooking.renterCategory === 'MAHASISWA' && existingBooking.location && !existingBooking.location.isLoanable);
      nextAddonSubtotal = isPaidMode
        ? body.addonAssets.reduce(
            (sum: number, a: any) => sum + (parseFloat(a.ratePerSession || 0) * parseInt(a.quantity || 1)),
            0
          )
        : 0;
      updatedData.addonSubtotal = nextAddonSubtotal;
    }

    if (updatedData.roomSubtotal !== undefined || updatedData.addonSubtotal !== undefined) {
      const baseRoomSub = updatedData.roomSubtotal !== undefined ? updatedData.roomSubtotal : existingBooking.roomSubtotal;
      updatedData.totalAmount = baseRoomSub + nextAddonSubtotal;
    }

    // Cek ulang bentrok jadwal saat admin menyetujui / mengonfirmasi booking
    if (bookingStatus && ['APPROVED', 'CONFIRMED'].includes(bookingStatus) && targetLocationId) {
      const approvalConflict = await prisma.roomBooking.findFirst({
        where: {
          id: { not: params.id },
          locationId: targetLocationId,
          bookingStatus: { in: ['CONFIRMED', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED'] },
          AND: [{ startTime: { lt: newStart } }, { endTime: { gt: newEnd } }],
        },
      });
      if (approvalConflict) {
        return NextResponse.json(
          { error: `Slot ruangan sudah terpakai oleh booking #${approvalConflict.bookingNumber}` },
          { status: 409 }
        );
      }
    }

    // Jika sesi gratis dikonfirmasi, pastikan payStatus = PAID
    const finalTotalWithDeposit =
      (updatedData.totalAmount !== undefined ? updatedData.totalAmount : existingBooking.totalAmount) +
      existingBooking.depositAmount;
    if (bookingStatus === 'CONFIRMED' && finalTotalWithDeposit === 0 && !payStatus) {
      updatedData.payStatus = 'PAID';
    }

    // Append notes jika bukan edit detail draft
    if (resolvedNotes !== undefined && !(body.startTime || body.endTime || body.addonAssets)) {
      updatedData.notes = existingBooking.notes
        ? `${resolvedNotes}\n${existingBooking.notes}`
        : resolvedNotes;
    }

    // Hitung incremental paidAmount saat verifikasi pembayaran (DP atau PAID)
    const prevPaidAmount = existingBooking.paidAmount || 0;
    let deltaPaidToRecord = 0;
    const effectivePayStatus = updatedData.payStatus || payStatus;
    if (effectivePayStatus === 'DOWN_PAYMENT' && existingBooking.payStatus !== 'DOWN_PAYMENT') {
      const dpTarget = Math.ceil(finalTotalWithDeposit * 0.5);
      if (dpTarget > prevPaidAmount) {
        updatedData.paidAmount = dpTarget;
        deltaPaidToRecord = dpTarget - prevPaidAmount;
      }
    } else if (effectivePayStatus === 'PAID' && !wasAlreadyPaid && !['REFUNDED', 'CLAIMED'].includes(existingBooking.payStatus)) {
      if (finalTotalWithDeposit > prevPaidAmount) {
        updatedData.paidAmount = finalTotalWithDeposit;
        deltaPaidToRecord = finalTotalWithDeposit - prevPaidAmount;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(body.addonAssets)) {
        await tx.bookingAddonAsset.deleteMany({ where: { bookingId: params.id } });
        if (body.addonAssets.length > 0) {
          await tx.bookingAddonAsset.createMany({
            data: body.addonAssets.map((a: any) => ({
              bookingId: params.id,
              assetId: a.assetId,
              assetName: a.assetName || '',
              quantity: parseInt(a.quantity || 1),
              ratePerSession: parseFloat(a.ratePerSession || 0),
              subtotal: parseFloat(a.ratePerSession || 0) * parseInt(a.quantity || 1),
            })),
          });
        }
      }

      const saved = await tx.roomBooking.update({
        where: { id: params.id },
        data: updatedData,
        include: { location: true, renter: true, addonAssets: true },
      });

      if (deltaPaidToRecord > 0) {
        const facilityLabel = saved.location?.name || 'Paket Peralatan Sarpras';
        await tx.cashTransaction.create({
          data: {
            type: 'IN',
            category: 'RENTAL',
            amount: deltaPaidToRecord,
            referenceId: saved.bookingNumber,
            description: `Penerimaan Pembayaran (${effectivePayStatus}) ${facilityLabel} (#${saved.bookingNumber}) - Penyewa: ${saved.renter.name}`,
          },
        });
      }

      return saved;
    });

    // Write Audit Log
    const approverId = (session.user as any).id;
    let actionDesc = 'ROOM_BOOKING_UPDATE';
    let details = `Booking updated.`;

    if (bookingStatus) {
      actionDesc = `ROOM_BOOKING_${bookingStatus}`;
      details = `Status booking diubah menjadi ${bookingStatus}.`;
    }
    if (payStatus) {
      actionDesc = `ROOM_BOOKING_PAY_${payStatus}`;
      details = `Status pembayaran diubah menjadi ${payStatus}.`;
    }
    if (body.startTime || body.endTime) {
      actionDesc = 'ROOM_BOOKING_RESCHEDULE';
      details = `Booking di-reschedule ke ${updated.startTime.toISOString()} s.d. ${updated.endTime.toISOString()}.`;
    }

    await createAuditLog({
      userId: approverId,
      action: actionDesc,
      entity: 'RoomBooking',
      entityId: updated.id,
      details,
      oldData: {
        bookingStatus: existingBooking.bookingStatus,
        payStatus: existingBooking.payStatus,
        startTime: existingBooking.startTime,
        endTime: existingBooking.endTime,
      },
      newData: {
        bookingStatus: updated.bookingStatus,
        payStatus: updated.payStatus,
        startTime: updated.startTime,
        endTime: updated.endTime,
      },
    });

    // Send notifications on booking or payment status changes
    if (updated.renter.email || updated.renter.phone) {
      const { sendEmailNotification } = await import('@/lib/mailer');
      const { sendWaNotification } = await import('@/lib/whatsapp');

      let notifTitle = '';
      let notifMessage = '';
      let notifType: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' = 'INFO';

      const facilityLabel = updated.location?.name || 'Paket Peralatan Sarpras';

      if (bookingStatus === 'CONFIRMED' && existingBooking.bookingStatus !== 'CONFIRMED') {
        notifTitle = 'Reservasi Sarpras Dikonfirmasi! 🎉';
        notifMessage = `Halo ${updated.renter.name},\nReservasi "${facilityLabel}" dengan kode booking ${updated.bookingNumber} telah DIKONFIRMASI oleh admin. Silakan tunjukkan E-Voucher Anda saat melakukan Check-In.`;
        notifType = 'SUCCESS';
      } else if (bookingStatus === 'CANCELLED' && existingBooking.bookingStatus !== 'CANCELLED') {
        notifTitle = 'Reservasi Sarpras Dibatalkan ❌';
        notifMessage = `Halo ${updated.renter.name},\nReservasi "${facilityLabel}" dengan kode booking ${updated.bookingNumber} telah DIBATALKAN.\nCatatan admin: "${notes || 'Tidak ada catatan'}"`;
        notifType = 'DANGER';
      }

      if (payStatus === 'PAID' && !wasAlreadyPaid) {
        notifTitle = 'Pembayaran Terverifikasi (Lunas) ✅';
        notifMessage = `Halo ${updated.renter.name},\nPembayaran untuk kode booking ${updated.bookingNumber} (${facilityLabel}) sebesar Rp ${updated.totalAmount.toLocaleString('id-ID')} telah berhasil diverifikasi dan dinyatakan LUNAS.`;
        notifType = 'SUCCESS';
      }

      if (notifTitle && notifMessage) {
        if (updated.renter.email) {
          sendEmailNotification({
            to: updated.renter.email,
            subject: `🔔 [SPASI] ${notifTitle}`,
            title: notifTitle,
            body: `<p>${notifMessage.replace(/\n/g, '<br>')}</p>`,
            type: notifType,
          }).catch(console.error);
        }
        if (updated.renter.phone) {
          const waMsg = `🔔 *[NOTIFIKASI SPASI]*\n\n*${notifTitle}*\n\n${notifMessage}\n\n_© SPASI - Sistem Manajemen Aset & Sewa_`;
          sendWaNotification(updated.renter.phone, waMsg).catch(console.error);
        }
      }
    }

    // Kirim voucher PDF jika diverifikasi LUNAS
    if (payStatus === 'PAID' && !wasAlreadyPaid) {
      const facilityLabel = updated.location?.name || 'Paket Peralatan Sarpras';

      const voucherData = {
        to: updated.renter.email,
        phone: updated.renter.phone,
        bookingNumber: updated.bookingNumber,
        renterName: updated.renter.name,
        assetNames: facilityLabel,
        totalAmount: updated.totalAmount,
        startDate: updated.startTime.toISOString().split('T')[0],
        endDate: updated.endTime.toISOString().split('T')[0],
      };

      Promise.allSettled([
        sendEmailVoucher(voucherData),
        sendWaVoucher({ ...voucherData, to: voucherData.phone })
      ]).catch(console.error);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

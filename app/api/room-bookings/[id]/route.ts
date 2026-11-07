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
        location: { include: { assets: { where: { isFixedToRoom: true }, include: { category: true } } } },
        renter: true,
        addonAssets: { include: { asset: { select: { name: true, images: true, sessionRentRate: true } } } },
        inspections: { include: { asset: { select: { name: true, images: true } } }, orderBy: { timestamp: 'asc' } },
      },
    });

    if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 });
    return NextResponse.json(booking);
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
      if (bookingStatus && !['CANCELLED'].includes(bookingStatus)) {
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

    // SOP Langkah 2: Menolak wajib mengisi alasan
    if (bookingStatus === 'CANCELLED' && existingBooking.bookingStatus !== 'CANCELLED') {
      if (!notes || !notes.trim()) {
        return NextResponse.json({ error: 'Alasan penolakan / pembatalan wajib diisi' }, { status: 400 });
      }
    }

    const wasAlreadyPaid = existingBooking.payStatus === 'PAID';

    const updatedData: any = {
      ...(bookingStatus && { bookingStatus }),
      ...(payStatus && { payStatus }),
      ...(payMethod && { payMethod }),
      ...(paymentProofUrl !== undefined && { paymentProofUrl }),
      ...(notes !== undefined && { notes }),
    };

    if (body.startTime || body.endTime) {
      const newStart = body.startTime ? new Date(body.startTime) : existingBooking.startTime;
      const newEnd = body.endTime ? new Date(body.endTime) : existingBooking.endTime;

      if (newEnd <= newStart) {
        return NextResponse.json({ error: 'Waktu selesai harus setelah waktu mulai' }, { status: 400 });
      }

      // Check anti-double booking, exclude this booking ID
      const conflict = await prisma.roomBooking.findFirst({
        where: {
          id: { not: params.id },
          locationId: existingBooking.locationId,
          bookingStatus: { in: ['CONFIRMED', 'ACTIVE'] },
          OR: [{ startTime: { lte: newEnd }, endTime: { gte: newStart } }],
        },
      });

      if (conflict) {
        return NextResponse.json({ error: 'Slot waktu baru sudah dipesan oleh penyewa lain' }, { status: 409 });
      }

      updatedData.startTime = newStart;
      updatedData.endTime = newEnd;

      // Recalculate duration and subtotal
      const diffMs = newEnd.getTime() - newStart.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      updatedData.durationHours = parseFloat(diffHours.toFixed(2));
      
      // Recalculate roomSubtotal based on rate type
      if (existingBooking.rentalType === 'DAILY') {
        const diffDays = Math.max(1, Math.ceil(diffHours / 24));
        updatedData.roomSubtotal = diffDays * existingBooking.roomRate;
      } else {
        updatedData.roomSubtotal = updatedData.durationHours * existingBooking.roomRate;
      }
      updatedData.totalAmount = updatedData.roomSubtotal + existingBooking.addonSubtotal;
    }

    const updated = await prisma.roomBooking.update({
      where: { id: params.id },
      data: updatedData,
      include: { location: true, renter: true, addonAssets: true },
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

      if (bookingStatus === 'CONFIRMED' && existingBooking.bookingStatus !== 'CONFIRMED') {
        notifTitle = 'Reservasi Ruangan Dikonfirmasi! 🎉';
        notifMessage = `Halo ${updated.renter.name},\nReservasi ruangan "${updated.location.name}" dengan kode booking ${updated.bookingNumber} telah DIKONFIRMASI oleh admin. Silakan tunjukkan E-Voucher Anda saat melakukan Check-In.`;
        notifType = 'SUCCESS';
      } else if (bookingStatus === 'CANCELLED' && existingBooking.bookingStatus !== 'CANCELLED') {
        notifTitle = 'Reservasi Ruangan Dibatalkan ❌';
        notifMessage = `Halo ${updated.renter.name},\nReservasi ruangan "${updated.location.name}" dengan kode booking ${updated.bookingNumber} telah DIBATALKAN.\nCatatan admin: "${notes || 'Tidak ada catatan'}"`;
        notifType = 'DANGER';
      }

      if (payStatus === 'PAID' && !wasAlreadyPaid) {
        notifTitle = 'Pembayaran Terverifikasi (Lunas) ✅';
        notifMessage = `Halo ${updated.renter.name},\nPembayaran untuk kode booking ${updated.bookingNumber} (Ruang ${updated.location.name}) sebesar Rp ${updated.totalAmount.toLocaleString('id-ID')} telah berhasil diverifikasi dan dinyatakan LUNAS.`;
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

    // Kirim voucher PDF & catat buku kas jika diverifikasi LUNAS
    if (payStatus === 'PAID' && !wasAlreadyPaid) {
      // Catat Buku Kas Otomatis (CashTransaction)
      try {
        if (updated.totalAmount > 0) {
          await prisma.cashTransaction.create({
            data: {
              type: 'IN',
              category: 'RENTAL',
              amount: updated.totalAmount,
              referenceId: updated.bookingNumber,
              description: `Penerimaan Pembayaran Sewa Ruang ${updated.location.name} (#${updated.bookingNumber}) - Penyewa: ${updated.renter.name}`,
            },
          });
        }
        if (updated.depositAmount > 0) {
          await prisma.cashTransaction.create({
            data: {
              type: 'IN',
              category: 'DEPOSIT',
              amount: updated.depositAmount,
              referenceId: updated.bookingNumber,
              description: `Penerimaan Uang Jaminan / Deposit Sewa Ruang ${updated.location.name} (#${updated.bookingNumber})`,
            },
          });
        }
      } catch (cashErr) {
        console.error('Error recording automatic cash transaction:', cashErr);
      }

      const voucherData = {
        to: updated.renter.email,
        phone: updated.renter.phone,
        bookingNumber: updated.bookingNumber,
        renterName: updated.renter.name,
        assetNames: `Ruang ${updated.location.name}`,
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

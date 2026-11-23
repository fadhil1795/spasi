import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSystemNotification } from '@/lib/notification';
import { sendEmailNotification } from '@/lib/mailer';
import { sendWaNotification } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const today = new Date();
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(today.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(today);
    tomorrowEnd.setDate(today.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    let reminderCount = 0;

    // ─────────────────────────────────────────────────────────────
    // 1. LOAN: Reminder H-1 Sebelum Pengambilan (status APPROVED)
    // ─────────────────────────────────────────────────────────────
    const loansToPickUp = await prisma.loan.findMany({
      where: {
        status: 'APPROVED',
        startDate: {
          gte: tomorrowStart,
          lte: tomorrowEnd,
        },
      },
      include: { user: true, asset: true },
    });

    for (const loan of loansToPickUp) {
      await sendSystemNotification({
        userId: loan.userId,
        title: 'Reminder H-1 Pengambilan Aset 📦',
        message: `Halo ${loan.user.name},\nBesok adalah jadwal pengambilan aset "${loan.asset.name}" (${loan.asset.code}) yang telah Anda pinjam. Harap datang ke lokasi penyimpanan untuk serah terima fisik.`,
        type: 'INFO',
        email: loan.user.email,
        phone: loan.user.phone,
      });
      reminderCount++;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. LOAN: Reminder H-1 Sebelum Pengembalian (status ACTIVE)
    // ─────────────────────────────────────────────────────────────
    const loansToReturn = await prisma.loan.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: tomorrowStart,
          lte: tomorrowEnd,
        },
      },
      include: { user: true, asset: true },
    });

    for (const loan of loansToReturn) {
      await sendSystemNotification({
        userId: loan.userId,
        title: 'Reminder H-1 Batas Pengembalian Aset ⏰',
        message: `Halo ${loan.user.name},\nBesok adalah batas akhir pengembalian aset "${loan.asset.name}" (${loan.asset.code}). Harap kembalikan aset tepat waktu untuk menghindari denda keterlambatan.`,
        type: 'WARNING',
        email: loan.user.email,
        phone: loan.user.phone,
      });
      reminderCount++;
    }

    // ─────────────────────────────────────────────────────────────
    // 3. ROOM BOOKING: Reminder H-1 Sebelum Sesi Mulai (status CONFIRMED)
    // ─────────────────────────────────────────────────────────────
    const bookingsToStart = await prisma.roomBooking.findMany({
      where: {
        bookingStatus: 'CONFIRMED',
        startTime: {
          gte: tomorrowStart,
          lte: tomorrowEnd,
        },
      },
      include: { renter: true, location: true },
    });

    for (const booking of bookingsToStart) {
      const timeStr = booking.startTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const title = 'Reminder H-1 Reservasi Ruangan 🏢';
      const locName = booking.location?.name || 'Paket Peralatan Sarpras';
      const locBuilding = booking.location?.building ? ` (${booking.location.building})` : '';
      const msg = `Halo ${booking.renter.name},\nBesok adalah jadwal sewa Anda untuk "${locName}"${locBuilding} mulai pukul ${timeStr} WIB. Harap siapkan E-Voucher Anda untuk check-in.`;

      if (booking.renter.email) {
        await sendEmailNotification({
          to: booking.renter.email,
          subject: `🔔 [SPASI] ${title}`,
          title,
          body: `<p>${msg.replace(/\n/g, '<br>')}</p>`,
          type: 'INFO',
        });
      }
      if (booking.renter.phone) {
        const waMsg = `🔔 *[NOTIFIKASI SPASI]*\n\n*${title}*\n\n${msg}\n\n_© SPASI - Sistem Manajemen Aset & Sewa_`;
        await sendWaNotification(booking.renter.phone, waMsg);
      }
      reminderCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Pemicu notifikasi selesai diproses. Total reminder dikirim: ${reminderCount}`,
      reminderCount,
    });
  } catch (error: any) {
    console.error('Error triggering reminders:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

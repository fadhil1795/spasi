import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { calculatePenaltyFee } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staffId = (session.user as any).id;
    const body = await request.json();
    const { qrToken, condition, notes } = body;

    if (!qrToken) {
      return NextResponse.json({ error: 'QR Code token wajib diisi' }, { status: 400 });
    }

    // Detect Room Booking Code (e.g. BK-2026-0007)
    if (qrToken.startsWith('BK-') || qrToken.startsWith('BK')) {
      const booking = await prisma.roomBooking.findUnique({
        where: { bookingNumber: qrToken },
        include: { location: true, renter: true }
      });

      if (booking) {
        return NextResponse.json({
          type: 'ROOM_BOOKING',
          message: `E-Voucher Digital Ditemukan: ${booking.bookingNumber}`,
          booking,
          nextAction: booking.bookingStatus === 'CONFIRMED' ? 'checkin' : (booking.bookingStatus === 'ACTIVE' ? 'checkout' : 'view'),
          redirectUrl: booking.bookingStatus === 'CONFIRMED' 
            ? `/dashboard/room-bookings/${booking.id}/checkin` 
            : (booking.bookingStatus === 'ACTIVE' 
              ? `/dashboard/room-bookings/${booking.id}/checkout` 
              : `/dashboard/room-bookings/${booking.id}`)
        });
      }
    }

    // 1. Find asset by qrToken or code
    const asset = await prisma.asset.findFirst({
      where: { OR: [{ qrToken }, { code: qrToken }] },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Aset tidak ditemukan dari QR Code yang discan' }, { status: 404 });
    }

    // 2. Check if there is a pending loan (PENDING_L1 / PENDING_L2)
    const pendingLoan = await prisma.loan.findFirst({
      where: {
        assetId: asset.id,
        status: { in: ['PENDING_L1', 'PENDING_L2'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (pendingLoan) {
      const levelText = pendingLoan.status === 'PENDING_L1' ? 'Level 1 (Kepala Unit/Atasan)' : 'Level 2 (Admin Aset Utama)';
      return NextResponse.json(
        {
          error: `Peminjaman Aset "${asset.name}" (${asset.code}) masih menunggu persetujuan ${levelText}. Harap setujui perizinan di menu Peminjaman sebelum Check-In.`,
          asset,
          loan: pendingLoan,
        },
        { status: 400 }
      );
    }

    // 3. Find active or approved loan for this asset
    const activeLoan = await prisma.loan.findFirst({
      where: {
        assetId: asset.id,
        status: { in: ['APPROVED', 'ACTIVE'] },
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    if (activeLoan) {
      // Perform CHECK-IN for Loan
      if (activeLoan.status === 'APPROVED') {
        await prisma.loan.update({
          where: { id: activeLoan.id },
          data: {
            status: 'ACTIVE',
            checkInTime: now,
          },
        });

        await prisma.asset.update({
          where: { id: asset.id },
          data: { status: 'BORROWED' },
        });

        await prisma.checkInLog.create({
          data: {
            loanId: activeLoan.id,
            type: 'CHECK_IN',
            scannedBy: staffId,
            condition: condition || 'Baik',
            notes: notes || null,
          },
        });

        return NextResponse.json({
          type: 'CHECK_IN',
          message: `Check-In Berhasil! Aset ${asset.name} kini berstatus DIPINJAM oleh ${activeLoan.user.name}.`,
          loan: activeLoan,
          asset,
        });
      }

      // Perform CHECK-OUT for Loan
      if (activeLoan.status === 'ACTIVE') {
        const setting = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
        const penaltyRate = setting?.dailyPenaltyRate || 50000;
        const penaltyFee = calculatePenaltyFee(activeLoan.endDate, now, penaltyRate);

        await prisma.loan.update({
          where: { id: activeLoan.id },
          data: {
            status: 'RETURNED',
            checkOutTime: now,
            condition: condition || 'Baik',
            penaltyFee,
            penaltyStatus: penaltyFee === 0 ? 'PAID' : 'UNPAID',
            notes: notes || null,
          },
        });

        await prisma.asset.update({
          where: { id: asset.id },
          data: { status: 'AVAILABLE', condition: condition || asset.condition },
        });

        await prisma.checkInLog.create({
          data: {
            loanId: activeLoan.id,
            type: 'CHECK_OUT',
            scannedBy: staffId,
            condition: condition || 'Baik',
            notes: notes || null,
          },
        });

        return NextResponse.json({
          type: 'CHECK_OUT',
          message: `Pengembalian Berhasil! Status aset kembali TERSEDIA. ${penaltyFee > 0 ? `Keterlambatan terhitung Denda: Rp ${penaltyFee.toLocaleString('id-ID')}` : ''}`,
          penaltyFee,
          loan: activeLoan,
          asset,
        });
      }
    }

    // 4. Check for active RENTAL transaction if no Loan found
    const activeRental = await prisma.rental.findFirst({
      where: {
        assetId: asset.id,
        payStatus: { in: ['PAID', 'DOWN_PAYMENT', 'UNPAID'] },
      },
      include: { renter: true },
      orderBy: { createdAt: 'desc' },
    });

    if (activeRental) {
      if (asset.status !== 'RENTED') {
        await prisma.asset.update({
          where: { id: asset.id },
          data: { status: 'RENTED' },
        });
        return NextResponse.json({
          type: 'CHECK_IN_RENTAL',
          message: `Check-In Sewa Berhasil! Aset ${asset.name} terdaftar pada Penyewaan #${activeRental.bookingNumber} a.n ${activeRental.renter.name}. Status aset disesuaikan.`,
          rental: activeRental,
          asset,
        });
      } else {
        const setting = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
        const penaltyRate = setting?.dailyPenaltyRate || 50000;
        const penaltyFee = calculatePenaltyFee(activeRental.endDate, now, penaltyRate);

        await prisma.rental.update({
          where: { id: activeRental.id },
          data: {
            penaltyFee,
            penaltyStatus: penaltyFee === 0 ? 'PAID' : 'UNPAID',
          },
        });

        await prisma.asset.update({
          where: { id: asset.id },
          data: { status: 'AVAILABLE' },
        });

        return NextResponse.json({
          type: 'CHECK_OUT_RENTAL',
          message: `Pengembalian Sewa Berhasil! Aset ${asset.name} kembali tersedia. ${penaltyFee > 0 ? `Keterlambatan terhitung Denda: Rp ${penaltyFee.toLocaleString('id-ID')}` : ''}`,
          penaltyFee,
          rental: activeRental,
          asset,
        });
      }
    }

    return NextResponse.json(
      {
        error: `Aset "${asset.name}" (${asset.code}) tidak memiliki peminjaman atau penyewaan aktif yang siap di-CheckIn / CheckOut. Silakan pastikan tiket peminjaman telah disetujui hingga Level 2 (Admin Aset Utama).`,
        asset,
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error scanning QR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

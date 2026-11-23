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

    const cleanToken = String(qrToken).trim().replace(/^#/, '');
    const bookingUrlMatch = cleanToken.match(/\/bookings\/([A-Za-z0-9_-]+)/i);
    const maybeBookingCode = (bookingUrlMatch ? bookingUrlMatch[1] : cleanToken).toUpperCase();

    // Detect Room Booking Code (e.g. BK-2026-0007 or URL /bookings/BK-2026-0007)
    if (maybeBookingCode.startsWith('BK-') || maybeBookingCode.startsWith('BK')) {
      const booking = await prisma.roomBooking.findUnique({
        where: { bookingNumber: maybeBookingCode },
        include: { location: true, renter: true }
      });

      if (booking) {
        const isCheckinReady = booking.bookingStatus === 'CONFIRMED';
        const isCheckoutReady = ['ACTIVE', 'RETURN_REQUESTED'].includes(booking.bookingStatus);
        if (!isCheckinReady && !isCheckoutReady) {
          return NextResponse.json(
            {
              error: `Booking #${booking.bookingNumber} belum dapat di-Check-In / Check-Out karena berstatus "${booking.bookingStatus}". Hanya booking yang sudah disetujui & dikonfirmasi (CONFIRMED) atau sedang aktif (ACTIVE / RETURN_REQUESTED) yang dapat diproses.`,
            },
            { status: 400 }
          );
        }
        return NextResponse.json({
          type: 'ROOM_BOOKING',
          message: `E-Voucher Digital Ditemukan: ${booking.bookingNumber}`,
          booking,
          nextAction: isCheckinReady ? 'checkin' : 'checkout',
          redirectUrl: isCheckinReady
            ? `/dashboard/room-bookings/${booking.id}/checkin`
            : `/dashboard/room-bookings/${booking.id}/checkout`,
        });
      }
    }

    // Detect Loan Group Code (e.g. GRP-2026-0001-ABC) -> arahkan ke Batch Handover
    if (maybeBookingCode.startsWith('GRP-')) {
      const groupLoans = await prisma.loan.findMany({
        where: { groupCode: maybeBookingCode },
        include: { asset: true, user: true },
      });
      if (groupLoans.length > 0) {
        const approvedIds = groupLoans.filter((l) => l.status === 'APPROVED').map((l) => l.id);
        const checkoutIds = groupLoans.filter((l) => ['ACTIVE', 'RETURN_REQUESTED'].includes(l.status)).map((l) => l.id);
        if (approvedIds.length === 0 && checkoutIds.length === 0) {
          return NextResponse.json(
            {
              error: `Paket peminjaman #${maybeBookingCode} belum dapat di-Check-In / Check-Out karena berstatus "${groupLoans[0].status}". Hanya peminjaman yang sudah disetujui penuh (APPROVED) atau sedang aktif (ACTIVE / RETURN_REQUESTED) yang dapat diproses.`,
            },
            { status: 400 }
          );
        }
        const redirectUrl =
          approvedIds.length > 0
            ? `/dashboard/handovers/batch?ids=${approvedIds.join(',')}&type=CHECK_IN`
            : `/dashboard/handovers/batch?ids=${checkoutIds.join(',')}&type=CHECK_OUT`;
        return NextResponse.json({
          type: 'ROOM_BOOKING',
          message: `Paket Peminjaman Ditemukan: #${maybeBookingCode} (${groupLoans.length} Aset)`,
          booking: {
            bookingNumber: maybeBookingCode,
            bookingStatus: groupLoans[0].status,
            payStatus: 'FREE',
            location: { name: `${groupLoans.length} Aset Paket`, building: '-' },
            renter: { name: groupLoans[0].user?.name || '-' },
          },
          nextAction: approvedIds.length > 0 ? 'checkin' : 'checkout',
          redirectUrl,
        });
      }
    }

    // Detect Loan Ticket Code (e.g. LN-2026-0001)
    let matchedAssetFromLoanId: string | null = null;
    let specificTicketLoan: any = null;
    if (maybeBookingCode.startsWith('LN-')) {
      const ticketLoan = await prisma.loan.findUnique({
        where: { ticketNumber: maybeBookingCode },
        include: { user: true },
      });
      if (!ticketLoan) {
        return NextResponse.json({ error: `Tiket peminjaman #${maybeBookingCode} tidak ditemukan` }, { status: 404 });
      }
      if (!['APPROVED', 'ACTIVE', 'RETURN_REQUESTED'].includes(ticketLoan.status)) {
        return NextResponse.json(
          {
            error: `Tiket peminjaman #${ticketLoan.ticketNumber} belum dapat di-Check-In / Check-Out karena berstatus "${ticketLoan.status}". Hanya peminjaman yang sudah disetujui penuh (APPROVED) atau sedang aktif (ACTIVE / RETURN_REQUESTED) yang dapat diproses.`,
          },
          { status: 400 }
        );
      }
      matchedAssetFromLoanId = ticketLoan.assetId;
      specificTicketLoan = ticketLoan;
    }

    // Extract Asset ID if QR is a URL like http://.../dashboard/assets/<id> or /assets/<id>
    const assetUrlMatch = cleanToken.match(/\/assets\/([A-Za-z0-9_-]+)/i);
    const extractedAssetId = matchedAssetFromLoanId || (assetUrlMatch ? assetUrlMatch[1] : cleanToken);

    // 1. Find asset by id, qrToken, or code
    const asset = await prisma.asset.findFirst({
      where: {
        OR: [
          { id: extractedAssetId },
          { qrToken: cleanToken },
          { code: cleanToken },
          { code: maybeBookingCode },
        ],
      },
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

    // 3. Find active, return-requested, or approved loan for this asset
    const activeLoan =
      specificTicketLoan ||
      (await prisma.loan.findFirst({
        where: {
          assetId: asset.id,
          status: { in: ['APPROVED', 'ACTIVE', 'RETURN_REQUESTED'] },
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }));

    const now = new Date();

    if (activeLoan) {
      const loanQty = activeLoan.quantity || 1;

      // Perform CHECK-IN for Loan
      if (activeLoan.status === 'APPROVED') {
        const newAvail = Math.max(0, asset.availableQty - loanQty);

        await prisma.loan.update({
          where: { id: activeLoan.id },
          data: {
            status: 'ACTIVE',
            checkInTime: now,
          },
        });

        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            availableQty: newAvail,
            status: newAvail === 0 ? 'BORROWED' : 'AVAILABLE',
          },
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
          message: `Check-In Berhasil! ${loanQty} unit aset ${asset.name} kini berstatus DIPINJAM oleh ${activeLoan.user.name}. (Sisa stok tersedia: ${newAvail}/${asset.quantity})`,
          loan: activeLoan,
          asset,
        });
      }

      // Perform CHECK-OUT for Loan (ACTIVE or RETURN_REQUESTED)
      if (activeLoan.status === 'ACTIVE' || activeLoan.status === 'RETURN_REQUESTED') {
        const setting = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
        const penaltyRate = setting?.dailyPenaltyRate || 50000;
        const penaltyFee = calculatePenaltyFee(activeLoan.endDate, now, penaltyRate);
        const newAvail = Math.min(asset.quantity, asset.availableQty + loanQty);

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
          data: {
            availableQty: newAvail,
            status: newAvail > 0 ? 'AVAILABLE' : asset.status,
            condition: condition || asset.condition,
          },
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
          message: `Pengembalian Berhasil! ${loanQty} unit dikembalikan (Stok tersedia: ${newAvail}/${asset.quantity}). ${penaltyFee > 0 ? `Keterlambatan terhitung Denda: Rp ${penaltyFee.toLocaleString('id-ID')}` : ''}`,
          penaltyFee,
          loan: activeLoan,
          asset,
        });
      }
    }

    // 4. Check for approved/active RENTAL transaction if no Loan found
    const activeRental = await prisma.rental.findFirst({
      where: {
        assetId: asset.id,
        status: { in: ['APPROVED', 'ACTIVE'] },
        payStatus: { in: ['PAID', 'DOWN_PAYMENT'] },
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

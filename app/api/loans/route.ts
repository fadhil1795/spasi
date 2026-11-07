import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { generateLoanTicket } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const myLoans = searchParams.get('my') === 'true';

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    const whereClause: any = {};
    if (status && status !== 'ALL') whereClause.status = status;

    if (myLoans || userRole === 'BORROWER') {
      whereClause.userId = userId;
    }

    const loans = await prisma.loan.findMany({
      where: whereClause,
      include: {
        asset: { select: { id: true, name: true, code: true, images: true, category: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
        approvals: { include: { approver: { select: { name: true } } } },
        rating: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { assetId, startDate, endDate, purpose, notes, permitPdfUrl, activityType, consentText } = body;

    if (!assetId || !startDate || !endDate || !purpose || !permitPdfUrl) {
      return NextResponse.json({ error: 'Data peminjaman tidak lengkap (Identitas dan Surat Kegiatan wajib dilampirkan)' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Quota Validation Check
    const activeBookingsCount = await prisma.roomBooking.count({
      where: {
        renterId: userId,
        bookingStatus: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] }
      }
    });

    const activeLoansCount = await prisma.loan.count({
      where: {
        userId,
        status: { in: ['PENDING_L1', 'PENDING_L2', 'APPROVED', 'ACTIVE'] }
      }
    });

    const totalActive = activeBookingsCount + activeLoansCount;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user && user.role === 'BORROWER' && user.renterCategory === 'EXTERNAL') {
      return NextResponse.json({ error: 'Akses terbatas bagi pengguna Eksternal. Silakan ajukan verifikasi akun terlebih dahulu.' }, { status: 403 });
    }

    if (user) {
      let appliedRule = await prisma.quotaRule.findFirst({
        where: { targetType: 'USER', targetId: userId }
      });

      if (!appliedRule && user.departmentId) {
        appliedRule = await prisma.quotaRule.findFirst({
          where: { targetType: 'DEPARTMENT', targetId: user.departmentId }
        });
      }

      if (!appliedRule) {
        appliedRule = await prisma.quotaRule.findFirst({
          where: { targetType: 'ROLE', targetId: user.role }
        });
      }

      const maxQuota = appliedRule ? appliedRule.maxActiveBookings : 3;
      if (totalActive >= maxQuota) {
        return NextResponse.json(
          { error: `Kuota pemesanan/peminjaman aktif Anda penuh. Batas maksimal Anda adalah ${maxQuota} booking aktif.` },
          { status: 400 }
        );
      }
    }

    // 2. Blocked Period Validation Check
    const blockedConflict = await prisma.blockedPeriod.findFirst({
      where: {
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'ITEM', scopeTarget: assetId }
        ],
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } }
        ]
      }
    });

    if (blockedConflict) {
      return NextResponse.json(
        { error: `Periode tanggal tersebut terblokir oleh kebijakan kampus (${blockedConflict.reason}).` },
        { status: 400 }
      );
    }

    // Operational Constraint: Max 3 days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 3) {
      return NextResponse.json({ error: 'Batas waktu peminjaman internal maksimal adalah 3 hari.' }, { status: 400 });
    }

    // Operational Constraint: Prevent Weekend (Saturday = 6, Sunday = 0)
    const startDay = start.getDay();
    const endDay = end.getDay();
    if (startDay === 0 || startDay === 6 || endDay === 0 || endDay === 6) {
      return NextResponse.json({ error: 'Peminjaman tidak dapat dilakukan atau berakhir pada hari Sabtu/Minggu (weekend).' }, { status: 400 });
    }

    // Asset availability and status check
    const targetAsset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!targetAsset) {
      return NextResponse.json({ error: 'Aset tidak ditemukan' }, { status: 404 });
    }
    if (targetAsset.status === 'DISPOSED') {
      return NextResponse.json(
        { error: 'Aset ini telah diafkirkan / dihapus dari buku inventaris aktif dan tidak dapat dipinjam.' },
        { status: 400 }
      );
    }
    if (!targetAsset.isLoanable) {
      return NextResponse.json(
        { error: 'Aset ini tidak diaktifkan untuk peminjaman internal.' },
        { status: 400 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';

    // Atomic transaction to prevent parallel double-booking
    const newLoan = await prisma.$transaction(async (tx) => {
      // Conflict validation (Double booking check)
      const existingConflict = await tx.loan.findFirst({
        where: {
          assetId,
          status: { in: ['PENDING_L1', 'PENDING_L2', 'APPROVED', 'ACTIVE'] },
          OR: [
            { startDate: { lte: end }, endDate: { gte: start } },
          ],
        },
      });

      if (existingConflict) {
        throw new Error('CONFLICT_DOUBLE_BOOKING');
      }

      // Maintenance validation check
      const maintenanceConflict = await tx.maintenance.findFirst({
        where: {
          assetId,
          status: { in: ['SCHEDULED', 'ONGOING'] },
          OR: [
            { startDate: { lte: end }, endDate: null },
            { startDate: { lte: end }, endDate: { gte: start } }
          ]
        }
      });

      if (maintenanceConflict) {
        throw new Error('CONFLICT_MAINTENANCE');
      }

      const count = await tx.loan.count();
      const ticketNumber = generateLoanTicket(count + 1);

      return await tx.loan.create({
        data: {
          ticketNumber,
          userId,
          assetId,
          startDate: start,
          endDate: end,
          purpose,
          notes,
          permitPdfUrl,
          status: 'PENDING_L1',
          activityType: activityType || 'PERSONAL',
          approvals: {
            create: [
              { level: 1, approverId: userId, status: 'PENDING' },
            ],
          },
          consentLogs: {
            create: [
              {
                userId,
                consentType: 'GENERAL',
                consentTextVersion: consentText || 'Pernyataan menyetujui syarat & ketentuan peminjaman inventaris SPASI',
                ipAddress: clientIp,
              },
            ],
          },
        },
        include: {
          asset: true,
        },
      });
    });

    return NextResponse.json(newLoan, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'CONFLICT_DOUBLE_BOOKING') {
      return NextResponse.json(
        { error: 'Aset sudah di-booking oleh pengguna lain di jadwal tanggal tersebut.' },
        { status: 409 }
      );
    }
    if (error?.message === 'CONFLICT_MAINTENANCE') {
      return NextResponse.json(
        { error: 'Aset sedang dalam jadwal perawatan/maintenance rutin di rentang tanggal tersebut.' },
        { status: 409 }
      );
    }
    console.error('Error creating loan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

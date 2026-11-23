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
    const { assetId, items, startDate, endDate, purpose, notes, permitPdfUrl, activityType, consentText, quantity } = body;

    // Normalisasi daftar aset yang dipinjam: dukung multi-item `items` maupun single `assetId`
    const loanItems: { assetId: string; quantity: number }[] = Array.isArray(items) && items.length > 0
      ? items.map((it: any) => ({
          assetId: String(it.assetId),
          quantity: Math.max(1, parseInt(it.quantity || '1', 10) || 1),
        }))
      : assetId
      ? [{ assetId: String(assetId), quantity: Math.max(1, parseInt(quantity || '1', 10) || 1) }]
      : [];

    if (loanItems.length === 0 || !startDate || !endDate || !purpose || !permitPdfUrl) {
      return NextResponse.json({ error: 'Data peminjaman tidak lengkap (Pilih minimal 1 aset, isi tanggal, keperluan, Identitas dan Surat Kegiatan)' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Format tanggal peminjaman tidak valid.' }, { status: 400 });
    }
    if (end < start) {
      return NextResponse.json({ error: 'Tanggal kembali tidak boleh lebih awal dari tanggal pinjam.' }, { status: 400 });
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (start < todayStart) {
      return NextResponse.json({ error: 'Tanggal mulai peminjaman tidak boleh di masa lalu.' }, { status: 400 });
    }

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

    if (user?.isSuspended) {
      return NextResponse.json(
        { error: 'Akun Anda sedang ditangguhkan (Suspended) akibat pelanggaran/keterlambatan atau tanggungan klaim aset. Hubungi Admin Sarpras untuk pemulihan akun.' },
        { status: 403 }
      );
    }

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
      if (totalActive + loanItems.length > maxQuota && !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
        const remainingQuota = Math.max(0, maxQuota - totalActive);
        return NextResponse.json(
          {
            error:
              remainingQuota === 0
                ? `Kuota pemesanan/peminjaman aktif Anda penuh. Batas maksimal Anda adalah ${maxQuota} booking aktif.`
                : `Anda mengajukan ${loanItems.length} aset, melebihi sisa kuota aktif Anda (${remainingQuota} dari maksimal ${maxQuota} transaksi).`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Blocked Period Validation Check
    const blockedConflict = await prisma.blockedPeriod.findFirst({
      where: {
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'ITEM', scopeTarget: { in: loanItems.map((it) => it.assetId) } }
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

    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';

    // Atomic transaction to validate & create all requested loans
    const createdLoans = await prisma.$transaction(async (tx) => {
      const results = [];
      let baseCount = await tx.loan.count();
      const groupCode =
        loanItems.length > 1
          ? `GRP-${new Date().getFullYear()}-${String(baseCount + 1).padStart(4, '0')}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
          : null;

      for (const item of loanItems) {
        const targetAsset = await tx.asset.findUnique({ where: { id: item.assetId } });
        if (!targetAsset) {
          throw new Error(`ASSET_NOT_FOUND:${item.assetId}`);
        }
        if (targetAsset.status === 'DISPOSED') {
          throw new Error(`ASSET_UNAVAILABLE:${targetAsset.name}:telah diafkirkan`);
        }
        if (['DAMAGED', 'MAINTENANCE', 'LOST', 'INACTIVE'].includes(targetAsset.status)) {
          throw new Error(`ASSET_UNAVAILABLE:${targetAsset.name}:berstatus ${targetAsset.status}`);
        }
        if (!targetAsset.isLoanable) {
          throw new Error(`ASSET_UNAVAILABLE:${targetAsset.name}:tidak diaktifkan untuk peminjaman internal`);
        }
        if (item.quantity > targetAsset.quantity) {
          throw new Error(`CONFLICT_INSUFFICIENT_QTY:${targetAsset.quantity}:${targetAsset.name}`);
        }

        const overlappingLoans = await tx.loan.findMany({
          where: {
            assetId: item.assetId,
            status: { in: ['PENDING_L1', 'PENDING_L2', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED'] },
            startDate: { lte: end },
            endDate: { gte: start },
          },
          select: { quantity: true },
        });

        const bookedQty = overlappingLoans.reduce((sum, l) => sum + (l.quantity || 1), 0);
        const remainingOnDates = Math.max(0, targetAsset.quantity - bookedQty);

        if (item.quantity > remainingOnDates) {
          throw new Error(`CONFLICT_INSUFFICIENT_QTY:${remainingOnDates}:${targetAsset.name}`);
        }

        const maintenanceConflict = await tx.maintenance.findFirst({
          where: {
            assetId: item.assetId,
            status: { in: ['SCHEDULED', 'ONGOING'] },
            OR: [
              { startDate: { lte: end }, endDate: null },
              { startDate: { lte: end }, endDate: { gte: start } },
            ],
          },
        });

        if (maintenanceConflict) {
          throw new Error(`CONFLICT_MAINTENANCE:${targetAsset.name}`);
        }

        baseCount++;
        let ticketNumber = generateLoanTicket(baseCount);
        let dupTicket = await tx.loan.findUnique({ where: { ticketNumber } });
        while (dupTicket) {
          baseCount++;
          ticketNumber = generateLoanTicket(baseCount);
          dupTicket = await tx.loan.findUnique({ where: { ticketNumber } });
        }

        const created = await tx.loan.create({
          data: {
            ticketNumber,
            groupCode,
            userId,
            assetId: item.assetId,
            quantity: item.quantity,
            startDate: start,
            endDate: end,
            purpose,
            notes,
            permitPdfUrl,
            status: 'PENDING_L1',
            activityType: activityType || 'PERSONAL',
            approvals: {
              create: [{ level: 1, approverId: userId, status: 'PENDING' }],
            },
            consentLogs: {
              create: [
                {
                  userId,
                  consentType: 'GENERAL',
                  consentTextVersion:
                    consentText || 'Pernyataan menyetujui syarat & ketentuan peminjaman inventaris SPASI',
                  ipAddress: clientIp,
                },
              ],
            },
          },
          include: {
            asset: true,
          },
        });

        results.push(created);
      }

      return results;
    });

    return NextResponse.json(
      {
        ...createdLoans[0],
        loans: createdLoans,
        count: createdLoans.length,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.message?.startsWith('ASSET_NOT_FOUND:')) {
      return NextResponse.json({ error: 'Salah satu aset tidak ditemukan.' }, { status: 404 });
    }
    if (error?.message?.startsWith('ASSET_UNAVAILABLE:')) {
      const parts = error.message.split(':');
      return NextResponse.json(
        { error: `Aset "${parts[1]}" tidak dapat dipinjam (${parts[2]}).` },
        { status: 400 }
      );
    }
    if (error?.message?.startsWith('CONFLICT_INSUFFICIENT_QTY:')) {
      const parts = error.message.split(':');
      const rem = parts[1] || '0';
      const astName = parts[2] || 'Aset';
      return NextResponse.json(
        {
          error:
            rem === '0'
              ? `Semua unit "${astName}" sudah di-booking oleh pengguna lain di jadwal tanggal tersebut.`
              : `Stok "${astName}" pada jadwal tanggal tersebut tidak mencukupi (tersisa ${rem} unit).`,
        },
        { status: 409 }
      );
    }
    if (error?.message === 'CONFLICT_DOUBLE_BOOKING') {
      return NextResponse.json(
        { error: 'Aset sudah di-booking oleh pengguna lain di jadwal tanggal tersebut.' },
        { status: 409 }
      );
    }
    if (error?.message?.startsWith('CONFLICT_MAINTENANCE')) {
      const parts = error.message.split(':');
      const astName = parts[1] || 'Aset';
      return NextResponse.json(
        { error: `"${astName}" sedang dalam jadwal perawatan/maintenance rutin di rentang tanggal tersebut.` },
        { status: 409 }
      );
    }
    console.error('Error creating loan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

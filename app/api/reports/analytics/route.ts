import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const filterYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
    const filterMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null; // 1-12, null = all
    const filterType = searchParams.get('type') || 'ALL'; // ALL, ROOM, ASSET

    // Date range based on filters
    const yearStart = new Date(filterYear, 0, 1);
    const yearEnd = new Date(filterYear, 11, 31, 23, 59, 59);
    let dateStart = yearStart;
    let dateEnd = yearEnd;
    if (filterMonth) {
      dateStart = new Date(filterYear, filterMonth - 1, 1);
      dateEnd = new Date(filterYear, filterMonth, 0, 23, 59, 59);
    }

    // ─── ROOM BOOKINGS ───────────────────────────────────────────────────────────
    const roomBookings = filterType !== 'ASSET' ? await prisma.roomBooking.findMany({
      where: { createdAt: { gte: dateStart, lte: dateEnd } },
      include: {
        location: { select: { name: true, building: true, code: true } },
        renter: { select: { name: true, phone: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }) : [];

    // ─── ASSET RENTALS ───────────────────────────────────────────────────────────
    const assetRentals = filterType !== 'ROOM' ? await prisma.rental.findMany({
      where: { createdAt: { gte: dateStart, lte: dateEnd } },
      include: {
        asset: { select: { name: true, code: true } },
        renter: { select: { name: true, phone: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }) : [];

    // ─── COMPUTE KPIs ────────────────────────────────────────────────────────────
    const monthlyRevenue = Array(12).fill(0);
    const monthlyBookingsCount = Array(12).fill(0);
    const paymentMethods: Record<string, number> = {};

    let totalRevenue = 0;
    let totalRoomRevenue = 0;
    let totalAssetRevenue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalCancelled = 0;
    let countPaid = 0;
    let countPending = 0;
    let countCancelled = 0;

    // Process room bookings
    roomBookings.forEach((b) => {
      const bDate = new Date(b.createdAt);
      const isPaid = ['PAID'].includes(b.payStatus) || ['CONFIRMED', 'ACTIVE', 'COMPLETED', 'COMPLETED_WITH_CLAIM'].includes(b.bookingStatus);
      const isCancelled = b.bookingStatus === 'CANCELLED' || b.payStatus === 'CANCELLED';

      if (isCancelled) {
        countCancelled++;
      } else if (isPaid) {
        const amount = b.totalAmount || 0;
        totalRevenue += amount;
        totalRoomRevenue += amount;
        totalPaid += amount;
        countPaid++;
        if (bDate.getFullYear() === filterYear) {
          monthlyRevenue[bDate.getMonth()] += amount;
          monthlyBookingsCount[bDate.getMonth()]++;
        }
        const method = b.payMethod?.toUpperCase() || 'LAINNYA';
        paymentMethods[method] = (paymentMethods[method] || 0) + amount;
      } else {
        totalPending += b.totalAmount || 0;
        countPending++;
      }
    });

    // Process asset rentals
    assetRentals.forEach((r) => {
      const rDate = new Date(r.createdAt);
      const isPaid = r.payStatus === 'PAID';
      const isCancelled = r.payStatus === 'CANCELLED';

      if (isCancelled) {
        countCancelled++;
      } else if (isPaid) {
        const amount = r.totalAmount || 0;
        totalRevenue += amount;
        totalAssetRevenue += amount;
        totalPaid += amount;
        countPaid++;
        if (rDate.getFullYear() === filterYear) {
          monthlyRevenue[rDate.getMonth()] += amount;
          monthlyBookingsCount[rDate.getMonth()]++;
        }
        const method = r.payMethod?.toUpperCase() || 'LAINNYA';
        paymentMethods[method] = (paymentMethods[method] || 0) + amount;
      } else {
        totalPending += r.totalAmount || 0;
        countPending++;
      }
    });

    // ─── CSV EXPORT ───────────────────────────────────────────────────────────────
    if (format === 'csv') {
      const csvRows = [
        ['Jenis', 'No. Booking', 'Tanggal', 'Penyewa', 'Telepon', 'Item', 'Total (Rp)', 'Metode Bayar', 'Status Bayar'].join(','),
      ];

      roomBookings.forEach((b) => {
        csvRows.push([
          '"Sewa Ruangan"',
          `"${b.bookingNumber}"`,
          `"${new Date(b.createdAt).toISOString().split('T')[0]}"`,
          `"${(b.renter?.name || '').replace(/"/g, '""')}"`,
          `"${b.renter?.phone || ''}"`,
          `"${(b.location?.name || '').replace(/"/g, '""')}"`,
          b.totalAmount || 0,
          `"${b.payMethod || '-'}"`,
          `"${b.payStatus}"`,
        ].join(','));
      });

      assetRentals.forEach((r) => {
        csvRows.push([
          '"Sewa Aset"',
          `"${r.bookingNumber}"`,
          `"${new Date(r.createdAt).toISOString().split('T')[0]}"`,
          `"${(r.renter?.name || '').replace(/"/g, '""')}"`,
          `"${r.renter?.phone || ''}"`,
          `"${(r.asset?.name || '').replace(/"/g, '""')}"`,
          r.totalAmount || 0,
          `"${r.payMethod || '-'}"`,
          `"${r.payStatus}"`,
        ].join(','));
      });

      const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Excel UTF-8
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Laporan_Keuangan_SPASI_${filterYear}${filterMonth ? '_Bln' + filterMonth : ''}.csv"`,
        },
      });
    }

    // ─── ASSET USAGE & DAMAGE RATE ANALYTICS ─────────────────────────────────────────
    const allLoansForUsage = await prisma.loan.findMany({
      include: { asset: true, returnInspection: true }
    });

    const assetUsageMap: Record<string, { id: string; name: string; code: string; count: number; damagedCount: number }> = {};
    allLoansForUsage.forEach(l => {
      if (!assetUsageMap[l.assetId]) {
        assetUsageMap[l.assetId] = { id: l.assetId, name: l.asset.name, code: l.asset.code, count: 0, damagedCount: 0 };
      }
      assetUsageMap[l.assetId].count += l.quantity || 1;
      if (l.returnInspection && ['DAMAGED', 'NEEDS_REPAIR'].includes(l.returnInspection.status)) {
        assetUsageMap[l.assetId].damagedCount++;
      }
    });

    const mostBorrowedAssets = Object.values(assetUsageMap)
      .map(item => ({
        ...item,
        damageRate: item.count > 0 ? parseFloat(((item.damagedCount / item.count) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ─── PENALTIES & SANCTIONS RECAP ────────────────────────────────────────────────
    const totalLoanPenalties = allLoansForUsage.reduce((sum, l) => sum + (l.penaltyFee || 0), 0);
    
    const allRoomBookingsForPenalties = await prisma.roomBooking.findMany();
    const totalRoomOvertimePenalties = allRoomBookingsForPenalties.reduce((sum, rb) => sum + (rb.overtimeFee || 0), 0);

    const activeViolationsCount = await prisma.violation.count();
    const suspendedUsersCount = await prisma.user.count({ where: { isSuspended: true } });

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalRoomRevenue,
        totalAssetRevenue,
        totalPaid,
        totalPending,
        totalCancelled,
        countPaid,
        countPending,
        countCancelled,
        totalTransactions: roomBookings.length + assetRentals.length,
        totalLoanPenalties,
        totalRoomOvertimePenalties,
        activeViolationsCount,
        suspendedUsersCount,
      },
      currentYear: filterYear,
      filterMonth,
      filterType,
      monthlyRevenue,
      monthlyBookingsCount,
      paymentMethods,
      roomBookings,
      assetRentals,
      mostBorrowedAssets,
    });
  } catch (error) {
    console.error('Financial Analytics API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

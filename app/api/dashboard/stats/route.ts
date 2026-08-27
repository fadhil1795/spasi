import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    const isBorrower = (session.user as any).role === 'BORROWER' || currentUser?.role === 'BORROWER';

    if (isBorrower && currentUser) {
      const [
        userLoans,
        userPendingCount,
        userActiveCount,
        userRoomBookings,
      ] = await Promise.all([
        prisma.loan.findMany({
          where: { userId: currentUser.id },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            asset: { select: { name: true, code: true, category: true } },
          },
        }),
        prisma.loan.count({
          where: { userId: currentUser.id, status: 'PENDING_APPROVAL_L1' },
        }),
        prisma.loan.count({
          where: { userId: currentUser.id, status: { in: ['APPROVED_L1', 'BORROWED'] } },
        }),
        prisma.roomBooking.findMany({
          where: {
            renter: {
              OR: [
                { email: currentUser.email },
                { phone: currentUser.phone || undefined },
              ],
            },
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            location: { select: { name: true, code: true, building: true } },
          },
        }),
      ]);

      return NextResponse.json({
        isBorrower: true,
        stats: {
          userActiveCount,
          userPendingCount,
          totalUserLoans: userLoans.length,
          totalUserRoomBookings: userRoomBookings.length,
        },
        userLoans,
        userRoomBookings,
      });
    }

    // ── Admin Global Dashboard Stats ──
    const now = new Date();

    // Build 6-month range
    const monthLabels: string[] = [];
    const monthRanges: { gte: Date; lt: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dNext = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      monthLabels.push(`${d.getMonth() + 1}/${d.getFullYear()}`);
      monthRanges.push({ gte: d, lt: dNext });
    }

    const [
      totalAssets,
      borrowedCount,
      rentedCount,
      maintenanceCount,
      totalRooms,
      totalRoomBookings,
      activeRoomBookings,
      recentLoans,
      recentRentals,
      recentRoomBookings,
      assetsList,
      cashInAggr,
      cashOutAggr,
      categoryGroups,
      allLoansForTopAsset,
    ] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { status: 'BORROWED' } }),
      prisma.asset.count({ where: { status: 'RENTED' } }),
      prisma.asset.count({ where: { status: 'MAINTENANCE' } }),
      prisma.location.count(),
      prisma.roomBooking.count(),
      prisma.roomBooking.count({ where: { bookingStatus: 'ACTIVE' } }),
      prisma.loan.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { name: true, code: true } },
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.rental.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { name: true, code: true } },
          renter: { select: { name: true, phone: true } },
        },
      }),
      prisma.roomBooking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          location: { select: { name: true, code: true, building: true } },
          renter: { select: { name: true, phone: true } },
        },
      }),
      prisma.asset.findMany({
        take: 12,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true, code: true, name: true, status: true,
          category: { select: { name: true } },
        },
      }),
      prisma.cashTransaction.aggregate({ _sum: { amount: true }, where: { type: 'IN' } }),
      prisma.cashTransaction.aggregate({ _sum: { amount: true }, where: { type: 'OUT' } }),
      // Category distribution
      prisma.asset.groupBy({
        by: ['categoryId'],
        _count: { id: true },
      }),
      // All loans for top-asset counting
      prisma.loan.findMany({
        where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
        select: { assetId: true, asset: { select: { name: true } } },
      }),
    ]);

    // Monthly trend: count loans per month
    const monthlyTrendPromises = monthRanges.map(range =>
      prisma.loan.count({ where: { createdAt: range } })
    );
    const monthlyTrendValues = await Promise.all(monthlyTrendPromises);
    const monthlyTrend = monthLabels.map((label, i) => ({
      label,
      count: monthlyTrendValues[i],
    }));

    // Top 10 most borrowed assets
    const assetCountMap: Record<string, { name: string; count: number }> = {};
    for (const loan of allLoansForTopAsset) {
      if (!assetCountMap[loan.assetId]) {
        assetCountMap[loan.assetId] = { name: loan.asset.name, count: 0 };
      }
      assetCountMap[loan.assetId].count++;
    }
    const topAssets = Object.entries(assetCountMap)
      .map(([id, v]) => ({ id, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Category distribution with names
    const categoryIds = categoryGroups.map(g => g.categoryId).filter(Boolean) as string[];
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
    const categoryDistribution = categoryGroups.map(g => ({
      name: catMap[g.categoryId ?? ''] || 'Lainnya',
      count: g._count.id,
    }));

    const cashIn = cashInAggr._sum.amount || 0;
    const cashOut = cashOutAggr._sum.amount || 0;

    return NextResponse.json({
      isBorrower: false,
      stats: {
        totalAssets,
        borrowedCount,
        rentedCount,
        maintenanceCount,
        availableCount: totalAssets - (borrowedCount + rentedCount + maintenanceCount),
        totalRooms,
        totalRoomBookings,
        activeRoomBookings,
        totalCashBalance: cashIn - cashOut,
      },
      recentLoans,
      recentRentals,
      recentRoomBookings,
      liveAssets: assetsList,
      monthlyTrend,
      topAssets,
      categoryDistribution,
    });
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

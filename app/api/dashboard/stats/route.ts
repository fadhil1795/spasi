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
      const now = new Date();
      const [
        userLoans,
        userPendingCount,
        userActiveCount,
        userOverdueCount,
        userUnpaidFines,
        latestVerification,
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
          where: { userId: currentUser.id, status: { in: ['PENDING_L1', 'PENDING_L2'] } },
        }),
        prisma.loan.count({
          where: { userId: currentUser.id, status: { in: ['APPROVED', 'ACTIVE'] } },
        }),
        prisma.loan.count({
          where: { userId: currentUser.id, status: { in: ['ACTIVE', 'OVERDUE'] }, endDate: { lt: now } },
        }),
        prisma.loan.aggregate({
          where: {
            userId: currentUser.id,
            penaltyFee: { gt: 0 },
            penaltyStatus: { in: ['UNPAID', 'PARTIAL'] },
          },
          _sum: { penaltyFee: true, penaltyPaidAmount: true },
          _count: { id: true },
        }),
        prisma.verificationRequest.findFirst({
          where: { userId: currentUser.id },
          orderBy: { createdAt: 'desc' },
          select: { status: true },
        }),
        prisma.roomBooking.findMany({
          where: {
            OR: [
              { renterId: currentUser.id },
              { renter: { email: currentUser.email } },
            ],
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            location: { select: { name: true, code: true, building: true } },
          },
        }),
      ]);

      const verificationStatus =
        currentUser.renterCategory !== 'EXTERNAL'
          ? 'VERIFIED'
          : latestVerification?.status || 'UNVERIFIED';

      const unpaidTotal =
        (userUnpaidFines._sum.penaltyFee || 0) - (userUnpaidFines._sum.penaltyPaidAmount || 0);

      return NextResponse.json({
        isBorrower: true,
        userProfile: {
          verificationStatus,
          renterCategory: currentUser.renterCategory,
          email: currentUser.email,
          phone: currentUser.phone,
          identityNo: currentUser.identityNo,
        },
        stats: {
          userActiveCount,
          userPendingCount,
          userOverdueCount,
          userUnpaidFinesCount: userUnpaidFines._count.id || 0,
          userUnpaidFinesTotal: unpaidTotal > 0 ? unpaidTotal : 0,
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
      allAssetsForMetrics,
      allDepartments,
      newestAssets,
      problematicAssets,
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
          id: true, code: true, name: true, status: true, condition: true,
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
      // All assets for valuation, condition, and department breakdown
      prisma.asset.findMany({
        select: {
          id: true,
          status: true,
          condition: true,
          quantity: true,
          purchaseCost: true,
          currentValue: true,
          departmentId: true,
        },
      }),
      prisma.department.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      }),
      // 5 Aset Baru Ditambahkan
      prisma.asset.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          condition: true,
          purchaseCost: true,
          quantity: true,
          createdAt: true,
          category: { select: { name: true } },
          department: { select: { name: true, code: true } },
          location: { select: { name: true, building: true, room: true } },
        },
      }),
      // Aset Bermasalah (Rusak / Maintenance)
      prisma.asset.findMany({
        where: {
          OR: [
            { status: { in: ['DAMAGED', 'MAINTENANCE'] } },
            { condition: { in: ['Rusak Ringan', 'Rusak Berat'] } },
          ],
        },
        take: 8,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          condition: true,
          quantity: true,
          updatedAt: true,
          category: { select: { name: true } },
          department: { select: { name: true, code: true } },
          location: { select: { name: true, building: true, room: true } },
        },
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

    // Valuation, condition, and unit/department aggregation
    let totalAssetAcquisitionValue = 0;
    let totalAssetBookValue = 0;
    let totalPhysicalUnits = 0;
    let damagedCount = 0;
    let disposedCount = 0;

    const conditionMap: Record<string, { condition: string; count: number; totalQty: number }> = {
      'Baik': { condition: 'Baik', count: 0, totalQty: 0 },
      'Rusak Ringan': { condition: 'Rusak Ringan', count: 0, totalQty: 0 },
      'Rusak Berat': { condition: 'Rusak Berat', count: 0, totalQty: 0 },
    };

    const deptMap: Record<string, { id: string; code: string; name: string; count: number; totalQty: number; totalValue: number }> = {};
    for (const d of allDepartments) {
      deptMap[d.id] = { id: d.id, code: d.code, name: d.name, count: 0, totalQty: 0, totalValue: 0 };
    }
    deptMap['CENTRAL'] = { id: 'CENTRAL', code: 'PUSAT', name: 'Inventaris Umum / Pusat Instansi', count: 0, totalQty: 0, totalValue: 0 };

    for (const ast of allAssetsForMetrics) {
      const qty = ast.quantity || 1;
      const acq = (ast.purchaseCost || 0) * qty;
      const book = (ast.currentValue !== null && ast.currentValue !== undefined ? ast.currentValue : (ast.purchaseCost || 0)) * qty;

      if (ast.status === 'DISPOSED') {
        disposedCount++;
      } else {
        totalAssetAcquisitionValue += acq;
        totalAssetBookValue += book;
        totalPhysicalUnits += qty;
      }

      if (ast.status === 'DAMAGED') {
        damagedCount++;
      }

      const condKey =
        ast.condition === 'Rusak Berat'
          ? 'Rusak Berat'
          : ast.condition === 'Rusak Ringan'
          ? 'Rusak Ringan'
          : 'Baik';
      conditionMap[condKey].count += 1;
      conditionMap[condKey].totalQty += qty;

      const dKey = ast.departmentId && deptMap[ast.departmentId] ? ast.departmentId : 'CENTRAL';
      deptMap[dKey].count += 1;
      deptMap[dKey].totalQty += qty;
      if (ast.status !== 'DISPOSED') {
        deptMap[dKey].totalValue += acq;
      }
    }

    const conditionDistribution = Object.values(conditionMap);
    const departmentDistribution = Object.values(deptMap).filter((d) => d.count > 0 || d.id !== 'CENTRAL');

    return NextResponse.json({
      isBorrower: false,
      stats: {
        totalAssets,
        totalPhysicalUnits,
        totalAssetAcquisitionValue,
        totalAssetBookValue,
        borrowedCount,
        rentedCount,
        maintenanceCount,
        damagedCount,
        disposedCount,
        availableCount: Math.max(0, totalAssets - (borrowedCount + rentedCount + maintenanceCount + damagedCount + disposedCount)),
        totalRooms,
        totalRoomBookings,
        activeRoomBookings,
        totalCashBalance: cashIn - cashOut,
        problematicCount: problematicAssets.length,
      },
      recentLoans,
      recentRentals,
      recentRoomBookings,
      liveAssets: assetsList,
      monthlyTrend,
      topAssets,
      categoryDistribution,
      conditionDistribution,
      departmentDistribution,
      newestAssets,
      problematicAssets,
    });
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

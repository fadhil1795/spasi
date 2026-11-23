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

    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'APPROVER', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId') || 'ALL';
    const categoryId = searchParams.get('categoryId') || 'ALL';
    const conditionFilter = searchParams.get('condition') || 'ALL';

    const [
      assets,
      departments,
      categories,
      transfers,
      maintenances,
      claims,
      stockOpnameSessions,
    ] = await Promise.all([
      prisma.asset.findMany({
        orderBy: { code: 'asc' },
        include: {
          category: {
            include: { parent: true },
          },
          location: {
            select: { id: true, code: true, name: true, building: true, floor: true, room: true, picName: true },
          },
          department: {
            select: { id: true, code: true, name: true, headName: true },
          },
        },
      }),
      prisma.department.findMany({
        orderBy: { name: 'asc' },
      }),
      prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: { parent: true },
      }),
      prisma.transferLog.findMany({
        orderBy: { transferredAt: 'desc' },
        take: 300,
        include: {
          asset: {
            select: {
              id: true,
              code: true,
              name: true,
              brand: true,
              condition: true,
              category: { select: { name: true } },
            },
          },
        },
      }),
      prisma.maintenance.findMany({
        orderBy: { startDate: 'desc' },
        take: 300,
        include: {
          asset: {
            select: {
              id: true,
              code: true,
              name: true,
              brand: true,
              condition: true,
              status: true,
              category: { select: { name: true } },
              department: { select: { code: true, name: true } },
              location: { select: { name: true, building: true, room: true } },
            },
          },
          location: {
            select: { id: true, name: true, building: true, room: true },
          },
        },
      }),
      prisma.assetClaim.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          user: { select: { name: true, email: true } },
          loan: {
            include: {
              asset: { select: { id: true, code: true, name: true } },
            },
          },
          booking: {
            include: {
              location: { select: { id: true, name: true, building: true } },
            },
          },
        },
      }),
      prisma.stockOpnameSession.findMany({
        orderBy: { startDate: 'desc' },
        take: 100,
        include: {
          location: {
            select: { id: true, code: true, name: true, building: true, floor: true, room: true },
          },
          auditor: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              asset: {
                select: { id: true, code: true, name: true, condition: true },
              },
            },
          },
        },
      }),
    ]);

    // Filter assets when departmentId / categoryId / condition is selected
    const filteredAssets = assets.filter((ast) => {
      if (departmentId !== 'ALL') {
        if (departmentId === 'CENTRAL') {
          if (ast.departmentId) return false;
        } else if (ast.departmentId !== departmentId) {
          return false;
        }
      }
      if (categoryId !== 'ALL') {
        if (ast.categoryId !== categoryId && ast.category?.parentId !== categoryId) {
          return false;
        }
      }
      if (conditionFilter !== 'ALL') {
        const c = ast.condition || 'Baik';
        if (c !== conditionFilter) return false;
      }
      return true;
    });

    // 1. Rekap Laporan Aset per Unit
    const unitMap: Record<
      string,
      {
        id: string;
        code: string;
        name: string;
        headName: string | null;
        assetTypesCount: number;
        totalUnitsQty: number;
        baikCount: number;
        rusakRinganCount: number;
        rusakBeratCount: number;
        totalAcquisitionValue: number;
        totalBookValue: number;
      }
    > = {};

    for (const d of departments) {
      unitMap[d.id] = {
        id: d.id,
        code: d.code,
        name: d.name,
        headName: d.headName || null,
        assetTypesCount: 0,
        totalUnitsQty: 0,
        baikCount: 0,
        rusakRinganCount: 0,
        rusakBeratCount: 0,
        totalAcquisitionValue: 0,
        totalBookValue: 0,
      };
    }
    unitMap['CENTRAL'] = {
      id: 'CENTRAL',
      code: 'PUSAT',
      name: 'Inventaris Umum / Pusat Instansi',
      headName: 'Bagian Sarpras Pusat',
      assetTypesCount: 0,
      totalUnitsQty: 0,
      baikCount: 0,
      rusakRinganCount: 0,
      rusakBeratCount: 0,
      totalAcquisitionValue: 0,
      totalBookValue: 0,
    };

    // 2. Rekap Laporan Aset per Kategori
    const categoryMap: Record<
      string,
      {
        id: string;
        code: string;
        name: string;
        parentName: string;
        assetTypesCount: number;
        totalUnitsQty: number;
        availableQty: number;
        baikCount: number;
        rusakCount: number;
        totalAcquisitionValue: number;
        totalBookValue: number;
      }
    > = {};

    for (const c of categories) {
      categoryMap[c.id] = {
        id: c.id,
        code: c.code || '-',
        name: c.name,
        parentName: c.parent?.name || c.name,
        assetTypesCount: 0,
        totalUnitsQty: 0,
        availableQty: 0,
        baikCount: 0,
        rusakCount: 0,
        totalAcquisitionValue: 0,
        totalBookValue: 0,
      };
    }

    // 3. Rekap Kondisi Aset
    const conditionSummary = {
      baik: { count: 0, qty: 0, value: 0 },
      rusakRingan: { count: 0, qty: 0, value: 0 },
      rusakBerat: { count: 0, qty: 0, value: 0 },
      disposed: { count: 0, qty: 0, value: 0 },
    };

    // 4. Rekap Nilai Perolehan & Penyusutan
    let totalAcquisitionValue = 0;
    let totalBookValue = 0;
    let totalAccumulatedDepreciation = 0;
    let totalMonthlyDepreciation = 0;

    for (const ast of filteredAssets) {
      const qty = ast.quantity || 1;
      const acq = (ast.purchaseCost || 0) * qty;
      const book =
        (ast.currentValue !== null && ast.currentValue !== undefined ? ast.currentValue : ast.purchaseCost || 0) * qty;
      const cond = ast.condition || 'Baik';

      // Unit
      const uKey = ast.departmentId && unitMap[ast.departmentId] ? ast.departmentId : 'CENTRAL';
      unitMap[uKey].assetTypesCount += 1;
      unitMap[uKey].totalUnitsQty += qty;
      if (cond === 'Rusak Berat') unitMap[uKey].rusakBeratCount += 1;
      else if (cond === 'Rusak Ringan') unitMap[uKey].rusakRinganCount += 1;
      else unitMap[uKey].baikCount += 1;

      if (ast.status !== 'DISPOSED') {
        unitMap[uKey].totalAcquisitionValue += acq;
        unitMap[uKey].totalBookValue += book;
      }

      // Category
      if (categoryMap[ast.categoryId]) {
        categoryMap[ast.categoryId].assetTypesCount += 1;
        categoryMap[ast.categoryId].totalUnitsQty += qty;
        categoryMap[ast.categoryId].availableQty += ast.availableQty || 0;
        if (cond === 'Rusak Ringan' || cond === 'Rusak Berat' || ast.status === 'DAMAGED') {
          categoryMap[ast.categoryId].rusakCount += 1;
        } else {
          categoryMap[ast.categoryId].baikCount += 1;
        }
        if (ast.status !== 'DISPOSED') {
          categoryMap[ast.categoryId].totalAcquisitionValue += acq;
          categoryMap[ast.categoryId].totalBookValue += book;
        }
      }

      // Condition
      if (ast.status === 'DISPOSED') {
        conditionSummary.disposed.count += 1;
        conditionSummary.disposed.qty += qty;
        conditionSummary.disposed.value += acq;
      } else {
        totalAcquisitionValue += acq;
        totalBookValue += book;
        totalAccumulatedDepreciation += Math.max(0, acq - book);
        totalMonthlyDepreciation += (ast.monthlyDepreciation || 0) * qty;

        if (cond === 'Rusak Berat') {
          conditionSummary.rusakBerat.count += 1;
          conditionSummary.rusakBerat.qty += qty;
          conditionSummary.rusakBerat.value += acq;
        } else if (cond === 'Rusak Ringan') {
          conditionSummary.rusakRingan.count += 1;
          conditionSummary.rusakRingan.qty += qty;
          conditionSummary.rusakRingan.value += acq;
        } else {
          conditionSummary.baik.count += 1;
          conditionSummary.baik.qty += qty;
          conditionSummary.baik.value += acq;
        }
      }
    }

    // 6. Laporan Kerusakan & Pemeliharaan
    const damagedAssets = filteredAssets.filter(
      (a) =>
        a.status === 'DAMAGED' ||
        a.status === 'MAINTENANCE' ||
        a.condition === 'Rusak Ringan' ||
        a.condition === 'Rusak Berat'
    );
    const totalMaintenanceCost = maintenances.reduce((acc, m) => acc + (m.cost || 0), 0);

    // 7. Laporan Hasil Audit / Stock Opname
    const auditSummary = {
      totalSessions: stockOpnameSessions.length,
      completedSessions: stockOpnameSessions.filter((s) => s.status === 'COMPLETED').length,
      totalExpected: stockOpnameSessions.reduce((acc, s) => acc + (s.totalExpected || 0), 0),
      totalScanned: stockOpnameSessions.reduce((acc, s) => acc + (s.totalScanned || 0), 0),
      totalMatch: stockOpnameSessions.reduce((acc, s) => acc + (s.totalMatch || 0), 0),
      totalWrongLoc: stockOpnameSessions.reduce((acc, s) => acc + (s.totalWrongLoc || 0), 0),
      totalMissing: stockOpnameSessions.reduce((acc, s) => acc + (s.totalMissing || 0), 0),
    };

    return NextResponse.json({
      departments,
      categories,
      assets: filteredAssets,
      unitReport: Object.values(unitMap).filter((u) => u.assetTypesCount > 0 || u.id !== 'CENTRAL'),
      categoryReport: Object.values(categoryMap).filter((c) => c.assetTypesCount > 0),
      conditionSummary,
      valuationSummary: {
        totalAssetsCount: filteredAssets.length,
        totalAcquisitionValue,
        totalBookValue,
        totalAccumulatedDepreciation,
        totalMonthlyDepreciation,
      },
      mutationReport: transfers,
      damageReport: {
        damagedAssets,
        maintenances,
        claims,
        totalMaintenanceCost,
      },
      auditReport: {
        summary: auditSummary,
        sessions: stockOpnameSessions,
      },
    });
  } catch (error) {
    console.error('Error generating inventory reports:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const q = searchParams.get('q');

    const whereClause: any = {};
    if (categoryId && categoryId !== 'ALL') whereClause.categoryId = categoryId;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam);
      const end = new Date(endDateParam);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        // Cari aset yang sedang dipinjam atau disewa pada rentang tanggal tersebut
        const [conflictingLoans, conflictingRentals] = await Promise.all([
          prisma.loan.findMany({
            where: {
              status: { in: ['PENDING_L1', 'PENDING_L2', 'APPROVED', 'ACTIVE'] },
              startDate: { lte: end },
              endDate: { gte: start },
            },
            select: { assetId: true },
          }),
          prisma.rental.findMany({
            where: {
              payStatus: { not: 'REFUNDED' },
              startDate: { lte: end },
              endDate: { gte: start },
            },
            select: { assetId: true },
          }),
        ]);

        const bookedAssetIds = Array.from(
          new Set([
            ...conflictingLoans.map((l) => l.assetId),
            ...conflictingRentals.map((r) => r.assetId),
          ])
        );

        if (bookedAssetIds.length > 0) {
          whereClause.id = { notIn: bookedAssetIds };
        }
      }
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, building: true, room: true, name: true } },
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching public assets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

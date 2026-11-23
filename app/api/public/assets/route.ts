import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const parentCategoryId = searchParams.get('parentCategoryId');
    const status = searchParams.get('status');
    const isLoanableParam = searchParams.get('isLoanable');
    const q = searchParams.get('q');

    const whereClause: any = {};

    if (categoryId && categoryId !== 'ALL') {
      whereClause.categoryId = categoryId;
    } else if (parentCategoryId && parentCategoryId !== 'ALL') {
      const childCats = await prisma.category.findMany({
        where: { parentId: parentCategoryId },
        select: { id: true },
      });
      whereClause.categoryId = { in: [parentCategoryId, ...childCats.map((c) => c.id)] };
    }

    if (status && status !== 'ALL') {
      whereClause.status = status;
    } else {
      whereClause.status = { notIn: ['DISPOSED', 'LOST', 'INACTIVE'] };
    }

    if (isLoanableParam === 'true') {
      whereClause.isLoanable = true;
    }

    if (q && q.trim()) {
      whereClause.OR = [
        { name: { contains: q.trim() } },
        { code: { contains: q.trim() } },
        { brand: { contains: q.trim() } },
      ];
    }

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            parentId: true,
            parent: { select: { id: true, name: true } },
          },
        },
        location: { select: { id: true, building: true, room: true, name: true } },
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam);
      const end = new Date(endDateParam);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const [conflictingLoans, conflictingRentals] = await Promise.all([
          prisma.loan.findMany({
            where: {
              status: { in: ['PENDING_L1', 'PENDING_L2', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED'] },
              startDate: { lte: end },
              endDate: { gte: start },
            },
            select: { assetId: true, quantity: true },
          }),
          prisma.rental.findMany({
            where: {
              payStatus: { notIn: ['REFUNDED', 'CANCELLED'] },
              startDate: { lte: end },
              endDate: { gte: start },
            },
            select: { assetId: true, quantity: true },
          }),
        ]);

        const bookedMap = new Map<string, number>();
        for (const l of conflictingLoans) {
          bookedMap.set(l.assetId, (bookedMap.get(l.assetId) || 0) + (l.quantity || 1));
        }
        for (const r of conflictingRentals) {
          bookedMap.set(r.assetId, (bookedMap.get(r.assetId) || 0) + (r.quantity || 1));
        }

        const availableOnDates = assets
          .map((ast) => {
            const booked = bookedMap.get(ast.id) || 0;
            const remainingQty = Math.max(0, ast.quantity - booked);
            return {
              ...ast,
              remainingQty,
            };
          })
          .filter((ast) => ast.remainingQty > 0);

        return NextResponse.json(availableOnDates);
      }
    }

    return NextResponse.json(
      assets.map((ast) => ({ ...ast, remainingQty: ast.availableQty ?? ast.quantity ?? 1 }))
    );
  } catch (error) {
    console.error('Error fetching public assets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

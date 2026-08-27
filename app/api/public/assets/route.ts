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
    if (status && status !== 'ALL') whereClause.status = status;
    if (q) {
      whereClause.OR = [
        { name: { contains: q } },
        { code: { contains: q } },
        { brand: { contains: q } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, building: true, room: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching public assets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

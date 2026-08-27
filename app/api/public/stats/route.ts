import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const totalAssets = await prisma.asset.count();
    const activeLoans = await prisma.loan.count({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } },
    });
    const activeRentals = await prisma.rental.count({
      where: { payStatus: { in: ['PAID', 'DOWN_PAYMENT'] } },
    });

    return NextResponse.json({
      totalAssets,
      activeLoans,
      activeRentals,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

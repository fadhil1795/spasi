import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'user'; // 'user' or 'admin'

    if (mode === 'admin') {
      // For Admin, fetch all penalties
      if ((session.user as any).role !== 'SUPER_ADMIN' && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const loans = await prisma.loan.findMany({
        where: { penaltyFee: { gt: 0 } },
        include: { user: true, asset: true },
        orderBy: { createdAt: 'desc' }
      });

      const rentals = await prisma.rental.findMany({
        where: { penaltyFee: { gt: 0 } },
        include: { renter: true, asset: true },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ loans, rentals });
    }

    // For user
    const loans = await prisma.loan.findMany({
      where: {
        userId,
        penaltyFee: { gt: 0 }
      },
      include: { asset: true },
      orderBy: { createdAt: 'desc' }
    });

    const rentals = await prisma.rental.findMany({
      where: {
        renter: {
          email: session.user.email
        },
        penaltyFee: { gt: 0 }
      },
      include: { asset: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ loans, rentals });

  } catch (error) {
    console.error('Error fetching penalties:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

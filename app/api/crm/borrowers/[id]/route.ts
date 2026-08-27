import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as any).role;
  if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'user'; // user | renter

  try {
    if (type === 'user') {
      const user = await prisma.user.findUnique({
        where: { id: params.id },
        include: {
          department: true,
          loans: { include: { asset: { select: { name: true } } } },
          violations: true,
          blacklistRecords: { orderBy: { createdAt: 'desc' } },
        }
      });
      if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
      return NextResponse.json(user);
    } else {
      const renter = await prisma.renter.findUnique({
        where: { id: params.id },
        include: {
          rentals: { include: { asset: { select: { name: true } } } },
          roomBookings: { include: { location: { select: { name: true } } } },
        }
      });
      if (!renter) return NextResponse.json({ error: 'Renter tidak ditemukan' }, { status: 404 });
      return NextResponse.json(renter);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const requests = await prisma.verificationRequest.findMany({
      where: status ? { status } : {},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            renterCategory: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Gagal mengambil data verifikasi' }, { status: 500 });
  }
}

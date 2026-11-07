import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transfer = await prisma.transferLog.findUnique({
      where: { id: params.id },
      include: {
        asset: {
          include: {
            category: true,
            department: true,
            location: true,
          },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Data mutasi tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(transfer);
  } catch (error) {
    console.error('Error fetching transfer log:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

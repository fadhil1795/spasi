import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const asset = await prisma.asset.findFirst({
      where: {
        OR: [
          { id: params.id },
          { code: params.id }
        ]
      },
      include: {
        category: true,
        location: true,
        department: { select: { id: true, name: true, code: true } },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error fetching public asset detail:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { ROOM_TYPES } from '@/lib/roomConstants';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let types = await prisma.roomTypeMaster.findMany({
      orderBy: { name: 'asc' },
    });

    // Auto-seed tipe standar jika masih kosong
    if (types.length === 0) {
      for (const t of ROOM_TYPES) {
        await prisma.roomTypeMaster.upsert({
          where: { code: t.value },
          update: {},
          create: { code: t.value, name: t.label, color: t.color },
        });
      }
      types = await prisma.roomTypeMaster.findMany({
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json(types);
  } catch (error) {
    console.error('Error fetching room types:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, color } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Nama tipe ruangan wajib diisi' }, { status: 400 });
    }

    const cleanName = String(name).trim();
    const cleanCode = code
      ? String(code).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
      : cleanName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24);

    const existing = await prisma.roomTypeMaster.findFirst({
      where: {
        OR: [{ name: cleanName }, { code: cleanCode }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Tipe ruangan "${existing.name}" (${existing.code}) sudah ada.` },
        { status: 409 }
      );
    }

    const created = await prisma.roomTypeMaster.create({
      data: {
        code: cleanCode,
        name: cleanName,
        color: color || '#6366f1',
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating room type:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


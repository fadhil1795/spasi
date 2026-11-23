import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_FACILITIES = [
  { name: 'AC', category: 'Pendingin / Udara' },
  { name: 'Proyektor', category: 'Audio Visual' },
  { name: 'Smart TV', category: 'Audio Visual' },
  { name: 'Sound System', category: 'Audio Visual' },
  { name: 'Mic Wireless', category: 'Audio Visual' },
  { name: 'WiFi', category: 'Jaringan' },
  { name: 'Kabel LAN Gigabit', category: 'Jaringan' },
  { name: 'Whiteboard', category: 'Alat Tulis' },
  { name: 'Podium', category: 'Furniture' },
  { name: 'Panggung', category: 'Furniture' },
  { name: 'Kamera CCTV', category: 'Keamanan' },
  { name: 'Toilet Dalam', category: 'Sanitasi' },
  { name: 'Interactive Flat Panel', category: 'Audio Visual' },
];

export async function GET() {
  try {
    let facilities = await prisma.roomFacilityMaster.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Seed default jika masih kosong
    if (facilities.length === 0) {
      for (const item of DEFAULT_FACILITIES) {
        await prisma.roomFacilityMaster.upsert({
          where: { name: item.name },
          update: {},
          create: item,
        });
      }
      facilities = await prisma.roomFacilityMaster.findMany({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    }

    return NextResponse.json(facilities);
  } catch (error) {
    console.error('Error fetching room facilities:', error);
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
    const { name, category } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Nama fasilitas wajib diisi' }, { status: 400 });
    }

    const cleanName = String(name).trim();
    const existing = await prisma.roomFacilityMaster.findFirst({
      where: { name: cleanName },
    });

    if (existing) {
      return NextResponse.json({ error: `Fasilitas "${cleanName}" sudah terdaftar.` }, { status: 409 });
    }

    const created = await prisma.roomFacilityMaster.create({
      data: {
        name: cleanName,
        category: category ? String(category).trim() : 'Umum',
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating room facility:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


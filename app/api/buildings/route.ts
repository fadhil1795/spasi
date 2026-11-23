import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/buildings - list all buildings with room counts
export async function GET() {
  try {
    const buildings = await prisma.building.findMany({
      include: {
        _count: {
          select: { locations: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(buildings);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/buildings - create a new building
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, totalFloors, campusArea, address, description } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'Kode gedung dan nama gedung wajib diisi' }, { status: 400 });
    }

    const cleanCode = String(code).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const cleanName = String(name).trim();

    if (!cleanCode || !cleanName) {
      return NextResponse.json({ error: 'Kode dan nama gedung tidak valid' }, { status: 400 });
    }

    const existingCode = await prisma.building.findUnique({ where: { code: cleanCode } });
    if (existingCode) {
      return NextResponse.json({ error: `Kode gedung "${cleanCode}" sudah digunakan.` }, { status: 409 });
    }

    const newBuilding = await prisma.building.create({
      data: {
        code: cleanCode,
        name: cleanName,
        totalFloors: totalFloors ? Math.max(1, parseInt(totalFloors)) : 1,
        campusArea: campusArea ? String(campusArea).trim() : null,
        address: address ? String(address).trim() : null,
        description: description ? String(description).trim() : null,
      },
    });

    await recordAuditLog({
      action: 'CREATE_BUILDING',
      entity: 'Building',
      entityId: newBuilding.id,
      userId: (session.user as any).id,
      details: `Menambahkan master gedung: ${newBuilding.name} (${newBuilding.code})`,
      oldData: null,
      newData: newBuilding,
    });

    return NextResponse.json(newBuilding, { status: 201 });
  } catch (error) {
    console.error('Error creating building:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


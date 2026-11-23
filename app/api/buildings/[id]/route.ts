import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.building.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Gedung tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const { code, name, totalFloors, campusArea, address, description } = body;

    const cleanCode = code ? String(code).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') : existing.code;
    const cleanName = name ? String(name).trim() : existing.name;

    if (cleanCode !== existing.code) {
      const dup = await prisma.building.findUnique({ where: { code: cleanCode } });
      if (dup) {
        return NextResponse.json({ error: `Kode gedung "${cleanCode}" sudah digunakan.` }, { status: 409 });
      }
    }

    const updated = await prisma.building.update({
      where: { id: params.id },
      data: {
        code: cleanCode,
        name: cleanName,
        totalFloors: totalFloors ? Math.max(1, parseInt(totalFloors)) : existing.totalFloors,
        campusArea: campusArea !== undefined ? (campusArea ? String(campusArea).trim() : null) : existing.campusArea,
        address: address !== undefined ? (address ? String(address).trim() : null) : existing.address,
        description: description !== undefined ? (description ? String(description).trim() : null) : existing.description,
      },
    });

    // Sinkronkan nama gedung di tabel Location yang terhubung
    if (cleanName !== existing.name) {
      await prisma.location.updateMany({
        where: { buildingId: params.id },
        data: { building: cleanName },
      });
    }

    await recordAuditLog({
      action: 'UPDATE_BUILDING',
      entity: 'Building',
      entityId: params.id,
      userId: (session.user as any).id,
      details: `Memperbarui master gedung: ${updated.name} (${updated.code})`,
      oldData: existing,
      newData: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating building:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.building.findUnique({
      where: { id: params.id },
      include: { _count: { select: { locations: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Gedung tidak ditemukan' }, { status: 404 });
    }

    if (existing._count.locations > 0) {
      return NextResponse.json(
        {
          error: `Gedung "${existing.name}" masih memiliki ${existing._count.locations} ruangan terdaftar. Pindahkan atau hapus ruangan terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    await prisma.building.delete({ where: { id: params.id } });

    await recordAuditLog({
      action: 'DELETE_BUILDING',
      entity: 'Building',
      entityId: params.id,
      userId: (session.user as any).id,
      details: `Menghapus master gedung: ${existing.name} (${existing.code})`,
      oldData: existing,
      newData: null,
    });

    return NextResponse.json({ message: 'Gedung berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting building:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


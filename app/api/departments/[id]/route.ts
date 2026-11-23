import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, headName, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Nama dan Kode unit/fakultas wajib diisi' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const duplicate = await prisma.department.findFirst({
      where: {
        code: cleanCode,
        id: { not: params.id },
      },
    });

    if (duplicate) {
      return NextResponse.json({ error: `Kode unit "${cleanCode}" sudah digunakan oleh ${duplicate.name}` }, { status: 400 });
    }

    const updated = await prisma.department.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        code: cleanCode,
        headName: headName !== undefined ? (headName ? headName.trim() : null) : undefined,
        description: description !== undefined ? (description ? description.trim() : null) : undefined,
      },
      include: {
        _count: {
          select: {
            assets: true,
            locations: true,
            users: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json({ error: 'Gagal memperbarui unit/fakultas' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.department.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            assets: true,
            locations: true,
            users: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Unit/fakultas tidak ditemukan' }, { status: 404 });
    }

    if (existing._count.assets > 0 || existing._count.locations > 0) {
      return NextResponse.json(
        {
          error: `Unit "${existing.name}" tidak dapat dihapus karena masih memiliki ${existing._count.assets} aset dan ${existing._count.locations} ruangan terkait. Pindahkan aset/ruangan terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    await prisma.department.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Unit/fakultas berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Gagal menghapus unit/fakultas' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/users/[id] - Update user details, role, status suspended, etc.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(currentRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, role, renterCategory, phone, identityNo, departmentId, isSuspended } = body;

    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        role: role !== undefined ? role : existing.role,
        renterCategory: renterCategory !== undefined ? renterCategory : existing.renterCategory,
        phone: phone !== undefined ? phone : existing.phone,
        identityNo: identityNo !== undefined ? identityNo : existing.identityNo,
        departmentId: departmentId !== undefined ? (departmentId || null) : existing.departmentId,
        isSuspended: isSuspended !== undefined ? Boolean(isSuspended) : existing.isSuspended,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        renterCategory: true,
        phone: true,
        identityNo: true,
        isSuspended: true,
        department: { select: { id: true, name: true } },
      }
    });

    return NextResponse.json({ message: 'Data pengguna berhasil diperbarui', user: updated });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Gagal memperbarui pengguna' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Hapus user
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentRole = (session.user as any).role;
    if (currentRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Hanya Super Admin yang dapat menghapus akun' }, { status: 403 });
    }

    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Pengguna berhasil dihapus' });
  } catch (error: any) {
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Pengguna tidak dapat dihapus karena memiliki riwayat peminjaman atau reservasi. Silakan ubah statusnya menjadi "Suspended".' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Gagal menghapus pengguna' }, { status: 500 });
  }
}

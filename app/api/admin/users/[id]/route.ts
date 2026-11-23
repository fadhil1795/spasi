import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

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
    const {
      name,
      email,
      role,
      renterCategory,
      phone,
      identityNo,
      departmentId,
      address,
      gender,
      residence,
      isSuspended,
    } = body;

    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Jika email diubah, cek apakah email baru sudah dipakai user lain
    if (email !== undefined && email.trim() && email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const emailOwner = await prisma.user.findUnique({ where: { email: email.trim() } });
      if (emailOwner && emailOwner.id !== existing.id) {
        return NextResponse.json({ error: 'Alamat email baru sudah digunakan oleh akun lain' }, { status: 400 });
      }
    }

    const oldSnapshot = {
      name: existing.name,
      email: existing.email,
      role: existing.role,
      renterCategory: existing.renterCategory,
      phone: existing.phone,
      identityNo: existing.identityNo,
      departmentId: existing.departmentId,
      address: existing.address,
      gender: existing.gender,
      residence: existing.residence,
      isSuspended: existing.isSuspended,
    };

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        email: email !== undefined && email.trim() ? email.trim() : existing.email,
        role: role !== undefined ? role : existing.role,
        renterCategory: renterCategory !== undefined ? renterCategory : existing.renterCategory,
        phone: phone !== undefined ? (phone || null) : existing.phone,
        identityNo: identityNo !== undefined ? (identityNo || null) : existing.identityNo,
        departmentId: departmentId !== undefined ? (departmentId || null) : existing.departmentId,
        address: address !== undefined ? (address || null) : existing.address,
        gender: gender !== undefined ? (gender || null) : existing.gender,
        residence: residence !== undefined ? (residence || null) : existing.residence,
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
        departmentId: true,
        address: true,
        gender: true,
        residence: true,
        isSuspended: true,
        department: { select: { id: true, name: true, code: true } },
      }
    });

    const newSnapshot = {
      name: updated.name,
      email: updated.email,
      role: updated.role,
      renterCategory: updated.renterCategory,
      phone: updated.phone,
      identityNo: updated.identityNo,
      departmentId: updated.departmentId,
      address: updated.address,
      gender: updated.gender,
      residence: updated.residence,
      isSuspended: updated.isSuspended,
    };

    const actionType = isSuspended !== undefined && isSuspended !== existing.isSuspended
      ? (isSuspended ? 'SUSPEND_USER' : 'ACTIVATE_USER')
      : 'UPDATE';

    await recordAuditLog({
      userId: (session.user as any).id,
      action: actionType,
      entity: 'User',
      entityId: updated.id,
      details: `Memperbarui data pengguna: ${updated.name} (${updated.email})`,
      oldData: oldSnapshot,
      newData: newSnapshot,
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

    const existing = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true, role: true },
    });

    await prisma.user.delete({ where: { id: params.id } });

    if (existing) {
      await recordAuditLog({
        userId: (session.user as any).id,
        action: 'DELETE',
        entity: 'User',
        entityId: existing.id,
        details: `Menghapus akun pengguna: ${existing.name} (${existing.email})`,
        oldData: existing,
        newData: null,
      });
    }

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

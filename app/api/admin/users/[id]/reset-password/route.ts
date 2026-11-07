import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// POST /api/admin/users/[id]/reset-password - Reset password pengguna oleh Admin
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentRole = (session.user as any).role;
    const adminId = (session.user as any).id;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(currentRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const newPassword = body.newPassword || 'User@123';

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: params.id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: params.id },
      data: { password: hashedPassword }
    });

    // Catat ke Audit Log
    await createAuditLog({
      userId: adminId,
      action: 'ADMIN_RESET_PASSWORD',
      entity: 'User',
      entityId: targetUser.id,
      details: `Admin ${session.user?.name || session.user?.email} me-reset password untuk akun ${targetUser.email}.`,
    });

    return NextResponse.json({
      message: `Password untuk akun ${targetUser.name} (${targetUser.email}) berhasil di-reset menjadi "${newPassword}".`,
      newPassword,
      userId: targetUser.id
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Gagal me-reset password' }, { status: 500 });
  }
}

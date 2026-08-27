import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  const adminId = (session.user as any).id;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { liftReason } = await request.json();
    if (!liftReason?.trim()) return NextResponse.json({ error: 'Alasan pencabutan wajib diisi' }, { status: 400 });

    const record = await prisma.blacklistRecord.findUnique({ where: { id: params.id } });
    if (!record) return NextResponse.json({ error: 'Record tidak ditemukan' }, { status: 404 });
    if (record.liftedAt) return NextResponse.json({ error: 'Penangguhan sudah dicabut' }, { status: 409 });

    const updated = await prisma.blacklistRecord.update({
      where: { id: params.id },
      data: { liftedAt: new Date(), liftedBy: adminId, liftReason }
    });

    const remaining = await prisma.blacklistRecord.count({ where: { userId: record.userId, liftedAt: null } });
    if (remaining === 0) await prisma.user.update({ where: { id: record.userId }, data: { isSuspended: false } });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Daftar blacklist aktif
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as any).role;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') !== 'false';

  const records = await prisma.blacklistRecord.findMany({
    where: activeOnly ? { liftedAt: null } : undefined,
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, identityNo: true, renterCategory: true, department: { select: { name: true } } }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(records);
}

// POST: Tangguhkan peminjam (buat BlacklistRecord + set isSuspended = true)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as any).role;
  const adminId = (session.user as any).id;

  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, reason, type = 'SUSPENSION', endDate, violationRef } = body;

    if (!userId || !reason) {
      return NextResponse.json({ error: 'userId dan reason wajib diisi' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

    const [record] = await prisma.$transaction([
      prisma.blacklistRecord.create({
        data: { userId, reason, type, endDate: endDate ? new Date(endDate) : null, violationRef, createdBy: adminId }
      }),
      prisma.user.update({ where: { id: userId }, data: { isSuspended: true } }),
    ]);

    await prisma.communicationLog.create({
      data: { userId, channel: 'IN_APP', type: 'BLACKLIST_NOTICE', subject: 'Akun Anda telah ditangguhkan', body: `Alasan: ${reason}`, createdBy: adminId }
    });

    return NextResponse.json(record, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Gagal menerapkan penangguhan' }, { status: 500 });
  }
}

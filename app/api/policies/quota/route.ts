import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/policies/quota - Mengambil daftar kuota rule atau mengecek validasi kuota aktif user
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const checkActive = searchParams.get('checkActive'); // "true" untuk memicu pengecekan kuota aktif user saat ini

    if (checkActive === 'true') {
      const userId = (session?.user as any)?.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { department: true }
      });

      if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

      // 1. Hitung jumlah booking/loan aktif (belum selesai) milik user ini
      const activeBookingsCount = await prisma.roomBooking.count({
        where: {
          renterId: userId,
          bookingStatus: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] }
        }
      });

      const activeLoansCount = await prisma.loan.count({
        where: {
          userId,
          status: { in: ['PENDING_L1', 'PENDING_L2', 'APPROVED', 'ACTIVE'] }
        }
      });

      const totalActive = activeBookingsCount + activeLoansCount;

      // 2. Cari quota rule yang berlaku untuk user ini (prioritas: USER > DEPARTMENT > ROLE)
      let appliedRule = await prisma.quotaRule.findFirst({
        where: { targetType: 'USER', targetId: userId }
      });

      if (!appliedRule && user.departmentId) {
        appliedRule = await prisma.quotaRule.findFirst({
          where: { targetType: 'DEPARTMENT', targetId: user.departmentId }
        });
      }

      if (!appliedRule) {
        appliedRule = await prisma.quotaRule.findFirst({
          where: { targetType: 'ROLE', targetId: user.role }
        });
      }

      // Default fallback kuota jika tidak ada rule terdaftar
      const maxQuota = appliedRule ? appliedRule.maxActiveBookings : 3; 
      const maxDuration = appliedRule ? appliedRule.maxDurationDays : 3;

      return NextResponse.json({
        status: totalActive >= maxQuota ? 'EXCEEDED' : 'OK',
        activeCount: totalActive,
        maxQuota,
        maxDuration,
        ruleTarget: appliedRule ? `${appliedRule.targetType} (${appliedRule.targetId})` : 'Default System Settings'
      });
    }

    // Default: Ambil semua quota rules untuk manajemen admin
    const rules = await prisma.quotaRule.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Error fetching quota policies:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/policies/quota - Membuat aturan kuota baru
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { targetType, targetId, maxActiveBookings, maxDurationDays, applicableCategory } = body;

    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'Target tipe & ID wajib diisi.' }, { status: 400 });
    }

    const newRule = await prisma.quotaRule.create({
      data: {
        targetType,
        targetId,
        maxActiveBookings: maxActiveBookings ? parseInt(maxActiveBookings) : 3,
        maxDurationDays: maxDurationDays ? parseInt(maxDurationDays) : 3,
        applicableCategory: applicableCategory || null
      }
    });

    return NextResponse.json(newRule, { status: 201 });
  } catch (error) {
    console.error('Error creating quota rule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as any).role;
  if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type    = searchParams.get('type') || 'all';   // all | user | renter
  const search  = searchParams.get('search') || '';
  const status  = searchParams.get('status') || 'all'; // all | active | suspended
  const page    = parseInt(searchParams.get('page') || '1');
  const limit   = parseInt(searchParams.get('limit') || '30');
  const skip    = (page - 1) * limit;

  const results: any[] = [];

  // ── Fetch Users (internal borrowers) ──────────────────────────────
  if (type === 'all' || type === 'user') {
    const whereUser: any = {
      role: 'BORROWER',
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { identityNo: { contains: search } },
        ]
      } : {}),
      ...(status === 'active' ? { isSuspended: false }
        : status === 'suspended' ? { isSuspended: true }
        : {}),
    };

    const users = await prisma.user.findMany({
      where: whereUser,
      include: {
        department: { select: { name: true } },
        loans: { select: { id: true, penaltyFee: true, penaltyPaidAmount: true } },
        violations: { select: { id: true } },
        blacklistRecords: { where: { liftedAt: null }, select: { id: true, type: true, startDate: true, endDate: true } },
        memberCard: { select: { cardNumber: true, isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    users.forEach(u => {
      const totalDenda = u.loans.reduce((sum, l) => sum + (l.penaltyFee || 0), 0);
      const dendaPaid  = u.loans.reduce((sum, l) => sum + (l.penaltyPaidAmount || 0), 0);
      results.push({
        _type: 'user',
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        identityNo: u.identityNo,
        renterCategory: u.renterCategory,
        department: u.department?.name,
        isSuspended: u.isSuspended,
        activeBlacklist: u.blacklistRecords.length > 0 ? u.blacklistRecords[0] : null,
        memberCard: u.memberCard,
        totalLoans: u.loans.length,
        totalDenda,
        dendaOutstanding: totalDenda - dendaPaid,
        totalViolations: u.violations.length,
        createdAt: u.createdAt,
      });
    });
  }

  // ── Fetch Renters (external payers) ───────────────────────────────
  if (type === 'all' || type === 'renter') {
    const renters = await prisma.renter.findMany({
      ...(search ? {
        where: {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ]
        }
      } : {}),
      include: {
        rentals: { select: { id: true, totalAmount: true, penaltyFee: true, penaltyPaidAmount: true } },
        roomBookings: { select: { id: true, totalAmount: true, depositAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    renters.forEach(r => {
      const ltv = r.rentals.reduce((s, x) => s + (x.totalAmount || 0), 0)
               + r.roomBookings.reduce((s, x) => s + (x.totalAmount || 0), 0);
      const totalDenda = r.rentals.reduce((s, x) => s + (x.penaltyFee || 0), 0);
      const dendaPaid  = r.rentals.reduce((s, x) => s + (x.penaltyPaidAmount || 0), 0);
      results.push({
        _type: 'renter',
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        idCardNo: r.idCardNo,
        isSuspended: false,
        activeBlacklist: null,
        memberCard: null,
        totalLoans: 0,
        totalRentals: r.rentals.length,
        totalBookings: r.roomBookings.length,
        ltv,
        totalDenda,
        dendaOutstanding: totalDenda - dendaPaid,
        createdAt: r.createdAt,
      });
    });
  }

  // Sort merged list by createdAt desc, apply pagination
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = results.length;
  const paged = results.slice(skip, skip + limit);

  return NextResponse.json({ data: paged, total, page, limit });
}

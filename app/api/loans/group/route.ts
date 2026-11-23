import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/loans/group?ids=id1,id2,... OR ?groupCode=GRP-...
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    const groupCode = searchParams.get('groupCode');

    if (!idsParam && !groupCode) {
      return NextResponse.json({ error: 'Parameter ids atau groupCode wajib diisi' }, { status: 400 });
    }

    const where: any = {};
    if (groupCode) {
      where.groupCode = groupCode;
    } else if (idsParam) {
      const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ error: 'Daftar ids kosong' }, { status: 400 });
      }
      where.id = { in: ids };
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        asset: {
          include: {
            category: true,
            location: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        handoverLog: true,
        approvals: {
          include: {
            approver: { select: { name: true } },
          },
          orderBy: { level: 'asc' },
        },
      },
      orderBy: { ticketNumber: 'asc' },
    });

    if (loans.length === 0) {
      return NextResponse.json({ error: 'Data peminjaman tidak ditemukan' }, { status: 404 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const isStaffOrAdmin = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'APPROVER'].includes(userRole);
    if (!isStaffOrAdmin && loans[0].userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      groupCode: loans[0].groupCode || null,
      primary: loans[0],
      loans,
    });
  } catch (error) {
    console.error('Error fetching loan group:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


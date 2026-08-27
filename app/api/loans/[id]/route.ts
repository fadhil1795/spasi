import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: params.id },
      include: {
        asset: { include: { category: true, location: true } },
        user: { select: { id: true, name: true, email: true, phone: true, identityNo: true } },
        approvals: {
          include: { approver: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { level: 'asc' },
        },
        checkInLogs: true,
      },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan request not found' }, { status: 404 });
    }

    return NextResponse.json(loan);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

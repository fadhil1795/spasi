import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// DELETE /api/policies/blocked/[id] - Menghapus blokir ketersediaan
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.blockedPeriod.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, message: 'Blokir periode berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting blocked period:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.roomFacilityMaster.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Fasilitas berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting room facility:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


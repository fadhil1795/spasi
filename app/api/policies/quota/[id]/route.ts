import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH /api/policies/quota/[id] - Memperbarui aturan kuota
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { maxActiveBookings, maxDurationDays, applicableCategory } = body;

    const updated = await prisma.quotaRule.update({
      where: { id: params.id },
      data: {
        maxActiveBookings: maxActiveBookings !== undefined ? parseInt(maxActiveBookings) : undefined,
        maxDurationDays: maxDurationDays !== undefined ? parseInt(maxDurationDays) : undefined,
        applicableCategory: applicableCategory !== undefined ? applicableCategory : undefined
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating quota rule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/policies/quota/[id] - Menghapus aturan kuota
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.quotaRule.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, message: 'Aturan kuota berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting quota rule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

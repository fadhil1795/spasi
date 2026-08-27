import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    const userRole = (session?.user as any)?.role;
    
    // Hanya SUPER_ADMIN dan ADMIN yang boleh mengubah user
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { role, isSuspended } = body;

    const dataToUpdate: any = {};
    if (role !== undefined) dataToUpdate.role = role;
    if (isSuspended !== undefined) dataToUpdate.isSuspended = isSuspended;

    // Prevent changing your own role or suspending yourself
    if (session.user?.email) {
      const self = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (self?.id === id && (role !== undefined || isSuspended === true)) {
        return NextResponse.json({ error: 'Anda tidak dapat mengubah status atau peran akun Anda sendiri' }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuspended: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

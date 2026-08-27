import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Semua permission + grouped by role
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const permissions = await prisma.permission.findMany({
    include: { rolePermissions: true },
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  });

  const rolePermissions = await prisma.rolePermission.findMany({
    include: { permission: true },
    orderBy: { roleName: 'asc' },
  });

  return NextResponse.json({ permissions, rolePermissions });
}

// POST: Assign permission ke role
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { roleName, permissionId, action } = body;

    if (action === 'REVOKE') {
      await prisma.rolePermission.deleteMany({ where: { roleName, permissionId } });
      return NextResponse.json({ ok: true });
    }

    // GRANT
    const rp = await prisma.rolePermission.upsert({
      where: { roleName_permissionId: { roleName, permissionId } },
      update: {},
      create: { roleName, permissionId },
    });
    return NextResponse.json(rp, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

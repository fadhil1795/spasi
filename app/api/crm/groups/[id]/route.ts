import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const group = await prisma.borrowerGroup.findUnique({
    where: { id: params.id },
    include: { members: { include: { user: { select: { id: true, name: true, email: true, phone: true, identityNo: true } } } } }
  });
  if (!group) return NextResponse.json({ error: 'Grup tidak ditemukan' }, { status: 404 });
  return NextResponse.json(group);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    if (body.action === 'ADD_MEMBER') {
      const member = await prisma.borrowerGroupMember.create({ data: { groupId: params.id, userId: body.userId, role: body.memberRole || 'MEMBER' } });
      return NextResponse.json(member);
    }
    if (body.action === 'REMOVE_MEMBER') {
      await prisma.borrowerGroupMember.deleteMany({ where: { groupId: params.id, userId: body.userId } });
      return NextResponse.json({ ok: true });
    }
    const { name, code, type, description, leaderId, isActive } = body;
    const updated = await prisma.borrowerGroup.update({ where: { id: params.id }, data: { name, code, type, description, leaderId, isActive } });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.borrowerGroup.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

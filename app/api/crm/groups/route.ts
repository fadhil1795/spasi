import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  const groups = await prisma.borrowerGroup.findMany({
    where: search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : undefined,
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, identityNo: true } } }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(groups);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { name, code, type, description, leaderId } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Nama grup wajib diisi' }, { status: 400 });

    const group = await prisma.borrowerGroup.create({
      data: { name, code, type, description, leaderId }
    });
    return NextResponse.json(group, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

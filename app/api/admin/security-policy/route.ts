import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const policy = await prisma.securityPolicy.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
  return NextResponse.json(policy);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Hanya Super Admin yang dapat mengubah kebijakan keamanan' }, { status: 403 });
  try {
    const body = await request.json();
    const updated = await prisma.securityPolicy.upsert({ where: { id: 'default' }, update: body, create: { id: 'default', ...body } });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

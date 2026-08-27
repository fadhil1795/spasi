import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const renterId = searchParams.get('renterId');

  const logs = await prisma.communicationLog.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(renterId ? { renterId } : {}),
    },
    orderBy: { sentAt: 'desc' },
    take: 100,
  });

  return NextResponse.json(logs);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  const adminId = (session.user as any).id;
  if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { userId, renterId, channel, type, subject, body: msgBody, relatedId, relatedType } = body;

    if (!subject || !msgBody || !channel || !type) {
      return NextResponse.json({ error: 'subject, body, channel, type wajib diisi' }, { status: 400 });
    }

    const log = await prisma.communicationLog.create({
      data: { userId, renterId, channel, type, subject, body: msgBody, relatedId, relatedType, createdBy: adminId }
    });

    return NextResponse.json(log, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

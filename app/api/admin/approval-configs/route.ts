import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const deptId = searchParams.get('departmentId');
  const txType = searchParams.get('transactionType');

  const configs = await prisma.approvalConfig.findMany({
    where: { ...(deptId ? { departmentId: deptId } : {}), ...(txType ? { transactionType: txType } : {}), isActive: true },
    orderBy: [{ departmentId: 'asc' }, { transactionType: 'asc' }, { level: 'asc' }],
  });

  const enriched = await Promise.all(configs.map(async (c) => {
    const approver = await prisma.user.findUnique({ where: { id: c.approverId }, select: { id: true, name: true, email: true, role: true } });
    return { ...c, approver };
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  const adminId = (session.user as any).id;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { departmentId, categoryId, transactionType = 'LOAN', level, approverId, notes } = body;
    if (!level || !approverId) return NextResponse.json({ error: 'level dan approverId wajib diisi' }, { status: 400 });

    const config = await prisma.approvalConfig.upsert({
      where: { departmentId_categoryId_transactionType_level: { departmentId: departmentId ?? null, categoryId: categoryId ?? null, transactionType, level } },
      update: { approverId, notes, isActive: true },
      create: { departmentId: departmentId ?? null, categoryId: categoryId ?? null, transactionType, level, approverId, notes, createdBy: adminId },
    });
    return NextResponse.json(config, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

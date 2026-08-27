import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let setting = await prisma.systemSetting.findUnique({
      where: { id: 'default' }
    });

    if (!setting) {
      setting = await prisma.systemSetting.create({
        data: { id: 'default', autoCancelHours: 24 }
      });
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { autoCancelHours } = body;

    const setting = await prisma.systemSetting.upsert({
      where: { id: 'default' },
      update: {
        autoCancelHours: autoCancelHours ? parseInt(autoCancelHours) : 24,
      },
      create: {
        id: 'default',
        autoCancelHours: autoCancelHours ? parseInt(autoCancelHours) : 24,
      },
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Error updating system settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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

    let setting = await prisma.whatsAppSetting.findUnique({
      where: { id: 'default' }
    });

    if (!setting) {
      setting = await prisma.whatsAppSetting.create({
        data: {
          id: 'default',
          provider: 'EVOLUTION',
          apiUrl: '',
          apiKey: '',
          instanceName: '',
          payloadTemplate: '',
          headers: '',
        }
      });
    }

    return NextResponse.json({
      ...setting,
      apiKey: setting.apiKey ? '••••••••••••••••' : '',
      _hasApiKey: Boolean(setting.apiKey),
    });
  } catch (error) {
    console.error('Error fetching WhatsApp settings:', error);
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
    const { provider, apiUrl, apiKey, instanceName, payloadTemplate, headers } = body;

    const updateData: any = {
      provider: provider || 'EVOLUTION',
      apiUrl: apiUrl || '',
      instanceName: instanceName || '',
      payloadTemplate: payloadTemplate || '',
      headers: headers || '',
    };

    if (apiKey !== undefined && !String(apiKey).startsWith('•')) {
      updateData.apiKey = apiKey || '';
    }

    const setting = await prisma.whatsAppSetting.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData,
        apiKey: updateData.apiKey || '',
      },
    });

    return NextResponse.json({
      ...setting,
      apiKey: setting.apiKey ? '••••••••••••••••' : '',
      _hasApiKey: Boolean(setting.apiKey),
    });
  } catch (error) {
    console.error('Error updating WhatsApp settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

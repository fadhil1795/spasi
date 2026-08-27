import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let setting = await prisma.storageSetting.findUnique({ where: { id: 'default' } });
    if (!setting) {
      setting = await prisma.storageSetting.create({
        data: { id: 'default' },
      });
    }

    // Mask secret key in response
    return NextResponse.json({
      ...setting,
      secretAccessKey: setting.secretAccessKey ? '••••••••••••••••' : '',
      _hasSecret: !!setting.secretAccessKey,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal memuat konfigurasi storage' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, baseUrl, bucket, accessKeyId, secretAccessKey, region, forcePathStyle, isActive } = body;

    const updateData: any = {
      endpoint: endpoint ?? '',
      baseUrl: baseUrl ?? '',
      bucket: bucket ?? 'spasi',
      accessKeyId: accessKeyId ?? '',
      region: region ?? 'us-east-1',
      forcePathStyle: forcePathStyle ?? true,
      isActive: isActive ?? false,
    };

    // Only update secret if a new one is provided (not masked placeholder)
    if (secretAccessKey && !secretAccessKey.startsWith('•')) {
      updateData.secretAccessKey = secretAccessKey;
    }

    const setting = await prisma.storageSetting.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...updateData },
      update: updateData,
    });

    return NextResponse.json({ success: true, updatedAt: setting.updatedAt });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Gagal menyimpan konfigurasi storage' }, { status: 500 });
  }
}

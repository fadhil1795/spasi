import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint, bucket, accessKeyId, secretAccessKey, region, forcePathStyle } = await req.json();

    let resolvedSecret = secretAccessKey;
    if (!resolvedSecret || String(resolvedSecret).startsWith('•')) {
      const saved = await prisma.storageSetting.findUnique({ where: { id: 'default' } });
      resolvedSecret = saved?.secretAccessKey || '';
    }

    if (!endpoint || !accessKeyId || !resolvedSecret) {
      return NextResponse.json({ error: 'Endpoint, Access Key, dan Secret Key harus diisi' }, { status: 400 });
    }

    // Dynamic import to avoid issues if AWS SDK not installed
    try {
      const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        endpoint,
        region: region || 'us-east-1',
        credentials: { accessKeyId, secretAccessKey: resolvedSecret },
        forcePathStyle: forcePathStyle ?? true,
      });

      await client.send(new ListBucketsCommand({}));
      return NextResponse.json({ success: true, message: 'Koneksi berhasil' });
    } catch (s3Error: any) {
      return NextResponse.json({ error: `Koneksi gagal: ${s3Error.message}` }, { status: 422 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'Gagal menguji koneksi' }, { status: 500 });
  }
}

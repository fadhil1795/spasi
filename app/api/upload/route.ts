import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Harap login sebelum mengunggah file' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folderRaw = (formData.get('folder') as string | null) || 'general';
    const folder = folderRaw.replace(/[^a-zA-Z0-9_-]/g, '') || 'general';

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file melebihi batas maksimal 10 MB' },
        { status: 400 }
      );
    }

    const ext = (path.extname(file.name) || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || (file.type && !ALLOWED_MIME_TYPES.has(file.type))) {
      return NextResponse.json(
        { error: 'Tipe file tidak diizinkan. Hanya mendukung JPG, PNG, WEBP, GIF, dan PDF.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const filename = `doc_${timestamp}_${random}${ext}`;

    // Check active S3 / MinIO StorageSetting
    const storage = await prisma.storageSetting.findUnique({
      where: { id: 'default' },
    });

    if (
      storage?.isActive &&
      storage.endpoint &&
      storage.bucket &&
      storage.accessKeyId &&
      storage.secretAccessKey
    ) {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        endpoint: storage.endpoint,
        region: storage.region || 'us-east-1',
        credentials: {
          accessKeyId: storage.accessKeyId,
          secretAccessKey: storage.secretAccessKey,
        },
        forcePathStyle: storage.forcePathStyle ?? true,
      });

      const objectKey = `uploads/${folder}/${filename}`;
      await client.send(
        new PutObjectCommand({
          Bucket: storage.bucket,
          Key: objectKey,
          Body: buffer,
          ContentType: file.type || 'application/octet-stream',
        })
      );

      let publicUrl = '';
      if (storage.baseUrl) {
        publicUrl = `${storage.baseUrl.replace(/\/$/, '')}/${objectKey}`;
      } else if (storage.forcePathStyle) {
        publicUrl = `${storage.endpoint.replace(/\/$/, '')}/${storage.bucket}/${objectKey}`;
      } else {
        publicUrl = `${storage.endpoint.replace(/\/$/, '').replace('://', `://${storage.bucket}.`)}/${objectKey}`;
      }

      return NextResponse.json({
        message: 'File berhasil diunggah ke S3/MinIO',
        url: publicUrl,
        storage: 's3',
        filename: file.name,
        size: file.size,
      });
    }

    // Fallback to local storage if S3 is not active
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({
      message: 'File berhasil diunggah (Penyimpanan Lokal)',
      url: fileUrl,
      storage: 'local',
      filename: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Gagal mengunggah file' }, { status: 500 });
  }
}

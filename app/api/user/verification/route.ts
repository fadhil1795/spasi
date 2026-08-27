import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const requests = await prisma.verificationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Gagal mengambil data pengajuan verifikasi' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { requestedCategory, identityNo, fullName, departmentName, ktmUrl } = body;

    if (!requestedCategory || !identityNo || !fullName || !ktmUrl) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 });
    }

    const activeRequest = await prisma.verificationRequest.findFirst({
      where: { userId, status: 'PENDING' },
    });

    if (activeRequest) {
      return NextResponse.json({ error: 'Anda sudah memiliki pengajuan aktif yang sedang ditinjau Admin' }, { status: 400 });
    }

    const newRequest = await prisma.verificationRequest.create({
      data: {
        userId,
        requestedCategory,
        identityNo,
        fullName,
        departmentName: departmentName || '',
        ktmUrl,
        status: 'PENDING',
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'SUBMIT_VERIFICATION',
        entity: 'VerificationRequest',
        entityId: newRequest.id,
        userId,
        details: `Mengajukan verifikasi menjadi ${requestedCategory} dengan identitas ${identityNo}`,
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Gagal mengirim pengajuan verifikasi' }, { status: 500 });
  }
}

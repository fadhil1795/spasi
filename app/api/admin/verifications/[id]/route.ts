import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = (session.user as any).id;
    const requestId = params.id;
    const body = await req.json();
    const { status, adminNotes } = body; // APPROVED atau REJECTED

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const verificationReq = await prisma.verificationRequest.findUnique({
      where: { id: requestId },
    });

    if (!verificationReq) {
      return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 });
    }

    if (verificationReq.status !== 'PENDING') {
      return NextResponse.json({ error: 'Pengajuan sudah diproses sebelumnya' }, { status: 400 });
    }

    if (status === 'APPROVED') {
      // Validasi keunikan NIM/NIP
      const existingUserWithIdentity = await prisma.user.findFirst({
        where: {
          identityNo: verificationReq.identityNo,
          id: { not: verificationReq.userId },
        },
      });
      if (existingUserWithIdentity) {
        return NextResponse.json({
          error: `Gagal menyetujui: NIM/NIP ${verificationReq.identityNo} sudah terdaftar pada pengguna lain (${existingUserWithIdentity.email}).`,
        }, { status: 400 });
      }
    }

    // Cari kesesuaian unit/fakultas jika ada
    let matchedDepartmentId: string | null = null;
    if (status === 'APPROVED' && verificationReq.departmentName) {
      const dept = await prisma.department.findFirst({
        where: {
          OR: [
            { name: { contains: verificationReq.departmentName } },
            { code: { equals: verificationReq.departmentName } },
          ],
        },
      });
      if (dept) matchedDepartmentId = dept.id;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update status VerificationRequest
      const updatedReq = await tx.verificationRequest.update({
        where: { id: requestId },
        data: {
          status,
          adminNotes: status === 'REJECTED' ? adminNotes : null,
          decidedById: adminId,
        },
      });

      // 2. Jika disetujui, update renterCategory, identityNo, dan departmentId pada User
      if (status === 'APPROVED') {
        await tx.user.update({
          where: { id: verificationReq.userId },
          data: {
            name: verificationReq.fullName || undefined,
            renterCategory: verificationReq.requestedCategory,
            identityNo: verificationReq.identityNo,
            ...(matchedDepartmentId ? { departmentId: matchedDepartmentId } : {}),
          },
        });
      }

      // 3. Catat audit log
      await tx.auditLog.create({
        data: {
          action: status === 'APPROVED' ? 'APPROVE_VERIFICATION' : 'REJECT_VERIFICATION',
          entity: 'VerificationRequest',
          entityId: requestId,
          userId: adminId,
          details: status === 'APPROVED' 
            ? `Menyetujui pengajuan verifikasi user ${verificationReq.userId} menjadi ${verificationReq.requestedCategory}` 
            : `Menolak pengajuan verifikasi user ${verificationReq.userId}. Alasan: ${adminNotes || '-'}`,
        },
      });

      return updatedReq;
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Gagal memperbarui status verifikasi' }, { status: 500 });
  }
}

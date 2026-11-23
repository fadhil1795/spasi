import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

type GroupActionType = 'APPROVE' | 'REJECT' | 'CANCEL' | 'REQUEST_RETURN';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const body = await request.json();
    const { loanIds, action, notes } = body as {
      loanIds?: string[];
      action?: GroupActionType;
      notes?: string;
    };

    if (!Array.isArray(loanIds) || loanIds.length === 0) {
      return NextResponse.json({ error: 'Daftar ID peminjaman wajib diisi' }, { status: 400 });
    }

    if (!action || !['APPROVE', 'REJECT', 'CANCEL', 'REQUEST_RETURN'].includes(action)) {
      return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
    }

    if (action === 'REJECT' && (!notes || !String(notes).trim())) {
      return NextResponse.json({ error: 'Alasan penolakan wajib diisi' }, { status: 400 });
    }

    const loans = await prisma.loan.findMany({
      where: { id: { in: loanIds } },
      include: { asset: true, user: true },
    });

    if (loans.length === 0) {
      return NextResponse.json({ error: 'Data peminjaman tidak ditemukan' }, { status: 404 });
    }

    // Authorization checks
    if (['APPROVE', 'REJECT'].includes(action)) {
      if (!['SUPER_ADMIN', 'ADMIN', 'APPROVER'].includes(userRole)) {
        return NextResponse.json({ error: 'Anda tidak memiliki izin persetujuan' }, { status: 403 });
      }

      if (action === 'APPROVE') {
        const hasPendingL2 = loans.some((l) => l.status === 'PENDING_L2');
        if (hasPendingL2 && !['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
          return NextResponse.json(
            { error: 'Verifikasi Level 2 hanya dapat dilakukan oleh Admin Aset/Sarpras.' },
            { status: 403 }
          );
        }

        // Check department head constraint for L1 if not ADMIN/SUPER_ADMIN
        if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
          const deptIds = Array.from(
            new Set(
              loans
                .filter((l) => l.status === 'PENDING_L1' && l.asset.departmentId)
                .map((l) => l.asset.departmentId as string)
            )
          );
          if (deptIds.length > 0) {
            const depts = await prisma.department.findMany({
              where: { id: { in: deptIds } },
            });
            for (const dept of depts) {
              if (dept.headId && dept.headId !== actorId) {
                return NextResponse.json(
                  {
                    error: `Persetujuan Level 1 hanya dapat disetujui oleh Kepala Unit/Lab (${dept.name}) yang bersangkutan.`,
                  },
                  { status: 403 }
                );
              }
            }
          }
        }
      }
    } else {
      // CANCEL or REQUEST_RETURN
      const isPrivileged = ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole);
      const unauthorized = loans.some((l) => l.userId !== actorId && !isPrivileged);
      if (unauthorized) {
        return NextResponse.json({ error: 'Anda tidak memiliki izin untuk memproses pengajuan ini' }, { status: 403 });
      }
    }

    const cleanNotes = notes ? String(notes).trim() : '';
    const updatedLoans: any[] = [];
    let approvalLevel = 1;

    await prisma.$transaction(async (tx) => {
      for (const loan of loans) {
        if (action === 'APPROVE') {
          if (loan.status === 'PENDING_L1') {
            approvalLevel = 1;
            const updated = await tx.loan.update({
              where: { id: loan.id },
              data: { status: 'PENDING_L2' },
            });
            await tx.approval.create({
              data: {
                loanId: loan.id,
                approverId: actorId,
                level: 1,
                status: 'APPROVED',
                notes: cleanNotes || null,
                decidedAt: new Date(),
              },
            });
            updatedLoans.push(updated);
          } else if (loan.status === 'PENDING_L2') {
            approvalLevel = 2;
            const updated = await tx.loan.update({
              where: { id: loan.id },
              data: { status: 'APPROVED' },
            });
            await tx.approval.create({
              data: {
                loanId: loan.id,
                approverId: actorId,
                level: 2,
                status: 'APPROVED',
                notes: cleanNotes || null,
                decidedAt: new Date(),
              },
            });
            updatedLoans.push(updated);
          }
        } else if (action === 'REJECT') {
          if (['PENDING_L1', 'PENDING_L2'].includes(loan.status)) {
            approvalLevel = loan.status === 'PENDING_L1' ? 1 : 2;
            const updated = await tx.loan.update({
              where: { id: loan.id },
              data: { status: 'REJECTED' },
            });
            await tx.approval.create({
              data: {
                loanId: loan.id,
                approverId: actorId,
                level: approvalLevel,
                status: 'REJECTED',
                notes: cleanNotes,
                decidedAt: new Date(),
              },
            });
            updatedLoans.push(updated);
          }
        } else if (action === 'CANCEL') {
          if (['DRAFT', 'PENDING_L1', 'PENDING_L2', 'APPROVED'].includes(loan.status)) {
            const reason = cleanNotes || 'Dibatalkan oleh pengguna';
            const updated = await tx.loan.update({
              where: { id: loan.id },
              data: {
                status: 'CANCELLED',
                notes: `[Dibatalkan]: ${reason}\n${loan.notes || ''}`,
              },
            });
            updatedLoans.push(updated);
          }
        } else if (action === 'REQUEST_RETURN') {
          if (loan.status === 'ACTIVE') {
            const updated = await tx.loan.update({
              where: { id: loan.id },
              data: {
                status: 'RETURN_REQUESTED',
                notes: cleanNotes ? `${loan.notes ? loan.notes + '\n' : ''}[Ajuan Kembali]: ${cleanNotes}` : loan.notes,
              },
            });
            updatedLoans.push(updated);
          }
        }
      }
    });

    if (updatedLoans.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada item peminjaman yang memenuhi status untuk aksi ini.' },
        { status: 400 }
      );
    }

    const borrower = loans[0].user;
    const assetSummary = loans.map((l) => `${l.asset.name} (${l.quantity} unit)`).join(', ');
    const groupLabel = loans[0].groupCode ? `#${loans[0].groupCode}` : `${updatedLoans.length} tiket`;

    await createAuditLog({
      userId: actorId,
      action: `LOAN_GROUP_${action}`,
      entity: 'Loan',
      entityId: updatedLoans.map((l) => l.id).join(','),
      details: `Aksi massal ${action} pada ${groupLabel} (${updatedLoans.length} aset: ${assetSummary}). Catatan: "${cleanNotes || '-'}"`,
    });

    const { sendSystemNotification } = await import('@/lib/notification');

    if (action === 'APPROVE') {
      const isFinal = approvalLevel === 2;
      await sendSystemNotification({
        userId: borrower.id,
        title: isFinal
          ? `Peminjaman ${updatedLoans.length} Aset Disetujui Sepenuhnya! 🎉`
          : `Persetujuan Peminjaman Level 1 Disetujui 👍`,
        message: isFinal
          ? `Pengajuan peminjaman (${assetSummary}) telah disetujui sepenuhnya. Silakan lakukan pengambilan barang sesuai jadwal.`
          : `Pengajuan peminjaman (${assetSummary}) disetujui di Level 1. Menunggu verifikasi Level 2 dari Admin Aset/Sarpras.`,
        type: isFinal ? 'SUCCESS' : 'INFO',
        email: borrower.email,
        phone: borrower.phone,
      });
    } else if (action === 'REJECT') {
      await sendSystemNotification({
        userId: borrower.id,
        title: `Pengajuan Peminjaman Ditolak ❌`,
        message: `Pengajuan peminjaman (${assetSummary}) ditolak pada Level ${approvalLevel}.\nAlasan: "${cleanNotes}"`,
        type: 'DANGER',
        email: borrower.email,
        phone: borrower.phone,
      });
    }

    return NextResponse.json({
      success: true,
      count: updatedLoans.length,
      loans: updatedLoans,
    });
  } catch (error) {
    console.error('Error in loan group action:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


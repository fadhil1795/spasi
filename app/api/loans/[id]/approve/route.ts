import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const approverId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const body = await request.json();
    const { action, notes } = body; // action: 'APPROVE' | 'REJECT'

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: params.id },
      include: { approvals: true, asset: true, user: true },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Data peminjaman tidak ditemukan' }, { status: 404 });
    }

    // Role & Department Head verification for level 1 approvals
    if (loan.status === 'PENDING_L1' && action === 'APPROVE') {
      if (loan.asset.departmentId) {
        const dept = await prisma.department.findUnique({
          where: { id: loan.asset.departmentId }
        });
        
        // If department has a head designated, check if approver matches or is admin
        if (dept && dept.headId && !['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
          if (approverId !== dept.headId) {
            return NextResponse.json({ 
              error: `Persetujuan Level 1 hanya dapat disetujui oleh Kepala Unit/Lab (${dept.name}) yang bersangkutan.` 
            }, { status: 403 });
          }
        }
      }
    }

    let nextStatus = loan.status;
    const level = loan.status === 'PENDING_L1' ? 1 : 2;

    const { sendSystemNotification } = await import('@/lib/notification');

    if (action === 'REJECT') {
      if (!notes) {
        return NextResponse.json({ error: 'Alasan penolakan wajib diisi' }, { status: 400 });
      }
      nextStatus = 'REJECTED';
      await prisma.approval.create({
        data: {
          loanId: loan.id,
          approverId,
          level,
          status: 'REJECTED',
          notes,
          decidedAt: new Date(),
        },
      });

      // Write Audit Log
      await createAuditLog({
        userId: approverId,
        action: 'LOAN_REJECT',
        entity: 'Loan',
        entityId: loan.id,
        details: `Level ${level} rejection. Alasan: "${notes}"`,
        oldData: { status: loan.status },
        newData: { status: 'REJECTED' },
      });

      // Send rejection notification to borrower
      await sendSystemNotification({
        userId: loan.userId,
        title: `Pengajuan Peminjaman Ditolak ❌`,
        message: `Peminjaman aset "${loan.asset.name}" (${loan.asset.code}) ditolak pada persetujuan Level ${level}.\nAlasan penolakan: "${notes}"`,
        type: 'DANGER',
        email: loan.user.email,
        phone: loan.user.phone,
      });

    } else if (action === 'APPROVE') {
      if (loan.status === 'PENDING_L1') {
        nextStatus = 'PENDING_L2';
        await prisma.approval.create({
          data: {
            loanId: loan.id,
            approverId,
            level: 1,
            status: 'APPROVED',
            notes,
            decidedAt: new Date(),
          },
        });

        // Write Audit Log
        await createAuditLog({
          userId: approverId,
          action: 'LOAN_APPROVE_L1',
          entity: 'Loan',
          entityId: loan.id,
          details: `Level 1 approval. Catatan: "${notes || '-'}"`,
          oldData: { status: 'PENDING_L1' },
          newData: { status: 'PENDING_L2' },
        });

        // Send L1 approval notification to borrower
        await sendSystemNotification({
          userId: loan.userId,
          title: `Persetujuan Peminjaman Level 1 Disetujui 👍`,
          message: `Peminjaman aset "${loan.asset.name}" (${loan.asset.code}) disetujui di Level 1. Menunggu persetujuan Level 2 dari Admin Aset/Sarpras.`,
          type: 'INFO',
          email: loan.user.email,
          phone: loan.user.phone,
        });

      } else if (loan.status === 'PENDING_L2') {
        nextStatus = 'APPROVED';
        await prisma.approval.create({
          data: {
            loanId: loan.id,
            approverId,
            level: 2,
            status: 'APPROVED',
            notes,
            decidedAt: new Date(),
          },
        });

        // Write Audit Log
        await createAuditLog({
          userId: approverId,
          action: 'LOAN_APPROVE_L2',
          entity: 'Loan',
          entityId: loan.id,
          details: `Level 2 approval. Catatan: "${notes || '-'}"`,
          oldData: { status: 'PENDING_L2' },
          newData: { status: 'APPROVED' },
        });

        // Send L2 approval (final) notification to borrower
        await sendSystemNotification({
          userId: loan.userId,
          title: `Peminjaman Aset Disetujui Sepenuhnya! 🎉`,
          message: `Selamat! Pengajuan peminjaman aset "${loan.asset.name}" (${loan.asset.code}) disetujui sepenuhnya. Silakan lakukan pengambilan barang sesuai jadwal.`,
          type: 'SUCCESS',
          email: loan.user.email,
          phone: loan.user.phone,
        });
      }
    }

    const updatedLoan = await prisma.loan.update({
      where: { id: params.id },
      data: { status: nextStatus },
    });

    return NextResponse.json(updatedLoan);
  } catch (error) {
    console.error('Error approving loan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST /api/loans/[id]/cancel - Batalkan pengajuan peminjaman sebelum serah terima
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const loan = await prisma.loan.findUnique({
      where: { id: params.id },
      include: { asset: true },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Data peminjaman tidak ditemukan' }, { status: 404 });
    }

    // Hanya pemilik atau Admin/Staff yang boleh membatalkan
    if (loan.userId !== userId && !['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Anda tidak memiliki izin membatalkan pengajuan ini' }, { status: 403 });
    }

    if (!['DRAFT', 'PENDING_L1', 'PENDING_L2', 'APPROVED'].includes(loan.status)) {
      return NextResponse.json(
        {
          error: `Pengajuan dengan status "${loan.status}" tidak dapat dibatalkan (barang sudah diserahterimakan atau selesai).`,
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason ? String(body.reason).trim() : 'Dibatalkan oleh pengguna';

    const updated = await prisma.loan.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        notes: `[Dibatalkan]: ${reason}\n${loan.notes || ''}`,
      },
    });

    await createAuditLog({
      userId,
      action: 'LOAN_CANCEL',
      entity: 'Loan',
      entityId: loan.id,
      details: `Peminjaman ${loan.ticketNumber} (${loan.asset.name}) dibatalkan. Alasan: ${reason}`,
      oldData: { status: loan.status },
      newData: { status: 'CANCELLED' },
    });

    return NextResponse.json({
      success: true,
      message: `Pengajuan peminjaman #${loan.ticketNumber} berhasil dibatalkan.`,
      loan: updated,
    });
  } catch (error) {
    console.error('Error cancelling loan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


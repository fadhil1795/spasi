import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST /api/loans/[id]/request-return - Peminjam mengajukan pengembalian (Status -> RETURN_REQUESTED)
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const loan = await prisma.loan.findUnique({
      where: { id: params.id },
      include: { asset: true, user: true },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Data peminjaman tidak ditemukan' }, { status: 404 });
    }

    // Borrower can only request return for their own loan unless STAFF/ADMIN
    if (userRole === 'BORROWER' && loan.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (loan.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Peminjaman tidak dalam status AKTIF (Status saat ini: ${loan.status})` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { returnNotes } = body;

    const updatedLoan = await prisma.loan.update({
      where: { id: params.id },
      data: {
        status: 'RETURN_REQUESTED',
        notes: returnNotes ? `[Pengajuan Pengembalian]: ${returnNotes}\n${loan.notes || ''}` : loan.notes,
      },
    });

    await createAuditLog({
      userId,
      action: 'REQUEST_RETURN',
      entity: 'Loan',
      entityId: params.id,
      details: `Peminjam ${loan.user.name} mengajukan pengembalian aset "${loan.asset.name}" (${loan.ticketNumber}). Status berubah menjadi MENUNGGU PEMERIKSAAN.`,
      oldData: { status: loan.status },
      newData: { status: updatedLoan.status },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengajuan pengembalian berhasil! Harap serahkan aset kepada petugas di lokasi untuk pemeriksaan fisik.',
      loan: updatedLoan,
    });
  } catch (error) {
    console.error('Error requesting return:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const rental = await prisma.rental.findUnique({
      where: { id: params.id },
      include: {
        asset: true,
        renter: true,
      },
    });

    if (!rental) return NextResponse.json({ error: 'Data penyewaan aset tidak ditemukan' }, { status: 404 });
    return NextResponse.json(rental);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role || 'BORROWER';
    const isBorrower = userRole === 'BORROWER';

    const body = await request.json();
    const { payStatus, payMethod, paymentProofUrl, notes } = body;

    // RBAC: Borrower can only upload payment proof, NOT verify or change payment status to PAID
    if (isBorrower && payStatus === 'PAID') {
      return NextResponse.json({ error: 'Hanya Admin/Staff/Kepala yang dapat memverifikasi pembayaran' }, { status: 403 });
    }

    const existingRental = await prisma.rental.findUnique({
      where: { id: params.id },
    });

    if (!existingRental) {
      return NextResponse.json({ error: 'Data sewa tidak ditemukan' }, { status: 404 });
    }

    const updated = await prisma.rental.update({
      where: { id: params.id },
      data: {
        ...(payStatus && { payStatus }),
        ...(payMethod && { payMethod }),
        ...(paymentProofUrl !== undefined && { paymentProofUrl }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        asset: true,
        renter: true,
      },
    });

    // Write Audit Log
    const actorId = (session.user as any).id;
    await createAuditLog({
      userId: actorId,
      action: payStatus ? `RENTAL_PAY_${payStatus}` : 'RENTAL_UPDATE',
      entity: 'Rental',
      entityId: updated.id,
      details: payStatus ? `Status bayar diubah menjadi ${payStatus} (Metode: ${payMethod || '-'}).` : 'Data sewa di-update.',
      oldData: { payStatus: existingRental.payStatus, payMethod: existingRental.payMethod },
      newData: { payStatus: updated.payStatus, payMethod: updated.payMethod },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.rental.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Transaksi penyewaan berhasil dihapus' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session || (session.user as any).role !== 'SUPER_ADMIN' && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Hanya admin yang bisa membatalkan denda.' }, { status: 403 });
    }

    const { transactionType, id, reason } = await request.json();

    if (!transactionType || !id) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (transactionType === 'LOAN') {
      const transaction = await prisma.loan.findUnique({ where: { id } });
      if (!transaction) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });

      await prisma.loan.update({
        where: { id },
        data: {
          penaltyStatus: 'CANCELLED',
          notes: (transaction.notes ? transaction.notes + '\n' : '') + `[DIBATALKAN ADMIN]: ${reason || 'Tanpa alasan'}`,
        }
      });
    } else if (transactionType === 'RENTAL') {
      const transaction = await prisma.rental.findUnique({ where: { id } });
      if (!transaction) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });

      await prisma.rental.update({
        where: { id },
        data: {
          penaltyStatus: 'CANCELLED',
          notes: (transaction.notes ? transaction.notes + '\n' : '') + `[DIBATALKAN ADMIN]: ${reason || 'Tanpa alasan'}`,
        }
      });
    } else {
      return NextResponse.json({ error: 'Tipe transaksi tidak valid' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Denda berhasil dibatalkan',
    });

  } catch (error) {
    console.error('Error cancelling penalty:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

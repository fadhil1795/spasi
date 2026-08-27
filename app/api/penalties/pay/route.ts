import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionType, id, amount, useDeposit } = await request.json();

    if (!transactionType || !id || (!amount && !useDeposit)) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    let transaction;
    let newPaidAmount = 0;
    let status = 'UNPAID';

    if (transactionType === 'LOAN') {
      transaction = await prisma.loan.findUnique({ where: { id } });
      if (!transaction) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });

      // Loan biasanya tidak punya depositAmount (di skema aslinya tidak ada field depositAmount di Loan)
      if (useDeposit) {
        return NextResponse.json({ error: 'Peminjaman tidak mendukung potong deposit' }, { status: 400 });
      }

      newPaidAmount = (transaction.penaltyPaidAmount || 0) + Number(amount);
      if (newPaidAmount >= (transaction.penaltyFee || 0)) {
        status = 'PAID';
        newPaidAmount = transaction.penaltyFee || 0; // Cap at total fee
      } else if (newPaidAmount > 0) {
        status = 'PARTIAL';
      }

      await prisma.loan.update({
        where: { id },
        data: {
          penaltyPaidAmount: newPaidAmount,
          penaltyStatus: status,
        }
      });

      // SINGLE-ENTRY ACCOUNTING: Catat penerimaan kas
      if (Number(amount) > 0) {
        await prisma.cashTransaction.create({
          data: {
            type: 'IN',
            category: 'PENALTY',
            amount: Number(amount),
            referenceId: id,
            description: `Pembayaran denda Peminjaman (Loan ID: ${id})`,
          }
        });
      }

    } else if (transactionType === 'RENTAL') {
      transaction = await prisma.rental.findUnique({ where: { id } });
      if (!transaction) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });

      let paidFromDeposit = 0;
      let depositRemaining = transaction.depositAmount || 0;
      let feeRemaining = (transaction.penaltyFee || 0) - (transaction.penaltyPaidAmount || 0);

      if (useDeposit && depositRemaining > 0) {
        if (depositRemaining >= feeRemaining) {
          paidFromDeposit = feeRemaining;
          depositRemaining -= feeRemaining;
        } else {
          paidFromDeposit = depositRemaining;
          depositRemaining = 0;
        }
      }

      const totalPaidNow = Number(amount || 0) + paidFromDeposit;
      newPaidAmount = (transaction.penaltyPaidAmount || 0) + totalPaidNow;

      if (newPaidAmount >= (transaction.penaltyFee || 0)) {
        status = 'PAID';
        newPaidAmount = transaction.penaltyFee || 0; // Cap
      } else if (newPaidAmount > 0) {
        status = 'PARTIAL';
      }

      await prisma.rental.update({
        where: { id },
        data: {
          penaltyPaidAmount: newPaidAmount,
          penaltyStatus: status,
          depositAmount: depositRemaining,
        }
      });

      // SINGLE-ENTRY ACCOUNTING: Catat penerimaan kas
      if (Number(amount) > 0) {
        await prisma.cashTransaction.create({
          data: {
            type: 'IN',
            category: 'PENALTY',
            amount: Number(amount),
            referenceId: id,
            description: `Pembayaran denda Sewa (Rental ID: ${id})`,
          }
        });
      }

    } else {
      return NextResponse.json({ error: 'Tipe transaksi tidak valid' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Pembayaran denda berhasil dicatat',
      status,
      penaltyPaidAmount: newPaidAmount
    });

  } catch (error) {
    console.error('Error paying penalty:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

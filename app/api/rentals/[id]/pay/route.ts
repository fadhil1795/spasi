import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { sendEmailVoucher } from '@/lib/mailer';
import { sendWaVoucher } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { payStatus, payMethod, depositAmount, notes } = body;

    if (!payStatus) {
      return NextResponse.json({ error: 'Status pembayaran wajib diisi' }, { status: 400 });
    }

    // Ambil data sebelum diubah untuk ngecek apakah status aslinya bukan PAID
    const existingRental = await prisma.rental.findUnique({
      where: { id: params.id },
      include: { asset: true, renter: true }
    });

    if (!existingRental) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    const wasAlreadyPaid = existingRental.payStatus === 'PAID';

    const updatedRental = await prisma.rental.update({
      where: { id: params.id },
      data: {
        payStatus,
        payMethod: payMethod || 'Cash',
        depositAmount: depositAmount ? parseFloat(depositAmount) : 0,
        notes: notes || null,
      },
      include: {
        asset: true,
        renter: true,
      },
    });

    // Jika payStatus berubah menjadi PAID dari yang bukan PAID, kirim e-Voucher!
    if (payStatus === 'PAID' && !wasAlreadyPaid) {
      const voucherData = {
        to: updatedRental.renter.email, // email & wa bisa sama-sama pakai objek renter
        phone: updatedRental.renter.phone, 
        bookingNumber: updatedRental.bookingNumber,
        renterName: updatedRental.renter.name,
        assetNames: updatedRental.asset.name,
        totalAmount: updatedRental.totalAmount,
        startDate: updatedRental.startDate.toISOString().split('T')[0],
        endDate: updatedRental.endDate.toISOString().split('T')[0],
      };

      // Jalankan async di background agar API cepat membalas
      Promise.allSettled([
        sendEmailVoucher(voucherData),
        sendWaVoucher({ ...voucherData, to: voucherData.phone })
      ]).catch(console.error);
    }

    return NextResponse.json(updatedRental);
  } catch (error) {
    console.error('Error updating rental payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

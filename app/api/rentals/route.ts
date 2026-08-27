import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { generateRentalNumber, calculateDaysCount } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const payStatus = searchParams.get('payStatus') || searchParams.get('status');
    const myRentals = searchParams.get('my') === 'true';

    const whereClause: any = {};
    if (payStatus && payStatus !== 'ALL') whereClause.payStatus = payStatus;

    if (myRentals || (session?.user && (session.user as any).role === 'BORROWER')) {
      if (session?.user?.email) {
        whereClause.renter = {
          OR: [
            { email: session.user.email },
            { phone: (session.user as any).phone || undefined },
          ],
        };
      }
    }

    const rentals = await prisma.rental.findMany({
      where: whereClause,
      include: {
        asset: { select: { name: true, code: true } },
        renter: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(rentals);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      renterName,
      renterPhone,
      renterEmail,
      renterIdCard,
      assetId,
      quantity,
      startDate,
      endDate,
      ratePerDay,
      depositAmount,
      payStatus,
      payMethod,
      paymentProofUrl,
      supportingDocUrl,
    } = body;

    if (!renterName || !renterPhone || !assetId || !startDate || !endDate || !ratePerDay) {
      return NextResponse.json({ error: 'Data penyewaan tidak lengkap' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = calculateDaysCount(start, end);

    // Limit maximum commercial rental to 7 days
    if (totalDays > 7) {
      return NextResponse.json({ error: 'Batas waktu sewa komersial maksimal adalah 7 hari.' }, { status: 400 });
    }

    // Backend double-booking conflict check
    const existingConflict = await prisma.rental.findFirst({
      where: {
        assetId,
        payStatus: { notIn: ['REFUNDED', 'CANCELLED'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (existingConflict) {
      return NextResponse.json(
        { error: 'Aset ini sudah disewakan ke pelanggan lain pada periode tanggal tersebut.' },
        { status: 409 }
      );
    }

    const qty = quantity ? parseInt(quantity) : 1;
    const totalAmount = totalDays * parseFloat(ratePerDay) * qty;

    // 1. Create or get Renter
    let renter = await prisma.renter.findFirst({
      where: { phone: renterPhone },
    });

    if (!renter) {
      renter = await prisma.renter.create({
        data: {
          name: renterName,
          phone: renterPhone,
          email: renterEmail || null,
          idCardNo: renterIdCard || null,
        },
      });
    }

    // 2. Generate Booking Number
    const count = await prisma.rental.count();
    const bookingNumber = generateRentalNumber(count + 1);

    // 3. Create Rental Transaction
    const rental = await prisma.rental.create({
      data: {
        bookingNumber,
        renterId: renter.id,
        assetId,
        quantity: qty,
        startDate: start,
        endDate: end,
        ratePerDay: parseFloat(ratePerDay),
        totalDays,
        totalAmount,
        depositAmount: depositAmount ? parseFloat(depositAmount) : 0,
        payStatus: payStatus || (paymentProofUrl ? 'PENDING_VERIFICATION' : 'UNPAID'),
        payMethod: payMethod || 'Transfer',
        paymentProofUrl: paymentProofUrl || null,
        supportingDocUrl: supportingDocUrl || null,
        operatorId: body.operatorId || null,
        operatorFee: body.operatorFee ? parseFloat(body.operatorFee) : 0,
      },
    });

    // 4. Update asset status to RENTED
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: 'RENTED' },
    });

    return NextResponse.json(rental, { status: 201 });
  } catch (error) {
    console.error('Error creating rental:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { generateBookingNumber, calculateDurationHours } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingNumber = searchParams.get('bookingNumber');

    // If searching by specific booking number (e.g. public E-Voucher lookup), skip auth requirement
    if (bookingNumber) {
      const booking = await prisma.roomBooking.findUnique({
        where: { bookingNumber },
        include: {
          location: true,
          renter: true,
          addonAssets: { include: { asset: { select: { name: true, images: true } } } },
          inspections: true,
        },
      });
      return NextResponse.json(booking ? [booking] : []);
    }

    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const status = searchParams.get('status');
    const locationId = searchParams.get('locationId');
    const myBookings = searchParams.get('my') === 'true';

    const where: any = {};
    if (status && status !== 'ALL') where.bookingStatus = status;
    if (locationId) where.locationId = locationId;

    if (myBookings || (session?.user && (session.user as any).role === 'BORROWER')) {
      const renterOr: any[] = [];
      if (session?.user?.email) renterOr.push({ email: session.user.email });
      const userPhone = String((session?.user as any)?.phone || '').trim();
      if (userPhone) renterOr.push({ phone: userPhone });
      if (renterOr.length > 0) {
        where.renter = { OR: renterOr };
      } else {
        where.id = '__none__';
      }
    }

    const bookings = await prisma.roomBooking.findMany({
      where,
      include: {
        location: { select: { name: true, building: true, code: true } },
        renter: true,
        addonAssets: { include: { asset: { select: { name: true } } } },
        _count: { select: { inspections: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      locationId, startTime, endTime,
      renterName, renterPhone, renterEmail, renterIdCard,
      payMethod, payStatus: inputPayStatus, depositAmount: inputDepositAmount, notes,
      supportingDocUrl, rentalType, paymentScheme,
      renterCategory = 'MAHASISWA',
      addonAssets, // array of { assetId, quantity, ratePerSession }
      activityType, consentText,
      bankName, bankAccountNumber, bankAccountHolder,
    } = body;

    const hasAddons = Array.isArray(addonAssets) && addonAssets.length > 0;
    if ((!locationId && !hasAddons) || !startTime || !endTime || !renterName || !renterPhone) {
      return NextResponse.json({ error: 'Data booking tidak lengkap (pilih minimal 1 ruangan atau 1 aset Sarpras)' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return NextResponse.json({ error: 'Waktu selesai harus setelah waktu mulai' }, { status: 400 });
    }

    // 1. Quota Validation Check
    const userId = (session?.user as any)?.id;
    const userEmail = session?.user?.email;
    const activeBookingsCount = userEmail
      ? await prisma.roomBooking.count({
          where: {
            renter: { email: userEmail },
            bookingStatus: { in: ['PENDING', 'PENDING_L1', 'PENDING_L2', 'APPROVED', 'CONFIRMED', 'ACTIVE', 'RETURN_REQUESTED'] },
          },
        })
      : 0;

    const activeLoansCount = await prisma.loan.count({
      where: {
        userId,
        status: { in: ['PENDING_L1', 'PENDING_L2', 'APPROVED', 'ACTIVE'] }
      }
    });

    const totalActive = activeBookingsCount + activeLoansCount;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user && user.role === 'BORROWER' && user.renterCategory === 'EXTERNAL') {
      return NextResponse.json({ error: 'Akses terbatas bagi pengguna Eksternal. Silakan ajukan verifikasi akun terlebih dahulu.' }, { status: 403 });
    }

    if (user) {
      let appliedRule = await prisma.quotaRule.findFirst({
        where: { targetType: 'USER', targetId: userId }
      });

      if (!appliedRule && user.departmentId) {
        appliedRule = await prisma.quotaRule.findFirst({
          where: { targetType: 'DEPARTMENT', targetId: user.departmentId }
        });
      }

      if (!appliedRule) {
        appliedRule = await prisma.quotaRule.findFirst({
          where: { targetType: 'ROLE', targetId: user.role }
        });
      }

      const maxQuota = appliedRule ? appliedRule.maxActiveBookings : 3;
      if (totalActive >= maxQuota) {
        return NextResponse.json(
          { error: `Kuota pemesanan/peminjaman aktif Anda penuh. Batas maksimal Anda adalah ${maxQuota} booking aktif.` },
          { status: 400 }
        );
      }
    }

    // 2. Blocked Period Validation Check
    const blockedConflict = await prisma.blockedPeriod.findFirst({
      where: {
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'ITEM', scopeTarget: locationId }
        ],
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } }
        ]
      }
    });

    if (blockedConflict) {
      return NextResponse.json(
        { error: `Periode tanggal tersebut terblokir oleh kebijakan kampus (${blockedConflict.reason}).` },
        { status: 400 }
      );
    }

    // Operating hours validation (07:00 - 22:00)
    const startHour = start.getHours();
    const endHour = end.getHours();
    if (startHour < 7 || endHour > 22 || (endHour === 22 && end.getMinutes() > 0)) {
      return NextResponse.json({ error: 'Pemesanan ruangan hanya dapat dilakukan di dalam jam operasional instansi (07:00 s.d. 22:00).' }, { status: 400 });
    }

    // Rental duration limits (Min 1 hour, Max 12 hours)
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 1) {
      return NextResponse.json({ error: 'Durasi minimal pemesanan ruangan adalah 1 jam.' }, { status: 400 });
    }
    if (rentalType !== 'DAILY' && diffHours > 12) {
      return NextResponse.json({ error: 'Durasi maksimal pemesanan ruangan per jam adalah 12 jam per hari.' }, { status: 400 });
    }

    // Get room rate (jika memilih ruangan)
    const room = locationId ? await prisma.location.findUnique({ where: { id: locationId } }) : null;
    if (locationId && !room) return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });

    // Validate access based on isLoanable & isRentable settings
    const requesterRole = (session?.user as any)?.role || 'BORROWER';
    const requesterCategory = (session?.user as any)?.renterCategory || 'EXTERNAL';

    if (room && requesterRole === 'BORROWER') {
      if (requesterCategory === 'EXTERNAL') {
        if (!room.isRentable) {
          return NextResponse.json({ error: 'Akses terbatas. Ruangan ini tidak disewakan untuk Eksternal.' }, { status: 403 });
        }
      } else {
        // Internal
        if (!room.isLoanable && !room.isRentable) {
          return NextResponse.json({ error: 'Akses ditutup. Ruangan ini sedang dinonaktifkan.' }, { status: 403 });
        }
      }
    }

    const durationHours = calculateDurationHours(start, end);
    const originalRoomRate = room
      ? rentalType === 'DAILY'
        ? (room.pricePerDay || (room.pricePerHour || 0) * 8)
        : (room.pricePerHour || 0)
      : 0;

    // Apply conditional calculations based on renterCategory
    let roomRate = originalRoomRate;
    let roomSubtotal = 0;
    let addonSubtotal = 0;
    let depositAmount = 0;
    let finalPayStatus = inputPayStatus || 'UNPAID';

    const duration = rentalType === 'DAILY' ? Math.max(1, Math.ceil(durationHours / 24)) : durationHours;

    if (renterCategory === 'MAHASISWA') {
      const isFree = room ? room.isLoanable : true;
      if (isFree) {
        roomRate = 0;
        roomSubtotal = 0;
        addonSubtotal = 0;
        depositAmount = room?.requiresDepositForInternal ? (room.depositAmount || 0) : 0;
        finalPayStatus = depositAmount > 0 ? (inputPayStatus || 'UNPAID') : 'PAID';
      } else {
        // Paid room for internal
        roomRate = originalRoomRate;
        roomSubtotal = roomRate * duration;
        const addonList = Array.isArray(addonAssets) ? addonAssets : [];
        addonSubtotal = addonList.reduce((sum: number, a: any) => {
          return sum + (parseFloat(a.ratePerSession) * parseInt(a.quantity));
        }, 0);
        depositAmount = room?.requiresDepositForInternal ? (room.depositAmount || 0) : 0;
        finalPayStatus = inputPayStatus || 'UNPAID';
      }
    } else if (renterCategory === 'EXTERNAL_PINJAM') {
      roomRate = 0;
      roomSubtotal = 0;
      addonSubtotal = 0;
      depositAmount =
        inputDepositAmount !== undefined && inputDepositAmount !== null
          ? parseFloat(inputDepositAmount)
          : (room?.depositAmount || 0);
      finalPayStatus = depositAmount > 0 ? (inputPayStatus || 'UNPAID') : 'PAID';
    } else { // EXTERNAL_SEWA
      roomRate = originalRoomRate;
      roomSubtotal = roomRate * duration;
      const addonList = Array.isArray(addonAssets) ? addonAssets : [];
      addonSubtotal = addonList.reduce((sum: number, a: any) => {
        return sum + (parseFloat(a.ratePerSession) * parseInt(a.quantity));
      }, 0);
      depositAmount =
        inputDepositAmount !== undefined && inputDepositAmount !== null
          ? parseFloat(inputDepositAmount)
          : (room?.depositAmount || 0);
      finalPayStatus = inputPayStatus || 'UNPAID';
    }

    const totalAmount = roomSubtotal + addonSubtotal;
    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';

    // Concurrency-safe atomic transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Anti-double booking check (jika menggunakan ruangan)
      if (locationId) {
        const conflict = await tx.roomBooking.findFirst({
          where: {
            locationId,
            OR: [
              { bookingStatus: { in: ['CONFIRMED', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED'] } },
              {
                bookingStatus: { in: ['PENDING', 'PENDING_L1', 'PENDING_L2'] },
                paymentExpiredAt: { gt: new Date() },
              },
            ],
            AND: [
              { startTime: { lt: end } },
              { endTime: { gt: start } },
            ],
          },
        });

        if (conflict) {
          throw new Error('CONFLICT_DOUBLE_BOOKING');
        }
      }

      // Find or create renter
      let renter = await tx.renter.findFirst({ where: { phone: renterPhone } });
      if (!renter) {
        renter = await tx.renter.create({
          data: {
            name: renterName,
            phone: renterPhone,
            email: renterEmail || null,
            idCardNo: renterIdCard || null,
          },
        });
      }

      // Generate booking number
      const count = await tx.roomBooking.count();
      const bookingNumber = generateBookingNumber(count + 1);

      // Create booking with addons and consent logs
      return await tx.roomBooking.create({
        data: {
          bookingNumber,
          locationId: locationId || null,
          renterId: renter.id,
          startTime: start,
          endTime: end,
          durationHours,
          roomRate,
          roomSubtotal,
          addonSubtotal,
          totalAmount,
          depositAmount,
          renterCategory,
          bookingStatus: 'PENDING',
          payStatus: finalPayStatus,
          payMethod: payMethod || null,
          paymentScheme: paymentScheme || 'FULL',
          paymentExpiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Deadline +24 jam
          rentalType: rentalType || 'HOURLY',
          supportingDocUrl: supportingDocUrl || null,
          notes: notes || null,
          activityType: activityType || 'PERSONAL',
          bankName: bankName || null,
          bankAccountNumber: bankAccountNumber || null,
          bankAccountHolder: bankAccountHolder || null,
          refundStatus: depositAmount > 0 ? 'PENDING' : 'NONE',
          addonAssets: {
            create: Array.isArray(addonAssets) && addonAssets.length > 0
              ? addonAssets.map((a: any) => ({
                  assetId: a.assetId,
                  assetName: a.assetName || '',
                  quantity: parseInt(a.quantity),
                  ratePerSession: parseFloat(a.ratePerSession),
                  subtotal: parseFloat(a.ratePerSession) * parseInt(a.quantity),
                }))
              : [],
          },
          consentLogs: {
            create: [
              {
                userId,
                consentType: renterCategory === 'EXTERNAL_SEWA' ? 'RENTAL' : 'GENERAL',
                consentTextVersion: consentText || 'Persetujuan syarat & ketentuan penggunaan fasilitas SPASI',
                ipAddress: clientIp,
              },
            ],
          },
        } as any,
        include: {
          location: true,
          renter: true,
          addonAssets: true,
        },
      });
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'CONFLICT_DOUBLE_BOOKING') {
      return NextResponse.json(
        { error: 'Slot waktu ruangan tersebut sudah dipesan atau sedang dalam proses pembayaran oleh pemohon lain' },
        { status: 409 }
      );
    }
    console.error('Error creating room booking:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

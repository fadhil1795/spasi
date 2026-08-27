import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/claims - Mengambil list klaim ganti rugi aset (hilang/rusak berat)
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const my = searchParams.get('my') === 'true';

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || 'BORROWER';

    const whereClause: any = {};
    if (['BORROWER'].includes(userRole) || my) {
      whereClause.userId = userId;
    }

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const claims = await prisma.assetClaim.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true, phone: true, identityNo: true } },
        loan: {
          include: {
            asset: { select: { name: true, code: true, brand: true, currentValue: true, purchaseCost: true } },
          },
        },
        booking: {
          include: {
            location: { select: { name: true } },
            inspections: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(claims);
  } catch (error) {
    console.error('Error fetching asset claims:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/claims - Membuat tiket klaim ganti rugi baru secara manual oleh Admin
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Hanya Admin atau Staff yang berhak membuat tiket klaim' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, loanId, bookingId, type, amount, adminNotes } = body;

    if (!userId || !type || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Data peminjam, tipe kasus, dan nominal ganti rugi wajib diisi' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Buat AssetClaim & Violation dalam Transaction
    const claim = await prisma.$transaction(async (tx) => {
      // Generate claimNumber otomatis (CL-YYYY-XXXX)
      const currentYear = new Date().getFullYear();
      const count = await tx.assetClaim.count({
        where: { createdAt: { gte: new Date(`${currentYear}-01-01`), lte: new Date(`${currentYear}-12-31`) } }
      });
      const claimNumber = `CL-${currentYear}-${String(count + 1).padStart(4, '0')}`;

      // 1. Buat Asset Claim
      const claimRecord = await tx.assetClaim.create({
        data: {
          claimNumber,
          userId,
          loanId: loanId || null,
          bookingId: bookingId || null,
          type,
          amount: parseFloat(amount),
          status: 'NEW', // Default status: Baru
          sourceFunding: 'NEW_BILL',
          adminNotes: adminNotes || null,
        },
      });

      // 2. Buat Catatan Pelanggaran (Violation)
      let claimSourceText = 'secara manual oleh Admin';
      if (loanId) {
        const ln = await tx.loan.findUnique({ where: { id: loanId }, include: { asset: true } });
        if (ln) claimSourceText = `peminjaman aset "${ln.asset.name}" (${ln.asset.code})`;
      } else if (bookingId) {
        const bk = await tx.roomBooking.findUnique({ where: { id: bookingId } });
        if (bk) claimSourceText = `booking ruangan #${bk.bookingNumber}`;
      }

      await tx.violation.create({
        data: {
          userId,
          loanId: loanId || null,
          type: type === 'LOST' ? 'LOST_ASSET' : 'DAMAGED_ASSET',
          description: `Tagihan ganti rugi atas ${type === 'LOST' ? 'kehilangan' : 'kerusakan'} aset pada ${claimSourceText}. No Tiket Klaim: ${claimNumber}. Catatan admin: ${adminNotes || '-'}`
        }
      });

      // 3. Suspend Akun User secara otomatis
      await tx.user.update({
        where: { id: userId },
        data: { isSuspended: true }
      });

      // 4. Kirim notifikasi sistem
      const { sendSystemNotification } = await import('@/lib/notification');
      await sendSystemNotification({
        userId,
        title: `Tagihan Ganti Rugi Baru Diterbitkan 🚨`,
        message: `Tiket klaim ganti rugi baru ${claimNumber} sebesar Rp ${parseFloat(amount).toLocaleString('id-ID')} telah diterbitkan atas nama Anda untuk kasus ${type === 'LOST' ? 'kehilangan' : 'kerusakan'} aset. Akun Anda ditangguhkan sementara sampai tagihan diselesaikan.`,
        type: 'DANGER',
        email: targetUser.email,
        phone: targetUser.phone,
      });

      return claimRecord;
    });

    return NextResponse.json(claim);
  } catch (error: any) {
    console.error('Error creating lost claim:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Kasus klaim untuk transaksi peminjaman/booking ini sudah terdaftar' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

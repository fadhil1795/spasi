import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { calculatePenaltyFee } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/handovers - Mengambil log serah terima (handover)
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const bookingId = searchParams.get('bookingId');
    const type = searchParams.get('type'); // optional filter CHECK_IN / CHECK_OUT

    if (!loanId && !bookingId) {
      return NextResponse.json({ error: 'loanId atau bookingId wajib diisi' }, { status: 400 });
    }

    const where: any = {};
    if (loanId) where.loanId = loanId;
    if (bookingId) where.bookingId = bookingId;
    if (type) where.type = type;

    const handoverLogs = await prisma.handoverLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(handoverLogs);
  } catch (error) {
    console.error('Error fetching handover logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/handovers - Menyimpan / Submit Handover Log (Serah Terima)
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role || 'BORROWER';
    if (userRole === 'BORROWER') {
      return NextResponse.json({ error: 'Proses serah terima hanya bisa dilakukan oleh Staff atau Admin' }, { status: 403 });
    }

    const body = await request.json();
    const { loanId, bookingId, type, inspectorName, status, components, photoUrls } = body;

    if (!inspectorName || !type || !status) {
      return NextResponse.json({ error: 'Inspector, tipe, dan status wajib diisi' }, { status: 400 });
    }

    if (!loanId && !bookingId) {
      return NextResponse.json({ error: 'Transaksi (loanId atau bookingId) wajib diisi' }, { status: 400 });
    }

    const parsedComponents = Array.isArray(components) ? components : JSON.parse(components || '[]');
    const parsedPhotos = Array.isArray(photoUrls) ? photoUrls : JSON.parse(photoUrls || '[]');

    let assetName = 'Aset';
    let assetId = '';
    let borrowerId = '';
    let renterEmail = '';
    let renterPhone = '';

    // Ambil data transaksi pendukung
    if (loanId) {
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { asset: true, user: true },
      });
      if (!loan) return NextResponse.json({ error: 'Data peminjaman tidak ditemukan' }, { status: 404 });
      if (type === 'CHECK_IN' && loan.status !== 'APPROVED') {
        return NextResponse.json(
          { error: `Hanya peminjaman yang sudah disetujui penuh (APPROVED) yang dapat di-Check-In (Status saat ini: ${loan.status})` },
          { status: 400 }
        );
      }
      if (type === 'CHECK_OUT' && !['ACTIVE', 'RETURN_REQUESTED'].includes(loan.status)) {
        return NextResponse.json(
          { error: `Hanya peminjaman yang sedang aktif (ACTIVE / RETURN_REQUESTED) yang dapat di-Check-Out (Status saat ini: ${loan.status})` },
          { status: 400 }
        );
      }
      assetName = loan.asset.name;
      assetId = loan.assetId;
      borrowerId = loan.userId;
      renterEmail = loan.user.email;
      renterPhone = loan.user.phone || '';
    } else if (bookingId) {
      const booking = await prisma.roomBooking.findUnique({
        where: { id: bookingId },
        include: { renter: true, location: true },
      });
      if (!booking) return NextResponse.json({ error: 'Data sewa ruangan tidak ditemukan' }, { status: 404 });
      if (type === 'CHECK_IN' && booking.bookingStatus !== 'CONFIRMED') {
        return NextResponse.json(
          { error: `Hanya booking yang sudah disetujui & dikonfirmasi (CONFIRMED) yang dapat di-Check-In (Status saat ini: ${booking.bookingStatus})` },
          { status: 400 }
        );
      }
      if (type === 'CHECK_OUT' && !['ACTIVE', 'RETURN_REQUESTED'].includes(booking.bookingStatus)) {
        return NextResponse.json(
          { error: `Hanya booking yang sedang aktif (ACTIVE / RETURN_REQUESTED) yang dapat di-Check-Out (Status saat ini: ${booking.bookingStatus})` },
          { status: 400 }
        );
      }
      assetName = booking.location?.name || 'Paket Peralatan Sarpras';
      borrowerId = (session.user as any).id; // fallback, atau ditarik dari renter
      if (booking.renter?.email) {
        const matchingUser = await prisma.user.findFirst({ where: { email: booking.renter.email } });
        if (matchingUser) borrowerId = matchingUser.id;
      }
      renterEmail = booking.renter?.email || '';
      renterPhone = booking.renter?.phone || '';
    }

    // 1. Simpan atau Update Handover Log
    const handover = await prisma.handoverLog.upsert({
      where: loanId ? { loanId } : { bookingId },
      create: {
        loanId: loanId || null,
        bookingId: bookingId || null,
        type,
        inspectorName,
        status,
        components: JSON.stringify(parsedComponents),
        photoUrls: JSON.stringify(parsedPhotos),
      },
      update: {
        type,
        inspectorName,
        status,
        components: JSON.stringify(parsedComponents),
        photoUrls: JSON.stringify(parsedPhotos),
      },
    });

    // 2. Logic Tambahan jika status = SUBMITTED (Selesai Serah Terima)
    if (status === 'SUBMITTED') {
      const isCheckIn = type === 'CHECK_IN'; // Pengambilan awal
      const isCheckOut = type === 'CHECK_OUT'; // Pengembalian akhir

      const now = new Date();

      await prisma.$transaction(async (tx) => {
        if (isCheckIn) {
          // Status peminjaman / sewa berubah menjadi ACTIVE
          if (loanId) {
            const loanRec = await tx.loan.findUnique({
              where: { id: loanId },
              include: { asset: true },
            });
            const loanQty = loanRec?.quantity || 1;
            const currentAvail = loanRec?.asset?.availableQty ?? 1;
            const newAvail = Math.max(0, currentAvail - loanQty);

            await tx.loan.update({
              where: { id: loanId },
              data: { status: 'ACTIVE', checkInTime: now },
            });
            await tx.asset.update({
              where: { id: assetId },
              data: {
                availableQty: newAvail,
                status: newAvail === 0 ? 'BORROWED' : 'AVAILABLE',
              },
            });
          } else if (bookingId) {
            await tx.roomBooking.update({
              where: { id: bookingId },
              data: { bookingStatus: 'ACTIVE' },
            });
          }
        }

        if (isCheckOut) {
          const hasIssue = parsedComponents.some((c: any) => c.isMissing || c.isDamaged);

          if (loanId) {
            const loanRec = await tx.loan.findUnique({
              where: { id: loanId },
              include: { asset: true },
            });
            const setting = await tx.systemSetting.findUnique({ where: { id: 'default' } });
            const penaltyRate = setting?.dailyPenaltyRate || 50000;
            const penaltyFee = loanRec ? calculatePenaltyFee(loanRec.endDate, now, penaltyRate) : 0;

            const loanQty = loanRec?.quantity || 1;
            const totalQty = loanRec?.asset?.quantity || 1;
            const currentAvail = loanRec?.asset?.availableQty ?? 0;

            // Tentukan status fisik aset
            const isMissing = parsedComponents.some((c: any) => c.isMissing);
            const isDamaged = parsedComponents.some((c: any) => c.isDamaged);

            const restoredAvail = isMissing
              ? currentAvail
              : Math.min(totalQty, currentAvail + loanQty);

            // Selesaikan Peminjaman
            await tx.loan.update({
              where: { id: loanId },
              data: {
                status: 'RETURNED',
                checkOutTime: now,
                penaltyFee,
                penaltyStatus: penaltyFee === 0 ? 'PAID' : 'UNPAID',
              },
            });

            await tx.asset.update({
              where: { id: assetId },
              data: {
                availableQty: restoredAvail,
                status: isMissing ? 'DISPOSED' : (isDamaged ? 'MAINTENANCE' : (restoredAvail > 0 ? 'AVAILABLE' : 'BORROWED')),
                condition: isMissing ? 'Hilang (Laporan Kehilangan)' : (isDamaged ? 'Rusak Berat' : 'Baik'),
              },
            });
          } else if (bookingId) {
            await tx.roomBooking.update({
              where: { id: bookingId },
              data: {
                bookingStatus: hasIssue ? 'COMPLETED_WITH_CLAIM' : 'COMPLETED',
                payStatus: hasIssue ? 'CLAIMED' : 'PAID',
              },
            });
          }

          // 3. Trigger Otomatis Pembuatan Tiket Klaim (SOP Langkah 1 & 2)
          if (hasIssue) {
            const isMissing = parsedComponents.some((c: any) => c.isMissing);
            const claimType = isMissing ? 'LOST' : 'DAMAGED';
            
            // Dapatkan nominal harga aset untuk denda
            let claimAmount = 1500000; // fallback
            if (loanId) {
              const loanData = await tx.loan.findUnique({
                where: { id: loanId },
                include: { asset: true }
              });
              if (loanData?.asset) {
                claimAmount = loanData.asset.currentValue || loanData.asset.purchaseCost || 1500000;
              }
            }

            // Generate claimNumber otomatis (CL-YYYY-XXXX)
            const currentYear = new Date().getFullYear();
            const count = await tx.assetClaim.count({
              where: { createdAt: { gte: new Date(`${currentYear}-01-01`), lte: new Date(`${currentYear}-12-31`) } }
            });
            const claimNumber = `CL-${currentYear}-${String(count + 1).padStart(4, '0')}`;

            const detailNotes = parsedComponents
              .filter((c: any) => c.isMissing || c.isDamaged)
              .map((c: any) => `- Komponen "${c.name}" ${c.isMissing ? 'HILANG' : 'RUSAK'} (Catatan: ${c.notes || '-'})`)
              .join('\n');

            await tx.assetClaim.create({
              data: {
                claimNumber,
                loanId: loanId || null,
                bookingId: bookingId || null,
                userId: borrowerId,
                type: claimType,
                amount: claimAmount,
                status: 'NEW', // Siklus hidup: Baru
                sourceFunding: 'NEW_BILL',
                adminNotes: `Kerusakan komponen dilaporkan oleh petugas:\n${detailNotes}`,
              },
            });

            // Catat Violation
            await tx.violation.create({
              data: {
                userId: borrowerId,
                loanId: loanId || null,
                type: claimType === 'LOST' ? 'LOST_ASSET' : 'DAMAGED_ASSET',
                description: `Tagihan ganti rugi kerusakan/kehilangan komponen aset "${assetName}". No Tiket Klaim: ${claimNumber}. Estimasi denda: Rp ${claimAmount.toLocaleString('id-ID')}`
              }
            });

            // Suspend User
            await tx.user.update({
              where: { id: borrowerId },
              data: { isSuspended: true },
            });

            // Kirim Notifikasi
            const { sendSystemNotification } = await import('@/lib/notification');
            await sendSystemNotification({
              userId: borrowerId,
              title: `Peringatan Kasus Ganti Rugi Aset — ${claimNumber} 🚨`,
              message: `Akun Anda ditangguhkan sementara karena ditemukan kerusakan/kehilangan komponen aset "${assetName}" pada saat pengembalian. Segera lakukan penyelesaian ganti rugi sebesar Rp ${claimAmount.toLocaleString('id-ID')} di menu "Ganti Rugi & Klaim".`,
              type: 'DANGER',
              email: renterEmail || undefined,
              phone: renterPhone || undefined,
            });
          }
        }

        // Catat Audit Log
        await createAuditLog({
          userId: (session.user as any).id,
          action: 'SUBMIT_HANDOVER',
          entity: 'HandoverLog',
          entityId: handover.id,
          details: `Menyelesaikan serah terima (${type}) untuk transaksi ${loanId ? 'peminjaman' : 'ruangan'}. Status: ${status}. Petugas: ${inspectorName}`,
        });
      });
    }

    return NextResponse.json({ success: true, handoverId: handover.id });
  } catch (error: any) {
    console.error('Error submitting handover log:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

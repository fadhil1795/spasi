import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { calculatePenaltyFee } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface BatchHandoverItem {
  loanId: string;
  components: Array<{
    name: string;
    condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'HILANG';
    isMissing: boolean;
    isDamaged: boolean;
    notes?: string;
  }>;
  photoUrls?: string[];
}

// POST /api/handovers/batch - Serah terima massal (Ambil / Kembali sekaligus)
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role || 'BORROWER';
    if (userRole === 'BORROWER') {
      return NextResponse.json(
        { error: 'Proses serah terima hanya bisa dilakukan oleh Staff atau Admin' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { items, type, inspectorName } = body as {
      items?: BatchHandoverItem[];
      type?: 'CHECK_IN' | 'CHECK_OUT';
      inspectorName?: string;
    };

    if (!inspectorName || !String(inspectorName).trim()) {
      return NextResponse.json({ error: 'Nama petugas pemeriksa wajib diisi' }, { status: 400 });
    }
    if (!type || !['CHECK_IN', 'CHECK_OUT'].includes(type)) {
      return NextResponse.json({ error: 'Tipe serah terima tidak valid' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Pilih minimal 1 aset untuk diproses' }, { status: 400 });
    }

    const now = new Date();
    const isCheckIn = type === 'CHECK_IN';
    const isCheckOut = type === 'CHECK_OUT';

    const processedResults: Array<{ loanId: string; ticketNumber: string; assetName: string }> = [];
    const issueClaimsToNotify: Array<{
      userId: string;
      claimNumber: string;
      assetName: string;
      claimAmount: number;
      email?: string;
      phone?: string;
    }> = [];

    await prisma.$transaction(async (tx) => {
      const setting = isCheckOut
        ? await tx.systemSetting.findUnique({ where: { id: 'default' } })
        : null;
      const penaltyRate = setting?.dailyPenaltyRate || 50000;

      const currentYear = now.getFullYear();
      let claimCount = isCheckOut
        ? await tx.assetClaim.count({
            where: {
              createdAt: {
                gte: new Date(`${currentYear}-01-01`),
                lte: new Date(`${currentYear}-12-31`),
              },
            },
          })
        : 0;

      for (const item of items) {
        const loan = await tx.loan.findUnique({
          where: { id: item.loanId },
          include: { asset: true, user: true },
        });
        if (!loan) {
          throw new Error(`Data peminjaman (${item.loanId}) tidak ditemukan`);
        }
        if (isCheckIn && loan.status !== 'APPROVED') {
          throw new Error(`Tiket #${loan.ticketNumber} belum disetujui penuh (Status: ${loan.status}). Hanya peminjaman berstatus APPROVED yang dapat di-Check-In.`);
        }
        if (isCheckOut && !['ACTIVE', 'RETURN_REQUESTED'].includes(loan.status)) {
          throw new Error(`Tiket #${loan.ticketNumber} belum berstatus dipinjam/ACTIVE (Status: ${loan.status}).`);
        }

        const comps = Array.isArray(item.components) ? item.components : [];
        const photos = Array.isArray(item.photoUrls) ? item.photoUrls : [];

        await tx.handoverLog.upsert({
          where: { loanId: loan.id },
          create: {
            loanId: loan.id,
            type,
            inspectorName: String(inspectorName).trim(),
            status: 'SUBMITTED',
            components: JSON.stringify(comps),
            photoUrls: JSON.stringify(photos),
          },
          update: {
            type,
            inspectorName: String(inspectorName).trim(),
            status: 'SUBMITTED',
            components: JSON.stringify(comps),
            photoUrls: JSON.stringify(photos),
          },
        });

        const loanQty = loan.quantity || 1;
        const totalQty = loan.asset.quantity || 1;
        const currentAvail = loan.asset.availableQty ?? 0;

        if (isCheckIn) {
          const newAvail = Math.max(0, currentAvail - loanQty);
          await tx.loan.update({
            where: { id: loan.id },
            data: { status: 'ACTIVE', checkInTime: now },
          });
          await tx.asset.update({
            where: { id: loan.assetId },
            data: {
              availableQty: newAvail,
              status: newAvail === 0 ? 'BORROWED' : 'AVAILABLE',
            },
          });
        } else if (isCheckOut) {
          const penaltyFee = calculatePenaltyFee(loan.endDate, now, penaltyRate);
          const isMissing = comps.some((c) => c.isMissing);
          const isDamaged = comps.some((c) => c.isDamaged);
          const hasIssue = isMissing || isDamaged;

          const restoredAvail = isMissing
            ? currentAvail
            : Math.min(totalQty, currentAvail + loanQty);

          await tx.loan.update({
            where: { id: loan.id },
            data: {
              status: 'RETURNED',
              checkOutTime: now,
              penaltyFee,
              penaltyStatus: penaltyFee === 0 ? 'PAID' : 'UNPAID',
            },
          });

          await tx.asset.update({
            where: { id: loan.assetId },
            data: {
              availableQty: restoredAvail,
              status: isMissing
                ? 'DISPOSED'
                : isDamaged
                ? 'MAINTENANCE'
                : restoredAvail > 0
                ? 'AVAILABLE'
                : 'BORROWED',
              condition: isMissing
                ? 'Hilang (Laporan Kehilangan)'
                : isDamaged
                ? 'Rusak Berat'
                : 'Baik',
            },
          });

          if (hasIssue) {
            const claimType = isMissing ? 'LOST' : 'DAMAGED';
            const claimAmount = loan.asset.currentValue || loan.asset.purchaseCost || 1500000;
            claimCount++;
            const claimNumber = `CL-${currentYear}-${String(claimCount).padStart(4, '0')}`;

            const detailNotes = comps
              .filter((c) => c.isMissing || c.isDamaged)
              .map(
                (c) =>
                  `- Komponen "${c.name}" ${c.isMissing ? 'HILANG' : 'RUSAK'} (Catatan: ${c.notes || '-'})`
              )
              .join('\n');

            await tx.assetClaim.create({
              data: {
                claimNumber,
                loanId: loan.id,
                userId: loan.userId,
                type: claimType,
                amount: claimAmount,
                status: 'NEW',
                sourceFunding: 'NEW_BILL',
                adminNotes: `Kerusakan komponen dilaporkan oleh petugas saat serah terima massal:\n${detailNotes}`,
              },
            });

            await tx.violation.create({
              data: {
                userId: loan.userId,
                loanId: loan.id,
                type: claimType === 'LOST' ? 'LOST_ASSET' : 'DAMAGED_ASSET',
                description: `Tagihan ganti rugi kerusakan/kehilangan komponen aset "${loan.asset.name}". No Tiket Klaim: ${claimNumber}. Estimasi denda: Rp ${claimAmount.toLocaleString('id-ID')}`,
              },
            });

            await tx.user.update({
              where: { id: loan.userId },
              data: { isSuspended: true },
            });

            issueClaimsToNotify.push({
              userId: loan.userId,
              claimNumber,
              assetName: loan.asset.name,
              claimAmount,
              email: loan.user.email || undefined,
              phone: loan.user.phone || undefined,
            });
          }
        }

        processedResults.push({
          loanId: loan.id,
          ticketNumber: loan.ticketNumber,
          assetName: loan.asset.name,
        });
      }
    });

    await createAuditLog({
      userId: (session.user as any).id,
      action: 'SUBMIT_BATCH_HANDOVER',
      entity: 'HandoverLog',
      entityId: processedResults.map((r) => r.loanId).join(','),
      details: `Serah terima massal (${type}) untuk ${processedResults.length} aset (${processedResults.map((r) => r.ticketNumber).join(', ')}). Petugas: ${inspectorName}`,
    });

    if (issueClaimsToNotify.length > 0) {
      const { sendSystemNotification } = await import('@/lib/notification');
      for (const claim of issueClaimsToNotify) {
        await sendSystemNotification({
          userId: claim.userId,
          title: `Peringatan Kasus Ganti Rugi Aset — ${claim.claimNumber} 🚨`,
          message: `Akun Anda ditangguhkan sementara karena ditemukan kerusakan/kehilangan aset "${claim.assetName}" saat pengembalian. Segera selesaikan ganti rugi sebesar Rp ${claim.claimAmount.toLocaleString('id-ID')} di menu "Ganti Rugi & Klaim".`,
          type: 'DANGER',
          email: claim.email,
          phone: claim.phone,
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: processedResults.length,
      processed: processedResults,
    });
  } catch (error: any) {
    console.error('Error in batch handover:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}


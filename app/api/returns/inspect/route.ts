import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { calculatePenaltyFee } from '@/lib/utils';
import { sendEmailVoucher } from '@/lib/mailer';
import { sendWaVoucher } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

// GET /api/returns/inspect?loanId=xxx - Fetch loan info, asset, & relevant checklist template
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const ticketNumber = searchParams.get('ticketNumber');

    if (!loanId && !ticketNumber) {
      return NextResponse.json({ error: 'loanId atau ticketNumber wajib diisi' }, { status: 400 });
    }

    const loan = await prisma.loan.findFirst({
      where: loanId ? { id: loanId } : { ticketNumber: ticketNumber! },
      include: {
        asset: {
          include: {
            category: true,
            location: true,
            department: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            identityNo: true,
            department: { select: { name: true, code: true } },
          },
        },
        returnInspection: {
          include: {
            itemResults: true,
            inspector: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Data peminjaman tidak ditemukan' }, { status: 404 });
    }

    // Find checklist template matching category or default template
    let template = await prisma.checklistTemplate.findFirst({
      where: { categoryId: loan.asset.categoryId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!template) {
      template = await prisma.checklistTemplate.findFirst({
        where: { isDefault: true },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
    }

    // Fallback default checklist items if no template exists in DB
    const fallbackItems = [
      { id: 'item-1', name: 'Kondisi Body / Fisik Utama', description: 'Cek fisik luar, lecet, retak', isRequired: true, sortOrder: 0 },
      { id: 'item-2', name: 'Fungsi Utama & Daya Nyala', description: 'Cek perangkat menyala & berfungsi normal', isRequired: true, sortOrder: 1 },
      { id: 'item-3', name: 'Kelengkapan Aksesori / Cable / Adapter', description: 'Cek kelengkapan charger/kabel/tas', isRequired: true, sortOrder: 2 },
      { id: 'item-4', name: 'Kebersihan & Kerapihan', description: 'Cek kebersihan saat dikembalikan', isRequired: false, sortOrder: 3 },
    ];

    const checklistItems = template ? template.items : fallbackItems;

    return NextResponse.json({
      loan,
      asset: loan.asset,
      borrower: loan.user,
      templateTitle: template?.title || `Checklist Standard Kategori ${loan.asset.category.name}`,
      checklistItems,
      existingInspection: loan.returnInspection,
    });
  } catch (error) {
    console.error('Error fetching return inspection info:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/returns/inspect - Petugas melakukan inspeksi & konfirmasi pengembalian
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const staffId = (session.user as any).id;
    const staffRole = (session.user as any).role;

    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(staffRole)) {
      return NextResponse.json({ error: 'Hanya Petugas atau Admin yang berhak melakukan inspeksi' }, { status: 403 });
    }

    const body = await request.json();
    const { loanId, itemResults, overallNotes, generalPhotoUrls } = body;

    if (!loanId || !Array.isArray(itemResults) || itemResults.length === 0) {
      return NextResponse.json({ error: 'Data inspeksi tidak lengkap' }, { status: 400 });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { asset: true, user: true },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Data peminjaman tidak ditemukan' }, { status: 404 });
    }

    if (!['ACTIVE', 'RETURN_REQUESTED', 'UNDER_INSPECTION'].includes(loan.status)) {
      return NextResponse.json(
        { error: `Peminjaman berstatus "${loan.status}" tidak dapat diinspeksi ulang.` },
        { status: 400 }
      );
    }

    // 1. Calculate Aggregate Item Summary
    let totalBaik = 0;
    let totalRusakRingan = 0;
    let totalRusakBerat = 0;
    let totalHilang = 0;
    let totalTidakDiperiksa = 0;

    itemResults.forEach((res: any) => {
      const cond = res.condition?.toUpperCase();
      if (cond === 'BAIK') totalBaik++;
      else if (cond === 'RUSAK_RINGAN') totalRusakRingan++;
      else if (cond === 'RUSAK_BERAT') totalRusakBerat++;
      else if (cond === 'HILANG') totalHilang++;
      else totalTidakDiperiksa++;
    });

    // 2. Determine Asset & Loan Status
    let resultingAssetStatus = 'AVAILABLE';
    let resultingLoanStatus = 'RETURNED';
    let assetConditionSummary = 'Baik';

    if (totalHilang > 0) {
      resultingAssetStatus = 'DISPOSED';
      resultingLoanStatus = 'LOST_REPORTED';
      assetConditionSummary = 'Hilang (Laporan Kehilangan)';
    } else if (totalRusakBerat > 0) {
      resultingAssetStatus = 'DAMAGED';
      resultingLoanStatus = 'NEEDS_REPAIR';
      assetConditionSummary = 'Rusak Berat';
    } else if (totalRusakRingan > 0) {
      resultingAssetStatus = 'MAINTENANCE';
      resultingLoanStatus = 'NEEDS_REPAIR';
      assetConditionSummary = 'Rusak Ringan';
    }

    // 3. Compute Penalty Fee for Late Return
    const now = new Date();
    const setting = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
    const penaltyRate = setting?.dailyPenaltyRate || 50000;
    const penaltyFee = calculatePenaltyFee(loan.endDate, now, penaltyRate);

    // 4. Save Inspection in Database
    const inspection = await prisma.returnInspection.upsert({
      where: { loanId },
      update: {
        inspectorId: staffId,
        status: resultingLoanStatus === 'RETURNED' ? 'COMPLETED' : resultingLoanStatus,
        totalBaik,
        totalRusakRingan,
        totalRusakBerat,
        totalHilang,
        totalTidakDiperiksa,
        resultingAssetStatus,
        overallNotes: overallNotes || null,
        generalPhotoUrls: Array.isArray(generalPhotoUrls) ? JSON.stringify(generalPhotoUrls) : (generalPhotoUrls || null),
        inspectedAt: now,
      },
      create: {
        loanId,
        inspectorId: staffId,
        status: resultingLoanStatus === 'RETURNED' ? 'COMPLETED' : resultingLoanStatus,
        totalBaik,
        totalRusakRingan,
        totalRusakBerat,
        totalHilang,
        totalTidakDiperiksa,
        resultingAssetStatus,
        overallNotes: overallNotes || null,
        generalPhotoUrls: Array.isArray(generalPhotoUrls) ? JSON.stringify(generalPhotoUrls) : (generalPhotoUrls || null),
        inspectedAt: now,
      },
    });

    // Replace Item Results
    await prisma.returnInspectionItemResult.deleteMany({
      where: { inspectionId: inspection.id },
    });

    await prisma.returnInspectionItemResult.createMany({
      data: itemResults.map((res: any) => ({
        inspectionId: inspection.id,
        itemName: res.itemName,
        condition: res.condition,
        problemDescription: res.problemDescription || null,
        severityLevel: res.severityLevel || null,
        actionRequired: res.actionRequired || null,
        photoUrls: Array.isArray(res.photoUrls) ? JSON.stringify(res.photoUrls) : (res.photoUrls || null),
        notes: res.notes || null,
      })),
    });

    // 5. Update Loan Record
    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: {
        status: resultingLoanStatus,
        checkOutTime: now,
        condition: assetConditionSummary,
        penaltyFee,
        penaltyStatus: penaltyFee > 0 ? 'UNPAID' : 'PAID',
        notes: overallNotes ? `[Pemeriksaan Pengembalian]: ${overallNotes}\n${loan.notes || ''}` : loan.notes,
      },
    });

    // Auto Blacklist & Penalty Check for Late Return
    if (penaltyFee > 0) {
      // Record this late return violation
      await prisma.violation.create({
        data: {
          userId: loan.userId,
          loanId: loan.id,
          type: 'LATE_RETURN',
          description: `Keterlambatan pengembalian aset "${loan.asset.name}" (${loan.asset.code}). Denda terhitung: Rp ${penaltyFee.toLocaleString('id-ID')}`
        }
      });

      // Count total late return violations for this user
      const totalLates = await prisma.violation.count({
        where: { userId: loan.userId, type: 'LATE_RETURN' }
      });

      if (totalLates >= 3) {
        // Suspend user account automatically
        await prisma.user.update({
          where: { id: loan.userId },
          data: { isSuspended: true }
        });

        // Record suspension log
        await prisma.violation.create({
          data: {
            userId: loan.userId,
            type: 'SUSPENSION',
            description: `Akun ditangguhkan otomatis oleh sistem karena telah melakukan keterlambatan pengembalian sebanyak ${totalLates} kali.`
          }
        });

        // Trigger suspension alert notification
        const { sendSystemNotification } = await import('@/lib/notification');
        await sendSystemNotification({
          userId: loan.userId,
          title: 'Akun Anda Ditangguhkan Sementara 🚨',
          message: `Mohon maaf, akun Anda ditangguhkan otomatis oleh sistem karena terdeteksi terlambat mengembalikan barang sebanyak 3 kali. Hubungi unit sarpras/admin untuk membuka penangguhan akun Anda.`,
          type: 'DANGER',
          email: loan.user.email,
          phone: loan.user.phone,
        });
      }
    }

    // Auto Ganti Rugi / Claim Check for Lost & Damaged Assets
    if (totalHilang > 0 || totalRusakBerat > 0) {
      const claimType = totalHilang > 0 ? 'LOST' : 'DAMAGED';
      const claimAmount = loan.asset.currentValue || loan.asset.purchaseCost || 1500000;

      const existingClaim = await prisma.assetClaim.findUnique({
        where: { loanId: loan.id },
      });

      if (!existingClaim) {
        const currentYear = new Date().getFullYear();
        const count = await prisma.assetClaim.count({
          where: { createdAt: { gte: new Date(`${currentYear}-01-01`), lte: new Date(`${currentYear}-12-31`) } }
        });
        const claimNumber = `CL-${currentYear}-${String(count + 1).padStart(4, '0')}`;

        await prisma.assetClaim.create({
          data: {
            claimNumber,
            loanId: loan.id,
            userId: loan.userId,
            type: claimType,
            amount: claimAmount,
            status: 'NEW',
            sourceFunding: 'NEW_BILL',
          },
        });
      } else {
        await prisma.assetClaim.update({
          where: { loanId: loan.id },
          data: {
            type: claimType,
            amount: claimAmount,
          },
        });
      }

      // Record this damage/loss violation
      await prisma.violation.create({
        data: {
          userId: loan.userId,
          loanId: loan.id,
          type: claimType === 'LOST' ? 'LOST_ASSET' : 'DAMAGED_ASSET',
          description: `${claimType === 'LOST' ? 'Kehilangan' : 'Kerusakan berat'} aset "${loan.asset.name}" (${loan.asset.code}). Tagihan ganti rugi dibebankan: Rp ${claimAmount.toLocaleString('id-ID')}`
        }
      });

      // Suspend user account automatically due to loss/damage
      await prisma.user.update({
        where: { id: loan.userId },
        data: { isSuspended: true }
      });

      // Trigger lost claim alert notification
      const { sendSystemNotification } = await import('@/lib/notification');
      await sendSystemNotification({
        userId: loan.userId,
        title: `Tagihan Ganti Rugi Aset ${claimType === 'LOST' ? 'Hilang' : 'Rusak'} 🚨`,
        message: `Akun Anda ditangguhkan karena terdapat kasus ${claimType === 'LOST' ? 'kehilangan' : 'kerusakan berat'} aset "${loan.asset.name}" (${loan.asset.code}). Segera selesaikan tagihan ganti rugi sebesar Rp ${claimAmount.toLocaleString('id-ID')} melalui menu "Ganti Rugi & Klaim" di dashboard.`,
        type: 'DANGER',
        email: loan.user.email,
        phone: loan.user.phone,
      });
    }

    // 6. Update Asset Record Status, availableQty & Condition
    const loanQty = loan.quantity || 1;
    const isLostAsset = resultingAssetStatus === 'LOST' || totalHilang > 0;
    const restoredAvailQty = isLostAsset
      ? loan.asset.availableQty
      : Math.min(loan.asset.quantity, loan.asset.availableQty + loanQty);

    await prisma.asset.update({
      where: { id: loan.assetId },
      data: {
        availableQty: restoredAvailQty,
        status: resultingAssetStatus === 'AVAILABLE' && restoredAvailQty === 0 ? 'BORROWED' : resultingAssetStatus,
        condition: assetConditionSummary,
      },
    });

    // 7. Log CheckInLog for Checkout Audit
    await prisma.checkInLog.create({
      data: {
        loanId,
        type: 'CHECK_OUT',
        scannedBy: staffId,
        condition: assetConditionSummary,
        notes: overallNotes || `Pengembalian dikonfirmasi. Kondisi: ${assetConditionSummary}.`,
      },
    });

    // 8. Record AuditLog
    await createAuditLog({
      userId: staffId,
      action: 'PROCESS_RETURN_INSPECTION',
      entity: 'ReturnInspection',
      entityId: inspection.id,
      details: `Petugas melakukan inspeksi pengembalian aset "${loan.asset.name}" (${loan.ticketNumber}). Hasil: ${totalBaik} Baik, ${totalRusakRingan} Rusak Ringan, ${totalRusakBerat} Rusak Berat, ${totalHilang} Hilang. Status Aset: ${resultingAssetStatus}.`,
      oldData: { loanStatus: loan.status, assetStatus: loan.asset.status },
      newData: { loanStatus: resultingLoanStatus, assetStatus: resultingAssetStatus, inspection },
    });

    // 9. Send Email & WA Notification asynchronously
    const returnSummaryText = `Pengembalian Selesai! Kondisi Aset: ${assetConditionSummary}. Item Baik: ${totalBaik}, Bermasalah: ${totalRusakRingan + totalRusakBerat + totalHilang}.`;
    
    Promise.allSettled([
      sendEmailVoucher({
        to: loan.user.email,
        bookingNumber: loan.ticketNumber,
        renterName: loan.user.name,
        assetNames: loan.asset.name,
        totalAmount: penaltyFee,
        startDate: loan.startDate.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      }),
      sendWaVoucher({
        to: loan.user.phone || '',
        bookingNumber: loan.ticketNumber,
        renterName: loan.user.name,
        assetNames: `${loan.asset.name} (${returnSummaryText})`,
        totalAmount: penaltyFee,
        startDate: loan.startDate.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      }),
    ]).catch(console.error);

    return NextResponse.json({
      success: true,
      message: `Inspeksi pengembalian berhasil diproses! Status Aset: ${resultingAssetStatus}, Status Transaksi: ${resultingLoanStatus}.`,
      inspection,
      loan: updatedLoan,
    });
  } catch (error) {
    console.error('Error processing return inspection:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

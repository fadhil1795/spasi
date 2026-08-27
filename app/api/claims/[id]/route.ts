import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

// PATCH /api/claims/[id] - Update klaim ganti rugi (oleh user untuk upload bukti, atau oleh admin untuk review)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { compensationMethod, proofUrl, status, adminNotes, amount, sourceFunding, diajukanAsuransi, statusAsuransi } = body;

    const userRole = (session.user as any).role || 'BORROWER';
    const userId = (session.user as any).id;

    // Dapatkan data klaim saat ini
    const claim = await prisma.assetClaim.findUnique({
      where: { id },
      include: {
        user: true,
        loan: {
          include: { asset: true }
        },
        booking: {
          include: {
            inspections: true,
            location: true
          }
        }
      }
    });

    if (!claim) {
      return NextResponse.json({ error: 'Data klaim ganti rugi tidak ditemukan' }, { status: 404 });
    }

    // ── CASE 1: PROSES UPDATE OLEH USER (BORROWER) ──
    if (userRole === 'BORROWER') {
      // Pastikan hanya pemilik klaim yang bisa mengubah
      if (claim.userId !== userId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }

      if (!compensationMethod || !proofUrl) {
        return NextResponse.json({ error: 'Metode ganti rugi dan bukti pembayaran wajib diisi' }, { status: 400 });
      }

      const updatedClaim = await prisma.assetClaim.update({
        where: { id },
        data: {
          compensationMethod,
          proofUrl,
          status: 'PENDING_APPROVAL', // Menunggu validasi admin
        },
      });

      // Kirim notifikasi ke admin/staff
      const { sendSystemNotification } = await import('@/lib/notification');
      const admins = await prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } }
      });
      for (const adm of admins) {
        await sendSystemNotification({
          userId: adm.id,
          title: 'Pengajuan Ganti Rugi Aset Masuk 📥',
          message: `User ${claim.user.name} mengajukan bukti ganti rugi untuk tiket ${claim.claimNumber}. Segera lakukan peninjauan bukti di panel ganti rugi.`,
          type: 'INFO',
          email: adm.email,
        });
      }

      return NextResponse.json(updatedClaim);
    }

    // ── CASE 2: PROSES REVIEW OLEH PETUGAS/ADMIN (STAFF/ADMIN) ──
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (sourceFunding) updateData.sourceFunding = sourceFunding;
    if (diajukanAsuransi !== undefined) updateData.diajukanAsuransi = diajukanAsuransi;
    if (statusAsuransi !== undefined) updateData.statusAsuransi = statusAsuransi;

    // Handle Resolved Date
    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    const updatedClaim = await prisma.assetClaim.update({
      where: { id },
      data: updateData,
    });

    // Aksi Tambahan berdasarkan perubahan status
    if (status === 'INVESTIGATING') {
      // Catat audit log
      await createAuditLog({
        userId,
        action: 'INVESTIGATE_CLAIM',
        entity: 'AssetClaim',
        entityId: id,
        details: `Menandai klaim ${claim.claimNumber} dalam status Investigasi. Catatan: ${adminNotes || '-'}`,
      });
    }

    if (status === 'AWAITING_PAYMENT') {
      // Kirim Notifikasi Tagihan Baru ke Peminjam
      const { sendSystemNotification } = await import('@/lib/notification');
      let sourceText = sourceFunding === 'DEDUCT_DEPOSIT' ? 'Potong Uang Jaminan (Deposit)' : 'Transfer Mandiri (Tagihan Baru)';

      await sendSystemNotification({
        userId: claim.userId,
        title: `Tagihan Ganti Rugi Ditetapkan — ${claim.claimNumber} 💰`,
        message: `Nilai ganti rugi untuk tiket ${claim.claimNumber} telah ditetapkan sebesar Rp ${updatedClaim.amount.toLocaleString('id-ID')} dengan metode pendanaan: ${sourceText}. Silakan selesaikan pembayaran di menu "Ganti Rugi & Klaim".`,
        type: 'WARNING',
        email: claim.user.email,
        phone: claim.user.phone,
      });

      // Catat audit log
      await createAuditLog({
        userId,
        action: 'BILL_CLAIM',
        entity: 'AssetClaim',
        entityId: id,
        details: `Menetapkan nilai ganti rugi klaim ${claim.claimNumber} sebesar Rp ${updatedClaim.amount.toLocaleString('id-ID')} dengan metode ${sourceFunding}.`,
      });
    }

    if (status === 'RESOLVED') {
      let assetName = 'Aset Sewa/Pinjam';
      let assetId = '';

      // 1. Selesaikan status peminjaman
      if (claim.loanId && claim.loan) {
        await prisma.loan.update({
          where: { id: claim.loanId },
          data: { status: 'RETURNED' },
        });
        assetId = claim.loan.assetId;
        assetName = claim.loan.asset.name;
      } else if (claim.bookingId && claim.booking) {
        await prisma.roomBooking.update({
          where: { id: claim.bookingId },
          data: { bookingStatus: 'COMPLETED', payStatus: 'PAID' },
        });
        // Ambil assetId yang rusak dari checklist check-out ruangan
        const damagedInspection = claim.booking.inspections.find(ins => ins.type === 'CHECK_OUT' && (ins.isDamaged || ins.isMissing));
        if (damagedInspection) {
          assetId = damagedInspection.assetId;
          assetName = damagedInspection.assetName;
        }
      }

      // 2. Tentukan status aset berdasarkan metode kompensasi:
      //    Jika REPLACEMENT_UNIT: Status kembali ke AVAILABLE (Kondisi: Baik)
      //    Jika CASH_TRANSFER:
      //      Jika Hilang -> Aset tetap DISPOSED.
      //      Jika Rusak -> Kirim ke modul Maintenance perbaikan (SOP Langkah 4) & set status MAINTENANCE.
      if (assetId) {
        if (claim.compensationMethod === 'REPLACEMENT_UNIT') {
          await prisma.asset.update({
            where: { id: assetId },
            data: { status: 'AVAILABLE', condition: 'Baik' },
          });
        } else if (claim.type === 'DAMAGED') {
          // SOP Langkah 4: Jika aset rusak, teruskan otomatis ke modul Maintenance
          await prisma.maintenance.create({
            data: {
              assetId,
              type: 'CORRECTIVE',
              description: `Pemeliharaan korektif pasca kerusakan sewa/pinjam oleh user "${claim.user.name}". Didanai lunas dari biaya klaim denda ganti rugi ${claim.claimNumber}.`,
              cost: updatedClaim.amount,
              startDate: new Date(),
              status: 'ONGOING',
              claimId: claim.id,
              notes: `Diteruskan otomatis dari modul Klaim Ganti Rugi. Catatan review: ${adminNotes || ''}`,
            }
          });

          // Ubah status aset menjadi MAINTENANCE
          await prisma.asset.update({
            where: { id: assetId },
            data: { status: 'MAINTENANCE', condition: 'Rusak Ringan' },
          });
        }
      }

      // 3. Check apakah user masih mempunyai tagihan pending/hilang/kerusakan lain.
      //    Jika semua klaimnya sudah diselesaikan (RESOLVED) dan tidak ada denda penalty pending:
      //    Maka buka blokir/suspend user secara otomatis!
      const activePendingClaims = await prisma.assetClaim.count({
        where: { userId: claim.userId, status: { in: ['NEW', 'INVESTIGATING', 'AWAITING_PAYMENT', 'PENDING_APPROVAL'] } }
      });

      if (activePendingClaims === 0) {
        await prisma.user.update({
          where: { id: claim.userId },
          data: { isSuspended: false }
        });
      }

      // 4. Buat Log Audit
      await createAuditLog({
        userId,
        action: 'RESOLVE_LOST_CLAIM',
        entity: 'AssetClaim',
        entityId: id,
        details: `Menyetujui penyelesaian ganti rugi atas kehilangan/kerusakan aset "${assetName}". No Klaim: ${claim.claimNumber}. Metode: ${claim.compensationMethod}. Catatan: ${adminNotes || '-'}`,
      });

      // 5. Kirim Notifikasi Sukses ke Peminjam
      const { sendSystemNotification } = await import('@/lib/notification');
      await sendSystemNotification({
        userId: claim.userId,
        title: `Ganti Rugi Aset Disetujui! ✅ — ${claim.claimNumber}`,
        message: `Bukti ganti rugi untuk tiket ${claim.claimNumber} (${assetName}) telah divalidasi dan disetujui oleh admin. Akun Anda telah diaktifkan kembali. Terima kasih atas kerja samanya.`,
        type: 'SUCCESS',
        email: claim.user.email,
        phone: claim.user.phone,
      });
    }

    if (status === 'REJECTED') {
      let assetName = 'Aset Sewa/Pinjam';
      if (claim.loanId && claim.loan) {
        assetName = claim.loan.asset.name;
      } else if (claim.bookingId && claim.booking) {
        const damagedInspection = claim.booking.inspections.find(ins => ins.type === 'CHECK_OUT' && (ins.isDamaged || ins.isMissing));
        if (damagedInspection) assetName = damagedInspection.assetName;
      }

      // Kirim Notifikasi Penolakan ke Peminjam
      const { sendSystemNotification } = await import('@/lib/notification');
      await sendSystemNotification({
        userId: claim.userId,
        title: `Bukti Ganti Rugi Ditolak ❌ — ${claim.claimNumber}`,
        message: `Bukti ganti rugi Anda untuk tiket ${claim.claimNumber} (${assetName}) ditolak oleh admin. Alasan: ${adminNotes || 'Bukti kurang jelas / tidak valid'}. Silakan ajukan ulang bukti pembayaran Anda.`,
        type: 'DANGER',
        email: claim.user.email,
        phone: claim.user.phone,
      });

      // Buat Log Audit
      await createAuditLog({
        userId,
        action: 'REJECT_LOST_CLAIM',
        entity: 'AssetClaim',
        entityId: id,
        details: `Menolak bukti ganti rugi untuk klaim ${claim.claimNumber} (${assetName}). Alasan: ${adminNotes || '-'}`,
      });
    }

    return NextResponse.json(updatedClaim);
  } catch (error) {
    console.error('Error updating asset claim:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

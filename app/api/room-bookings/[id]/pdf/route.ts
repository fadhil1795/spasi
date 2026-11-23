import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatDate, formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'RECEIPT'; // RECEIPT | BAST

    const [booking, tpl] = await Promise.all([
      prisma.roomBooking.findUnique({
        where: { id: params.id },
        include: {
          location: true,
          renter: true,
          addonAssets: true,
          inspections: true,
          handoverLog: true,
        },
      }),
      prisma.documentTemplate.findUnique({ where: { id: 'default' } }),
    ]);

    if (!booking) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 });
    }

    const institution = tpl?.institutionName || 'SPASI — Sistem Pencatatan Aset & Sewa Instansi';
    const institutionSub = tpl?.institutionSubtitle || 'Layanan Pengelolaan Ruangan, Fasilitas & Inventaris Resmi';
    const logoUrl = tpl?.institutionLogoUrl || '';
    const signerName = tpl?.signerName || 'Petugas Pengelola Aset';
    const signerTitle = tpl?.signerTitle || 'Petugas SPASI';
    const signerNip = tpl?.signerNip || '';
    const footerNote = tpl?.receiptFooterNote || 'Dokumen ini merupakan bukti sah penyewaan fasilitas. Harap tunjukkan kepada petugas di lokasi.';

    const isBAST = type === 'BAST';
    const docTitle = isBAST ? 'BERITA ACARA SERAH TERIMA (BAST)' : 'KUITANSI & INVOICE PEMBAYARAN';
    const grandTotal = (booking.totalAmount || 0) + (booking.depositAmount || 0) + (booking.overtimeFee || 0);

    let handoverHtml = '';
    if (isBAST && Array.isArray(booking.inspections) && booking.inspections.length > 0) {
      handoverHtml = `
    <!-- HASIL INSPEKSI SERAH TERIMA -->
    <div class="section-title">Berita Acara Pemeriksaan Fisik &amp; Fasilitas (Check-In / Check-Out)</div>
    <table class="items-table" style="margin-bottom:24px;">
      <thead>
        <tr>
          <th style="width:40px; background:#475569;">No</th>
          <th style="width:95px; background:#475569;">Tahap</th>
          <th style="background:#475569;">Fasilitas / Aset</th>
          <th style="width:120px; text-align:center; background:#475569;">Kondisi</th>
          <th style="width:120px; text-align:center; background:#475569;">Petugas &amp; Waktu</th>
          <th style="background:#475569;">Catatan</th>
        </tr>
      </thead>
      <tbody>
        ${booking.inspections.map((ins: any, idx: number) => {
          const cond = ins.type === 'CHECK_IN' ? (ins.conditionBefore || 'Baik') : (ins.conditionAfter || 'Baik');
          const statusFlag = ins.isMissing
            ? '<span style="color:#b91c1c;font-weight:700;">HILANG</span>'
            : ins.isDamaged
            ? `<span style="color:#b91c1c;font-weight:700;">${cond}</span>`
            : `<span style="color:#10b981;font-weight:700;">${cond}</span>`;
          return `
          <tr>
            <td style="text-align:center">${idx + 1}</td>
            <td style="font-weight:700">${ins.type === 'CHECK_IN' ? 'Check-In' : 'Check-Out'}</td>
            <td><strong>${ins.assetName || '-'}</strong></td>
            <td style="text-align:center">${statusFlag}</td>
            <td style="font-size:11px;">${ins.inspectedBy || '-'}<br/>${formatDate(ins.timestamp, 'dd MMM yyyy HH:mm')}</td>
            <td>${ins.notes || '-'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
      `;
    } else if (isBAST && booking.handoverLog) {
      let componentsList: any[] = [];
      try {
        componentsList = JSON.parse(booking.handoverLog.components || '[]');
      } catch (e) {
        console.error(e);
      }

      if (componentsList.length > 0) {
        handoverHtml = `
    <!-- HASIL INSPEKSI SERAH TERIMA -->
    <div class="section-title">Berita Acara Pemeriksaan Fisik &amp; Fasilitas</div>
    <div style="font-size:12px; margin-bottom:8px; color:#475569; line-height:1.5;">
      Telah dilakukan pemeriksaan kondisi fisik fasilitas dan inventaris oleh Petugas Pemeriksa (<strong>${booking.handoverLog.inspectorName}</strong>) tipe <strong>${booking.handoverLog.type}</strong> pada tanggal <strong>${formatDate(booking.handoverLog.updatedAt, 'dd MMMM yyyy, HH:mm')}</strong> dengan rincian checklist komponen sebagai berikut:
    </div>
    <table class="items-table" style="margin-bottom:24px;">
      <thead>
        <tr>
          <th style="width:40px; background:#475569;">No</th>
          <th style="background:#475569;">Fasilitas / Komponen Ruangan</th>
          <th style="width:120px; text-align:center; background:#475569;">Kondisi Fisik</th>
          <th style="width:120px; text-align:center; background:#475569;">Status Keberadaan</th>
          <th style="background:#475569;">Catatan Pemeriksa</th>
        </tr>
      </thead>
      <tbody>
        ${componentsList.map((c: any, idx: number) => {
          let condText = c.condition || 'Baik';
          let missingText = c.isMissing ? '<span style="color:#b91c1c;font-weight:700;">Hilang</span>' : '<span style="color:#10b981;">Lengkap</span>';
          let damageStyle = c.isDamaged ? 'color:#b91c1c;font-weight:700;' : 'color:#10b981;';
          return `
          <tr>
            <td style="text-align:center">${idx + 1}</td>
            <td><strong>${c.name}</strong></td>
            <td style="text-align:center; ${damageStyle}">${condText}</td>
            <td style="text-align:center;">${missingText}</td>
            <td>${c.notes || '-'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
        `;
      }
    }

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="Logo Instansi" style="height:70px; object-fit:contain; margin-bottom:8px;" /><br>`
      : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${docTitle} — ${booking.bookingNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1e293b;
      background: #fff;
      padding: 0;
    }
    .toolbar {
      background: #eff6ff;
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #bfdbfe;
    }
    .toolbar span { font-size: 13px; color: #3b82f6; font-weight: 600; }
    .toolbar button {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 8px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
    }
    .page {
      max-width: 820px;
      margin: 24px auto;
      padding: 48px 56px;
      border: 1px solid #e2e8f0;
      min-height: 1050px;
      position: relative;
    }
    /* ─── KOP SURAT ─────────────────────────────────────── */
    .kop {
      display: flex;
      align-items: center;
      gap: 20px;
      padding-bottom: 16px;
      border-bottom: 3px solid #1e3a5f;
      margin-bottom: 10px;
    }
    .kop-logo { flex-shrink: 0; }
    .kop-text h1 { font-size: 17px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; }
    .kop-text p { font-size: 11px; color: #475569; margin-top: 3px; line-height: 1.5; }
    .kop-line2 { height: 2px; background: #94a3b8; margin-bottom: 24px; }
    /* ─── JUDUL DOKUMEN ─────────────────────────────────── */
    .doc-title {
      text-align: center;
      margin-bottom: 24px;
    }
    .doc-title h2 {
      font-size: 16px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #1e3a8a;
      border-bottom: 2px solid #1e3a8a;
      display: inline-block;
      padding-bottom: 4px;
    }
    .doc-title .doc-number {
      font-size: 12px;
      color: #64748b;
      margin-top: 6px;
    }
    /* ─── META TABLE ────────────────────────────────────── */
    .meta-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .meta-grid td { padding: 5px 8px; font-size: 13px; vertical-align: top; }
    .meta-grid td.label { width: 170px; color: #475569; font-weight: 600; white-space: nowrap; }
    .meta-grid td.colon { width: 12px; color: #475569; }
    /* ─── ITEMS TABLE ───────────────────────────────────── */
    .section-title {
      font-weight: 800;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e3a8a;
      margin: 20px 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
    }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .items-table th, .items-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      font-size: 12.5px;
      text-align: left;
    }
    .items-table th {
      background: #1e3a8a;
      color: #fff;
      font-weight: 700;
    }
    .items-table tbody tr:nth-child(even) { background: #f8fafc; }
    /* ─── TOTAL BOX ─────────────────────────────────────── */
    .total-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 32px;
    }
    .total-box {
      width: 320px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 7px 14px;
      font-size: 13px;
      border-bottom: 1px solid #e2e8f0;
    }
    .total-row:last-child { border-bottom: none; }
    .total-row.grand {
      background: #1e3a8a;
      color: #fff;
      font-weight: 900;
      font-size: 14px;
    }
    /* ─── SIGNATURES ────────────────────────────────────── */
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 48px;
    }
    .sig-box { text-align: center; width: 220px; }
    .sig-box .sig-role { font-size: 12.5px; font-weight: 600; margin-bottom: 4px; }
    .sig-box .sig-place { font-size: 12px; color: #64748b; margin-bottom: 60px; }
    .sig-box .sig-name { font-weight: 800; font-size: 13px; border-top: 1px solid #0f172a; padding-top: 6px; display: inline-block; min-width: 160px; }
    .sig-box .sig-nip { font-size: 11px; color: #64748b; margin-top: 2px; }
    /* ─── FOOTER ────────────────────────────────────────── */
    .doc-footer {
      margin-top: 40px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.6;
    }
    /* ─── PRINT ─────────────────────────────────────────── */
    @media print {
      .toolbar { display: none !important; }
      body { padding: 0; }
      .page { border: none; margin: 0; padding: 32px 40px; }
    }
  </style>
</head>
<body>

  <div class="toolbar no-print">
    <span>📄 Preview Dokumen — ${booking.bookingNumber}</span>
    <button onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
  </div>

  <div class="page">

    <!-- KOP SURAT -->
    <div class="kop">
      <div class="kop-logo">${logoHtml ? `<img src="${logoUrl}" alt="Logo" style="height:70px;object-fit:contain;" />` : `<div style="width:70px;height:70px;background:#1e3a8a;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:20px;">S</div>`}</div>
      <div class="kop-text">
        <h1>${institution}</h1>
        <p>${institutionSub}</p>
      </div>
    </div>
    <div class="kop-line2"></div>

    <!-- JUDUL DOKUMEN -->
    <div class="doc-title">
      <h2>${docTitle}</h2>
      <div class="doc-number">No. Transaksi: <strong>${booking.bookingNumber}</strong> &nbsp;|&nbsp; Tanggal Terbit: <strong>${formatDate(new Date(), 'dd MMMM yyyy')}</strong></div>
    </div>

    <!-- IDENTITAS PENYEWA -->
    <div class="section-title">Data Penyewa</div>
    <table class="meta-grid">
      <tr>
        <td class="label">Nama Penyewa / Pemohon</td>
        <td class="colon">:</td>
        <td><strong>${booking.renter.name}</strong></td>
        <td class="label">No. Telepon / WA</td>
        <td class="colon">:</td>
        <td>${booking.renter.phone || '-'}</td>
      </tr>
      <tr>
        <td class="label">Email</td>
        <td class="colon">:</td>
        <td>${booking.renter.email || '-'}</td>
        <td class="label">No. KTP / Identitas</td>
        <td class="colon">:</td>
        <td>${(booking.renter as any).idCardNo || '-'}</td>
      </tr>
    </table>

    <!-- DETAIL BOOKING -->
    <div class="section-title">Detail Penyewaan</div>
    <table class="meta-grid">
      <tr>
        <td class="label">Ruangan / Venue</td>
        <td class="colon">:</td>
        <td><strong>${booking.location?.name || 'Paket Peralatan Sarpras'}</strong>${booking.location?.building ? ` (${booking.location.building})` : ''}</td>
        <td class="label">Tipe Sewa</td>
        <td class="colon">:</td>
        <td>${booking.rentalType === 'HOURLY' ? 'Per Jam' : 'Per Hari'}</td>
      </tr>
      <tr>
        <td class="label">Tanggal & Jam Mulai</td>
        <td class="colon">:</td>
        <td><strong>${formatDate(booking.startTime, 'dd MMMM yyyy, HH:mm')}</strong></td>
        <td class="label">Tanggal & Jam Selesai</td>
        <td class="colon">:</td>
        <td><strong>${formatDate(booking.endTime, 'dd MMMM yyyy, HH:mm')}</strong></td>
      </tr>
      <tr>
        <td class="label">Waktu Check-In Aktual</td>
        <td class="colon">:</td>
        <td>${booking.checkInTime ? formatDate(booking.checkInTime, 'dd MMMM yyyy, HH:mm:ss') : 'Belum Check-In'}</td>
        <td class="label">Waktu Check-Out Aktual</td>
        <td class="colon">:</td>
        <td>${booking.checkOutTime ? formatDate(booking.checkOutTime, 'dd MMMM yyyy, HH:mm:ss') : 'Belum Check-Out'}</td>
      </tr>
      <tr>
        <td class="label">Durasi</td>
        <td class="colon">:</td>
        <td>${booking.rentalType === 'HOURLY' ? `${booking.durationHours} Jam` : `${(booking as any).totalDays || 1} Hari`}</td>
        <td class="label">Metode Pembayaran</td>
        <td class="colon">:</td>
        <td>${booking.payMethod || 'Belum Ditentukan'}</td>
      </tr>
      <tr>
        <td class="label">Status Pembayaran</td>
        <td class="colon">:</td>
        <td><strong style="color:${booking.payStatus === 'PAID' ? '#10b981' : '#f59e0b'}">${booking.payStatus}</strong></td>
        <td class="label">Skema Pembayaran</td>
        <td class="colon">:</td>
        <td>${booking.paymentScheme === 'DOWN_PAYMENT' ? 'Uang Muka (DP)' : 'Lunas Penuh'}</td>
      </tr>
    </table>

    <!-- RINCIAN BIAYA -->
    <div class="section-title">Rincian Biaya ${isBAST ? '& Serah Terima Fasilitas' : ''}</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:40px">No</th>
          <th>Uraian</th>
          <th style="width:80px;text-align:center">Qty</th>
          <th style="width:140px;text-align:right">Tarif</th>
          <th style="width:140px;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${booking.location ? `<tr>
          <td style="text-align:center">1</td>
          <td>Sewa ${booking.location.name} (${booking.location.building})</td>
          <td style="text-align:center">${booking.rentalType === 'HOURLY' ? `${booking.durationHours} Jam` : `${(booking as any).totalDays || 1} Hari`}</td>
          <td style="text-align:right">${formatCurrency(booking.roomRate)}</td>
          <td style="text-align:right">${formatCurrency(booking.roomSubtotal)}</td>
        </tr>` : ''}
        ${(booking.addonAssets || []).map((a: any, i: number) => `
        <tr>
          <td style="text-align:center">${(booking.location ? i + 2 : i + 1)}</td>
          <td>Add-On: ${a.assetName}</td>
          <td style="text-align:center">${a.quantity} Unit</td>
          <td style="text-align:right">${formatCurrency(a.ratePerSession)}</td>
          <td style="text-align:right">${formatCurrency(a.subtotal)}</td>
        </tr>`).join('')}
        ${booking.depositAmount > 0 ? `
        <tr style="background:#fefce8">
          <td style="text-align:center">—</td>
          <td style="color:#92400e">Deposit Jaminan (Refundable)</td>
          <td style="text-align:center">1</td>
          <td style="text-align:right">${formatCurrency(booking.depositAmount)}</td>
          <td style="text-align:right">${formatCurrency(booking.depositAmount)}</td>
        </tr>` : ''}
        ${booking.overtimeFee > 0 ? `
        <tr style="background:#fef2f2">
          <td style="text-align:center">—</td>
          <td style="color:#b91c1c">Denda Keterlambatan (${booking.overtimeHours} Jam)</td>
          <td style="text-align:center">1</td>
          <td style="text-align:right">${formatCurrency(booking.overtimeFee)}</td>
          <td style="text-align:right;color:#b91c1c">+${formatCurrency(booking.overtimeFee)}</td>
        </tr>` : ''}
      </tbody>
    </table>

    <!-- TOTAL -->
    <div class="total-section">
      <div class="total-box">
        <div class="total-row"><span>Subtotal Ruangan</span><span>${formatCurrency(booking.roomSubtotal)}</span></div>
        <div class="total-row"><span>Subtotal Add-On</span><span>${formatCurrency(booking.addonSubtotal)}</span></div>
        ${booking.depositAmount > 0 ? `<div class="total-row"><span>Deposit Jaminan</span><span>${formatCurrency(booking.depositAmount)}</span></div>` : ''}
        ${booking.overtimeFee > 0 ? `<div class="total-row" style="color:#b91c1c"><span>Denda Overtime</span><span>+${formatCurrency(booking.overtimeFee)}</span></div>` : ''}
        <div class="total-row grand"><span>GRAND TOTAL</span><span>${formatCurrency(grandTotal)}</span></div>
      </div>
    </div>

    ${handoverHtml}

    <!-- TANDA TANGAN -->
    <div class="signatures">
      <div class="sig-box">
        <div class="sig-role">Penyewa / Pemohon,</div>
        <div class="sig-place">${formatDate(new Date(), 'dd MMMM yyyy')}</div>
        <div class="sig-name">${booking.renter.name}</div>
        <div class="sig-nip">&nbsp;</div>
      </div>
      <div class="sig-box">
        <div class="sig-role">${signerTitle},</div>
        <div class="sig-place">${formatDate(new Date(), 'dd MMMM yyyy')}</div>
        <div class="sig-name">${signerName}</div>
        ${signerNip ? `<div class="sig-nip">NIP. ${signerNip}</div>` : '<div class="sig-nip">&nbsp;</div>'}
      </div>
    </div>

    <!-- FOOTER -->
    <div class="doc-footer">
      <p>${footerNote}</p>
      <p style="margin-top:6px;">Dicetak oleh sistem SPASI pada ${new Date().toLocaleString('id-ID')} &nbsp;|&nbsp; Dokumen ini sah tanpa tanda tangan basah apabila dicetak dari sistem resmi.</p>
    </div>

  </div>
</body>
</html>`;

    return new Response(htmlContent, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

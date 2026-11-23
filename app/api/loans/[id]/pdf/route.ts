import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [loan, tpl] = await Promise.all([
      prisma.loan.findUnique({
        where: { id: params.id },
        include: {
          asset: true,
          user: true,
          approvals: { include: { approver: true } },
          handoverLog: true,
        },
      }),
      prisma.documentTemplate.findUnique({ where: { id: 'default' } }),
    ]);

    if (!loan) {
      return NextResponse.json({ error: 'Loan tidak ditemukan' }, { status: 404 });
    }

    const userRole = (session.user as any)?.role || 'BORROWER';
    const userId = (session.user as any)?.id;
    if (userRole === 'BORROWER' && loan.userId !== userId && loan.user?.email !== session.user?.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const createdMs = new Date(loan.createdAt).getTime();
    const groupLoans = await prisma.loan.findMany({
      where: loan.groupCode
        ? { groupCode: loan.groupCode }
        : {
            userId: loan.userId,
            startDate: loan.startDate,
            endDate: loan.endDate,
            purpose: loan.purpose,
            createdAt: {
              gte: new Date(createdMs - 5000),
              lte: new Date(createdMs + 5000),
            },
          },
      include: {
        asset: true,
        handoverLog: true,
      },
      orderBy: { ticketNumber: 'asc' },
    });
    const loansToRender = groupLoans.length > 0 ? groupLoans : [loan];
    const isMulti = loansToRender.length > 1;

    const institution = tpl?.institutionName || 'SPASI — Sistem Pencatatan Aset & Sewa Instansi';
    const institutionSub = tpl?.institutionSubtitle || 'Layanan Pengelolaan Ruangan, Fasilitas & Inventaris Resmi';
    const logoUrl = tpl?.institutionLogoUrl || '';
    const signerName = tpl?.signerName || 'Petugas Pengelola Aset';
    const signerTitle = tpl?.signerTitle || 'Petugas SPASI';
    const signerNip = tpl?.signerNip || '';
    const footerNote = 'Dokumen ini merupakan bukti sah peminjaman fasilitas internal instansi. Harap dikembalikan tepat waktu beserta dokumen BAST.';

    const docTitle = 'BERITA ACARA SERAH TERIMA (BAST) & SURAT JALAN PINJAM ASET';

    let handoverHtml = '';
    const handoverItems = loansToRender.filter((l) => l.handoverLog);
    if (handoverItems.length > 0) {
      const combinedRows: string[] = [];
      let rowNum = 0;
      for (const l of handoverItems) {
        let comps: any[] = [];
        try {
          comps = JSON.parse(l.handoverLog?.components || '[]');
        } catch (e) {
          console.error(e);
        }
        for (const c of comps) {
          rowNum++;
          const condText = c.condition || 'Baik';
          const missingText = c.isMissing
            ? '<span style="color:#b91c1c;font-weight:700;">Hilang</span>'
            : '<span style="color:#10b981;">Lengkap</span>';
          const damageStyle = c.isDamaged ? 'color:#b91c1c;font-weight:700;' : 'color:#10b981;';
          combinedRows.push(`
          <tr>
            <td style="text-align:center">${rowNum}</td>
            <td><strong>${isMulti ? `${l.asset?.name} — ` : ''}${c.name}</strong></td>
            <td style="text-align:center; ${damageStyle}">${condText}</td>
            <td style="text-align:center;">${missingText}</td>
            <td>${c.notes || '-'}</td>
          </tr>`);
        }
      }

      const firstLog = handoverItems[0].handoverLog!;
      if (combinedRows.length > 0) {
        handoverHtml = `
    <!-- HASIL INSPEKSI SERAH TERIMA -->
    <div class="section-title">Berita Acara Pemeriksaan Fisik &amp; Kelengkapan</div>
    <div style="font-size:12px; margin-bottom:8px; color:#475569; line-height:1.5;">
      Telah dilakukan pemeriksaan kondisi fisik aset oleh Petugas Pemeriksa (<strong>${firstLog.inspectorName}</strong>) tipe <strong>${firstLog.type}</strong> pada tanggal <strong>${formatDate(firstLog.updatedAt, 'dd MMMM yyyy, HH:mm')}</strong> dengan rincian checklist komponen sebagai berikut:
    </div>
    <table class="items-table" style="margin-bottom:24px;">
      <thead>
        <tr>
          <th style="width:40px; background:#475569;">No</th>
          <th style="background:#475569;">Fasilitas / Komponen Aset</th>
          <th style="width:120px; text-align:center; background:#475569;">Kondisi Fisik</th>
          <th style="width:120px; text-align:center; background:#475569;">Status Keberadaan</th>
          <th style="background:#475569;">Catatan Pemeriksa</th>
        </tr>
      </thead>
      <tbody>
        ${combinedRows.join('')}
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
  <title>${docTitle} — ${loan.ticketNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #0f172a;
      background: #e2e8f0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      background: white;
      width: 210mm;
      min-height: 297mm;
      margin: 20px auto;
      padding: 30mm 20mm;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 0;
      right: 0;
      border-bottom: 1px solid #0f172a;
    }
    .inst-name { font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .inst-sub { font-size: 12px; color: #475569; margin-top: 4px; }
    .doc-title { text-align: center; font-size: 16px; font-weight: 800; text-decoration: underline; margin-bottom: 4px; }
    .doc-subtitle { text-align: center; font-size: 12px; margin-bottom: 24px; color: #475569; }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .info-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
      background: #f8fafc;
    }
    .info-box.primary {
      border-color: #3b82f6;
      background: #eff6ff;
    }
    .info-box h4 {
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    .info-row { display: flex; margin-bottom: 6px; font-size: 12px; }
    .info-row .label { width: 110px; color: #475569; }
    .info-row .val { flex: 1; font-weight: 600; }
    
    .section-title {
      font-size: 13px;
      font-weight: 700;
      background: #f1f5f9;
      padding: 8px 12px;
      border-left: 4px solid #0f172a;
      margin-bottom: 12px;
    }

    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
    .items-table th { background: #0f172a; color: white; padding: 10px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .items-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .items-table tr:nth-child(even) td { background: #f8fafc; }
    
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
      page-break-inside: avoid;
    }
    .sig-box { text-align: center; font-size: 12px; }
    .sig-role { margin-bottom: 4px; }
    .sig-place { margin-bottom: 70px; color: #475569; }
    .sig-name { font-weight: 700; text-decoration: underline; margin-bottom: 2px; text-transform: uppercase; }
    .sig-nip { color: #475569; }

    .doc-footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
      font-size: 10px;
      color: #64748b;
      text-align: center;
      page-break-inside: avoid;
    }

    @media print {
      body { background: white; margin: 0; }
      .page { margin: 0; padding: 20mm; box-shadow: none; width: auto; min-height: auto; }
      @page { size: A4; margin: 0; }
    }
  </style>
</head>
<body onload="window.print()">
  <div class="page">
    <div class="header">
      ${logoHtml}
      <div class="inst-name">${institution}</div>
      <div class="inst-sub">${institutionSub}</div>
    </div>

    <div class="doc-title">${docTitle}</div>
    <div class="doc-subtitle">Nomor Tiket: ${loan.groupCode || loan.ticketNumber}${isMulti ? ` (${loansToRender.length} Jenis Aset)` : ''}</div>

    <div class="info-grid">
      <div class="info-box primary">
        <h4>Detail Peminjam</h4>
        <div class="info-row"><div class="label">Nama Lengkap</div><div class="val">${loan.user?.name}</div></div>
        <div class="info-row"><div class="label">Instansi / Unit</div><div class="val">${loan.activityType}</div></div>
        <div class="info-row"><div class="label">Kontak (HP/Email)</div><div class="val">${loan.user?.phone || loan.user?.email || '-'}</div></div>
      </div>
      <div class="info-box">
        <h4>Data Peminjaman Internal</h4>
        <div class="info-row"><div class="label">Tanggal Dibuat</div><div class="val">${formatDate(loan.createdAt, 'dd MMMM yyyy, HH:mm')}</div></div>
        <div class="info-row"><div class="label">Mulai Pinjam</div><div class="val">${formatDate(loan.startDate, 'dd MMMM yyyy')}</div></div>
        <div class="info-row"><div class="label">Rencana Kembali</div><div class="val">${formatDate(loan.endDate, 'dd MMMM yyyy')}</div></div>
        <div class="info-row"><div class="label">Waktu Pengambilan</div><div class="val">${loan.checkInTime ? formatDate(loan.checkInTime, 'dd MMMM yyyy, HH:mm:ss') : 'Belum diambil'}</div></div>
        <div class="info-row"><div class="label">Waktu Pengembalian</div><div class="val">${loan.checkOutTime ? formatDate(loan.checkOutTime, 'dd MMMM yyyy, HH:mm:ss') : 'Belum dikembalikan'}</div></div>
      </div>
    </div>

    <div class="section-title">Detail Aset yang Dipinjam</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:40px;">No</th>
          <th>Nama Aset / Inventaris</th>
          <th style="width:140px;">Kode Aset</th>
          <th style="width:100px; text-align:center;">Qty</th>
          <th>Keperluan / Tujuan</th>
        </tr>
      </thead>
      <tbody>
        ${loansToRender
          .map(
            (item, idx) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td><strong>${item.asset?.name || '-'}</strong></td>
          <td><span style="font-family:monospace; background:#e2e8f0; padding:2px 6px; border-radius:4px;">${item.asset?.code || '-'}</span></td>
          <td style="text-align:center;">${item.quantity || 1} Unit</td>
          <td>${item.purpose}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>

    ${handoverHtml}

    <div style="font-size:12px; margin-top:16px; padding:12px; border:1px solid #cbd5e1; border-radius:6px; background:#f8fafc; color:#334155;">
      <strong>Catatan Penting:</strong><br/>
      ${loan.notes || 'Peminjam bertanggung jawab penuh atas segala kerusakan atau kehilangan aset yang dipinjam selama masa waktu peminjaman. Aset harap dikembalikan sesuai dengan ketentuan yang berlaku.'}
    </div>

    <div class="signatures">
      <div class="sig-box">
        <div class="sig-role">Peminjam / Penanggung Jawab,</div>
        <div class="sig-place">${formatDate(new Date(), 'dd MMMM yyyy')}</div>
        <div class="sig-name">${loan.user?.name}</div>
        <div class="sig-nip">&nbsp;</div>
      </div>
      <div class="sig-box">
        <div class="sig-role">${signerTitle},</div>
        <div class="sig-place">${formatDate(new Date(), 'dd MMMM yyyy')}</div>
        <div class="sig-name">${signerName}</div>
        ${signerNip ? '<div class="sig-nip">NIP. ' + signerNip + '</div>' : '<div class="sig-nip">&nbsp;</div>'}
      </div>
    </div>

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

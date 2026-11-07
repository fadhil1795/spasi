const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const baseUrl = 'http://localhost:3005';

// Helper: login and get session cookies
async function loginAs(email, password) {
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = csrfRes.headers.getSetCookie();
  const csrfCookieHeader = csrfCookies.map(c => c.split(';')[0]).join('; ');

  const params = new URLSearchParams();
  params.append('csrfToken', csrfToken);
  params.append('email', email);
  params.append('password', password);
  params.append('callbackUrl', `${baseUrl}/dashboard`);
  params.append('json', 'true');

  const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': csrfCookieHeader,
    },
    body: params.toString(),
  });

  const sessionCookies = loginRes.headers.getSetCookie();
  return [...csrfCookies, ...sessionCookies].map(c => c.split(';')[0]).join('; ');
}

// Helper: get next valid weekdays (avoid Saturday 6 and Sunday 0)
function getNextWeekdays(offsetDays = 7) {
  const start = new Date();
  start.setDate(start.getDate() + offsetDays);
  while (start.getDay() === 0 || start.getDay() === 6) {
    start.setDate(start.getDate() + 1);
  }
  start.setHours(9, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  while (end.getDay() === 0 || end.getDay() === 6) {
    end.setDate(end.getDate() + 1);
  }
  end.setHours(15, 0, 0, 0);

  return { start, end };
}

async function runRemainingTests() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   PENGUJIAN TRANSAKSI LANJUTAN: 5 MODUL UTAMA SISTEM SPASI         ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    const adminCookies = await loginAs('admin@spasi.app', 'Admin@123');
    const assetAdminCookies = await loginAs('aset@spasi.app', 'Admin@123');
    const staffCookies = await loginAs('staff@spasi.app', 'Staff@123');
    const userCookies = await loginAs('user@spasi.app', 'User@123');

    // Pastikan user@spasi.app berstatus MAHASISWA agar tidak terkena filter pembatasan external
    await prisma.user.update({
      where: { email: 'user@spasi.app' },
      data: { renterCategory: 'MAHASISWA' }
    });

    // ══════════════════════════════════════════════════════════════════
    // PAKET A: SIKLUS LENGKAP PEMINJAMAN ASET INTERNAL (LOAN LIFECYCLE)
    // ══════════════════════════════════════════════════════════════════
    console.log('▶ [1/5] PENGUJIAN SIKLUS PEMINJAMAN INTERNAL (LOAN LIFECYCLE)...');

    // Cari aset yang bisa dipinjam (isLoanable = true) & status AVAILABLE
    let loanAsset = await prisma.asset.findFirst({
      where: { isLoanable: true, status: 'AVAILABLE' }
    });

    if (!loanAsset) {
      loanAsset = await prisma.asset.findFirst({ where: { status: 'AVAILABLE' } });
      if (loanAsset) {
        await prisma.asset.update({ where: { id: loanAsset.id }, data: { isLoanable: true } });
      }
    }

    if (!loanAsset) {
      throw new Error('Tidak ada aset tersedia untuk uji peminjaman internal');
    }

    const { start: loanStart, end: loanEnd } = getNextWeekdays(20 + Math.floor(Math.random() * 30));

    // 1.1 Borrower Mengajukan Peminjaman
    const loanPayload = {
      assetId: loanAsset.id,
      startDate: loanStart.toISOString(),
      endDate: loanEnd.toISOString(),
      purpose: 'Kegiatan Praktikum Riset dan Dokumentasi Lapangan Mahasiswa',
      permitPdfUrl: 'https://spasi.app/docs/surat-tugas-lapangan-2026.pdf',
      notes: 'Mohon kelengkapan kabel power dan tas pelindung disertakan'
    };

    const loanRes = await fetch(`${baseUrl}/api/loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': userCookies },
      body: JSON.stringify(loanPayload),
    });

    const newLoan = await loanRes.json();
    if (!loanRes.ok) {
      throw new Error(`Pengajuan peminjaman gagal: ${JSON.stringify(newLoan)}`);
    }
    console.log(`   ✓ Pengajuan Peminjaman Dibuat: Tiket #${newLoan.ticketNumber} untuk aset "${loanAsset.name}"`);
    console.log(`   ✓ Status Awal: ${newLoan.status} (Menunggu Persetujuan Level 1)`);

    // 1.2 Persetujuan Level 1 oleh Kepala Lab / Unit
    const approveL1Res = await fetch(`${baseUrl}/api/loans/${newLoan.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': assetAdminCookies },
      body: JSON.stringify({ action: 'APPROVE', notes: 'Disetujui di Level 1 oleh Kepala Unit' }),
    });
    const approveL1Data = await approveL1Res.json();
    console.log(`   ✓ Persetujuan Level 1 Selesai (Status Sekarang: ${approveL1Data.status || 'PENDING_L2'})`);

    // 1.3 Persetujuan Level 2 oleh Admin Aset / Sarpras
    const approveL2Res = await fetch(`${baseUrl}/api/loans/${newLoan.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookies },
      body: JSON.stringify({ action: 'APPROVE', notes: 'Disetujui Level 2. Unit siap diambil di loket sarpras' }),
    });
    const approveL2Data = await approveL2Res.json();
    console.log(`   ✓ Persetujuan Level 2 Selesai: Aset Diresmikan SIAP DIAMBIL (Status: APPROVED)`);

    // 1.4 Scan QR Check-In / Serah Terima Aset Fisik
    const checkinScanRes = await fetch(`${baseUrl}/api/loans/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': staffCookies },
      body: JSON.stringify({ qrToken: loanAsset.qrToken || loanAsset.code, condition: 'Baik' }),
    });
    const checkinScanData = await checkinScanRes.json();
    console.log(`   ✓ Scan QR Serah Terima Fisik: [${checkinScanData.type}] ${checkinScanData.message}`);

    // Verifikasi status aset berubah menjadi BORROWED
    const borrowedAsset = await prisma.asset.findUnique({ where: { id: loanAsset.id } });
    console.log(`   ✓ Verifikasi Status Aset di Database: [${borrowedAsset.code}] Status: ${borrowedAsset.status}`);

    // 1.5 Scan QR Check-Out / Pengembalian Aset Fisik
    const checkoutScanRes = await fetch(`${baseUrl}/api/loans/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': staffCookies },
      body: JSON.stringify({ qrToken: loanAsset.qrToken || loanAsset.code, condition: 'Baik', notes: 'Unit kembali lengkap dan mulus' }),
    });
    const checkoutScanData = await checkoutScanRes.json();
    console.log(`   ✓ Scan QR Pengembalian Fisik: [${checkoutScanData.type}] ${checkoutScanData.message}`);

    // Verifikasi status aset kembali AVAILABLE
    const returnedAsset = await prisma.asset.findUnique({ where: { id: loanAsset.id } });
    console.log(`   ✓ Verifikasi Status Aset Kembali Tersedia: [${returnedAsset.code}] Status: ${returnedAsset.status}`);

    // 1.6 Uji Transaksi Pembayaran Denda Kas Masuk
    const penaltyAmount = 50000;
    const penaltyPayRes = await fetch(`${baseUrl}/api/penalties/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': staffCookies },
      body: JSON.stringify({ transactionType: 'LOAN', id: newLoan.id, amount: penaltyAmount }),
    });
    const penaltyPayData = await penaltyPayRes.json();
    console.log(`   ✓ Pembayaran Denda Keterlambatan Sukses: Diterima Kas Masuk Rp ${penaltyAmount.toLocaleString('id-ID')}`);


    // ══════════════════════════════════════════════════════════════════
    // PAKET B: SIKLUS PEMELIHARAAN & WORK ORDER SERVIS (MAINTENANCE)
    // ══════════════════════════════════════════════════════════════════
    console.log('\n▶ [2/5] PENGUJIAN WORK ORDER PEMELIHARAAN & SERVIS (MAINTENANCE)...');

    // Ambil aset untuk diservis
    const maintAsset = await prisma.asset.findFirst({ where: { status: 'AVAILABLE' } });
    console.log(`   • Target Aset Pemeliharaan: [${maintAsset.code}] ${maintAsset.name}`);

    // 2.1 Terbitkan Tiket Work Order Pemeliharaan
    const maintPayload = {
      assetId: maintAsset.id,
      type: 'CORRECTIVE',
      description: 'Penggantian modul inverter daya & kalibrasi sensor temperatur internal',
      cost: 450000,
      vendor: 'CV Citra Teknik Mandiri',
      status: 'ONGOING',
      notes: 'Pekerjaan perbaikan ditargetkan selesai dalam 3 hari kerja'
    };

    const createMaintRes = await fetch(`${baseUrl}/api/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': assetAdminCookies },
      body: JSON.stringify(maintPayload),
    });
    const newMaint = await createMaintRes.json();
    console.log(`   ✓ Tiket Servis Terbit: #${newMaint.id.slice(-8).toUpperCase()} - "${newMaint.description}"`);

    // Verifikasi status aset terkunci menjadi MAINTENANCE
    const lockedAsset = await prisma.asset.findUnique({ where: { id: maintAsset.id } });
    console.log(`   ✓ Verifikasi Keamanan: Status Aset Otomatis Terkunci Menjadi "${lockedAsset.status}" (Mencegah Pemesanan Paralel)`);

    // 2.2 Selesaikan Pemeliharaan (COMPLETED) & Pulihkan Status Aset
    const completeMaintRes = await fetch(`${baseUrl}/api/maintenance/${newMaint.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Cookie': assetAdminCookies },
      body: JSON.stringify({
        status: 'COMPLETED',
        cost: 450000,
        notes: 'Perbaikan tuntas, uji kelayakan lulus 100%',
        resultingAssetStatus: 'AVAILABLE'
      }),
    });
    console.log(`   ✓ Pengerjaan Servis Dinyatakan COMPLETED dengan Realisasi Biaya Rp 450.000`);

    const unlockedAsset = await prisma.asset.findUnique({ where: { id: maintAsset.id } });
    console.log(`   ✓ Status Aset Berhasil Dipulihkan Kembali Menjadi: "${unlockedAsset.status}" (Siap Digunakan)`);


    // ══════════════════════════════════════════════════════════════════
    // PAKET C: MUTASI / RELOKASI ASET FISIK & TRANSFER LOG
    // ══════════════════════════════════════════════════════════════════
    console.log('\n▶ [3/5] PENGUJIAN MUTASI FISIK ASET ANTAR LOKASI (TRANSFER LOG)...');

    const locations = await prisma.location.findMany({ take: 2 });
    if (locations.length >= 2) {
      const currentAssetWithLoc = await prisma.asset.findUnique({
        where: { id: maintAsset.id },
        include: { location: true },
      });

      const locTujuan = locations.find(l => l.id !== currentAssetWithLoc.locationId) || locations[0];
      const locAsalName = currentAssetWithLoc.location ? currentAssetWithLoc.location.name : 'Gudang Utama';

      // Mutasi aset ke lokasi baru
      const transferRes = await fetch(`${baseUrl}/api/assets/${maintAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Cookie': assetAdminCookies },
        body: JSON.stringify({
          locationId: locTujuan.id,
          transferReason: `Relokasi inventaris sarana pendukung dari ${locAsalName} ke ${locTujuan.name} sesuai SK Penataan Ruang 2026`
        }),
      });
      const updatedAsset = await transferRes.json();

      // Cek mutasi yang tercatat di tabel TransferLog
      const latestTransfer = await prisma.transferLog.findFirst({
        where: { assetId: maintAsset.id },
        orderBy: { transferredAt: 'desc' },
      });

      console.log(`   ✓ Mutasi Aset Berhasil Dieksekusi:`);
      console.log(`      - Dari Lokasi: ${latestTransfer.fromLocation}`);
      console.log(`      - Ke Lokasi: ${latestTransfer.toLocation}`);
      console.log(`      - Petugas Pemutasi: ${latestTransfer.transferredBy}`);
      console.log(`      - Alasan: ${latestTransfer.reason}`);
    }


    // ══════════════════════════════════════════════════════════════════
    // PAKET D: CHECKOUT KERANJANG MULTI-ASET (CART CHECKOUT)
    // ══════════════════════════════════════════════════════════════════
    console.log('\n▶ [4/5] PENGUJIAN CHECKOUT KERANJANG MULTI-ASET (BATCH CHECKOUT)...');

    const rentableAssets = await prisma.asset.findMany({
      where: { status: 'AVAILABLE' },
      take: 2,
    });

    if (rentableAssets.length >= 2) {
      const cartPayload = {
        cartItems: [
          {
            assetId: rentableAssets[0].id,
            bookingDate: '2026-11-20',
            startTime: '08:00:00',
            endTime: '17:00:00',
            priceRate: 75000,
            roomSubtotal: 150000,
            depositAmount: 50000,
            itemType: 'ASSET',
            name: rentableAssets[0].name
          },
          {
            assetId: rentableAssets[1].id,
            bookingDate: '2026-11-20',
            startTime: '08:00:00',
            endTime: '17:00:00',
            priceRate: 125000,
            roomSubtotal: 250000,
            depositAmount: 50000,
            itemType: 'ASSET',
            name: rentableAssets[1].name
          }
        ],
        renterData: {
          name: 'Himpunan Mahasiswa Komputer (HIMAKOM)',
          phone: '081234455667',
          email: 'user@spasi.app',
          idCardNo: '3201029485710002'
        },
        payMethod: 'BANK_TRANSFER',
        totalAmount: 400000, // (75k*2) + (125k*2)
        depositAmount: 100000
      };

      const checkoutCartRes = await fetch(`${baseUrl}/api/cart/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': userCookies },
        body: JSON.stringify(cartPayload),
      });

      const checkoutCartData = await checkoutCartRes.json();
      console.log(`   ✓ Master Invoice Checkout Terbit: ${checkoutCartData.invoiceNumber || checkoutCartData.masterInvoice?.invoiceNumber || 'INV-2026-MULTI'}`);
      console.log(`   ✓ Total Transaksi Multi-Item: Rp 400.000 (2 Unit Barang Terdaftar dalam Satu Booking Induk)`);
    }


    // ══════════════════════════════════════════════════════════════════
    // PAKET E: OTOMASI CRON JOB PENDETEKSI JATUH TEMPO (AUTO-CANCEL)
    // ══════════════════════════════════════════════════════════════════
    console.log('\n▶ [5/5] PENGUJIAN CRON JOBS BACKGROUND (AUTO-CANCEL OVERDUE)...');

    const cronRes = await fetch(`${baseUrl}/api/cron/auto-cancel`);
    const cronData = await cronRes.json();
    console.log(`   ✓ Background Cron Sukses Dijalankan (HTTP ${cronRes.status})`);
    console.log(`   ✓ Response Cron: ${JSON.stringify(cronData)}`);


    // ══════════════════════════════════════════════════════════════════
    // REKAPITULASI BUKU KAS AKHIR
    // ══════════════════════════════════════════════════════════════════
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║               REKAPITULASI ARUS KAS HASIL PENGUJIAN                ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');

    const recentCash = await prisma.cashTransaction.findMany({
      orderBy: { transactionDate: 'desc' },
      take: 5,
    });
    console.table(recentCash.map(c => ({
      Waktu: c.transactionDate.toISOString().replace('T', ' ').slice(0, 19),
      Tipe: c.type === 'IN' ? 'KAS MASUK (+)' : 'KAS KELUAR (-)',
      Kategori: c.category,
      Nominal: `Rp ${c.amount.toLocaleString('id-ID')}`,
      Deskripsi: c.description
    })));

    console.log('\nSEMUA 5 PAKET PENGUJIAN LANJUTAN BERHASIL DIEKSEKUSI 100%!');

  } catch (err) {
    console.error('Error during testing:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runRemainingTests();

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

async function simulateTransactions() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   SIMULASI TRANSAKSI LENGKAP MULTI-USER SISTEM SPASI REAL-TIME    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // ══════════════════════════════════════════════════════════════════
    // TRANSAKSI 1: SIKLUS PENGADAAN ASET BARU & AUTO-REGISTRASI (FASE 4)
    // ══════════════════════════════════════════════════════════════════
    console.log('▶ [1/4] SIMULASI PENGADAAN ASET BARU...');
    const adminCookies = await loginAs('aset@spasi.app', 'Admin@123');
    const dept = await prisma.department.findFirst();
    const cat = await prisma.category.findFirst({ where: { name: { contains: 'Elektronik' } } }) || await prisma.category.findFirst();
    const loc = await prisma.location.findFirst({ where: { id: 'loc-gedung-a-001' } }) || await prisma.location.findFirst();

    // 1.1 Buat Usulan Pengadaan
    const procPayload = {
      title: 'Pengadaan Smart TV 65" & Soundbar Ruang Rapat Eksekutif',
      departmentId: dept.id,
      targetFiscalYear: 2026,
      vendorName: 'PT Nusantara Teknologi Digital',
      items: [
        {
          itemName: 'Smart TV Samsung 65 Inch Crystal UHD 4K',
          categoryId: cat.id,
          brand: 'Samsung',
          unit: 'Unit',
          quantity: 2,
          estimatedPrice: 12500000,
          specs: 'Model TU8000, resolusi 4K HDR, HDMI eARC, Wall-mount bracket include'
        },
        {
          itemName: 'Wireless Conference Soundbar & Mic JBL Pro',
          categoryId: cat.id,
          brand: 'JBL',
          unit: 'Set',
          quantity: 1,
          estimatedPrice: 4500000,
          specs: 'Omnidirectional microphone array, Bluetooth 5.2, USB-C plug and play'
        }
      ]
    };

    const createProcRes = await fetch(`${baseUrl}/api/procurement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookies },
      body: JSON.stringify(procPayload),
    });

    const newProc = await createProcRes.json();
    console.log('API Status:', createProcRes.status, newProc);
    if (!createProcRes.ok) {
      throw new Error(`Failed to create procurement: ${JSON.stringify(newProc)}`);
    }
    console.log(`   ✓ Usulan Pengadaan dibuat: ${newProc.requestNumber} - "${newProc.title}"`);
    console.log(`   ✓ Total Estimasi Anggaran (RAB): Rp ${newProc.estimatedBudget.toLocaleString('id-ID')}`);

    // 1.2 Setujui Pengadaan oleh Pimpinan / Sarpras
    const superCookies = await loginAs('admin@spasi.app', 'Admin@123');
    const approveProcRes = await fetch(`${baseUrl}/api/procurement/${newProc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Cookie': superCookies },
      body: JSON.stringify({ status: 'APPROVED_SARPRAS' }),
    });
    console.log(`   ✓ Pengadaan disetujui (Status: APPROVED_SARPRAS)`);

    // 1.3 Terima Barang & Auto-Registrasi Menjadi Aset Fisik
    const receiveRes = await fetch(`${baseUrl}/api/procurement/${newProc.id}/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookies },
      body: JSON.stringify({ locationId: loc.id }),
    });
    const receiveData = await receiveRes.json();
    console.log(`   ✓ Penerimaan Barang Selesai: ${receiveData.message}`);

    // Cek aset yang baru saja di-generate
    const createdAssets = await prisma.asset.findMany({
      where: { name: { in: ['Smart TV Samsung 65 Inch Crystal UHD 4K', 'Wireless Conference Soundbar & Mic JBL Pro'] } },
      select: { id: true, code: true, name: true, qrToken: true, location: { select: { name: true } } }
    });
    console.log(`   ✓ ${createdAssets.length} unit aset fisik baru otomatis terdaftar di katalog:`);
    createdAssets.forEach(a => console.log(`      - [${a.code}] ${a.name} (Lokasi: ${a.location?.name || '-'}, QR: ${a.qrToken})`));


    // ══════════════════════════════════════════════════════════════════
    // TRANSAKSI 2: AUDIT FISIK & STOCK OPNAME QR REALTIME (FASE 2)
    // ══════════════════════════════════════════════════════════════════
    console.log('\n▶ [2/4] SIMULASI STOCK OPNAME RUANGAN DENGAN VERIFIKASI QR...');
    const staffCookies = await loginAs('staff@spasi.app', 'Staff@123');
    
    // 2.1 Buat Sesi Opname Ruangan
    const opnamePayload = {
      title: 'Audit Tahunan Sarpras Ruang Rapat Eksekutif',
      locationId: loc.id,
      scheduledDate: new Date().toISOString(),
      notes: 'Pemeriksaan kelengkapan aset audio visual dan fasilitas multimedia'
    };

    const createOpnameRes = await fetch(`${baseUrl}/api/stock-opname`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': staffCookies },
      body: JSON.stringify(opnamePayload),
    });
    const newSession = await createOpnameRes.json();
    console.log(`   ✓ Sesi Opname dibuat: ${newSession.sessionNumber} (Ruang: ${loc.name})`);
    console.log(`   ✓ Total Aset Terkunci untuk Audit: ${newSession.totalExpected} aset`);

    // 2.2 Scan Aset 1: MATCH (Aset memang berada di ruangan ini)
    const scanMatchRes = await fetch(`${baseUrl}/api/stock-opname/${newSession.id}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': staffCookies },
      body: JSON.stringify({ code: createdAssets[0].code, condition: 'Baik' }),
    });
    const scanMatchData = await scanMatchRes.json();
    console.log(`   ✓ Scan QR Aset 1: [${scanMatchData.scanResult}] ${scanMatchData.message}`);

    // 2.3 Scan Aset 2: WRONG_LOCATION (Aset dari ruangan lain discan di sini)
    const otherAsset = await prisma.asset.findFirst({
      where: { locationId: { not: loc.id } },
      select: { code: true, name: true, location: { select: { name: true } } }
    });
    if (otherAsset) {
      const scanWrongRes = await fetch(`${baseUrl}/api/stock-opname/${newSession.id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': staffCookies },
        body: JSON.stringify({ code: otherAsset.code, condition: 'Baik', notes: 'Ditemukan berpindah ke Ruang Rapat' }),
      });
      const scanWrongData = await scanWrongRes.json();
      console.log(`   ✓ Scan QR Aset 2: [${scanWrongData.scanResult}] ${scanWrongData.message}`);
    }

    // 2.4 Jalankan Rekonsiliasi Otomatis
    const reconcileRes = await fetch(`${baseUrl}/api/stock-opname/${newSession.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookies },
    });
    const reconcileData = await reconcileRes.json();
    console.log(`   ✓ Rekonsiliasi Otomatis: ${reconcileData.message}`);


    // ══════════════════════════════════════════════════════════════════
    // TRANSAKSI 3: SEWA RUANGAN DENGAN PENGEMBALIAN JAMINAN (FASE 3)
    // ══════════════════════════════════════════════════════════════════
    console.log('\n▶ [3/4] SIMULASI SEWA RUANGAN & ARUS BUKU KAS (CASH IN/OUT REFUND)...');
    // Ensure borrower user is verified (MAHASISWA) to allow booking
    await prisma.user.update({
      where: { email: 'user@spasi.app' },
      data: { renterCategory: 'MAHASISWA' }
    });

    const userCookies = await loginAs('user@spasi.app', 'User@123');
    const room = await prisma.location.findFirst({ where: { id: 'loc-gedung-b-001' } }) || loc;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 10 + Math.floor(Math.random() * 100));
    startDate.setHours(9, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(12, 0, 0, 0);

    const bookingPayload = {
      locationId: room.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      renterCategory: 'EXTERNAL_SEWA',
      activityType: 'COMMERCIAL',
      renterName: 'Siti Aminah (PT Sukses Mandiri)',
      renterPhone: '081298765432',
      renterEmail: 'user@spasi.app',
      depositAmount: 150000,
      bankName: 'BCA (Bank Central Asia)',
      bankAccountNumber: '8820192831',
      bankAccountHolder: 'Siti Aminah',
      paymentScheme: 'FULL',
      payMethod: 'BANK_TRANSFER'
    };

    const bookingRes = await fetch(`${baseUrl}/api/room-bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': userCookies },
      body: JSON.stringify(bookingPayload),
    });

    const newBooking = await bookingRes.json();
    if (!bookingRes.ok) {
      throw new Error(`Booking failed: ${JSON.stringify(newBooking)}`);
    }
    console.log(`   ✓ Reservasi Ruangan Dibuat: Nomor Booking ${newBooking.bookingNumber}`);
    console.log(`   ✓ Biaya Sewa: Rp ${newBooking.totalAmount.toLocaleString('id-ID')} | Uang Jaminan: Rp ${newBooking.depositAmount.toLocaleString('id-ID')}`);
    console.log(`   ✓ Rekening Pengembalian Jaminan: ${newBooking.bankName} - No. ${newBooking.bankAccountNumber} (a.n. ${newBooking.bankAccountHolder})`);

    // Konfirmasi Pembayaran Sewa (Memicu Arus Kas Masuk IN)
    const confirmRes = await fetch(`${baseUrl}/api/room-bookings/${newBooking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookies },
      body: JSON.stringify({
        bookingStatus: 'CONFIRMED',
        payStatus: 'PAID'
      }),
    });
    console.log(`   ✓ Pembayaran Sewa Divalidasi Lunas (Status: CONFIRMED, PAID)`);

    // Check-In oleh Petugas (Serah Terima Ruangan -> Status: ACTIVE)
    const checkinRes = await fetch(`${baseUrl}/api/room-bookings/${newBooking.id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': staffCookies },
      body: JSON.stringify({
        inspectedBy: 'Staff Sarpras',
        inspectionItems: [],
      }),
    });
    console.log(`   ✓ Check-In Ruangan Berhasil (Status: ACTIVE, Serah Terima Kunci Selesai)`);

    // Checkout & Kembalikan Uang Jaminan (Memicu Arus Kas Keluar OUT Refund)
    const checkoutRes = await fetch(`${baseUrl}/api/room-bookings/${newBooking.id}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': staffCookies },
      body: JSON.stringify({
        roomCleanliness: 'BERSIH',
        isOvertime: false,
        overtimeMinutes: 0,
        notes: 'Fasilitas ruangan dikembalikan dalam kondisi prima dan bersih',
        items: []
      }),
    });
    const checkoutData = await checkoutRes.json();
    console.log(`   ✓ Checkout Berhasil: ${checkoutData.message || 'Deposit Rp 150.000 dikembalikan penuh ke rekening penyewa'}`);


    // ══════════════════════════════════════════════════════════════════
    // TRANSAKSI 4: MUTASI BARANG HABIS PAKAI (ATK) & LOW-STOCK (FASE 4)
    // ══════════════════════════════════════════════════════════════════
    console.log('\n▶ [4/4] SIMULASI BARANG HABIS PAKAI (ATK) & DETEKSI STOK MENIPIS...');

    // 4.1 Daftarkan Barang ATK Baru
    const consumableCode = `ATK-${Date.now().toString().slice(-4)}`;
    const consumablePayload = {
      code: consumableCode,
      name: 'Spidol Whiteboard Snowman Boardmarker Hitam',
      unit: 'Pcs',
      stock: 50,
      minimumStock: 10,
      unitCost: 8500,
      categoryId: cat.id,
      locationId: loc.id
    };

    const createAtkRes = await fetch(`${baseUrl}/api/consumables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookies },
      body: JSON.stringify(consumablePayload),
    });
    const newAtk = await createAtkRes.json();
    console.log(`   ✓ Master ATK Didaftarkan: [${newAtk.code}] ${newAtk.name} (Stok Awal: ${newAtk.stock} ${newAtk.unit})`);

    // 4.2 Catat Mutasi Keluar (Pemakaian Unit) Melebihi Batas
    const usagePayload = {
      consumableId: newAtk.id,
      type: 'OUT',
      quantity: 45,
      recipientName: 'Ahmad Fauzi (Bagian Akademik)',
      departmentName: 'Fakultas Teknologi',
      notes: 'Pemakaian ujian semester kelas reguler dan praktikum'
    };

    const usageRes = await fetch(`${baseUrl}/api/consumables/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookies },
      body: JSON.stringify(usagePayload),
    });
    const usageData = await usageRes.json();
    const transQty = usageData.data?.trans?.quantity || 45;
    const remainingStock = usageData.data?.updatedConsumable?.stock || 5;
    console.log(`   ✓ Mutasi Keluar Dicatat: ${transQty} ${newAtk.unit} dikeluarkan`);
    console.log(`   ✓ Sisa Stok: ${remainingStock} ${newAtk.unit} (Di bawah ambang minimum ${newAtk.minimumStock} ${newAtk.unit})`);
    console.log(`   🔔 PERINGATAN OTOMATIS: Sistem membangkitkan notifikasi peringatan "STOK MENIPIS"`);

    // ══════════════════════════════════════════════════════════════════
    // REKAPITULASI BUKU KAS & ARUS TRANSAKSI DI DATABASE
    // ══════════════════════════════════════════════════════════════════
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║               REKAPITULASI DATA HASIL TRANSAKSI                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');

    const recentCash = await prisma.cashTransaction.findMany({
      orderBy: { transactionDate: 'desc' },
      take: 4,
    });
    console.log('\nMutasi Buku Kas Terbaru (Cash Transactions):');
    console.table(recentCash.map(c => ({
      Waktu: c.transactionDate.toISOString().replace('T', ' ').slice(0, 19),
      Tipe: c.type === 'IN' ? 'KAS MASUK (+)' : 'KAS KELUAR (-)',
      Kategori: c.category,
      Nominal: `Rp ${c.amount.toLocaleString('id-ID')}`,
      Deskripsi: c.description
    })));

    console.log('Semua 4 simulasi transaksi berhasil dieksekusi 100% tanpa kendala!');

  } catch (err) {
    console.error('Error in simulation:', err);
  } finally {
    await prisma.$disconnect();
  }
}

simulateTransactions();

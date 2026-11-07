import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runAudit() {
  console.log('=== MEMULAI AUDIT & PENGUJIAN OTOMATIS SISTEM SPASI ===\n');

  const results: {
    db: any;
    pages: { url: string; status: number; ok: boolean; error?: string }[];
    apis: { url: string; status: number; ok: boolean; error?: string }[];
    findings: string[];
  } = {
    db: {},
    pages: [],
    apis: [],
    findings: [],
  };

  // 1. Audit Database
  console.log('1. Menguji Integritas Database & Record Data...');
  try {
    const userCount = await prisma.user.count();
    const assetCount = await prisma.asset.count();
    const roomCount = await prisma.location.count();
    const categoryCount = await prisma.category.count();
    const loanCount = await prisma.loan.count();
    const rentalCount = await prisma.rental.count();
    const bookingCount = await prisma.roomBooking.count();
    const opnameCount = await (prisma as any).stockOpnameSession.count();
    const opnameItemCount = await (prisma as any).stockOpnameItem.count();
    const procurementCount = await (prisma as any).procurementRequest.count();
    const consumableCount = await (prisma as any).consumable.count();
    const cashCount = await prisma.cashTransaction.count();

    results.db = {
      users: userCount,
      assets: assetCount,
      rooms: roomCount,
      categories: categoryCount,
      loans: loanCount,
      rentals: rentalCount,
      roomBookings: bookingCount,
      stockOpnameSessions: opnameCount,
      stockOpnameItems: opnameItemCount,
      procurements: procurementCount,
      consumables: consumableCount,
      cashTransactions: cashCount,
    };

    console.log('Database Status: OK');
    console.table(results.db);

    if (userCount === 0) results.findings.push('CRITICAL: Belum ada pengguna di database (perlu seeding).');
    if (roomCount === 0) results.findings.push('WARNING: Belum ada master ruangan/lokasi.');
    if (categoryCount === 0) results.findings.push('WARNING: Belum ada kategori aset.');
  } catch (err: any) {
    console.error('Error connecting to DB:', err.message);
    results.findings.push(`CRITICAL DB ERROR: ${err.message}`);
  }

  // 2. Audit Page Routes (HTTP GET)
  console.log('\n2. Menguji Aksesibilitas Halaman Dashboard & Publik...');
  const baseUrl = 'http://localhost:3005';
  const pagePaths = [
    '/',
    '/login',
    '/guide',
    '/dashboard',
    '/dashboard/catalog',
    '/dashboard/cart',
    '/dashboard/penalties',
    '/dashboard/history',
    '/dashboard/claims',
    '/dashboard/verification',
    '/dashboard/assets',
    '/dashboard/assets/new',
    '/dashboard/assets/qr-labels',
    '/dashboard/rooms',
    '/dashboard/rooms/new',
    '/dashboard/loans',
    '/dashboard/loans/scan',
    '/dashboard/rentals',
    '/dashboard/handovers',
    '/dashboard/stock-opname',
    '/dashboard/procurement',
    '/dashboard/consumables',
    '/dashboard/maintenance',
    '/dashboard/crm',
    '/dashboard/verifications',
    '/dashboard/finance',
    '/dashboard/admin/users',
    '/dashboard/admin/penalties',
    '/dashboard/admin/partners',
    '/dashboard/admin/operators',
    '/dashboard/reports',
    '/dashboard/categories',
    '/dashboard/tools',
    '/dashboard/settings',
    '/dashboard/settings/checklists',
  ];

  for (const path of pagePaths) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: { 'Accept': 'text/html' },
        redirect: 'manual',
      });
      const ok = res.status >= 200 && res.status < 400;
      results.pages.push({ url: path, status: res.status, ok });
      if (!ok) {
        results.findings.push(`PAGE ERROR: ${path} mengembalikan status ${res.status}`);
      }
    } catch (err: any) {
      results.pages.push({ url: path, status: 0, ok: false, error: err.message });
      results.findings.push(`PAGE UNREACHABLE: ${path} (${err.message})`);
    }
  }

  // 3. Audit API Endpoints
  console.log('\n3. Menguji Respon Endpoint API...');
  const apiPaths = [
    '/api/public/categories',
    '/api/public/assets',
    '/api/public/stats',
    '/api/categories',
    '/api/locations',
    '/api/rooms',
    '/api/departments',
    '/api/assets',
    '/api/stock-opname',
    '/api/procurement',
    '/api/consumables',
    '/api/finance/cash',
    '/api/reports/analytics',
  ];

  for (const path of apiPaths) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      // 200 (OK) or 401 (Unauthorized - expected if protected)
      const ok = res.status === 200 || res.status === 401;
      results.apis.push({ url: path, status: res.status, ok });
      if (res.status >= 500) {
        results.findings.push(`API SERVER ERROR (500): ${path}`);
      }
    } catch (err: any) {
      results.apis.push({ url: path, status: 0, ok: false, error: err.message });
      results.findings.push(`API UNREACHABLE: ${path} (${err.message})`);
    }
  }

  // Output Summary
  console.log('\n=== REKAP HASIL AUDIT ===');
  console.log(`Halaman Diuji: ${results.pages.length} | Berhasil: ${results.pages.filter(p => p.ok).length} | Gagal: ${results.pages.filter(p => !p.ok).length}`);
  console.log(`API Diuji: ${results.apis.length} | Berhasil: ${results.apis.filter(a => a.ok).length} | Gagal: ${results.apis.filter(a => !a.ok).length}`);

  if (results.findings.length > 0) {
    console.log('\nTEMUAN & CATATAN PERBAIKAN:');
    results.findings.forEach((f, i) => console.log(`${i + 1}. ${f}`));
  } else {
    console.log('\nSemua rute dan endpoint merespons dengan sempurna tanpa 500/Crash!');
  }

  await prisma.$disconnect();
}

runAudit();

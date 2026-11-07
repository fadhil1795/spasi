async function testAuthFlow() {
  const baseUrl = 'http://localhost:3005';
  console.log('=== TEST LOGIN & AUTHENTICATED DASHBOARD PAGES ===\n');

  // 1. Get CSRF Token
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = csrfRes.headers.getSetCookie();
  const csrfCookieHeader = csrfCookies.map(c => c.split(';')[0]).join('; ');
  console.log('1. Got CSRF Token:', csrfToken);

  // 2. Perform Login with Credentials
  const params = new URLSearchParams();
  params.append('csrfToken', csrfToken);
  params.append('email', 'admin@spasi.app');
  params.append('password', 'Admin@123');
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
  console.log('2. Login Response Status:', loginRes.status);
  
  // Combine cookies
  const cookies = [...csrfCookies, ...sessionCookies].map(c => c.split(';')[0]).join('; ');
  console.log('3. Session Cookies Acquired.\n');

  // 3. Test all dashboard pages with session cookies!
  const dashboardPages = [
    '/dashboard',
    '/dashboard/catalog',
    '/dashboard/cart',
    '/dashboard/penalties',
    '/dashboard/history',
    '/dashboard/claims',
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

  const results = [];

  for (const page of dashboardPages) {
    try {
      const res = await fetch(`${baseUrl}${page}`, {
        method: 'GET',
        headers: {
          'Cookie': cookies,
          'Accept': 'text/html',
        },
        redirect: 'manual',
      });
      const text = await res.text();
      const hasError = text.includes('"statusCode":500') || res.status >= 500;
      const status = hasError ? 500 : res.status;
      results.push({ url: page, status, ok: !hasError && res.status < 400 });
      console.log(`[${status}] ${page} -> ${hasError ? 'ERROR 500' : 'OK'}`);
      if (hasError) {
        const match = text.match(/"message":"([^"]+)"/);
        if (match) console.log(`   Detail: ${match[1]}`);
      }
    } catch (e) {
      console.log(`[FAILED] ${page}: ${e.message}`);
      results.push({ url: page, status: 0, ok: false, error: e.message });
    }
  }

  console.log('\n=== REKAP TEST HALAMAN DASHBOARD TERAUTENTIKASI ===');
  console.log(`Total: ${results.length} | Berhasil: ${results.filter(r => r.ok).length} | Error: ${results.filter(r => !r.ok).length}`);
}

testAuthFlow();

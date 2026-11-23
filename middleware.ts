import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any;
    const role = token?.role || 'BORROWER';
    const pathname = req.nextUrl.pathname;

    if (role === 'BORROWER') {
      const restrictedPrefixes = [
        '/dashboard/admin',
        '/dashboard/crm',
        '/dashboard/finance',
        '/dashboard/procurement',
        '/dashboard/stock-opname',
        '/dashboard/consumables',
        '/dashboard/buildings',
        '/dashboard/transfers',
        '/dashboard/brands',
        '/dashboard/categories',
        '/dashboard/tools',
        '/dashboard/reports',
        '/dashboard/logs',
        '/dashboard/verifications',
      ];
      if (restrictedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*'],
};


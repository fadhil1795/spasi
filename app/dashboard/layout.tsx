'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ToastProvider } from '@/components/ui/Toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParamsRaw = typeof window !== 'undefined' ? window.location.search : '';
  const [collapsed, setCollapsed] = useState(false);
  const [paramsAuthorized, setParamsAuthorized] = useState(true);

  React.useEffect(() => {
    if (window.innerWidth <= 768) {
      setCollapsed(true);
    }
  }, []);

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const userRole = (session?.user as any)?.role || 'BORROWER';

  // 1. Synchronous route authorization validation (path-based checks only, safe from race conditions)
  let isAuthorized = true;
  if (status === 'authenticated') {
    const isPath = (path: string) => pathname === path || pathname.startsWith(path + '/');

    if (userRole === 'BORROWER') {
      const isRoomBookingDetail = pathname.startsWith('/dashboard/room-bookings/') &&
        !pathname.includes('/scan') &&
        !pathname.includes('/checkin') &&
        !pathname.includes('/checkout');

      if (
        isPath('/dashboard/admin') ||
        isPath('/dashboard/crm') ||
        isPath('/dashboard/assets') ||
        isPath('/dashboard/rooms') ||
        isPath('/dashboard/maintenance') ||
        isPath('/dashboard/finance') ||
        isPath('/dashboard/handovers') ||
        isPath('/dashboard/verifications') ||
        isPath('/dashboard/categories') ||
        isPath('/dashboard/tools') ||
        isPath('/dashboard/reports') ||
        isPath('/dashboard/procurement') ||
        isPath('/dashboard/stock-opname') ||
        isPath('/dashboard/consumables') ||
        isPath('/dashboard/buildings') ||
        isPath('/dashboard/transfers') ||
        isPath('/dashboard/brands') ||
        isPath('/dashboard/logs') ||
        (isPath('/dashboard/room-bookings') && !isRoomBookingDetail) ||
        isPath('/dashboard/returns') ||
        isPath('/dashboard/loans/scan')
      ) {
        isAuthorized = false;
      }
    } else if (userRole === 'STAFF') {
      if (
        isPath('/dashboard/verifications') ||
        isPath('/dashboard/admin/users') ||
        isPath('/dashboard/finance') ||
        isPath('/dashboard/admin/partners') ||
        isPath('/dashboard/categories') ||
        isPath('/dashboard/tools') ||
        isPath('/dashboard/reports')
      ) {
        isAuthorized = false;
      }
    } else if (userRole === 'ADMIN') {
      if (isPath('/dashboard/admin/users')) {
        isAuthorized = false;
      }
    }
  }

  // 2. Reactively check search-params-based restrictions inside useEffect (prevents soft-navigation race conditions)
  React.useEffect(() => {
    if (status !== 'authenticated') return;

    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const mode = params.get('mode');

    const canAccessSettings = () => {
      if (['SUPER_ADMIN', 'ADMIN'].includes(userRole)) return true;
      if (pathname === '/dashboard/settings') {
        const activeTab = tab || 'profile';
        return ['profile', 'sanctions'].includes(activeTab);
      }
      if (pathname.startsWith('/dashboard/settings/')) return false;
      return true;
    };

    const checkParams = () => {
      // Protect settings page first
      if (!canAccessSettings()) return false;

      // Allow settings page for everyone who passed canAccessSettings check
      if (pathname === '/dashboard/settings') return true;

      // Check query parameter permissions
      if (userRole === 'BORROWER') {
        const renterCategory = (session?.user as any)?.renterCategory || 'EXTERNAL';
        const isExternal = renterCategory === 'EXTERNAL';

        if (pathname === '/dashboard/loans' && mode !== 'my') return false;
        if (pathname === '/dashboard/loans/new' && isExternal) return false;
        if (pathname === '/dashboard/rentals' && mode !== 'my') return false;
        if (pathname === '/dashboard/rentals/new' && isExternal) return false;
        if (pathname === '/dashboard/room-bookings/new' && isExternal) return false;
      }

      if (userRole === 'APPROVER') {
        if (pathname === '/dashboard/rentals' && mode !== 'my') return false;
      }

      return true;
    };

    const allowed = checkParams();
    setParamsAuthorized(allowed);

    if (!allowed) {
      router.replace('/dashboard');
    }
  }, [status, pathname, searchParamsRaw, router, userRole, session]);

  React.useEffect(() => {
    if (status === 'authenticated' && !isAuthorized) {
      router.replace('/dashboard');
    }
  }, [status, isAuthorized, router]);

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Memuat Sesi Pengguna...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !isAuthorized || !paramsAuthorized) {
    return null;
  }

  return (
    <ToastProvider>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <React.Suspense fallback={null}>
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        </React.Suspense>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Topbar collapsed={collapsed} setCollapsed={setCollapsed} />
          <main style={{ flex: 1, padding: '2rem 1.75rem' }}>
            <React.Suspense fallback={<div style={{ padding: '2rem', color: 'var(--color-muted)' }}>Memuat halaman...</div>}>
              {children}
            </React.Suspense>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

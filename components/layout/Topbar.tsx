'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/app/providers';
import { useSession } from 'next-auth/react';
import { Sun, Moon, Bell, Menu, Search, User as UserIcon } from 'lucide-react';

interface TopbarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ collapsed, setCollapsed }) => {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();

  const getBreadcrumb = () => {
    if (pathname === '/dashboard') return 'Dashboard Overview';
    if (pathname.startsWith('/dashboard/assets')) return 'Manajemen & Katalog Aset';
    if (pathname.startsWith('/dashboard/loans')) return 'Peminjaman Aset Internal';
    if (pathname.startsWith('/dashboard/rentals')) return 'Penyewaan Aset Eksternal';
    if (pathname.startsWith('/dashboard/maintenance')) return 'Perawatan & Maintenance';
    if (pathname.startsWith('/dashboard/reports')) return 'Laporan & Analytics';
    if (pathname.startsWith('/dashboard/settings')) return 'Pengaturan Sistem';
    return 'Dashboard';
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 80,
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Left: Sidebar Toggle & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'var(--color-surface2)',
            border: '1px solid var(--color-border)',
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Menu size={18} />
        </button>

        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)' }}>
          {getBreadcrumb()}
        </h2>
      </div>

      {/* Right: Search, Theme Toggle, Notification Bell, User Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--color-surface2)',
            border: '1px solid var(--color-border)',
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Toggle Dark/Light Mode"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div style={{ position: 'relative' }}>
          <button
            style={{
              background: 'var(--color-surface2)',
              border: '1px solid var(--color-border)',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bell size={18} />
          </button>
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
            }}
          />
        </div>

        {session?.user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.3rem 0.75rem',
              background: 'var(--color-surface2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <UserIcon size={14} style={{ color: 'var(--color-primary-light)' }} />
            <span>{session.user.name?.split(' ')[0]}</span>
          </div>
        )}
      </div>
    </header>
  );
};

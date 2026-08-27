'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/providers';
import { useCart } from '@/components/public/CartContext';
import { Sun, Moon, LogIn, LayoutDashboard, Box, HelpCircle, Building2, ShoppingBag, Home, User } from 'lucide-react';

export const PublicNavbar: React.FC = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { totalItemCount } = useCart();

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <header
        className="desktop-nav"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          borderBottom: '1px solid var(--color-border)',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--grad-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '1.2rem',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              S
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.02em' }}>SPASI</div>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', fontWeight: 600 }}>
                Pencatatan & Sewa Pinjam
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="desktop-nav">
            <Link
              href="/"
              style={{
                fontSize: '0.9rem',
                fontWeight: isActive('/') ? 700 : 500,
                color: isActive('/') ? 'var(--color-primary)' : 'var(--color-text)',
                transition: 'color 0.2s',
              }}
            >
              Beranda
            </Link>
            <Link
              href="/assets"
              style={{
                fontSize: '0.9rem',
                fontWeight: isActive('/assets') ? 700 : 500,
                color: isActive('/assets') ? 'var(--color-primary)' : 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'color 0.2s',
              }}
            >
              <Box size={16} /> Katalog
            </Link>
            <Link
              href="/rooms"
              style={{
                fontSize: '0.9rem',
                fontWeight: isActive('/rooms') || pathname.startsWith('/rooms/') ? 700 : 500,
                color: isActive('/rooms') || pathname.startsWith('/rooms/') ? 'var(--color-primary)' : 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'color 0.2s',
              }}
            >
              <Building2 size={16} /> Ruangan
            </Link>
            <Link
              href="/guide"
              style={{
                fontSize: '0.9rem',
                fontWeight: isActive('/guide') ? 700 : 500,
                color: isActive('/guide') ? 'var(--color-primary)' : 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'color 0.2s',
              }}
            >
              <HelpCircle size={16} /> Panduan
            </Link>
          </nav>

          {/* Actions (Theme, Cart & Auth) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button
              onClick={toggleTheme}
              style={{
                background: 'var(--color-surface2)',
                border: '1px solid var(--color-border)',
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Ganti Tema (Dark/Light)"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              href="/cart"
              className="desktop-nav"
              style={{
                background: totalItemCount > 0 ? 'var(--color-primary-light, rgba(37,99,235,0.1))' : 'var(--color-surface2)',
                border: `1px solid ${totalItemCount > 0 ? 'var(--color-primary)' : 'var(--color-border)'}`,
                padding: '0 0.85rem',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                color: totalItemCount > 0 ? 'var(--color-primary)' : 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                position: 'relative',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              title="Keranjang Pemesanan"
            >
              <ShoppingBag size={18} />
              <span>Keranjang</span>
              {totalItemCount > 0 && (
                <span
                  style={{
                    background: 'var(--color-primary)',
                    color: '#FFFFFF',
                    borderRadius: '50%',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '0.2rem',
                  }}
                >
                  {totalItemCount}
                </span>
              )}
            </Link>

            {session ? (
              <Link
                href="/dashboard"
                className="desktop-nav"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--grad-primary)',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-glow)',
                }}
              >
                <LayoutDashboard size={16} /> Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="desktop-nav"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--grad-primary)',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-glow)',
                }}
              >
                <LogIn size={16} /> Masuk
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div
        className="mobile-bottom-bar"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px',
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          borderTop: '1px solid var(--color-border)',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 100,
          padding: '0 0.5rem',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            color: isActive('/') ? 'var(--color-primary)' : 'var(--color-muted)',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: isActive('/') ? 700 : 500,
            transition: 'color 0.2s',
          }}
        >
          <Home size={20} />
          <span>Beranda</span>
        </Link>

        <Link
          href="/assets"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            color: isActive('/assets') ? 'var(--color-primary)' : 'var(--color-muted)',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: isActive('/assets') ? 700 : 500,
            transition: 'color 0.2s',
          }}
        >
          <Box size={20} />
          <span>Katalog</span>
        </Link>

        <Link
          href="/rooms"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            color: isActive('/rooms') || pathname.startsWith('/rooms/') ? 'var(--color-primary)' : 'var(--color-muted)',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: isActive('/rooms') || pathname.startsWith('/rooms/') ? 700 : 500,
            transition: 'color 0.2s',
          }}
        >
          <Building2 size={20} />
          <span>Ruangan</span>
        </Link>

        <Link
          href="/cart"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            color: isActive('/cart') ? 'var(--color-primary)' : 'var(--color-muted)',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: isActive('/cart') ? 700 : 500,
            position: 'relative',
            transition: 'color 0.2s',
          }}
        >
          <ShoppingBag size={20} />
          <span>Keranjang</span>
          {totalItemCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '4px',
                background: 'var(--color-primary)',
                color: '#FFFFFF',
                borderRadius: '50%',
                minWidth: '16px',
                height: '16px',
                padding: '0 3px',
                fontSize: '0.65rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {totalItemCount}
            </span>
          )}
        </Link>

        <Link
          href={session ? '/dashboard' : '/login'}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            color: isActive('/dashboard') || isActive('/login') ? 'var(--color-primary)' : 'var(--color-muted)',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: isActive('/dashboard') || isActive('/login') ? 700 : 500,
            transition: 'color 0.2s',
          }}
        >
          {session ? <User size={20} /> : <LogIn size={20} />}
          <span>{session ? 'Akun' : 'Masuk'}</span>
        </Link>
      </div>
    </>
  );
};

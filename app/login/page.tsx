'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  LogIn,
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Building2,
  Box,
  QrCode,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'admin@spasi.app', pass: 'Admin@123', badge: 'Full Access' },
  { role: 'Admin Sarpras', email: 'aset@spasi.app', pass: 'Admin@123', badge: 'L2 & Aset' },
  { role: 'Kepala Unit', email: 'kepala@spasi.app', pass: 'Kepala@123', badge: 'Approver L1' },
  { role: 'Staf Operasional', email: 'staff@spasi.app', pass: 'Staff@123', badge: 'QR & Handover' },
  { role: 'Peminjam / User', email: 'user@spasi.app', pass: 'User@123', badge: 'Borrower' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Email dan password wajib diisi');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setErrorMsg(res.error || 'Login gagal. Periksa kembali email dan password Anda.');
      } else if (res?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMsg('Terjadi kesalahan saat proses login.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        backgroundColor: 'var(--color-bg)',
        position: 'relative',
      }}
    >
      {/* Left Column: Modern Crimson #E4252C Hero Showcase */}
      <div
        className="desktop-nav"
        style={{
          background: 'linear-gradient(145deg, #160406 0%, #5c0b10 42%, #B91C22 78%, #E4252C 100%)',
          padding: '3.25rem 3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative Ambient Orbs */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-100px',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(228, 37, 44, 0.45) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-140px',
            left: '-80px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Brand & Headline */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.85rem',
              marginBottom: '2.75rem',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: '#E4252C',
                boxShadow: '0 8px 24px rgba(228, 37, 44, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.45rem',
                color: '#FFFFFF',
              }}
            >
              S
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1.1 }}>
                SPASI
              </div>
              <div style={{ fontSize: '0.72rem', opacity: 0.8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Smart Asset &amp; Venue System
              </div>
            </div>
          </Link>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Sparkles size={14} /> Portal Terpadu Sarana &amp; Prasarana
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 3.2vw, 2.75rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              marginBottom: '1.1rem',
              letterSpacing: '-0.02em',
            }}
          >
            Kelola Aset, Ruangan &amp; Sirkulasi Lebih Cepat.
          </h1>
          <p
            style={{
              opacity: 0.88,
              fontSize: '1rem',
              lineHeight: 1.65,
              maxWidth: '500px',
              marginBottom: '2.25rem',
            }}
          >
            Satu ekosistem digital untuk peminjaman multi-aset, reservasi ruangan Sarpras, serah terima berbasis QR Code, hingga BAST dan pelaporan otomatis.
          </p>

          {/* Feature Highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: '500px' }}>
            {[
              {
                icon: <Box size={18} />,
                title: 'Peminjaman & Serah Terima Paket Multi-Aset',
                desc: 'Ajukan banyak peralatan dalam satu halaman, setujui dan serah-terimakan sekaligus.',
              },
              {
                icon: <Building2 size={18} />,
                title: 'Reservasi Ruangan & Sarpras Terpadu',
                desc: 'Cek jadwal ketersediaan real-time, dukungan E-Voucher digital, dan pengelolaan sewa.',
              },
              {
                icon: <QrCode size={18} />,
                title: 'Verifikasi QR Cepat & BAST Otomatis',
                desc: 'Check-In/Check-Out instan dengan kamera serta pencatatan timestamp akurat.',
              },
            ].map((feat, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '0.9rem 1.1rem',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(228, 37, 44, 0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '0.1rem',
                  }}
                >
                  {feat.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.15rem' }}>{feat.title}</div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.82, lineHeight: 1.45 }}>{feat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Security Badge */}
        <div style={{ position: 'relative', zIndex: 1, marginTop: '2.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.8rem',
              opacity: 0.85,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
              <ShieldCheck size={16} /> Role-Based Access Control (RBAC)
            </span>
            <span>© {new Date().getFullYear()} SPASI Platform</span>
          </div>
        </div>
      </div>

      {/* Right Column: Modern Login Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          background:
            'radial-gradient(circle at top right, rgba(228, 37, 44, 0.08) 0%, transparent 45%)',
        }}
      >
        <div
          style={{
            maxWidth: '450px',
            width: '100%',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            padding: '2.25rem 2rem',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top Crimson Accent Bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #E4252C 0%, #F0484E 50%, #B91C22 100%)',
            }}
          />

          <div style={{ marginBottom: '1.75rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#E4252C',
                background: 'rgba(228, 37, 44, 0.12)',
                padding: '0.28rem 0.7rem',
                borderRadius: '999px',
                marginBottom: '0.75rem',
              }}
            >
              <Lock size={12} /> Autentikasi Pengguna
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.35rem', letterSpacing: '-0.01em' }}>
              Masuk ke Akun Anda
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem' }}>
              Masukkan email atau username untuk mengakses dashboard SPASI.
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                backgroundColor: 'var(--color-danger-bg)',
                border: '1px solid rgba(228, 37, 44, 0.35)',
                color: 'var(--color-danger)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                lineHeight: 1.5,
              }}
            >
              {errorMsg === 'User tidak ditemukan' || errorMsg.includes('tidak ditemukan') ? (
                <span>
                  Email Anda belum terdaftar di database SPASI. Silakan{' '}
                  <Link
                    href="/register"
                    style={{ fontWeight: 700, textDecoration: 'underline', color: '#E4252C' }}
                  >
                    daftar akun baru di sini
                  </Link>
                  .
                </span>
              ) : (
                errorMsg
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Username atau Alamat Email"
              type="text"
              placeholder="nama@instansi.ac.id"
              icon={<Mail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div style={{ position: 'relative' }}>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password"
                icon={<Lock size={18} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Tampilkan password"
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '2.25rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-muted)',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                background: 'linear-gradient(135deg, #E4252C 0%, #B91C22 100%)',
                boxShadow: '0 6px 20px rgba(228, 37, 44, 0.35)',
                border: 'none',
              }}
            >
              <LogIn size={19} /> Masuk Sekarang
            </Button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '1.35rem 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
            <span style={{ margin: '0 0.85rem', fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600 }}>
              ATAU
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
          </div>

          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl })}
            style={{
              width: '100%',
              padding: '0.72rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface2)',
              color: 'var(--color-text)',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Masuk dengan Google
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.15rem', fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--color-muted)' }}>Belum punya akun? </span>
            <Link href="/register" style={{ color: '#E4252C', fontWeight: 700 }}>
              Daftar Sekarang
            </Link>
          </div>

          {/* Modern Quick Demo Role Chips */}
          <div
            style={{
              marginTop: '1.5rem',
              borderTop: '1px solid var(--color-border)',
              paddingTop: '1.15rem',
            }}
          >
            <div
              style={{
                fontSize: '0.73rem',
                color: 'var(--color-muted)',
                fontWeight: 700,
                marginBottom: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>⚡ Akses Cepat Akun Demo</span>
              <span style={{ fontSize: '0.68rem', color: '#E4252C' }}>Klik untuk isi</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemoAccount(acc.email, acc.pass)}
                  style={{
                    gridColumn: idx === DEMO_ACCOUNTS.length - 1 ? '1 / -1' : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.7rem',
                    borderRadius: '10px',
                    border: email === acc.email ? '1px solid #E4252C' : '1px solid var(--color-border)',
                    background:
                      email === acc.email ? 'rgba(228, 37, 44, 0.12)' : 'var(--color-surface2)',
                    color: 'var(--color-text)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{acc.role}</span>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '999px',
                      background: 'rgba(228, 37, 44, 0.16)',
                      color: '#F0484E',
                      fontWeight: 700,
                    }}
                  >
                    {acc.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.35rem' }}>
            <Link
              href="/"
              style={{
                color: 'var(--color-muted)',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={14} /> Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem', textAlign: 'center' }}>Memuat halaman login...</p>}>
      <LoginForm />
    </Suspense>
  );
}

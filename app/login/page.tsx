'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LogIn, Lock, Mail, ShieldCheck, Eye, EyeOff } from 'lucide-react';

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
    } catch (err: any) {
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {/* Left Column: Branded Hero Panel */}
      <div
        className="desktop-nav"
        style={{
          background: 'var(--grad-primary)',
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.4rem',
              }}
            >
              S
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.03em' }}>SPASI</span>
          </Link>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem' }}>
            Selamat Datang di Portal SPASI
          </h1>
          <p style={{ opacity: 0.9, fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '480px' }}>
            Sistem Informasi Pengelolaan Inventaris Aset, Peminjaman Sarana Internal, dan Penyewaan Eksternal Berbasis Digital.
          </p>
        </div>

        <div style={{ marginTop: '3rem' }}>
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={18} /> Keamanan & Akses Terkontrol
            </div>
            Akses sistem dibatasi sesuai dengan hak akses peran pengguna (Super Admin, Admin Aset, Kepala Unit, Staff, dan Peminjam).
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '1.5rem' }}>
            © {new Date().getFullYear()} SPASI Platform PWA.
          </div>
        </div>
      </div>

      {/* Right Column: Login Form & Demo Quick Accs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: '420px', width: '100%' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>Masuk Akun</h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
              Masukkan kredensial Anda untuk melanjutkan ke dashboard.
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                backgroundColor: 'var(--color-danger-bg)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--color-danger)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                marginBottom: '1.5rem',
                animation: 'fadeInUp 0.3s ease',
                lineHeight: 1.5,
              }}
            >
              {errorMsg === 'User tidak ditemukan' || errorMsg.includes('tidak ditemukan') ? (
                <span>
                  Email Anda belum terdaftar di database SPASI. Silakan{' '}
                  <Link href="/register" style={{ fontWeight: 700, textDecoration: 'underline', color: 'var(--color-danger)' }}>
                    daftar (sign up) di sini
                  </Link>{' '}
                  terlebih dahulu untuk membuat akun.
                </span>
              ) : (
                errorMsg
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Alamat Email"
              type="email"
              placeholder="nama@spasi.app"
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
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              <LogIn size={20} /> Masuk Sekarang
            </Button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
            <span style={{ margin: '0 1rem', fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>ATAU</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
          </div>

          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl })}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface2)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Masuk dengan Google
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--color-muted)' }}>Belum punya akun? </span>
            <Link href="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Daftar di sini
            </Link>
          </div>

          {/* Quick Demo Login Shortcuts */}
          <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Klik Akun Demo (Untuk Pengujian):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => fillDemoAccount('admin@spasi.app', 'Admin@123')}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between' }}
              >
                <span>🔑 Super Admin</span> <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>admin@spasi.app</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('kepala@spasi.app', 'Kepala@123')}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between' }}
              >
                <span>📋 Kepala Unit (Approver)</span> <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>kepala@spasi.app</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('user@spasi.app', 'User@123')}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between' }}
              >
                <span>👤 Peminjam Demo</span> <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>user@spasi.app</span>
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link href="/" style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
              ← Kembali ke Halaman Utama
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem', textAlign: 'center' }}>Loading login page...</p>}>
      <LoginForm />
    </Suspense>
  );
}

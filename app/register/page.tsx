'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UserPlus, Lock, Mail, User, Eye, EyeOff } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setErrorMsg('Semua kolom wajib diisi');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'Pendaftaran gagal');
      } else {
        setSuccessMsg('Pendaftaran berhasil! Mengarahkan ke halaman login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan sistem saat pendaftaran.');
    } finally {
      setLoading(false);
    }
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
            Bergabung dengan SPASI
          </h1>
          <p style={{ opacity: 0.9, fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '480px' }}>
            Daftarkan diri Anda untuk mulai meminjam aset dan menyewa ruangan secara digital dengan cepat dan transparan.
          </p>
        </div>

        <div style={{ marginTop: '3rem' }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '1.5rem' }}>
            © {new Date().getFullYear()} SPASI Platform PWA.
          </div>
        </div>
      </div>

      {/* Right Column: Register Form */}
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
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>Buat Akun Baru</h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
              Isi data diri Anda di bawah ini untuk mendaftar.
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
              }}
            >
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#16a34a',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                marginBottom: '1.5rem',
                animation: 'fadeInUp 0.3s ease',
              }}
            >
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Nama Lengkap"
              type="text"
              placeholder="John Doe"
              icon={<User size={18} />}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

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
                placeholder="Buat password"
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
              <UserPlus size={20} /> Daftar Akun
            </Button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
            <span style={{ margin: '0 1rem', fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>ATAU</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
          </div>

          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
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
            Daftar dengan Google
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--color-muted)' }}>Sudah punya akun? </span>
            <Link href="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Masuk di sini
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem', textAlign: 'center' }}>Loading register page...</p>}>
      <RegisterForm />
    </Suspense>
  );
}

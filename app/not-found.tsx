import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        padding: '2rem 1.5rem',
      }}
    >
      <div
        className="spasi-card"
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-surface2)',
            color: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FileQuestion size={32} />
        </div>

        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.2rem' }}>404</h1>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Halaman Tidak Ditemukan</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Halaman yang Anda cari mungkin tidak ada atau telah dipindahkan.
          </p>
        </div>

        <Link href="/" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
          <Home size={18} /> Kembali ke Beranda Utama
        </Link>
      </div>
    </div>
  );
}

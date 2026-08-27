'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('SPASI App Error Boundary caught:', error);
  }, [error]);

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
          maxWidth: '520px',
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
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AlertTriangle size={32} />
        </div>

        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Terjadi Kesalahan Sistem
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.92rem', lineHeight: 1.5 }}>
            Aplikasi mengalami masalah saat memproses rute ini. Silakan coba muat ulang atau kembali ke halaman utama.
          </p>
        </div>

        {error.message && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface2)',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: 'var(--color-danger)',
              wordBreak: 'break-word',
              maxWidth: '100%',
            }}
          >
            {error.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem' }}>
          <button onClick={() => reset()} className="btn btn-primary">
            <RefreshCw size={18} /> Coba Muat Ulang
          </button>

          <Link href="/" className="btn btn-secondary">
            <Home size={18} /> Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

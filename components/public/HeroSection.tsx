'use client';

import React from 'react';
import Link from 'next/link';
import { StatCounter } from '@/components/ui/StatCounter';
import { ArrowRight, Box, ShieldCheck, QrCode } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section
      style={{
        position: 'relative',
        padding: '5rem 1.5rem 4rem 1.5rem',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 20%, rgba(79, 70, 229, 0.15) 0%, transparent 60%)',
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        {/* Badge Banner */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--color-surface2)',
            border: '1px solid var(--color-border)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--color-primary-light)',
            marginBottom: '1.75rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <ShieldCheck size={16} /> Sistem Manajemen Aset & Sewa Pinjam Terpadu
        </div>

        {/* Hero Title */}
        <h1 className="text-hero" style={{ marginBottom: '1.25rem' }}>
          Kelola Aset, Peminjaman & <br />
          <span className="text-gradient">Penyewaan dengan Mudah</span>
        </h1>

        {/* Hero Subtitle */}
        <p
          style={{
            fontSize: '1.15rem',
            color: 'var(--color-muted)',
            maxWidth: '720px',
            margin: '0 auto 2.5rem auto',
            lineHeight: 1.6,
          }}
        >
          Platform berbasis web & PWA installable untuk inventarisasi aset fisik, peminjaman sarana internal dengan QR Code scanner, dan penyewaan aset eksternal secara efisien.
        </p>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '4rem',
          }}
        >
          <Link href="/assets" className="btn btn-primary btn-lg">
            <Box size={20} /> Lihat Aset Tersedia <ArrowRight size={18} />
          </Link>
          <Link href="/login" className="btn btn-secondary btn-lg">
            Login / Masuk Sistem
          </Link>
        </div>

        {/* Stats Section */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1.5rem',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem 1rem',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <StatCounter value={250} label="Total Aset Fisik" suffix="+" />
          <StatCounter value={48} label="Peminjaman Aktif" />
          <StatCounter value={100} label="Akurasi QR Scan" suffix="%" />
          <StatCounter value={24} label="Akses Instan PWA" suffix="/7" />
        </div>
      </div>
    </section>
  );
};

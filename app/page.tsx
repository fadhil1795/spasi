'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicNavbar } from '@/components/public/Navbar';
import { HeroSection } from '@/components/public/HeroSection';
import { AssetCard } from '@/components/public/AssetCard';
import { FilterPill } from '@/components/ui/FilterPill';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Search, ArrowRight, Calendar, ShieldCheck, QrCode } from 'lucide-react';

export default function LandingPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [resAssets, resCat] = await Promise.all([
        fetch('/api/public/assets'),
        fetch('/api/public/categories'),
      ]);

      if (resAssets.ok) setAssets(await resAssets.json());
      if (resCat.ok) setCategories(await resCat.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = selectedCategory === 'ALL' || asset.categoryId === selectedCategory;
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <PublicNavbar />
      <main style={{ flex: 1 }}>
        <HeroSection />

        {/* Public Catalog Preview Section */}
        <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>
                Katalog <span className="text-gradient">Aset & Sarana</span>
              </h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
                Jelajahi daftar aset fisik, peralatan, kendaraan, dan ruangan yang siap digunakan.
              </p>
            </div>

            <Link href="/assets" className="btn btn-ghost" style={{ color: 'var(--color-primary-light)' }}>
              Lihat Semua Aset <ArrowRight size={16} />
            </Link>
          </div>

          {/* Search & Filter Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <div style={{ maxWidth: '480px' }}>
              <Input
                placeholder="Cari nama atau kode aset..."
                icon={<Search size={18} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              <FilterPill
                label="Semua Kategori"
                active={selectedCategory === 'ALL'}
                onClick={() => setSelectedCategory('ALL')}
                count={assets.length}
              />
              {categories.map((cat) => (
                <FilterPill
                  key={cat.id}
                  label={cat.name}
                  active={selectedCategory === cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  count={assets.filter((a) => a.categoryId === cat.id).length}
                />
              ))}
            </div>
          </div>

          {/* Asset Cards Grid */}
          {loading ? (
            <div className="catalog-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="spasi-card" style={{ padding: '1rem' }}>
                  <Skeleton height="180px" borderRadius="var(--radius-md)" style={{ marginBottom: '1rem' }} />
                  <Skeleton height="1.2rem" width="80%" style={{ marginBottom: '0.5rem' }} />
                  <Skeleton height="1rem" width="50%" />
                </div>
              ))}
            </div>
          ) : filteredAssets.length > 0 ? (
            <div className="catalog-grid">
              {filteredAssets.slice(0, 8).map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          ) : (
            <div className="spasi-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <p style={{ color: 'var(--color-muted)', fontSize: '1rem' }}>Tidak ada aset yang sesuai dengan kriteria pencarian.</p>
            </div>
          )}
        </section>

        {/* How it Works Section */}
        <section
          style={{
            backgroundColor: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
            padding: '4rem 1.5rem',
            marginTop: '2rem',
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                Alur Kerja <span className="text-gradient">Sistem SPASI</span>
              </h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '1rem' }}>
                4 langkah mudah peminjaman & penyewaan aset transparan berbasis digital
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '2rem' }}>
              {[
                {
                  step: '01',
                  title: 'Pilih & Cari Aset',
                  desc: 'Temukan aset atau sarana yang dibutuhkan di katalog publik terintegrasi real-time.',
                  icon: <Search size={24} style={{ color: 'var(--color-primary)' }} />,
                },
                {
                  step: '02',
                  title: 'Ajukan Request',
                  desc: 'Isi form wizard 4 langkah (jadwal, aset, keperluan) tanpa risiko konflik jadwal.',
                  icon: <Calendar size={24} style={{ color: 'var(--color-primary)' }} />,
                },
                {
                  step: '03',
                  title: 'Approval Berjenjang',
                  desc: 'Persetujuan otomatis dari Kepala Unit & Admin Aset dengan transparansi jejak digital.',
                  icon: <ShieldCheck size={24} style={{ color: 'var(--color-primary)' }} />,
                },
                {
                  step: '04',
                  title: 'Scan QR & Pakai',
                  desc: 'Tunjukkan surat izin PDF / Scan QR Code fisik aset via kamera HP untuk check-in/out.',
                  icon: <QrCode size={24} style={{ color: 'var(--color-primary)' }} />,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="spasi-card"
                  style={{
                    position: 'relative',
                    padding: '2rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1.25rem',
                      fontSize: '1.8rem',
                      fontWeight: 900,
                      color: 'var(--color-surface2)',
                    }}
                  >
                    {item.step}
                  </div>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{item.title}</h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--color-muted)',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
            SPASI — Sistem Pencatatan Aset, Sewa & Pinjam Instansi
          </div>
          <div>© {new Date().getFullYear()} SPASI App Platform. Installable Web Application (PWA).</div>
        </div>
      </footer>
    </div>
  );
}

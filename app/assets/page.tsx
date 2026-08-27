'use client';

import React, { useEffect, useState } from 'react';
import { PublicNavbar } from '@/components/public/Navbar';
import { AssetCard } from '@/components/public/AssetCard';
import { FilterPill } from '@/components/ui/FilterPill';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Search, SlidersHorizontal } from 'lucide-react';

export default function PublicAssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resAssets, resCat] = await Promise.all([
        fetch('/api/public/assets'),
        fetch('/api/public/categories'),
      ]);

      if (resAssets.ok) setAssets(await resAssets.json());
      if (resCat.ok) setCategories(await resCat.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = assets.filter((asset) => {
    const matchCat = selectedCategory === 'ALL' || asset.categoryId === selectedCategory;
    const matchStatus = statusFilter === 'ALL' || asset.status === statusFilter;
    const matchSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchStatus && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <PublicNavbar />
      <main style={{ flex: 1, maxWidth: '1280px', margin: '0 auto', padding: '3rem 1.5rem', width: '100%' }}>
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Daftar <span className="text-gradient">Katalog Aset</span>
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            Cari dan jelajahi seluruh aset fisik, peralatan, kendaraan operasional, dan sarana instansi.
          </p>
        </div>

        {/* Filter Bar */}
        <div
          className="spasi-card"
          style={{
            padding: '1.5rem',
            marginBottom: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'center' }}>
            <Input
              placeholder="Cari kata kunci nama / kode aset..."
              icon={<Search size={18} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SlidersHorizontal size={18} style={{ color: 'var(--color-muted)' }} />
              <select
                className="input-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="ALL">-- Semua Status --</option>
                <option value="AVAILABLE">Tersedia</option>
                <option value="BORROWED">Dipinjam</option>
                <option value="RENTED">Disewa</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>

          {/* Category Pills */}
          <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingTop: '0.5rem' }}>
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

        {/* Asset Grid */}
        {loading ? (
          <div className="catalog-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="spasi-card" style={{ padding: '1rem' }}>
                <Skeleton height="180px" borderRadius="var(--radius-md)" style={{ marginBottom: '1rem' }} />
                <Skeleton height="1.2rem" width="80%" style={{ marginBottom: '0.5rem' }} />
                <Skeleton height="1rem" width="50%" />
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="catalog-grid">
            {filtered.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="spasi-card" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
            <p style={{ color: 'var(--color-muted)', fontSize: '1.1rem' }}>Tidak ada aset yang ditemukan dengan kriteria filter tersebut.</p>
          </div>
        )}
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--color-muted)',
          marginTop: '4rem',
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

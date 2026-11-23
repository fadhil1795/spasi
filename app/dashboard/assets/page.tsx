'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import {
  Plus, Search, Trash2, Eye, Printer, Pencil, Tag, SlidersHorizontal,
  RotateCcw, Filter, FolderTree, Bookmark, Building2, Box,
  CheckCircle2, AlertTriangle, Layers, X, Sparkles, MapPin, Wrench,
  Download, Calculator, DollarSign, TrendingDown
} from 'lucide-react';

export default function DashboardAssetsPage() {
  const { showToast } = useToast();
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [masterBrands, setMasterBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State Filter Bertingkat
  const [searchQuery, setSearchQuery] = useState('');
  const [parentCategoryFilter, setParentCategoryFilter] = useState('ALL');
  const [subCategoryFilter, setSubCategoryFilter] = useState('ALL');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [calculatingDepreciation, setCalculatingDepreciation] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resA, resC, resL, resB] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/public/categories'),
        fetch('/api/locations'),
        fetch('/api/brands?detail=true'),
      ]);

      if (resA.ok) setAssets(await resA.json());
      if (resC.ok) setCategories(await resC.json());
      if (resL.ok) setLocations(await resL.json());
      if (resB.ok) {
        const bData = await resB.json();
        setMasterBrands(bData.items || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data aset & referensi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/assets/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== deleteId));
        setDeleteId(null);
        showToast('Aset berhasil dihapus.', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menghapus aset.', 'error');
        setDeleteId(null);
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan jaringan.', 'error');
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  // Helper Pemisahan Hirarki Kategori
  const parentCategories = useMemo(
    () => categories.filter((c: any) => !c.parentId),
    [categories]
  );

  const subCategories = useMemo(
    () => categories.filter((c: any) => !!c.parentId),
    [categories]
  );

  // Subkategori dinamis yang cocok dengan Kategori Utama terpilih
  const availableSubCategories = useMemo(() => {
    if (parentCategoryFilter === 'ALL') return subCategories;
    return subCategories.filter((s: any) => s.parentId === parentCategoryFilter);
  }, [subCategories, parentCategoryFilter]);

  // Daftar Merek dinamis berdasarkan data aset & master brand
  const availableBrands = useMemo(() => {
    const brandSet = new Set<string>();

    // Ambil merek dari aset yang sudah ada
    assets.forEach((ast) => {
      if (ast.brand && ast.brand.trim() && ast.brand !== '-') {
        brandSet.add(ast.brand.trim());
      }
    });

    // Tambah merek dari katalog master jika sesuai kategori aktif
    const activeParentObj = parentCategories.find((p) => p.id === parentCategoryFilter);
    const activeSubObj = subCategories.find((s) => s.id === subCategoryFilter);

    masterBrands.forEach((b: any) => {
      if (parentCategoryFilter === 'ALL' || (activeParentObj && b.categoryCode === activeParentObj.code)) {
        if (subCategoryFilter === 'ALL' || (activeSubObj && b.subCategoryCode === activeSubObj.code)) {
          brandSet.add(b.name);
        }
      }
    });

    return Array.from(brandSet).sort((a, b) => a.localeCompare(b));
  }, [assets, masterBrands, parentCategoryFilter, subCategoryFilter, parentCategories, subCategories]);

  // Handler pergantian Kategori Utama -> otomatis reset subkategori
  const handleParentCategoryFilterChange = (newParentId: string) => {
    setParentCategoryFilter(newParentId);
    setSubCategoryFilter('ALL');
  };

  // Reset semua filter
  const handleResetFilters = () => {
    setSearchQuery('');
    setParentCategoryFilter('ALL');
    setSubCategoryFilter('ALL');
    setBrandFilter('ALL');
    setStatusFilter('ALL');
    setLocationFilter('ALL');
  };

  // Hitung berapa filter aktif yang sedang bekerja
  const activeFilterCount = [
    searchQuery.trim() !== '',
    parentCategoryFilter !== 'ALL',
    subCategoryFilter !== 'ALL',
    brandFilter !== 'ALL',
    statusFilter !== 'ALL',
    locationFilter !== 'ALL',
  ].filter(Boolean).length;

  // Logika Penyaringan Data Bertingkat
  const filtered = useMemo(() => {
    return assets.filter((ast) => {
      // 1. Filter Kategori Utama (Parent Category)
      if (parentCategoryFilter !== 'ALL') {
        const isDirect = ast.categoryId === parentCategoryFilter;
        const isChildOfParent = ast.category?.parentId === parentCategoryFilter;
        if (!isDirect && !isChildOfParent) return false;
      }

      // 2. Filter Subkategori (Child Category)
      if (subCategoryFilter !== 'ALL') {
        if (ast.categoryId !== subCategoryFilter) return false;
      }

      // 3. Filter Merek / Brand
      if (brandFilter !== 'ALL') {
        const bName = (ast.brand || '').trim().toLowerCase();
        if (bName !== brandFilter.trim().toLowerCase()) return false;
      }

      // 4. Filter Status Aset
      if (statusFilter !== 'ALL') {
        if (ast.status !== statusFilter) return false;
      }

      // 5. Filter Lokasi / Gedung
      if (locationFilter !== 'ALL') {
        if (locationFilter === 'NONE') {
          if (ast.locationId) return false;
        } else {
          const matchLocId = ast.locationId === locationFilter;
          const matchBuilding = ast.location?.building === locationFilter;
          if (!matchLocId && !matchBuilding) return false;
        }
      }

      // 6. Pencarian Teks Bebas
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = ast.name?.toLowerCase().includes(q);
        const matchCode = ast.code?.toLowerCase().includes(q);
        const matchBrand = ast.brand?.toLowerCase().includes(q);
        const matchSerial = ast.serialNumber?.toLowerCase().includes(q);
        const matchCatName = ast.category?.name?.toLowerCase().includes(q);
        const matchParentCatName = ast.category?.parent?.name?.toLowerCase().includes(q);
        const matchLoc = ast.location
          ? `${ast.location.building} ${ast.location.room || ''}`.toLowerCase().includes(q)
          : false;

        if (!matchName && !matchCode && !matchBrand && !matchSerial && !matchCatName && !matchParentCatName && !matchLoc) {
          return false;
        }
      }

      return true;
    });
  }, [assets, parentCategoryFilter, subCategoryFilter, brandFilter, statusFilter, locationFilter, searchQuery]);

  // Statistik Ringkas Status Aset
  const statusCounts = useMemo(() => {
    const counts = { ALL: assets.length, AVAILABLE: 0, BORROWED: 0, RENTED: 0, MAINTENANCE: 0, DAMAGED: 0, INSTALLED: 0, DISPOSED: 0 };
    assets.forEach((ast) => {
      const s = ast.status as keyof typeof counts;
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [assets]);

  // Ringkasan Keuangan Aset (Biaya Pengadaan & Nilai Buku Depresiasi)
  const financialSummary = useMemo(() => {
    let totalAcquisition = 0;
    let totalBook = 0;
    let totalMonthlyDep = 0;

    assets.forEach((ast) => {
      if (ast.status !== 'DISPOSED') {
        const qty = ast.quantity || 1;
        const cost = (ast.purchaseCost || 0) * qty;
        const current = (ast.currentValue !== null && ast.currentValue !== undefined ? ast.currentValue : (ast.purchaseCost || 0)) * qty;
        totalAcquisition += cost;
        totalBook += current;
        totalMonthlyDep += (ast.monthlyDepreciation || 0) * qty;
      }
    });

    return {
      totalAcquisition,
      totalBook,
      totalDepreciation: Math.max(0, totalAcquisition - totalBook),
      totalMonthlyDep,
    };
  }, [assets]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (parentCategoryFilter !== 'ALL') params.set('parentCategoryId', parentCategoryFilter);
    if (subCategoryFilter !== 'ALL') params.set('categoryId', subCategoryFilter);
    if (brandFilter !== 'ALL') params.set('brand', brandFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (locationFilter !== 'ALL') params.set('locationId', locationFilter);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    window.open(`/api/assets/export?${params.toString()}`, '_blank');
  };

  const handleCalculateDepreciation = async () => {
    try {
      setCalculatingDepreciation(true);
      const res = await fetch('/api/assets/depreciation');
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Penyusutan nilai buku aset berhasil dihitung!', 'success');
        await fetchData();
      } else {
        showToast(data.error || 'Gagal menghitung depresiasi', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setCalculatingDepreciation(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filtered.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  // Handler Pengaturan Cepat Status & Kondisi Fisik Aset langsung dari Tabel
  const handleQuickUpdateAsset = async (
    assetId: string,
    updates: { status?: string; condition?: string }
  ) => {
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setAssets((prev) =>
          prev.map((a) => (a.id === assetId ? { ...a, ...updates, status: updated.status, condition: updated.condition } : a))
        );
        showToast('Status / kondisi aset berhasil diperbarui!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memperbarui status aset', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Halaman & Aksi Cepat */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Box size={28} style={{ color: 'var(--color-primary-light)' }} />
            Katalog & Manajemen Aset
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Inventarisasi aset fisik kampus dengan klasifikasi bertingkat: Kategori &rarr; Subkategori &rarr; Merek.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-secondary"
            title="Unduh seluruh data aset dalam format spreadsheet CSV"
          >
            <Download size={16} /> Ekspor CSV
          </button>
          <button
            type="button"
            onClick={handleCalculateDepreciation}
            disabled={calculatingDepreciation}
            className="btn btn-secondary"
            title="Kalkulasi ulang nilai penyusutan (depresiasi straight-line) seluruh aset"
          >
            <Calculator size={16} /> {calculatingDepreciation ? 'Menghitung...' : 'Hitung Depresiasi'}
          </button>
          <Link href="/dashboard/brands" className="btn btn-secondary">
            <Bookmark size={16} /> Master Merek
          </Link>
          <Link href="/dashboard/categories" className="btn btn-secondary">
            <Layers size={16} /> Kategori & Sub
          </Link>
          <Link href="/dashboard/tools" className="btn btn-secondary">
            <SlidersHorizontal size={16} /> Utilitas & Impor
          </Link>
          {selectedIds.length > 0 && (
            <Link
              href={`/dashboard/assets/qr-labels?ids=${selectedIds.join(',')}`}
              className="btn btn-secondary"
              style={{ borderColor: 'var(--color-primary-light)', color: 'var(--color-primary-light)' }}
            >
              <Printer size={16} /> Cetak Label QR ({selectedIds.length})
            </Link>
          )}
          <Link href="/dashboard/assets/new" className="btn btn-primary">
            <Plus size={18} /> Tambah Aset Baru
          </Link>
        </div>
      </div>

      {/* Financial & Inventory Overview Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="spasi-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(79, 70, 229, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-light)' }}>
            <Box size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Total Unit Aset Terdaftar</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text)' }}>
              {assets.reduce((acc, curr) => acc + (curr.quantity || 1), 0)} <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-muted)' }}>Unit ({assets.length} Item)</span>
            </div>
          </div>
        </div>

        <div className="spasi-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Total Nilai Perolehan (Awal)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>
              {formatCurrency(financialSummary.totalAcquisition)}
            </div>
          </div>
        </div>

        <div className="spasi-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-info)' }}>
            <TrendingDown size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Estimasi Nilai Buku Saat Ini</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>
              {formatCurrency(financialSummary.totalBook)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status Pills Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem',
            fontWeight: statusFilter === 'ALL' ? 700 : 500,
            border: statusFilter === 'ALL' ? '1px solid var(--color-primary-light)' : '1px solid var(--color-border)',
            background: statusFilter === 'ALL' ? 'var(--grad-primary)' : 'var(--color-surface2)',
            color: statusFilter === 'ALL' ? '#FFFFFF' : 'var(--color-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Semua Aset ({statusCounts.ALL})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('AVAILABLE')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem',
            fontWeight: statusFilter === 'AVAILABLE' ? 700 : 500,
            border: statusFilter === 'AVAILABLE' ? '1px solid var(--color-success)' : '1px solid var(--color-border)',
            background: statusFilter === 'AVAILABLE' ? 'rgba(16, 185, 129, 0.2)' : 'var(--color-surface2)',
            color: statusFilter === 'AVAILABLE' ? 'var(--color-success)' : 'var(--color-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ● Tersedia ({statusCounts.AVAILABLE})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('INSTALLED')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem',
            fontWeight: statusFilter === 'INSTALLED' ? 700 : 500,
            border: statusFilter === 'INSTALLED' ? '1px solid #06b6d4' : '1px solid var(--color-border)',
            background: statusFilter === 'INSTALLED' ? 'rgba(6, 182, 212, 0.2)' : 'var(--color-surface2)',
            color: statusFilter === 'INSTALLED' ? '#06b6d4' : 'var(--color-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ● Tertanam ({statusCounts.INSTALLED})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('BORROWED')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem',
            fontWeight: statusFilter === 'BORROWED' ? 700 : 500,
            border: statusFilter === 'BORROWED' ? '1px solid var(--color-danger)' : '1px solid var(--color-border)',
            background: statusFilter === 'BORROWED' ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-surface2)',
            color: statusFilter === 'BORROWED' ? 'var(--color-danger)' : 'var(--color-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ● Dipinjam ({statusCounts.BORROWED})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('RENTED')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem',
            fontWeight: statusFilter === 'RENTED' ? 700 : 500,
            border: statusFilter === 'RENTED' ? '1px solid var(--color-warning)' : '1px solid var(--color-border)',
            background: statusFilter === 'RENTED' ? 'rgba(245, 158, 11, 0.2)' : 'var(--color-surface2)',
            color: statusFilter === 'RENTED' ? 'var(--color-warning)' : 'var(--color-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ● Disewa ({statusCounts.RENTED})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('MAINTENANCE')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem',
            fontWeight: statusFilter === 'MAINTENANCE' ? 700 : 500,
            border: statusFilter === 'MAINTENANCE' ? '1px solid var(--color-info)' : '1px solid var(--color-border)',
            background: statusFilter === 'MAINTENANCE' ? 'rgba(59, 130, 246, 0.2)' : 'var(--color-surface2)',
            color: statusFilter === 'MAINTENANCE' ? 'var(--color-info)' : 'var(--color-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ● Maintenance ({statusCounts.MAINTENANCE})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('DAMAGED')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem',
            fontWeight: statusFilter === 'DAMAGED' ? 700 : 500,
            border: statusFilter === 'DAMAGED' ? '1px solid #94A3B8' : '1px solid var(--color-border)',
            background: statusFilter === 'DAMAGED' ? 'rgba(148, 163, 184, 0.2)' : 'var(--color-surface2)',
            color: statusFilter === 'DAMAGED' ? '#E2E8F0' : 'var(--color-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ● Rusak ({statusCounts.DAMAGED})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('DISPOSED')}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem',
            fontWeight: statusFilter === 'DISPOSED' ? 700 : 500,
            border: statusFilter === 'DISPOSED' ? '1px solid #ef4444' : '1px solid var(--color-border)',
            background: statusFilter === 'DISPOSED' ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-surface2)',
            color: statusFilter === 'DISPOSED' ? '#ef4444' : 'var(--color-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ● Afkir/Pemutihan ({statusCounts.DISPOSED})
        </button>
      </div>

      {/* Filter Toolbar Bertingkat */}
      <div className="spasi-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={16} style={{ color: 'var(--color-primary-light)' }} />
            Filter Bertingkat & Pencarian Aset
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-danger)',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} /> Reset Filter ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Baris 1: Kolom Pencarian + Filter Utama */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
          {/* 1. Search Query */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
              Pencarian Teks Bebas
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
              <input
                className="input-field"
                style={{ paddingLeft: '2.2rem', height: '38px', fontSize: '0.85rem' }}
                placeholder="Cari kode, nama, atau serial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 2. Filter Kategori Utama (Parent Category) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
              1. Kategori Utama
            </label>
            <select
              className="input-field"
              style={{ height: '38px', fontSize: '0.85rem', cursor: 'pointer' }}
              value={parentCategoryFilter}
              onChange={(e) => handleParentCategoryFilterChange(e.target.value)}
            >
              <option value="ALL">-- Semua Kategori --</option>
              {parentCategories.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filter Subkategori (Dinamis berdasarkan Kategori Utama) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
              2. Subkategori
            </label>
            <select
              className="input-field"
              style={{ height: '38px', fontSize: '0.85rem', cursor: 'pointer' }}
              value={subCategoryFilter}
              onChange={(e) => setSubCategoryFilter(e.target.value)}
            >
              <option value="ALL">
                {parentCategoryFilter !== 'ALL' ? '-- Semua Subkategori Ini --' : '-- Semua Subkategori --'}
              </option>
              {availableSubCategories.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.code}] {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Filter Merek / Brand (Dinamis) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
              3. Merek / Brand
            </label>
            <select
              className="input-field"
              style={{ height: '38px', fontSize: '0.85rem', cursor: 'pointer' }}
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            >
              <option value="ALL">-- Semua Merek --</option>
              {availableBrands.map((bName) => (
                <option key={bName} value={bName}>
                  {bName}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Filter Lokasi / Gedung */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
              4. Lokasi / Gedung
            </label>
            <select
              className="input-field"
              style={{ height: '38px', fontSize: '0.85rem', cursor: 'pointer' }}
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="ALL">-- Semua Lokasi --</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.building} {loc.room ? `- ${loc.room}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter Info & Selection Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--color-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
          <div>
            Menampilkan <strong style={{ color: 'var(--color-text)' }}>{filtered.length}</strong> dari total {assets.length} unit aset
            {activeFilterCount > 0 && <span style={{ marginLeft: '0.5rem', color: 'var(--color-primary-light)' }}>({activeFilterCount} filter aktif)</span>}
          </div>

          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: 'var(--color-primary-light)', fontWeight: 700 }}>
                {selectedIds.length} aset terpilih
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
              >
                Batal Pilih
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabel Data Aset */}
      <div className="spasi-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                <th style={{ padding: '0.85rem 1rem', width: '36px' }}>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '0.85rem 1rem' }}>Kode & Nama Aset</th>
                <th style={{ padding: '0.85rem 1rem' }}>Klasifikasi (Kategori & Sub)</th>
                <th style={{ padding: '0.85rem 1rem' }}>Merek & Spesifikasi</th>
                <th style={{ padding: '0.85rem 1rem' }}>Lokasi / Ruang</th>
                <th style={{ padding: '0.85rem 1rem' }}>Stok</th>
                <th style={{ padding: '0.85rem 1rem' }}>Tarif Sewa</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <Skeleton height="32px" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton height="32px" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton height="32px" />
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((ast) => {
                  const isChecked = selectedIds.includes(ast.id);
                  const parentCatName = ast.category?.parent?.name;
                  const currentCatName = ast.category?.name || '-';

                  return (
                    <tr
                      key={ast.id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: isChecked ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                        transition: 'background 0.2s',
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectOne(ast.id, e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Kode & Nama Aset */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <Link
                          href={`/dashboard/assets/${ast.id}`}
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            color: 'var(--color-primary-light)',
                            display: 'inline-block',
                            background: 'rgba(79, 70, 229, 0.12)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(79, 70, 229, 0.25)',
                            marginBottom: '0.2rem',
                          }}
                        >
                          {ast.code}
                        </Link>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--color-text)' }}>
                          {ast.name}
                        </div>
                        {ast.serialNumber && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                            S/N: {ast.serialNumber}
                          </div>
                        )}
                      </td>

                      {/* Klasifikasi Kategori & Subkategori */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {parentCatName ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: 'var(--color-muted)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <Layers size={11} /> {parentCatName}
                            </span>
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: 'var(--color-primary-light)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <FolderTree size={12} /> {currentCatName}
                            </span>
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: 'var(--color-text)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Tag size={13} style={{ color: 'var(--color-muted)' }} /> {currentCatName}
                          </span>
                        )}
                      </td>

                      {/* Merek & Spesifikasi */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {ast.brand && ast.brand !== '-' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--color-surface2)',
                              border: '1px solid var(--color-border)',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: 'var(--color-text)',
                            }}
                          >
                            <Bookmark size={12} style={{ color: 'var(--color-primary-light)' }} />
                            {ast.brand}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>-</span>
                        )}
                        <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>Kondisi:</span>
                          <select
                            value={ast.condition || 'Baik'}
                            onChange={(e) => handleQuickUpdateAsset(ast.id, { condition: e.target.value })}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.12rem 0.4rem',
                              borderRadius: '4px',
                              border: '1px solid var(--color-border)',
                              background: 'var(--color-surface2)',
                              color:
                                ast.condition === 'Rusak Berat'
                                  ? '#ef4444'
                                  : ast.condition === 'Rusak Ringan'
                                  ? '#f59e0b'
                                  : '#10b981',
                              cursor: 'pointer',
                            }}
                            title="Ubah Cepat Kondisi Fisik Aset"
                          >
                            <option value="Baik">Baik</option>
                            <option value="Rusak Ringan">Rusak Ringan</option>
                            <option value="Rusak Berat">Rusak Berat</option>
                          </select>
                        </div>
                      </td>

                      {/* Lokasi / Ruang */}
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--color-muted)', fontSize: '0.82rem' }}>
                        {ast.location ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Building2 size={14} style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} />
                            <span>
                              <strong>{ast.location.building}</strong>
                              {ast.location.room && ` - ${ast.location.room}`}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Belum ditempatkan</span>
                        )}
                      </td>

                      {/* Stok */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700 }}>
                          {ast.availableQty}{' '}
                          <span style={{ fontWeight: 400, color: 'var(--color-muted)', fontSize: '0.75rem' }}>
                            / {ast.quantity} Unit
                          </span>
                        </div>
                      </td>

                      {/* Tarif Sewa */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {ast.isRentable && ast.dailyRentRate ? (
                          <span style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.82rem' }}>
                            {formatCurrency(ast.dailyRentRate)}/hari
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Internal</span>
                        )}
                      </td>

                      {/* Status (Dapat Diubah Cepat Langsung dari Tabel) */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                          <Badge status={ast.status} />
                          <select
                            value={ast.status || 'AVAILABLE'}
                            onChange={(e) => handleQuickUpdateAsset(ast.id, { status: e.target.value })}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              border: '1px solid var(--color-border)',
                              background: 'var(--color-surface2)',
                              color: 'var(--color-text)',
                              cursor: 'pointer',
                              maxWidth: '140px',
                            }}
                            title="Ubah Cepat Status Operasional Aset"
                          >
                            <option value="AVAILABLE">Aktif / Tersedia</option>
                            <option value="INSTALLED">Tertanam Ruang</option>
                            <option value="BORROWED">Dipinjam</option>
                            <option value="RENTED">Disewa</option>
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="DAMAGED">Rusak (Damaged)</option>
                            <option value="DISPOSED">Afkir (Disposed)</option>
                          </select>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {ast.status === 'DISPOSED' ? (
                            <Link
                              href={`/dashboard/assets/${ast.id}/disposal-report`}
                              target="_blank"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                              title="Lihat & Cetak Berita Acara Pemutihan"
                            >
                              📄 BAST Afkir
                            </Link>
                          ) : (
                            <>
                              {ast.isRentable && ast.status === 'AVAILABLE' && (
                                <Link
                                  href={`/dashboard/rentals/new?assetId=${ast.id}`}
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                  title="Buat Transaksi Penyewaan Aset"
                                >
                                  💳 Sewa
                                </Link>
                              )}
                              <Link
                                href={`/dashboard/assets/${ast.id}/edit`}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                title="Edit Aset"
                              >
                                <Pencil size={13} />
                              </Link>
                            </>
                          )}
                          <Link
                            href={`/dashboard/assets/${ast.id}`}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0.25rem 0.45rem' }}
                            title="Lihat Detail & Riwayat Aset"
                          >
                            <Eye size={15} />
                          </Link>
                          <Link
                            href={`/dashboard/assets/qr-labels?ids=${ast.id}`}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0.25rem 0.45rem' }}
                            title="Cetak Label QR Stiker"
                          >
                            <Printer size={15} />
                          </Link>
                          {ast.status !== 'DISPOSED' && (
                            <Link
                              href={`/dashboard/maintenance?new=true&assetId=${ast.id}`}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0.25rem 0.45rem', color: 'var(--color-primary-light)' }}
                              title="Catat Servis / Perawatan"
                            >
                              <Wrench size={15} />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteId(ast.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0.25rem 0.45rem', color: 'var(--color-danger)' }}
                            title="Hapus Aset"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    <Box size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.3 }} />
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                      Tidak Ada Aset yang Sesuai
                    </div>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Coba ubah kombinasi filter atau kata kunci pencarian Anda.
                    </p>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '0.75rem' }}
                      >
                        <RotateCcw size={14} /> Reset Semua Filter
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Konfirmasi Hapus Aset */}
      <Modal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Konfirmasi Hapus Aset"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Batal
            </Button>
            <Button variant="danger" isLoading={deleting} onClick={handleDelete}>
              Hapus Aset
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', marginBottom: '0.75rem' }}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.88rem' }}>
            Apakah Anda yakin ingin menghapus aset ini? Tindakan ini tidak dapat dibatalkan dan akan menghapus riwayat inventaris terkait.
          </div>
        </div>
      </Modal>
    </div>
  );
}

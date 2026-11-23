'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  Plus, Search, Trash2, Tag, Layers, Box, CheckCircle2,
  AlertCircle, Sparkles, Bookmark, ExternalLink, Info,
  FolderTree
} from 'lucide-react';

interface BrandItem {
  id?: string;
  name: string;
  categoryCode: string;
  categoryName: string;
  subCategoryCode?: string;
  subCategoryName?: string;
  isDefault: boolean;
  isCustom: boolean;
  description?: string;
  assetCount: number;
}

interface CategoryOption {
  code: string;
  name: string;
  id?: string;
}

interface SubCategoryOption {
  id: string;
  code: string;
  name: string;
  parentId: string;
  parentCode?: string;
  parentName?: string;
}

export default function BrandsManagementPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<BrandItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    categoryCode: 'ELK',
    subCategoryCode: '',
    description: '',
  });

  // Delete State
  const [deleteBrand, setDeleteBrand] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, [selectedCategory, selectedSubCategory]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      let url = `/api/brands?detail=true`;
      if (selectedCategory !== 'ALL') {
        url += `&categoryCode=${selectedCategory}`;
      }
      if (selectedSubCategory !== 'ALL') {
        url += `&subCategoryCode=${selectedSubCategory}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.categories && categories.length === 0) {
          setCategories(data.categories);
        }
        if (data.subCategories && subCategories.length === 0) {
          setSubCategories(data.subCategories);
        }
      }
    } catch (error) {
      console.error('Error loading brands:', error);
      showToast('Gagal memuat data merek', 'error');
    } finally {
      setLoading(false);
    }
  };

  const activeSubCategoriesForFilter = subCategories.filter((s) => {
    if (selectedCategory === 'ALL' || selectedCategory === 'OTHER') return false;
    return s.parentCode === selectedCategory;
  });

  const activeSubCategoriesForModal = subCategories.filter((s) => {
    if (!formData.categoryCode || formData.categoryCode === 'OTHER') return false;
    return s.parentCode === formData.categoryCode;
  });

  const handleOpenAdd = () => {
    const defaultCat = selectedCategory !== 'ALL' && selectedCategory !== 'OTHER' ? selectedCategory : 'ELK';
    const availableSubs = subCategories.filter((s) => s.parentCode === defaultCat);
    const defaultSub = selectedSubCategory !== 'ALL'
      ? selectedSubCategory
      : availableSubs.length > 0
      ? availableSubs[0].code
      : '';

    setFormData({
      name: '',
      categoryCode: defaultCat,
      subCategoryCode: defaultSub,
      description: '',
    });
    setModalOpen(true);
  };

  const handleCategoryChangeInModal = (catCode: string) => {
    const matchingSubs = subCategories.filter((s) => s.parentCode === catCode);
    setFormData((prev) => ({
      ...prev,
      categoryCode: catCode,
      subCategoryCode: matchingSubs.length > 0 ? matchingSubs[0].code : '',
    }));
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Nama merek wajib diisi', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Gagal menyimpan merek');
      }

      showToast(`Merek "${formData.name}" berhasil didaftarkan!`, 'success');
      setModalOpen(false);
      fetchBrands();
    } catch (error: any) {
      showToast(error.message || 'Terjadi kesalahan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!deleteBrand) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/brands?name=${encodeURIComponent(deleteBrand)}`, {
        method: 'DELETE',
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Gagal menghapus merek');
      }

      showToast(`Merek "${deleteBrand}" berhasil dihapus`, 'success');
      setDeleteBrand(null);
      fetchBrands();
    } catch (error: any) {
      showToast(error.message || 'Gagal menghapus merek', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.categoryName.toLowerCase().includes(q) ||
      (item.subCategoryName && item.subCategoryName.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  const totalBrands = items.length;
  const usedBrands = items.filter((i) => i.assetCount > 0).length;
  const customBrandsCount = items.filter((i) => i.isCustom).length;
  const totalAssetsLinked = items.reduce((sum, i) => sum + i.assetCount, 0);

  const getCategoryBadgeStyle = (code: string): React.CSSProperties => {
    switch (code) {
      case 'ELK':
        return {
          background: 'rgba(59, 130, 246, 0.15)',
          color: '#60A5FA',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          padding: '0.2rem 0.55rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          fontWeight: 700,
        };
      case 'SND':
        return {
          background: 'rgba(168, 85, 247, 0.15)',
          color: '#C084FC',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          padding: '0.2rem 0.55rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          fontWeight: 700,
        };
      case 'FURN':
        return {
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#FBBF24',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          padding: '0.2rem 0.55rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          fontWeight: 700,
        };
      case 'KDR':
        return {
          background: 'rgba(16, 185, 129, 0.15)',
          color: '#34D399',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          padding: '0.2rem 0.55rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          fontWeight: 700,
        };
      case 'LAB':
        return {
          background: 'rgba(244, 63, 94, 0.15)',
          color: '#FB7185',
          border: '1px solid rgba(244, 63, 94, 0.35)',
          padding: '0.2rem 0.55rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          fontWeight: 700,
        };
      default:
        return {
          background: 'rgba(148, 163, 184, 0.15)',
          color: '#94A3B8',
          border: '1px solid rgba(148, 163, 184, 0.35)',
          padding: '0.2rem 0.55rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          fontWeight: 700,
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Tab Navigasi Master Data */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
        <Link
          href="/dashboard/categories"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'var(--color-muted)',
            background: 'var(--color-surface2)',
            border: '1px solid var(--color-border)',
            transition: 'all 0.2s',
          }}
        >
          <Layers size={16} /> Kategori & Subkategori
        </Link>
        <Link
          href="/dashboard/brands"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.88rem',
            fontWeight: 700,
            color: '#FFFFFF',
            background: 'var(--grad-primary)',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
            border: '1px solid var(--color-primary-light)',
            transition: 'all 0.2s',
          }}
        >
          <Bookmark size={16} /> Master Data Merek (Brand)
        </Link>
      </div>

      {/* Header Halaman */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-text)' }}>
            <Bookmark size={28} style={{ color: 'var(--color-primary-light)' }} />
            Master Data Merek (Brand)
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.25rem', maxWidth: '750px' }}>
            Katalog merek terstandarisasi berdasarkan <strong>Kategori Utama</strong> dan <strong>Subkategori</strong> untuk mempermudah input aset & penamaan otomatis.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Tambah Merek Baru
        </Button>
      </div>

      {/* Kartu Ringkasan Statistik */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="spasi-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(79, 70, 229, 0.15)', color: 'var(--color-primary-light)', display: 'flex' }}>
            <Bookmark size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>Total Merek</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.15rem' }}>{totalBrands}</div>
          </div>
        </div>

        <div className="spasi-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', display: 'flex' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>Digunakan di Aset</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.15rem' }}>{usedBrands} Merek</div>
          </div>
        </div>

        <div className="spasi-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-info)', display: 'flex' }}>
            <Box size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>Total Unit Aset</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-info)', marginTop: '0.15rem' }}>{totalAssetsLinked} Unit</div>
          </div>
        </div>

        <div className="spasi-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', display: 'flex' }}>
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>Merek Kustom</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#A855F7', marginTop: '0.15rem' }}>{customBrandsCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Kategori & Subkategori Pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Tingkat 1: Kategori Utama */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginRight: '0.25rem' }}>
            <Layers size={15} /> Kategori:
          </span>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.code;
            return (
              <button
                key={cat.code}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.code);
                  setSelectedSubCategory('ALL');
                }}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  border: isActive ? '1px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                  background: isActive ? 'var(--grad-primary)' : 'var(--color-surface2)',
                  color: isActive ? '#FFFFFF' : 'var(--color-text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? 'var(--shadow-glow)' : 'none',
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Tingkat 2: Subkategori */}
        {activeSubCategoriesForFilter.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              background: 'rgba(79, 70, 229, 0.06)',
              border: '1px solid rgba(79, 70, 229, 0.2)',
              borderLeft: '4px solid var(--color-primary-light)',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginRight: '0.25rem' }}>
              <FolderTree size={14} /> Subkategori:
            </span>
            <button
              type="button"
              onClick={() => setSelectedSubCategory('ALL')}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: selectedSubCategory === 'ALL' ? 700 : 500,
                border: selectedSubCategory === 'ALL' ? '1px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                background: selectedSubCategory === 'ALL' ? 'rgba(79, 70, 229, 0.25)' : 'var(--color-surface)',
                color: selectedSubCategory === 'ALL' ? 'var(--color-primary-light)' : 'var(--color-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Semua Subkategori
            </button>
            {activeSubCategoriesForFilter.map((sub) => {
              const isSubActive = selectedSubCategory === sub.code;
              return (
                <button
                  key={sub.code}
                  type="button"
                  onClick={() => setSelectedSubCategory(sub.code)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: isSubActive ? 700 : 500,
                    border: isSubActive ? '1px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                    background: isSubActive ? 'rgba(79, 70, 229, 0.3)' : 'var(--color-surface)',
                    color: isSubActive ? '#FFFFFF' : 'var(--color-text)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  [{sub.code}] {sub.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Search & Tool Bar */}
      <div className="spasi-card" style={{ padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              className="input-field"
              style={{ paddingLeft: '2.4rem', height: '40px', fontSize: '0.88rem' }}
              placeholder="Cari merek, kategori, atau subkategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
            Menampilkan <strong style={{ color: 'var(--color-text)' }}>{filteredItems.length}</strong> dari {totalBrands} merek
          </div>
        </div>
      </div>

      {/* Grid Daftar Merek */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="spasi-card" style={{ height: '140px', opacity: 0.5, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="spasi-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <Bookmark size={48} style={{ color: 'var(--color-muted)', margin: '0 auto 1rem auto', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>Tidak Ada Merek Ditemukan</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-muted)', marginTop: '0.35rem', maxWidth: '420px', margin: '0.35rem auto 1.25rem auto' }}>
            {searchQuery
              ? `Tidak ada merek yang cocok dengan kata kunci "${searchQuery}".`
              : 'Belum ada data merek pada kombinasi kategori & subkategori ini.'}
          </p>
          <Button variant="secondary" onClick={handleOpenAdd}>
            <Plus size={16} /> Daftarkan Merek Baru di Sini
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {filteredItems.map((item) => (
            <div
              key={`${item.name}-${item.categoryCode}-${item.subCategoryCode || 'NONE'}`}
              className="spasi-card spasi-card-hover"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(79, 70, 229, 0.15)',
                        color: 'var(--color-primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1rem',
                        flexShrink: 0,
                      }}
                    >
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {item.name}
                        {item.isCustom && (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: 'rgba(168, 85, 247, 0.2)',
                              color: '#C084FC',
                              border: '1px solid rgba(168, 85, 247, 0.35)',
                            }}
                          >
                            KUSTOM
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: '0.25rem' }}>
                        <span style={getCategoryBadgeStyle(item.categoryCode)}>
                          {item.categoryName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {item.isCustom && (
                    <button
                      type="button"
                      onClick={() => setDeleteBrand(item.name)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-muted)',
                        padding: '0.2rem',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
                      title="Hapus merek kustom ini"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Subkategori Badge */}
                {item.subCategoryName && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      fontSize: '0.75rem',
                      color: 'var(--color-muted)',
                      background: 'var(--color-surface2)',
                      padding: '0.35rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <FolderTree size={12} style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.subCategoryName}>
                      {item.subCategoryName}
                    </span>
                  </div>
                )}

                {item.description && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.6rem', fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{item.description}"
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <div>
                  {item.assetCount > 0 ? (
                    <Link
                      href={`/dashboard/assets?q=${encodeURIComponent(item.name)}`}
                      style={{ color: 'var(--color-success)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Box size={13} /> {item.assetCount} Aset Terdaftar
                    </Link>
                  ) : (
                    <span style={{ color: 'var(--color-muted)' }}>Belum dipakai di aset</span>
                  )}
                </div>

                <Link
                  href={`/dashboard/assets/new?brand=${encodeURIComponent(item.name)}&cat=${encodeURIComponent(item.categoryCode)}${item.subCategoryCode ? `&subcat=${encodeURIComponent(item.subCategoryCode)}` : ''}`}
                  style={{ color: 'var(--color-primary-light)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  Pakai <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card di Bagian Bawah */}
      <div
        className="spasi-card"
        style={{
          background: 'rgba(79, 70, 229, 0.05)',
          border: '1px dashed rgba(79, 70, 229, 0.3)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          padding: '1.25rem',
        }}
      >
        <Info size={20} style={{ color: 'var(--color-primary-light)', flexShrink: 0, marginTop: '0.1rem' }} />
        <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
            Hirarki Klasifikasi: Kategori $\rightarrow$ Subkategori $\rightarrow$ Merek / Brand
          </div>
          <div>
            Dengan mengaitkan merek ke subkategori yang tepat (misal: <em>Cisco/MikroTik</em> ke <em>Jaringan & Server</em>, atau <em>Chitose</em> ke <em>Mebel Kelas</em>), sistem formulir{' '}
            <Link href="/dashboard/assets/new" style={{ color: 'var(--color-primary-light)', fontWeight: 700, textDecoration: 'underline' }}>
              Tambah Aset
            </Link>{' '}
            dapat otomatis merekomendasikan pilihan merek yang paling relevan saat subkategori dipilih.
          </div>
        </div>
      </div>

      {/* Modal Tambah Merek Baru */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Daftarkan Merek (Brand) Baru"
      >
        <form onSubmit={handleSaveBrand} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
              Nama Merek / Brand <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              required
              className="input-field"
              placeholder="Contoh: MikroTik, Hikvision, Dell, Chitose..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
              Gunakan penulisan baku (misal: "MikroTik", "Asus", "Schneider Electric").
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
              1. Kategori Utama <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <select
              value={formData.categoryCode}
              onChange={(e) => handleCategoryChangeInModal(e.target.value)}
              className="input-field"
            >
              {categories
                .filter((c) => c.code !== 'ALL')
                .map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    [{cat.code}] {cat.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
              2. Subkategori Terkait
            </label>
            {activeSubCategoriesForModal.length > 0 ? (
              <select
                value={formData.subCategoryCode}
                onChange={(e) => setFormData({ ...formData, subCategoryCode: e.target.value })}
                className="input-field"
              >
                <option value="">-- (Semua Subkategori / Berlaku Umum) --</option>
                {activeSubCategoriesForModal.map((sub) => (
                  <option key={sub.code} value={sub.code}>
                    [{sub.code}] {sub.name}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)', fontSize: '0.78rem', color: 'var(--color-muted)', background: 'var(--color-surface2)' }}>
                Kategori ini belum memiliki subkategori khusus. Merek akan terhubung secara umum ke kategori ini.
              </div>
            )}
            <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
              Memilih subkategori mempermudah filter otomatis saat staf menginput aset dengan jenis yang sama.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
              Keterangan / Deskripsi Spesifikasi (Opsional)
            </label>
            <input
              className="input-field"
              placeholder="Contoh: Perangkat switch, router & Wi-Fi outdoor"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Merek'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus Merek Kustom */}
      <Modal
        isOpen={!!deleteBrand}
        onClose={() => setDeleteBrand(null)}
        title="Hapus Merek Kustom"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '0.88rem' }}>
              Apakah Anda yakin ingin menghapus merek <strong>"{deleteBrand}"</strong> dari daftar merek kustom?
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <Button
              variant="secondary"
              onClick={() => setDeleteBrand(null)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteBrand}
              disabled={deleting}
            >
              {deleting ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

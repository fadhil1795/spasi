'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  Plus, Search, Pencil, Trash2, Tag, ArrowLeft, FolderOpen,
  ChevronRight, Layers, Box, CheckCircle2, AlertCircle, Sparkles, Bookmark
} from 'lucide-react';

export default function CategoriesManagementPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Drill-down state: null = melihat daftar kategori utama, objek = melihat subkategori di dalam kategori tersebut
  const [activeParent, setActiveParent] = useState<any | null>(null);

  // Tab mode jika ingin melihat semua pohon sekaligus
  const [viewMode, setViewMode] = useState<'drilldown' | 'all'>('drilldown');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [modalParentLock, setModalParentLock] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    parentId: '',
    usefulLifeYears: '5',
    depreciationRate: '0.2',
  });

  // Delete Modal State
  const [deleteCategory, setDeleteCategory] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        // Refresh active parent if open
        if (activeParent) {
          const updated = data.find((c: any) => c.id === activeParent.id);
          if (updated) setActiveParent(updated);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Buka modal untuk tambah Kategori Utama baru
  const handleOpenAddParentModal = () => {
    setEditingCategory(null);
    setModalParentLock(null);
    setFormData({
      code: '',
      name: '',
      parentId: '',
      usefulLifeYears: '5',
      depreciationRate: '0.2',
    });
    setModalOpen(true);
  };

  // Buka modal untuk tambah Subkategori di dalam Kategori Induk tertentu
  const handleOpenAddSubModal = (parent: any) => {
    setEditingCategory(null);
    setModalParentLock(parent);
    setFormData({
      code: '',
      name: '',
      parentId: parent.id,
      usefulLifeYears: String(parent.usefulLifeYears || 5),
      depreciationRate: String(parent.depreciationRate || 0.2),
    });
    setModalOpen(true);
  };

  // Buka modal untuk edit Kategori atau Subkategori
  const handleOpenEditModal = (cat: any) => {
    setEditingCategory(cat);
    const parentObj = cat.parentId ? categories.find((c: any) => c.id === cat.parentId) : null;
    setModalParentLock(parentObj);
    setFormData({
      code: cat.code || '',
      name: cat.name || '',
      parentId: cat.parentId || '',
      usefulLifeYears: cat.usefulLifeYears ? String(cat.usefulLifeYears) : '5',
      depreciationRate: cat.depreciationRate ? String(cat.depreciationRate) : '0.2',
    });
    setModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) {
      showToast('Nama kategori wajib diisi', 'error');
      return;
    }

    try {
      setSaving(true);
      const isEdit = Boolean(editingCategory);
      const url = isEdit ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(
          isEdit
            ? 'Kategori berhasil diperbarui!'
            : formData.parentId
            ? 'Subkategori baru berhasil ditambahkan!'
            : 'Kategori utama baru berhasil ditambahkan!',
          'success'
        );
        setModalOpen(false);
        fetchCategories();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan kategori', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategory) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/categories/${deleteCategory.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('Kategori berhasil dihapus', 'success');
        setDeleteCategory(null);
        fetchCategories();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menghapus kategori', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Data helpers
  const parentCategories = categories.filter((c: any) => !c.parentId);
  const currentSubCategories = activeParent
    ? categories.filter((c: any) => c.parentId === activeParent.id)
    : [];

  const filteredParents = parentCategories.filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSubCategories = currentSubCategories.filter((s: any) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const allFiltered = categories.filter((cat: any) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.code && cat.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
            fontWeight: 700,
            color: '#FFFFFF',
            background: 'var(--grad-primary)',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
            border: '1px solid var(--color-primary-light)',
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
            fontWeight: 600,
            color: 'var(--color-muted)',
            background: 'var(--color-surface2)',
            border: '1px solid var(--color-border)',
            transition: 'all 0.2s',
          }}
        >
          <Bookmark size={16} /> Master Data Merek (Brand)
        </Link>
      </div>

      {/* Breadcrumb / Back Link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
        <Link
          href="/dashboard/assets"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--color-muted)',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={15} /> Manajemen Aset
        </Link>
        <span style={{ color: 'var(--color-muted)' }}>/</span>
        <button
          onClick={() => setActiveParent(null)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: activeParent ? 'var(--color-primary-light)' : 'var(--color-text)',
            fontWeight: activeParent ? 600 : 700,
            textDecoration: activeParent ? 'underline' : 'none',
          }}
        >
          Kategori Utama
        </button>
        {activeParent && (
          <>
            <span style={{ color: 'var(--color-muted)' }}>/</span>
            <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>
              [{activeParent.code}] {activeParent.name}
            </span>
          </>
        )}
      </div>

      {/* Header Utama */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {activeParent ? (
              <>
                <FolderOpen size={28} style={{ color: 'var(--color-primary)' }} />
                Subkategori: [{activeParent.code}] {activeParent.name}
              </>
            ) : (
              <>
                <Layers size={28} style={{ color: 'var(--color-primary)' }} />
                Manajemen Kategori & Subkategori
              </>
            )}
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            {activeParent
              ? `Kelola sub-bagian inventaris di bawah ${activeParent.name}. Klik Tambah Subkategori untuk membuat jenis baru.`
              : 'Struktur klasifikasi bertingkat untuk standardisasi penamaan dan kode Tag Aset kampus.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {activeParent ? (
            <>
              <Button variant="secondary" onClick={() => setActiveParent(null)}>
                <ArrowLeft size={16} /> Kembali ke Kategori Utama
              </Button>
              <Button variant="primary" onClick={() => handleOpenAddSubModal(activeParent)}>
                <Plus size={18} /> Tambah Subkategori di Sini
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={handleOpenAddParentModal}>
              <Plus size={18} /> Tambah Kategori Utama Baru
            </Button>
          )}
        </div>
      </div>

      {/* Banner Ringkasan Kategori Induk yang Sedang Dibuka */}
      {activeParent && (
        <Card
          style={{
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  background: 'var(--color-primary)',
                  color: '#fff',
                }}
              >
                {activeParent.code}
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{activeParent.name}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: 0 }}>
              Masa Manfaat Default: <strong>{activeParent.usefulLifeYears || 5} Tahun</strong> · Tarif Penyusutan: <strong>{((activeParent.depreciationRate || 0.2) * 100).toFixed(0)}% / Tahun</strong> · Subkategori: <strong>{currentSubCategories.length} Bagian</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" size="sm" onClick={() => handleOpenEditModal(activeParent)}>
              <Pencil size={14} /> Edit Kategori Induk
            </Button>
          </div>
        </Card>
      )}

      {/* Filter Bar & View Toggle */}
      <Card style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Input
            placeholder={activeParent ? `Cari subkategori dalam ${activeParent.name}...` : 'Cari kategori utama atau kode...'}
            icon={<Search size={18} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: 0 }}
          />
        </div>

        {!activeParent && (
          <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--color-surface2)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setViewMode('drilldown')}
              style={{
                padding: '0.4rem 0.85rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: viewMode === 'drilldown' ? 800 : 500,
                background: viewMode === 'drilldown' ? 'var(--color-surface)' : 'transparent',
                color: viewMode === 'drilldown' ? 'var(--color-primary-light)' : 'var(--color-muted)',
                cursor: 'pointer',
                boxShadow: viewMode === 'drilldown' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              📁 Mode Kategori Utama ({parentCategories.length})
            </button>
            <button
              onClick={() => setViewMode('all')}
              style={{
                padding: '0.4rem 0.85rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: viewMode === 'all' ? 800 : 500,
                background: viewMode === 'all' ? 'var(--color-surface)' : 'transparent',
                color: viewMode === 'all' ? 'var(--color-primary-light)' : 'var(--color-muted)',
                cursor: 'pointer',
                boxShadow: viewMode === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              🌳 Tampilkan Semua Pohon ({categories.length})
            </button>
          </div>
        )}
      </Card>

      {/* TABEL 1: Jika Sedang Membuka Detail Kategori (Drill-Down Mode) */}
      {activeParent ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Daftar Subkategori di Bawah [{activeParent.code}] {activeParent.name}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
              Total: {filteredSubCategories.length} Subkategori
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Kode Subkategori</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Nama Subkategori</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Format Tag Aset</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Masa Manfaat</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Aset Terdaftar</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>
                      <Skeleton height="35px" style={{ marginBottom: '0.5rem' }} />
                      <Skeleton height="35px" />
                    </td>
                  </tr>
                ) : filteredSubCategories.length > 0 ? (
                  filteredSubCategories.map((sub: any) => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--color-success)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {sub.code}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 700 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text)' }}>
                          <Tag size={15} color="var(--color-success)" /> {sub.name}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
                        [DEPT]-{sub.code}-{new Date().getFullYear()}-XXXX
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        {sub.usefulLifeYears || activeParent.usefulLifeYears || 5} Tahun
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge badge-available">
                          {sub._count?.assets || 0} Aset
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <Button variant="secondary" size="sm" onClick={() => handleOpenEditModal(sub)}>
                            <Pencil size={13} /> Edit
                          </Button>
                          <button
                            onClick={() => setDeleteCategory(sub)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            title="Hapus Subkategori"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '3.5rem', textAlign: 'center' }}>
                      <Box size={40} style={{ color: 'var(--color-muted)', opacity: 0.5, marginBottom: '0.6rem' }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
                        Belum Ada Subkategori di Bawah {activeParent.name}
                      </div>
                      <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        Klik tombol di bawah untuk menambahkan sub-bagian inventaris pertama.
                      </p>
                      <Button variant="primary" size="sm" onClick={() => handleOpenAddSubModal(activeParent)}>
                        <Plus size={16} /> Tambah Subkategori Pertama
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : viewMode === 'drilldown' ? (
        /* TABEL 2: Mode Utama Kategori Induk (dengan tombol Buka Subkategori) */
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '1rem 1.25rem' }}>Kode Kategori</th>
                  <th style={{ padding: '1rem' }}>Nama Kategori Utama</th>
                  <th style={{ padding: '1rem' }}>Jumlah Subkategori</th>
                  <th style={{ padding: '1rem' }}>Masa Manfaat</th>
                  <th style={{ padding: '1rem' }}>Tarif Penyusutan</th>
                  <th style={{ padding: '1rem' }}>Aset Terdaftar</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Aksi & Subkategori</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>
                      <Skeleton height="35px" style={{ marginBottom: '0.5rem' }} />
                      <Skeleton height="35px" />
                    </td>
                  </tr>
                ) : filteredParents.length > 0 ? (
                  filteredParents.map((parent: any) => {
                    const subCount = categories.filter((c: any) => c.parentId === parent.id).length;
                    return (
                      <tr key={parent.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.65rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.8rem',
                              fontWeight: 900,
                              letterSpacing: '0.05em',
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: 'var(--color-primary-light)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              fontFamily: 'monospace',
                            }}
                          >
                            {parent.code || 'AST'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 700 }}>
                          <button
                            onClick={() => setActiveParent(parent)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              color: 'var(--color-text)',
                              fontSize: '0.92rem',
                              fontWeight: 700,
                            }}
                            className="hover-underline"
                          >
                            <FolderOpen size={17} color="var(--color-primary)" /> {parent.name}
                          </button>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <button
                            onClick={() => setActiveParent(parent)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              fontSize: '0.78rem',
                              padding: '0.25rem 0.65rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: subCount > 0 ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-surface2)',
                              color: subCount > 0 ? 'var(--color-success)' : 'var(--color-muted)',
                              border: `1px solid ${subCount > 0 ? 'rgba(16, 185, 129, 0.25)' : 'var(--color-border)'}`,
                            }}
                          >
                            <Layers size={13} /> {subCount} Subkategori <ChevronRight size={13} />
                          </button>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>
                          {parent.usefulLifeYears || 5} Tahun
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>
                          {((parent.depreciationRate || 0.2) * 100).toFixed(0)}% / Thn
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className="badge badge-available">
                            {parent._count?.assets || 0} Aset
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {/* Tombol Buka & Kelola Subkategori */}
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setActiveParent(parent)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                            >
                              <FolderOpen size={14} /> Kelola Subkategori
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenAddSubModal(parent)}
                              title="Tambah Subkategori Langsung"
                              style={{ padding: '0.35rem 0.55rem' }}
                            >
                              <Plus size={14} /> Sub
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenEditModal(parent)}
                              style={{ padding: '0.35rem 0.55rem' }}
                            >
                              <Pencil size={14} />
                            </Button>
                            <button
                              onClick={() => setDeleteCategory(parent)}
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--color-danger)', padding: '0.35rem 0.5rem' }}
                              title="Hapus Kategori"
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
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                      Belum ada kategori utama yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* TABEL 3: Mode Semua Pohon Lengkap */
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '1rem 1.25rem' }}>Kode Standar</th>
                  <th style={{ padding: '1rem' }}>Nama Kategori / Subkategori</th>
                  <th style={{ padding: '1rem' }}>Tingkat / Induk</th>
                  <th style={{ padding: '1rem' }}>Masa Manfaat</th>
                  <th style={{ padding: '1rem' }}>Tarif Penyusutan</th>
                  <th style={{ padding: '1rem' }}>Aset Terdaftar</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>
                      <Skeleton height="35px" style={{ marginBottom: '0.5rem' }} />
                      <Skeleton height="35px" />
                    </td>
                  </tr>
                ) : allFiltered.length > 0 ? (
                  allFiltered.map((cat: any) => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid var(--color-border)', background: cat.parentId ? 'rgba(0,0,0,0.015)' : 'transparent' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            background: cat.parentId ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            color: cat.parentId ? 'var(--color-success)' : 'var(--color-primary-light)',
                            border: `1px solid ${cat.parentId ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.25)'}`,
                            fontFamily: 'monospace',
                          }}
                        >
                          {cat.code || 'AST'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingLeft: cat.parentId ? '1.5rem' : '0' }}>
                          {cat.parentId ? (
                            <span style={{ color: 'var(--color-muted)', fontFamily: 'monospace', fontWeight: 700 }}>└─</span>
                          ) : (
                            <FolderOpen size={16} color="var(--color-primary)" />
                          )}
                          <span style={{ color: cat.parentId ? 'var(--color-text)' : 'var(--color-primary-light)' }}>
                            {cat.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {cat.parent ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', background: 'var(--color-surface2)', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                            Sub dari: <strong>[{cat.parent.code}] {cat.parent.name}</strong>
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-primary-light)', fontWeight: 700 }}>
                            📁 Kategori Utama
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        {cat.usefulLifeYears || 5} Tahun
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        {((cat.depreciationRate || 0.2) * 100).toFixed(0)}% / Thn
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge badge-available">
                          {cat._count?.assets || 0} Aset
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {!cat.parentId && (
                            <Button variant="secondary" size="sm" onClick={() => handleOpenAddSubModal(cat)}>
                              <Plus size={13} /> Sub
                            </Button>
                          )}
                          <Button variant="secondary" size="sm" onClick={() => handleOpenEditModal(cat)}>
                            <Pencil size={13} /> Edit
                          </Button>
                          <button
                            onClick={() => setDeleteCategory(cat)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            title="Hapus"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                      Belum ada data kategori.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Tambah / Edit Kategori & Subkategori */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingCategory
            ? editingCategory.parentId
              ? `Edit Subkategori: ${editingCategory.name}`
              : `Edit Kategori Utama: ${editingCategory.name}`
            : modalParentLock
            ? `Tambah Subkategori di Bawah [${modalParentLock.code}] ${modalParentLock.name}`
            : 'Tambah Kategori Utama Baru'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" isLoading={saving} onClick={handleSaveCategory}>
              {editingCategory ? 'Simpan Perubahan' : 'Simpan Kategori'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Info Banner jika sedang menambah/edit subkategori */}
          {(modalParentLock || formData.parentId) && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                fontSize: '0.82rem',
                color: 'var(--color-primary-light)',
              }}
            >
              <strong>Kategori Induk:</strong> [{modalParentLock?.code || 'IND'}] {modalParentLock?.name || 'Kategori Utama'}
            </div>
          )}

          {/* Jika bukan modal yang dikunci parent-nya, tampilkan pilihan Kategori Induk */}
          {!modalParentLock && !editingCategory?.parentId && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
                Kategori Induk (Pilih jika ini adalah Subkategori)
              </label>
              <select
                className="input-field"
                value={formData.parentId}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              >
                <option value="">-- Kategori Utama (Tanpa Induk) --</option>
                {parentCategories
                  .filter((p: any) => p.id !== editingCategory?.id)
                  .map((p: any) => (
                    <option key={p.id} value={p.id}>
                      [{p.code || 'AST'}] {p.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '1rem' }}>
            <Input
              label="Kode Standar *"
              placeholder={formData.parentId ? 'mis. NET' : 'mis. ELK'}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) })}
              required
            />
            <Input
              label="Nama Kategori *"
              placeholder={formData.parentId ? 'Contoh: Perangkat Jaringan & Server' : 'Contoh: Elektronik & Multimedia'}
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                const autoCode = !formData.code || formData.code.length <= 4
                  ? name.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase()
                  : formData.code;
                setFormData({
                  ...formData,
                  name,
                  code: editingCategory ? formData.code : autoCode,
                });
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Masa Manfaat (Tahun)"
              type="number"
              placeholder="5"
              value={formData.usefulLifeYears}
              onChange={(e) => setFormData({ ...formData, usefulLifeYears: e.target.value })}
            />

            <Input
              label="Tarif Penyusutan (0 - 1)"
              type="number"
              step="0.05"
              placeholder="0.2"
              value={formData.depreciationRate}
              onChange={(e) => setFormData({ ...formData, depreciationRate: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Category Modal */}
      <Modal
        isOpen={Boolean(deleteCategory)}
        onClose={() => setDeleteCategory(null)}
        title="Konfirmasi Hapus Kategori"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteCategory(null)}>
              Batal
            </Button>
            <Button variant="danger" isLoading={deleting} onClick={handleDeleteCategory}>
              Hapus Kategori
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--color-muted)' }}>
          Apakah Anda yakin ingin menghapus kategori <strong>{deleteCategory?.name}</strong>?
          {categories.some((c: any) => c.parentId === deleteCategory?.id) && (
            <span style={{ display: 'block', color: 'var(--color-danger)', fontWeight: 700, marginTop: '0.5rem' }}>
              ⚠️ Peringatan: Kategori ini memiliki subkategori di dalamnya! Menghapus kategori induk akan ikut menghapus subkategori terkait.
            </span>
          )}
        </p>
      </Modal>
    </div>
  );
}

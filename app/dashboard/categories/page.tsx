'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Plus, Search, Pencil, Trash2, Tag, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function CategoriesManagementPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
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
        setCategories(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      usefulLifeYears: '5',
      depreciationRate: '0.2',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (cat: any) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
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
          isEdit ? 'Kategori berhasil diperbarui!' : 'Kategori baru berhasil ditambahkan!',
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

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Link
        href="/dashboard/assets"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--color-muted)',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={16} /> Kembali ke Manajemen Aset
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Manajemen Kategori Katalog</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Kelola, tambah, dan edit kategori pengelompokan aset fisik & fasilitas instansi.
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenAddModal}>
          <Plus size={18} /> Tambah Kategori Baru
        </Button>
      </div>

      {/* Filter Bar */}
      <Card style={{ padding: '1.25rem' }}>
        <Input
          placeholder="Cari nama kategori katalog..."
          icon={<Search size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: 0 }}
        />
      </Card>

      {/* Categories Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                <th style={{ padding: '1rem 1.25rem' }}>Nama Kategori</th>
                <th style={{ padding: '1rem' }}>Masa Manfaat</th>
                <th style={{ padding: '1rem' }}>Tarif Penyusutan</th>
                <th style={{ padding: '1rem' }}>Jumlah Aset Terikat</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>
                    <Skeleton height="30px" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton height="30px" />
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((cat) => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-primary-light)' }}>
                        <Tag size={16} /> {cat.name}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                      {cat.usefulLifeYears || 5} Tahun
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                      {((cat.depreciationRate || 0.2) * 100).toFixed(0)}% / Tahun
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge badge-available">
                        {cat._count?.assets || 0} Aset
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEditModal(cat)}
                        >
                          <Pencil size={14} /> Edit Kategori
                        </Button>
                        <button
                          onClick={() => setDeleteCategory(cat)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          title="Hapus Kategori"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    Belum ada kategori katalog yang sesuai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Edit Kategori Katalog' : 'Tambah Kategori Katalog Baru'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" isLoading={saving} onClick={handleSaveCategory}>
              {editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Nama Kategori *"
            placeholder="Contoh: Kendaraan Operasional / Alat Lab / Ruangan"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

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
          Kategori tidak dapat dihapus jika masih terikat pada aset yang terdaftar.
        </p>
      </Modal>
    </div>
  );
}

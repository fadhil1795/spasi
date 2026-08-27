'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Trash2, Eye, Printer, Pencil, Tag, SlidersHorizontal } from 'lucide-react';

export default function DashboardAssetsPage() {
  const { showToast } = useToast();
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resA, resC, resL] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/public/categories'),
        fetch('/api/locations'),
      ]);

      if (resA.ok) setAssets(await resA.json());
      if (resC.ok) setCategories(await resC.json());
      if (resL.ok) setLocations(await resL.json());
    } catch (e) {
      console.error(e);
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

  const filtered = assets.filter((ast) => {
    const matchCat = categoryFilter === 'ALL' || ast.categoryId === categoryFilter;
    const matchStatus = statusFilter === 'ALL' || ast.status === statusFilter;
    const matchSearch =
      ast.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ast.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ast.brand && ast.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchStatus && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Katalog & Manajemen Aset</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Kelola inventarisasi aset fisik, lokasi, kategori, edit data, dan cetak label QR Code.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/tools" className="btn btn-secondary">
            <SlidersHorizontal size={18} /> Utilitas & Impor/Ekspor
          </Link>
          <Link href="/dashboard/categories" className="btn btn-secondary">
            <Tag size={18} /> Kategori Katalog
          </Link>
          {selectedIds.length > 0 && (
            <Link
              href={`/dashboard/assets/qr-labels?ids=${selectedIds.join(',')}`}
              className="btn btn-secondary"
            >
              <Printer size={18} /> Cetak Label QR ({selectedIds.length})
            </Link>
          )}
          <Link href="/dashboard/assets/new" className="btn btn-primary">
            <Plus size={18} /> Tambah Aset Baru
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <Input
            placeholder="Cari kode, nama, atau merek aset..."
            icon={<Search size={18} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: 0 }}
          />

          <select
            className="input-field"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            <option value="ALL">-- Semua Kategori --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

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
            <option value="DAMAGED">Rusak</option>
          </select>
        </div>
      </Card>

      {/* Assets Data Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                <th style={{ padding: '1rem 1.25rem', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '1rem' }}>Kode & Nama Aset</th>
                <th style={{ padding: '1rem' }}>Kategori</th>
                <th style={{ padding: '1rem' }}>Lokasi</th>
                <th style={{ padding: '1rem' }}>Stok</th>
                <th style={{ padding: '1rem' }}>Tarif Sewa</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center' }}>
                    <Skeleton height="30px" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton height="30px" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton height="30px" />
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((ast) => {
                  const isChecked = selectedIds.includes(ast.id);
                  return (
                    <tr
                      key={ast.id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: isChecked ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectOne(ast.id, e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', color: 'var(--color-primary-light)' }}>
                          {ast.code}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ast.name}</div>
                        {ast.brand && <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Merek: {ast.brand}</div>}
                      </td>
                      <td style={{ padding: '1rem' }}>{ast.category?.name || '-'}</td>
                      <td style={{ padding: '1rem', color: 'var(--color-muted)' }}>
                        {ast.location ? `${ast.location.building} ${ast.location.room ? `- ${ast.location.room}` : ''}` : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700 }}>{ast.availableQty} <span style={{ fontWeight: 400, color: 'var(--color-muted)', fontSize: '0.8rem' }}>/ {ast.quantity} Unit</span></div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {ast.isRentable && ast.dailyRentRate ? (
                          <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                            {formatCurrency(ast.dailyRentRate)}/hari
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Internal</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <Badge status={ast.status} />
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {ast.isRentable && (
                            <Link href={`/dashboard/rentals/new?assetId=${ast.id}`} className="btn btn-primary btn-sm" title="Buat Transaksi Penyewaan Aset">
                              💳 Sewakan
                            </Link>
                          )}
                          <Link href={`/dashboard/assets/${ast.id}/edit`} className="btn btn-secondary btn-sm" title="Edit Aset">
                            <Pencil size={15} /> Edit
                          </Link>
                          <Link href={`/assets/${ast.id}`} target="_blank" className="btn btn-ghost btn-sm" title="Lihat Detail">
                            <Eye size={16} />
                          </Link>
                          <Link href={`/dashboard/assets/qr-labels?ids=${ast.id}`} className="btn btn-ghost btn-sm" title="Cetak QR Label">
                            <Printer size={16} />
                          </Link>
                          <button
                            onClick={() => setDeleteId(ast.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            title="Hapus Aset"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    Tidak ada aset yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Konfirmasi Hapus Aset"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Batal
            </Button>
            <Button variant="danger" isLoading={deleting} onClick={handleDelete}>
              Hapus Aset
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--color-muted)' }}>
          Apakah Anda yakin ingin menghapus aset ini? Tindakan ini tidak dapat dibatalkan dan akan menghapus riwayat aset terkait.
        </p>
      </Modal>
    </div>
  );
}

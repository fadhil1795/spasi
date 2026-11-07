'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditAssetPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    categoryId: '',
    departmentId: '',
    locationId: '',
    brand: '',
    serialNumber: '',
    purchaseDate: '',
    purchaseCost: '',
    dailyRentRate: '',
    isRentable: false,
    isLoanable: true,
    status: 'AVAILABLE',
    condition: 'Baik',
    images: [] as string[],
    imageUrl: '',
  });

  useEffect(() => {
    if (id) fetchAssetAndOptions();
  }, [id]);

  const fetchAssetAndOptions = async () => {
    try {
      setLoading(true);
      const [resAsset, resCat, resLoc, resDept] = await Promise.all([
        fetch(`/api/assets/${id}`),
        fetch('/api/public/categories'),
        fetch('/api/locations'),
        fetch('/api/departments'),
      ]);

      if (resCat.ok) setCategories(await resCat.json());
      if (resLoc.ok) setLocations(await resLoc.json());
      if (resDept.ok) {
        const depts = await resDept.json();
        if (Array.isArray(depts)) setDepartments(depts);
      }

      if (resAsset.ok) {
        const ast = await resAsset.json();
        let mainImg = '';
        let assetImages: string[] = [];
        try {
          const imgs = JSON.parse(ast.images || '[]');
          if (Array.isArray(imgs)) {
            assetImages = imgs;
            if (imgs.length > 0) mainImg = imgs[0];
          }
        } catch (e) {}

        setFormData({
          code: ast.code || '',
          name: ast.name || '',
          description: ast.description || '',
          categoryId: ast.categoryId || '',
          departmentId: ast.departmentId || '',
          locationId: ast.locationId || '',
          brand: ast.brand || '',
          serialNumber: ast.serialNumber || '',
          purchaseDate: ast.purchaseDate ? new Date(ast.purchaseDate).toISOString().split('T')[0] : '',
          purchaseCost: ast.purchaseCost ? String(ast.purchaseCost) : '',
          dailyRentRate: ast.dailyRentRate ? String(ast.dailyRentRate) : '',
          isRentable: Boolean(ast.isRentable),
          isLoanable: Boolean(ast.isLoanable),
          status: ast.status || 'AVAILABLE',
          condition: ast.condition || 'Baik',
          images: assetImages,
          imageUrl: mainImg,
        });
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data aset', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId) {
      showToast('Nama dan Kategori aset wajib diisi', 'error');
      return;
    }

    try {
      setSaving(true);
      const imagesArray = formData.images.filter((url) => url.trim() !== '');
      const res = await fetch(`/api/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          images: imagesArray,
        }),
      });

      if (res.ok) {
        showToast('Perubahan data aset berhasil disimpan!', 'success');
        router.push('/dashboard/assets');
        router.refresh();
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menyimpan perubahan aset', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <Skeleton height="30px" width="200px" style={{ marginBottom: '1.5rem' }} />
        <Skeleton height="400px" borderRadius="var(--radius-lg)" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link
        href="/dashboard/assets"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--color-muted)',
          fontSize: '0.9rem',
          fontWeight: 600,
          marginBottom: '1.5rem',
        }}
      >
        <ArrowLeft size={16} /> Kembali ke Daftar Aset
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-primary-light)', fontWeight: 700 }}>
            {formData.code}
          </span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Edit Informasi Aset</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Input
            label="Nama Aset / Sarana *"
            placeholder="Contoh: Proyektor Epson EB-X51"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
                Kategori Aset *
              </label>
              <select
                className="input-field"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
                Status Aset
              </label>
              <select
                className="input-field"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="AVAILABLE">Tersedia</option>
                <option value="BORROWED">Dipinjam</option>
                <option value="RENTED">Disewa</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="DAMAGED">Rusak</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
                Lokasi Ruang / Gedung
              </label>
              <select
                className="input-field"
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              >
                <option value="">-- Tanpa Lokasi / Gudang Umum --</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name || l.building} {l.room ? `- ${l.room}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
                Fakultas / Unit Pemilik Aset
              </label>
              <select
                className="input-field"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              >
                <option value="">-- Milik Kampus Umum / Pusat --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
                Kondisi Fisik
              </label>
              <select
                className="input-field"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              >
                <option value="Baik">Baik / Layak Pakai</option>
                <option value="Rusak Ringan">Rusak Ringan</option>
                <option value="Rusak Berat">Rusak Berat</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
              Deskripsi & Spesifikasi Aset
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Deskripsi singkat spesifikasi aset..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Merek / Brand"
              placeholder="Epson / HP / Toyota dll."
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />

            <Input
              label="Nomor Seri / Plat Nomor"
              placeholder="SN-12345XYZ"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Tanggal Perolehan / Beli"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            />

            <Input
              label="Nilai / Harga Beli (Rp)"
              type="number"
              placeholder="8500000"
              value={formData.purchaseCost}
              onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
              URL Foto Aset (Opsional)
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <input
                className="input-field"
                style={{ flex: 1, minWidth: '240px' }}
                placeholder="https://images.unsplash.com/..."
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ whiteSpace: 'nowrap' }}
                onClick={() => {
                  const url = formData.imageUrl.trim();
                  if (!url) return;
                  setFormData((prev) => ({
                    ...prev,
                    images: [...prev.images, url],
                    imageUrl: '',
                  }));
                }}
              >
                Tambah Foto
              </button>
            </div>
            {formData.images.length > 0 && (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {formData.images.map((img, idx) => (
                  <div
                    key={idx}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                  >
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img}</span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => setFormData((prev) => ({
                        ...prev,
                        images: prev.images.filter((_, index) => index !== idx),
                      }))}
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr style={{ borderColor: 'var(--color-border)', margin: '0.5rem 0' }} />

          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Opsi Hak Akses Peminjaman & Penyewaan</h3>

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={formData.isLoanable}
                onChange={(e) => setFormData({ ...formData, isLoanable: e.target.checked })}
              />
              Dapat Dipinjam Internal
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={formData.isRentable}
                onChange={(e) => setFormData({ ...formData, isRentable: e.target.checked })}
              />
              Dapat Disewa Eksternal
            </label>
          </div>

          {formData.isRentable && (
            <Input
              label="Tarif Sewa per Hari (Rp)"
              type="number"
              placeholder="150000"
              value={formData.dailyRentRate}
              onChange={(e) => setFormData({ ...formData, dailyRentRate: e.target.value })}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <Link href="/dashboard/assets" className="btn btn-secondary">
              Batal
            </Link>
            <Button type="submit" variant="primary" isLoading={saving}>
              <Save size={18} /> Simpan Perubahan Aset
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

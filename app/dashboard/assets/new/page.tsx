'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save, Plus, X, Package, Building2 } from 'lucide-react';

const FASILITAS_OPTIONS = ['AC', 'Proyektor', 'Smart TV', 'Sound System', 'WiFi', 'Whiteboard', 'Podium', 'Mic Wireless', 'Laptop', 'Kamera'];

function NewAssetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Checklist aksesori
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const prefilledRoomId = searchParams.get('roomId') || '';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    locationId: prefilledRoomId,
    brand: '',
    serialNumber: '',
    quantity: '1',
    purchaseDate: '',
    purchaseCost: '',
    dailyRentRate: '',
    sessionRentRate: '',
    isRentable: false,
    isLoanable: true,
    isFixedToRoom: prefilledRoomId ? true : false,
    status: 'AVAILABLE',
    condition: 'Baik',
    images: [] as string[],
    imageUrl: '',
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [resC, resL] = await Promise.all([
        fetch('/api/public/categories'),
        fetch('/api/rooms'),
      ]);
      if (resC.ok) {
        const cats = await resC.json();
        setCategories(cats);
        if (cats.length > 0) setFormData((prev) => ({ ...prev, categoryId: cats[0].id }));
      }
      if (resL.ok) setLocations(await resL.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddImage = () => {
    const url = formData.imageUrl.trim();
    if (!url) return;
    setFormData((prev) => ({ ...prev, images: [...prev.images, url], imageUrl: '' }));
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({ ...prev, images: prev.images.filter((_, idx) => idx !== index) }));
  };

  const handleAddChecklistItem = () => {
    const item = newChecklistItem.trim();
    if (!item || checklistItems.includes(item)) return;
    setChecklistItems((prev) => [...prev, item]);
    setNewChecklistItem('');
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId) {
      showToast('Nama dan Kategori aset wajib diisi', 'error');
      return;
    }

    try {
      setLoading(true);
      const imagesArray = formData.images.filter((url) => url.trim() !== '');
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          images: imagesArray,
          checklistItems,
          locationId: formData.isFixedToRoom ? formData.locationId : '',
        }),
      });

      if (res.ok) {
        showToast('Aset baru berhasil ditambahkan!', 'success');
        if (formData.isFixedToRoom && formData.locationId) {
          router.push(`/dashboard/rooms/${formData.locationId}`);
        } else {
          router.push('/dashboard/assets');
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal membuat aset baru', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const sectionStyle = {
    padding: '1.5rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem',
    marginBottom: '1.25rem',
  };

  const sectionTitleStyle = {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--color-text)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.4rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--color-muted)',
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
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

      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>Tambah Aset Baru</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Isi informasi identitas fisik, kelengkapan aksesori, dan penempatan aset.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Seksi A: Informasi Dasar */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <Package size={18} style={{ color: 'var(--color-primary)' }} />
            A. Informasi Dasar Aset
          </div>

          <Input
            label="Nama Aset / Sarana *"
            placeholder="Contoh: Proyektor Epson EB-X51"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Kategori Aset *</label>
              <select
                className="input-field"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Kondisi Fisik Awal</label>
              <select
                className="input-field"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              >
                <option value="Baik">Baik</option>
                <option value="Sangat Baik">Sangat Baik</option>
                <option value="Ada Minus">Ada Minus / Goresan</option>
                <option value="Rusak Ringan">Rusak Ringan</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <Input
              label="Jumlah Unit / Stok *"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
            <Input
              label="Merek / Brand"
              placeholder="Epson / HP / Sony"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />
            <Input
              label="Nomor Seri / SN"
              placeholder="SN-12345XYZ"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            />
          </div>

          <div>
            <label style={labelStyle}>Deskripsi & Spesifikasi</label>
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
        </div>

        {/* Seksi B: Checklist Aksesori */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <Package size={18} style={{ color: 'var(--color-accent)' }} />
            B. Checklist Kelengkapan Aksesori
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '-0.75rem' }}>
            Daftar item ini akan muncul sebagai checklist wajib saat aset dipinjam/dikembalikan.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              className="input-field"
              style={{ flex: 1 }}
              placeholder="Contoh: Body Kamera, Lensa Kit, 2x Baterai, Charger, Tas..."
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddChecklistItem(); } }}
            />
            <button type="button" className="btn btn-secondary" onClick={handleAddChecklistItem}>
              <Plus size={16} /> Tambah
            </button>
          </div>

          {checklistItems.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {checklistItems.map((item, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '999px',
                    background: 'var(--color-surface2)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  {item}
                  <button type="button" onClick={() => handleRemoveChecklistItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 0, display: 'flex' }}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {checklistItems.length === 0 && (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>
              Belum ada aksesori ditambahkan. Kosongkan jika aset tidak memiliki aksesori.
            </p>
          )}
        </div>

        {/* Seksi C: Penempatan Aset */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <Building2 size={18} style={{ color: 'var(--color-warning)' }} />
            C. Penempatan Aset
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '1rem', border: `2px solid ${!formData.isFixedToRoom ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: !formData.isFixedToRoom ? 'rgba(var(--color-primary-rgb, 99,102,241),0.05)' : 'transparent', transition: 'all 0.2s' }}>
              <input
                type="radio"
                name="assetType"
                checked={!formData.isFixedToRoom}
                onChange={() => setFormData({ ...formData, isFixedToRoom: false, locationId: '' })}
                style={{ marginTop: '2px' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>📦 Aset Bergerak (Mobile Asset)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Disimpan di gudang umum. Dapat dipinjam/disewa secara mandiri atau dijadikan Add-On sewa ruangan.</div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '1rem', border: `2px solid ${formData.isFixedToRoom ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: formData.isFixedToRoom ? 'rgba(var(--color-primary-rgb, 99,102,241),0.05)' : 'transparent', transition: 'all 0.2s' }}>
              <input
                type="radio"
                name="assetType"
                checked={formData.isFixedToRoom}
                onChange={() => setFormData({ ...formData, isFixedToRoom: true })}
                style={{ marginTop: '2px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>🏢 Aset Terikat Ruangan (Fixed Room Asset)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Terpasang tetap di ruangan tertentu (AC, Smart TV, Proyektor Ceiling, Furnitur). Otomatis muncul di inventaris ruangan.</div>
                {formData.isFixedToRoom && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={labelStyle}>Pilih Ruangan Tempat Aset Dipasang *</label>
                    <select
                      className="input-field"
                      value={formData.locationId}
                      onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                      required={formData.isFixedToRoom}
                    >
                      <option value="">-- Pilih Ruangan --</option>
                      {locations.map((l: any) => (
                        <option key={l.id} value={l.id}>
                          {l.name || l.building} {l.code ? `(${l.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Seksi D: Opsi Sewa & Pinjam */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>D. Opsi Peminjaman & Penyewaan</div>

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Tarif Sewa per Hari (Rp)"
                type="number"
                placeholder="150000"
                value={formData.dailyRentRate}
                onChange={(e) => setFormData({ ...formData, dailyRentRate: e.target.value })}
              />
              <Input
                label="Tarif Add-On per Sesi Booking Ruangan (Rp)"
                type="number"
                placeholder="50000"
                value={formData.sessionRentRate}
                onChange={(e) => setFormData({ ...formData, sessionRentRate: e.target.value })}
              />
            </div>
          )}
        </div>

        {/* Seksi E: Foto */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>E. Foto Aset (Opsional)</div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              className="input-field"
              style={{ flex: 1, minWidth: '240px' }}
              placeholder="https://images.unsplash.com/..."
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            />
            <button type="button" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={handleAddImage}>
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
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{img}</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: 'var(--color-danger)' }}
                    onClick={() => handleRemoveImage(idx)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <Link href="/dashboard/assets" className="btn btn-secondary">Batal</Link>
          <Button type="submit" variant="primary" isLoading={loading}>
            <Save size={18} /> Simpan Aset Baru
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewAssetPage() {
  return (
    <React.Suspense fallback={<div>Memuat...</div>}>
      <NewAssetForm />
    </React.Suspense>
  );
}

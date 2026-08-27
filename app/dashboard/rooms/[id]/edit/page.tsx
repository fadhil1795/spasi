'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save, Plus, X, Building2 } from 'lucide-react';

const FASILITAS_OPTIONS = ['AC', 'Proyektor', 'Smart TV', 'Sound System', 'WiFi', 'Whiteboard', 'Podium', 'Panggung', 'Kamera CCTV', 'Toilet', 'Mic Wireless'];

export default function EditRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    building: '',
    floor: '',
    room: '',
    area: '',
    capacity: '',
    pricePerHour: '',
    pricePerDay: '',
    depositAmount: '',
    description: '',
    status: 'AVAILABLE',
    facilities: [] as string[],
    assetIds: [] as string[],
    photos: [] as string[],
    photoInput: '',
  });

  const [availableAssets, setAvailableAssets] = useState<any[]>([]);

  useEffect(() => {
    fetchRoom();
    fetchAvailableAssets();
  }, [params.id]);

  const fetchAvailableAssets = async () => {
    try {
      const res = await fetch('/api/assets?locationId=none');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAvailableAssets(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoom = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rooms/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        
        // Gabungkan aset yang sudah ada dengan availableAssets jika belum ada
        if (data.assets && Array.isArray(data.assets)) {
          setAvailableAssets((prev) => {
            const existingIds = prev.map((p) => p.id);
            const toAdd = data.assets.filter((a: any) => !existingIds.includes(a.id));
            return [...prev, ...toAdd];
          });
        }

        setFormData({
          code: data.code || '',
          name: data.name || '',
          building: data.building || '',
          floor: data.floor || '',
          room: data.room || '',
          area: data.area ? String(data.area) : '',
          capacity: data.capacity ? String(data.capacity) : '',
          pricePerHour: data.pricePerHour ? String(data.pricePerHour) : '',
          pricePerDay: data.pricePerDay ? String(data.pricePerDay) : '',
          depositAmount: data.depositAmount ? String(data.depositAmount) : '',
          description: data.description || '',
          status: data.status || 'AVAILABLE',
          facilities: data.facilities ? (typeof data.facilities === 'string' ? JSON.parse(data.facilities) : data.facilities) : [],
          assetIds: data.assets ? data.assets.map((a: any) => a.id) : [],
          photos: data.photos ? (typeof data.photos === 'string' ? JSON.parse(data.photos) : data.photos) : [],
          photoInput: '',
        });
      } else {
        showToast('Ruangan tidak ditemukan', 'error');
      }
    } catch (e) {
      showToast('Gagal memuat data ruangan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFacilityToggle = (item: string) => {
    if (formData.facilities.includes(item)) {
      setFormData({ ...formData, facilities: formData.facilities.filter((f) => f !== item) });
    } else {
      setFormData({ ...formData, facilities: [...formData.facilities, item] });
    }
  };

  const handleAddPhoto = () => {
    if (!formData.photoInput.trim()) return;
    setFormData({
      ...formData,
      photos: [...formData.photos, formData.photoInput.trim()],
      photoInput: '',
    });
  };

  const handleRemovePhoto = (idx: number) => {
    setFormData({
      ...formData,
      photos: formData.photos.filter((_, i) => i !== idx),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.building) {
      showToast('Nama Ruangan dan Gedung wajib diisi', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/rooms/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast('Data ruangan berhasil diperbarui!', 'success');
        router.push(`/dashboard/rooms/${params.id}`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memperbarui ruangan', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Card style={{ padding: '2rem', height: '400px' }}>
          <div>Memuat data ruangan...</div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <Link
        href={`/dashboard/rooms/${params.id}`}
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
        <ArrowLeft size={16} /> Kembali ke Detail Ruangan
      </Link>

      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.35rem' }}>
        Edit Ruangan
      </h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Perbarui informasi ruangan, fasilitas, spesifikasi, dan tarif sewa.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section A: Informasi Utama */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} style={{ color: 'var(--color-primary)' }} /> Informasi Utama
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label className="input-label">Kode Ruangan (Opsional)</label>
              <input
                className="input-field"
                placeholder="Contoh: R-201, STUDIO-A"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="input-label">Nama Resmi Ruangan *</label>
              <input
                className="input-field"
                placeholder="Contoh: Ruang Rapat Executive"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="input-label">Gedung *</label>
              <input
                className="input-field"
                placeholder="Contoh: Gedung Utama (A)"
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="input-label">Lantai</label>
              <input
                className="input-field"
                placeholder="Contoh: Lantai 2"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Nama Ruang / Area Spesiﬁk</label>
              <input
                className="input-field"
                placeholder="Contoh: Ruang Rapat 201"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </Card>

        {/* Section B: Spesifikasi & Deskripsi */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            Spesifikasi & Deskripsi
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="input-label">Luas Ruangan (m²)</label>
              <input
                type="number"
                className="input-field"
                placeholder="Contoh: 80"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="input-label">Kapasitas Maksimal (Orang)</label>
              <input
                type="number"
                className="input-field"
                placeholder="Contoh: 30"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label className="input-label">Deskripsi & Aturan Penggunaan Ruangan</label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Tuliskan deskripsi kelengkapan, aturan penggunaan, tata tertib sewa..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </Card>

        {/* Section C: Tarif Sewa & Deposit */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            Tarif Sewa & Keuangan
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label className="input-label">Harga Sewa per Jam (Rp)</label>
              <input
                type="number"
                className="input-field"
                placeholder="100000"
                value={formData.pricePerHour}
                onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="input-label">Harga Sewa per Hari (Rp)</label>
              <input
                type="number"
                className="input-field"
                placeholder="750000"
                value={formData.pricePerDay}
                onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="input-label">Deposit Jaminan (Rp)</label>
              <input
                type="number"
                className="input-field"
                placeholder="200000"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </Card>

        {/* Section D: Fasilitas & Aset Ruangan */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Fasilitas & Aset Ruangan
          </h3>

          <div>
            <label className="input-label">Aset Fisik Terpasang (Terintegrasi ke Data Aset)</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.8rem' }}>
              Pilih aset fisik aktual (yang belum ditempatkan atau yang sudah ada di ruangan ini) untuk ditautkan lokasinya.
            </p>
            {availableAssets.length === 0 ? (
              <div style={{ padding: '1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                Tidak ada aset fisik nganggur yang tersedia.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.6rem' }}>
                {availableAssets.map((asset) => {
                  const active = formData.assetIds.includes(asset.id);
                  return (
                    <div
                      key={asset.id}
                      onClick={() => {
                        const newIds = active
                          ? formData.assetIds.filter((id) => id !== asset.id)
                          : [...formData.assetIds, asset.id];
                        setFormData({ ...formData, assetIds: newIds });
                      }}
                      style={{
                        padding: '0.75rem',
                        border: '1px solid',
                        borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
                        background: active ? 'rgba(79, 70, 229, 0.08)' : 'var(--color-surface)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={active} 
                        readOnly 
                        style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }} 
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{asset.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>SN: {asset.serialNumber || '-'} | {asset.code}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Section E: Foto */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Foto Ruangan
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              className="input-field"
              placeholder="Masukkan URL foto (https://...)"
              value={formData.photoInput}
              onChange={(e) => setFormData({ ...formData, photoInput: e.target.value })}
              style={{ flex: 1 }}
            />
            <Button type="button" variant="secondary" onClick={handleAddPhoto}>
              <Plus size={16} /> Tambah
            </Button>
          </div>

          {formData.photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
              {formData.photos.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', height: '90px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                  <img src={url} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    style={{
                      position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Section F: Status */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Status Ruangan
          </h3>

          <select
            className="input-field"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            style={{ width: '100%', cursor: 'pointer' }}
          >
            <option value="AVAILABLE">Tersedia (AVAILABLE)</option>
            <option value="MAINTENANCE">Maintenance / Perbaikan</option>
            <option value="INACTIVE">Non-Aktif</option>
          </select>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '3rem' }}>
          <Link href={`/dashboard/rooms/${params.id}`} className="btn btn-secondary">Batal</Link>
          <Button type="submit" variant="primary" isLoading={submitting}>
            <Save size={18} /> Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}

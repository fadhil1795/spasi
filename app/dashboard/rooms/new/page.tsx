'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Plus, X } from 'lucide-react';

const FACILITIES_LIST = [
  'AC',
  'Proyektor',
  'Smart TV',
  'Sound System',
  'WiFi',
  'Whiteboard',
  'Podium',
  'Panggung',
  'Kamera CCTV',
  'Toilet',
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: '0.8rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--color-primary-light)',
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {children}
    </div>
  );
}

function FormLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      style={{
        display: 'block',
        marginBottom: '0.4rem',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--color-muted)',
      }}
    >
      {children}
      {required && (
        <span style={{ color: 'var(--color-danger)', marginLeft: '0.2rem' }}>
          *
        </span>
      )}
    </label>
  );
}

export default function NewRoomPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  // Section A - Informasi Utama
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [areaName, setAreaName] = useState('');

  // Section B - Spesifikasi
  const [area, setArea] = useState('');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');

  // Section C - Tarif & Keuangan
  const [pricePerHour, setPricePerHour] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [deposit, setDeposit] = useState('');

  const [facilities, setFacilities] = useState<string[]>([]);

  // Section D.2 - Aset Fisik
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [assetIds, setAssetIds] = useState<string[]>([]);

  // Section E - Foto
  const [photos, setPhotos] = useState<string[]>(['']);

  // Section F - Status
  const [status, setStatus] = useState('AVAILABLE');

  React.useEffect(() => {
    fetch('/api/assets?locationId=none')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAvailableAssets(data);
      })
      .catch((err) => console.error(err));
  }, []);

  const toggleFacility = (fac: string) => {
    setFacilities((prev) =>
      prev.includes(fac) ? prev.filter((f) => f !== fac) : [...prev, fac]
    );
  };

  const toggleAsset = (id: string) => {
    setAssetIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAddPhoto = () => {
    if (photos.length < 8) setPhotos((prev) => [...prev, '']);
  };

  const handlePhotoChange = (idx: number, val: string) => {
    setPhotos((prev) => prev.map((p, i) => (i === idx ? val : p)));
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Nama Ruangan wajib diisi.', 'error');
      return;
    }
    if (!building.trim()) {
      showToast('Nama Gedung wajib diisi.', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        code: code.trim() || null,
        name: name.trim(),
        building: building.trim(),
        floor: floor.trim() || null,
        areaName: areaName.trim() || null,
        area: area ? parseFloat(area) : null,
        capacity: capacity ? parseInt(capacity) : null,
        description: description.trim() || null,
        pricePerHour: pricePerHour ? parseFloat(pricePerHour) : null,
        pricePerDay: pricePerDay ? parseFloat(pricePerDay) : null,
        deposit: deposit ? parseFloat(deposit) : null,
        facilities,
        assetIds,
        photos: photos.filter((p) => p.trim() !== ''),
        status,
      };

      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Ruangan berhasil ditambahkan!', 'success');
        router.push('/dashboard/rooms');
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan ruangan.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
      {/* Back & Title */}
      <div>
        <Link
          href="/dashboard/rooms"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            color: 'var(--color-muted)',
            marginBottom: '0.75rem',
          }}
        >
          <ArrowLeft size={15} /> Kembali ke Daftar Ruangan
        </Link>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Tambah Ruangan Baru</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Isi informasi ruangan yang akan didaftarkan ke sistem.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Section A - Informasi Utama */}
        <Card style={{ padding: '1.5rem' }}>
          <SectionTitle>A — Informasi Utama</SectionTitle>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <Input
              label="Kode Ruangan (opsional)"
              placeholder="RNG-001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ marginBottom: 0 }}
            />
            <Input
              label="Nama Ruangan *"
              placeholder="Aula Utama Gedung A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 2fr',
              gap: '1rem',
            }}
          >
            <Input
              label="Gedung *"
              placeholder="Gedung A"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              style={{ marginBottom: 0 }}
            />
            <Input
              label="Lantai"
              placeholder="1"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              style={{ marginBottom: 0 }}
            />
            <Input
              label="Nama Ruang / Area"
              placeholder="Aula, Ruang Rapat, dll."
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
        </Card>

        {/* Section B - Spesifikasi */}
        <Card style={{ padding: '1.5rem' }}>
          <SectionTitle>B — Spesifikasi</SectionTitle>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <Input
              label="Luas (m²)"
              type="number"
              placeholder="120"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              style={{ marginBottom: 0 }}
            />
            <Input
              label="Kapasitas (orang)"
              type="number"
              placeholder="50"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <FormLabel>Deskripsi & Aturan Penggunaan</FormLabel>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Deskripsikan ruangan dan aturan penggunaan, persyaratan peminjam, dll."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </Card>

        {/* Section C - Tarif & Keuangan */}
        <Card style={{ padding: '1.5rem' }}>
          <SectionTitle>C — Tarif & Keuangan</SectionTitle>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '1rem',
            }}
          >
            <Input
              label="Harga per Jam (Rp)"
              type="number"
              placeholder="500000"
              value={pricePerHour}
              onChange={(e) => setPricePerHour(e.target.value)}
              style={{ marginBottom: 0 }}
            />
            <Input
              label="Harga per Hari (Rp)"
              type="number"
              placeholder="3000000"
              value={pricePerDay}
              onChange={(e) => setPricePerDay(e.target.value)}
              style={{ marginBottom: 0 }}
            />
            <Input
              label="Deposit Jaminan (Rp)"
              type="number"
              placeholder="1000000"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
        </Card>

        {/* Section D - Fasilitas */}
        <Card style={{ padding: '1.5rem' }}>
          <SectionTitle>D — Fasilitas & Aset Ruangan</SectionTitle>

          <div>
            <FormLabel>Aset Fisik Terpasang (Terintegrasi ke Data Aset)</FormLabel>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.8rem' }}>
              Pilih aset fisik aktual (yang belum ditempatkan) untuk langsung dipindahkan lokasinya ke ruangan ini.
            </p>
            {availableAssets.length === 0 ? (
              <div style={{ padding: '1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                Tidak ada aset fisik nganggur yang tersedia.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.6rem' }}>
                {availableAssets.map((asset) => {
                  const active = assetIds.includes(asset.id);
                  return (
                    <div
                      key={asset.id}
                      onClick={() => toggleAsset(asset.id)}
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

        {/* Section E - Foto */}
        <Card style={{ padding: '1.5rem' }}>
          <SectionTitle>E — Foto Ruangan</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {photos.map((url, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  className="input-field"
                  type="url"
                  placeholder={`URL Foto ${idx + 1} (https://...)`}
                  value={url}
                  onChange={(e) => handlePhotoChange(idx, e.target.value)}
                  style={{ flex: 1 }}
                />
                {photos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    style={{
                      padding: '0.55rem',
                      background: 'var(--color-danger-bg)',
                      color: 'var(--color-danger)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    title="Hapus foto"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {photos.length < 8 && (
            <button
              type="button"
              onClick={handleAddPhoto}
              style={{
                marginTop: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--color-primary-light)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem 0',
              }}
            >
              <Plus size={15} /> Tambah Foto (maks. 8)
            </button>
          )}
        </Card>

        {/* Section F - Status */}
        <Card style={{ padding: '1.5rem' }}>
          <SectionTitle>F — Status Ruangan</SectionTitle>
          <div>
            <FormLabel>Status *</FormLabel>
            <select
              className="input-field"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ maxWidth: '280px' }}
            >
              <option value="AVAILABLE">Tersedia (AVAILABLE)</option>
              <option value="MAINTENANCE">Dalam Perbaikan (MAINTENANCE)</option>
              <option value="INACTIVE">Tidak Aktif (INACTIVE)</option>
            </select>
          </div>
        </Card>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <Link href="/dashboard/rooms" className="btn btn-secondary">
            Batal
          </Link>
          <Button type="submit" variant="primary" isLoading={saving}>
            Simpan Ruangan
          </Button>
        </div>
      </form>
    </div>
  );
}

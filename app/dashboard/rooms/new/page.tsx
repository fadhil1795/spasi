'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ROOM_TYPES } from '@/lib/roomConstants';
import { RoomAssetSelector, RoomAssetAllocItem } from '@/components/rooms/RoomAssetSelector';
import { RoomPrimaryInfoSection } from '@/components/rooms/RoomPrimaryInfoSection';
import { ArrowLeft, Plus, X, UploadCloud, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';

const BUILDING_UTILITIES_LIST = [
  'WiFi / Internet Kampus',
  'Toilet Dalam',
  'Panggung Permanen',
  'AC Sentral Gedung',
  'Akses Kursi Roda / Lift',
  'Area Parkir Khusus',
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
  const [roomType, setRoomType] = useState('CLASSROOM');
  const [buildingId, setBuildingId] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('1');
  const [areaName, setAreaName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [picName, setPicName] = useState('');
  const [picPhone, setPicPhone] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [buildingsList, setBuildingsList] = useState<any[]>([]);
  const [existingBuildings, setExistingBuildings] = useState<string[]>([]);

  // Section B - Spesifikasi
  const [area, setArea] = useState('');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');

  // Section C - Tarif & Keuangan
  const [pricePerHour, setPricePerHour] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [deposit, setDeposit] = useState('');
  const [isRentable, setIsRentable] = useState(false);
  const [isLoanable, setIsLoanable] = useState(true);
  const [requiresDepositForInternal, setRequiresDepositForInternal] = useState(false);

  const [facilities, setFacilities] = useState<string[]>([]);

  // Section D.2 - Aset Fisik Terpasang (dengan jumlah)
  const [assetAllocations, setAssetAllocations] = useState<RoomAssetAllocItem[]>([]);

  // Section E - Foto
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Section F - Status
  const [status, setStatus] = useState('AVAILABLE');

  React.useEffect(() => {
    Promise.all([
      fetch('/api/rooms').then((r) => r.json()).catch(() => []),
      fetch('/api/departments').then((r) => r.json()).catch(() => []),
      fetch('/api/buildings').then((r) => r.json()).catch(() => []),
    ]).then(([roomsData, deptsData, bData]) => {
      if (Array.isArray(roomsData)) {
        const buildings = Array.from(new Set(roomsData.map((r: any) => r.building).filter(Boolean))) as string[];
        setExistingBuildings(buildings);
      }
      if (Array.isArray(deptsData)) setDepartments(deptsData);
      if (Array.isArray(bData)) setBuildingsList(bData);
    });
  }, []);

  const toggleFacility = (facName: string) => {
    setFacilities((prev) =>
      prev.includes(facName) ? prev.filter((f) => f !== facName) : [...prev, facName]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingPhotos(true);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          showToast(`Berkas "${file.name}" bukan gambar valid. Lewati.`, 'warning');
          continue;
        }

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('folder', 'rooms');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) uploadedUrls.push(data.url);
        } else {
          const err = await res.json();
          showToast(`Gagal mengunggah ${file.name}: ${err.error || 'Terjadi kesalahan'}`, 'error');
        }
      }

      if (uploadedUrls.length > 0) {
        setPhotos((prev) => [...prev, ...uploadedUrls]);
        showToast(`Berhasil mengunggah ${uploadedUrls.length} foto ruangan!`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan saat mengunggah foto', 'error');
    } finally {
      setUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const handleAddPhotoUrl = () => {
    const url = photoUrlInput.trim();
    if (!url) return;
    setPhotos((prev) => [...prev, url]);
    setPhotoUrlInput('');
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
    if (!buildingId && !building.trim()) {
      showToast('Gedung wajib dipilih atau diisi.', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        code: code.trim() || null,
        name: name.trim(),
        roomType,
        buildingId: buildingId || null,
        building: building.trim(),
        floor: floor.trim() || null,
        room: areaName.trim() || null,
        departmentId: departmentId || null,
        picName: picName.trim() || null,
        picPhone: picPhone.trim() || null,
        area: area ? parseFloat(area) : null,
        capacity: capacity ? parseInt(capacity) : null,
        description: description.trim() || null,
        pricePerHour: pricePerHour ? parseFloat(pricePerHour) : null,
        pricePerDay: pricePerDay ? parseFloat(pricePerDay) : null,
        depositAmount: deposit ? parseFloat(deposit) : null,
        isRentable,
        isLoanable,
        requiresDepositForInternal,
        facilities,
        assetAllocations: assetAllocations.map(({ assetId, quantity }) => ({ assetId, quantity })),
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
        {/* Section A - Informasi Utama & Standarisasi Penamaan */}
        <RoomPrimaryInfoSection
          data={{
            code,
            name,
            roomType,
            buildingId,
            building,
            floor,
            room: areaName,
            departmentId,
            picName,
            picPhone,
          }}
          onChange={(next) => {
            setCode(next.code);
            setName(next.name);
            setRoomType(next.roomType);
            setBuildingId(next.buildingId);
            setBuilding(next.building);
            setFloor(next.floor);
            setAreaName(next.room);
            setDepartmentId(next.departmentId);
            setPicName(next.picName);
            setPicPhone(next.picPhone);
          }}
          autoNamingDefault={true}
        />

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
              onChange={(e) => {
                setDeposit(e.target.value);
                if (!e.target.value) setRequiresDepositForInternal(false);
              }}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={isLoanable}
                  onChange={(e) => setIsLoanable(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Bisa Dipinjam (Gratis untuk Internal)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={isRentable}
                  onChange={(e) => setIsRentable(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Bisa Disewa (Berbayar untuk Eksternal / Internal)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', opacity: deposit ? 1 : 0.5 }}>
                <input
                  type="checkbox"
                  checked={requiresDepositForInternal}
                  disabled={!deposit}
                  onChange={(e) => setRequiresDepositForInternal(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Wajib Deposit bagi Internal</span>
              </label>
            </div>
            {!deposit && (
              <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '-0.5rem' }}>
                * Jaminan deposit harus diisi untuk mengaktifkan opsi &quot;Wajib Deposit bagi Internal&quot;.
              </p>
            )}
          </div>
        </Card>

        {/* Section D - Utilitas Bangunan & Aset Terpasang */}
        <Card style={{ padding: '1.5rem' }}>
          <SectionTitle>D — Aset &amp; Perlengkapan Ruangan</SectionTitle>

          <div style={{ marginBottom: '1.5rem' }}>
            <FormLabel>Utilitas Bangunan Permanen (Non-Aset)</FormLabel>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.65rem' }}>
              Pilih atribut bawaan gedung yang melekat permanen (bukan barang inventaris lepas).
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {BUILDING_UTILITIES_LIST.map((item) => {
                const checked = facilities.includes(item);
                return (
                  <label
                    key={item}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      padding: '0.4rem 0.75rem',
                      border: '1px solid',
                      borderColor: checked ? 'var(--color-primary)' : 'var(--color-border)',
                      background: checked ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                      borderRadius: 'var(--radius-pill)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFacility(item)}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                    />
                    <span>{item}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <FormLabel>Aset Fisik Terpasang (Terintegrasi ke Master Data Aset)</FormLabel>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.8rem' }}>
              Pilih kategori dan aset yang akan ditempatkan ke ruangan ini, lalu tentukan jumlah unitnya.
            </p>
            <RoomAssetSelector
              allocations={assetAllocations}
              onChange={setAssetAllocations}
            />
          </div>
        </Card>

        {/* Section E - Foto Ruangan */}
        <Card style={{ padding: '1.5rem' }}>
          <SectionTitle>E — Dokumentasi Foto Ruangan</SectionTitle>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '-0.5rem', marginBottom: '0.85rem' }}>
            Unggah foto fisik ruangan (tampak depan, interior, panggung, fasilitas proyektor, sudut ruangan).
          </p>

          {/* Area Unggah Berkas Foto (Multiple Upload) */}
          <div
            style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem 1rem',
              textAlign: 'center',
              background: 'var(--color-surface2)',
              cursor: uploadingPhotos ? 'not-allowed' : 'pointer',
              position: 'relative',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploadingPhotos}
              onChange={handleFileUpload}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: uploadingPhotos ? 'not-allowed' : 'pointer',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', pointerEvents: 'none' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(79, 70, 229, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary-light)',
                }}
              >
                {uploadingPhotos ? <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> : <UploadCloud size={24} />}
              </div>
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                  {uploadingPhotos ? 'Sedang mengunggah foto ruangan...' : 'Klik untuk Pilih Foto atau Seret ke Sini'}
                </span>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                  Bisa pilih beberapa foto sekaligus (JPG, PNG, WebP hingga 10MB/foto)
                </p>
              </div>
            </div>
          </div>

          {/* Grid Preview Foto Terunggah */}
          {photos.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.6rem' }}>
                Foto Ruangan ({photos.length} foto):
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {photos.map((url, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      border: idx === 0 ? '2px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                      aspectRatio: '16/10',
                      background: '#0f172a',
                    }}
                  >
                    <img
                      src={url}
                      alt={`Foto Ruangan ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {idx === 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          left: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          background: 'var(--color-primary)',
                          color: '#fff',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '3px',
                        }}
                      >
                        Sampul Utama
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: '#ef4444',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                      title="Hapus foto ini"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opsi Collapse URL Eksternal */}
          <details style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--color-muted)' }}>
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
              Atau masukkan tautan URL gambar eksternal...
            </summary>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
              <input
                className="input-field"
                style={{ flex: 1, fontSize: '0.8rem', height: '34px' }}
                placeholder="https://..."
                value={photoUrlInput}
                onChange={(e) => setPhotoUrlInput(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddPhotoUrl}
              >
                Tambah URL
              </button>
            </div>
          </details>
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

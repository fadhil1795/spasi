'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ROOM_TYPES, parseFacilities } from '@/lib/roomConstants';
import { RoomAssetSelector, RoomAssetAllocItem } from '@/components/rooms/RoomAssetSelector';
import { RoomPrimaryInfoSection } from '@/components/rooms/RoomPrimaryInfoSection';
import { ArrowLeft, Save, Plus, X, Building2, UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react';

const BUILDING_UTILITIES_LIST = [
  'WiFi / Internet Kampus',
  'Toilet Dalam',
  'Panggung Permanen',
  'AC Sentral Gedung',
  'Akses Kursi Roda / Lift',
  'Area Parkir Khusus',
];

export default function EditRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    roomType: 'CLASSROOM',
    buildingId: '',
    building: '',
    floor: '',
    room: '',
    departmentId: '',
    picName: '',
    picPhone: '',
    area: '',
    capacity: '',
    pricePerHour: '',
    pricePerDay: '',
    depositAmount: '',
    isRentable: false,
    isLoanable: true,
    requiresDepositForInternal: false,
    description: '',
    status: 'AVAILABLE',
    facilities: [] as string[],
    assetAllocations: [] as RoomAssetAllocItem[],
    photos: [] as string[],
    photoInput: '',
  });

  const [buildingsList, setBuildingsList] = useState<any[]>([]);

  useEffect(() => {
    fetchRoom();
    fetch('/api/buildings').then((r) => r.json()).then((d) => Array.isArray(d) && setBuildingsList(d)).catch(() => {});
  }, [params.id]);

  const fetchRoom = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rooms/${params.id}`);
      if (res.ok) {
        const data = await res.json();

        // Susun initial assetAllocations beserta object asset-nya
        const initMap = new Map<string, RoomAssetAllocItem>();
        if (Array.isArray(data.assets)) {
          data.assets.forEach((a: any) => {
            initMap.set(a.id, { assetId: a.id, quantity: a.quantity || 1, asset: a });
          });
        }
        if (Array.isArray(data.assetAllocations)) {
          data.assetAllocations.forEach((al: any) => {
            if (al.asset) {
              initMap.set(al.assetId, {
                assetId: al.assetId,
                quantity: al.quantity || 1,
                asset: al.asset,
              });
            }
          });
        }
        const initAllocations = Array.from(initMap.values());

        // Parse facilities menjadi list string sederhana
        const parsedFacs = parseFacilities(data.facilities).map((f) => f.name);

        setFormData({
          code: data.code || '',
          name: data.name || '',
          roomType: data.roomType || 'CLASSROOM',
          buildingId: data.buildingId || '',
          building: data.building || '',
          floor: data.floor || '',
          room: data.room || '',
          departmentId: data.departmentId || '',
          picName: data.picName || '',
          picPhone: data.picPhone || '',
          area: data.area ? String(data.area) : '',
          capacity: data.capacity ? String(data.capacity) : '',
          pricePerHour: data.pricePerHour ? String(data.pricePerHour) : '',
          pricePerDay: data.pricePerDay ? String(data.pricePerDay) : '',
          depositAmount: data.depositAmount ? String(data.depositAmount) : '',
          isRentable: data.isRentable !== undefined ? Boolean(data.isRentable) : false,
          isLoanable: data.isLoanable !== undefined ? Boolean(data.isLoanable) : true,
          requiresDepositForInternal: data.requiresDepositForInternal !== undefined ? Boolean(data.requiresDepositForInternal) : false,
          description: data.description || '',
          status: data.status || 'AVAILABLE',
          facilities: parsedFacs,
          assetAllocations: initAllocations,
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
        setFormData((prev) => ({
          ...prev,
          photos: [...prev.photos, ...uploadedUrls],
        }));
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
      const payload = {
        ...formData,
        assetAllocations: formData.assetAllocations.map(({ assetId, quantity }) => ({
          assetId,
          quantity,
        })),
      };

      const res = await fetch(`/api/rooms/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        {/* Section A: Informasi Utama & Standarisasi Penamaan */}
        <RoomPrimaryInfoSection
          data={{
            code: formData.code,
            name: formData.name,
            roomType: formData.roomType,
            buildingId: formData.buildingId,
            building: formData.building,
            floor: formData.floor,
            room: formData.room,
            departmentId: formData.departmentId,
            picName: formData.picName,
            picPhone: formData.picPhone,
          }}
          onChange={(next) => setFormData({ ...formData, ...next })}
          autoNamingDefault={false}
        />

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
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    depositAmount: val,
                    requiresDepositForInternal: val ? formData.requiresDepositForInternal : false
                  });
                }}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={formData.isLoanable}
                  onChange={(e) => setFormData({ ...formData, isLoanable: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Bisa Dipinjam (Gratis untuk Internal)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={formData.isRentable}
                  onChange={(e) => setFormData({ ...formData, isRentable: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Bisa Disewa (Berbayar untuk Eksternal / Internal)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', opacity: formData.depositAmount ? 1 : 0.5 }}>
                <input
                  type="checkbox"
                  checked={formData.requiresDepositForInternal}
                  disabled={!formData.depositAmount}
                  onChange={(e) => setFormData({ ...formData, requiresDepositForInternal: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Wajib Deposit bagi Internal</span>
              </label>
            </div>
            {!formData.depositAmount && (
              <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '-0.5rem' }}>
                * Jaminan deposit harus diisi untuk mengaktifkan opsi &quot;Wajib Deposit bagi Internal&quot;.
              </p>
            )}
          </div>
        </Card>

        {/* Section D: Utilitas Bangunan & Aset Ruangan */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Aset &amp; Perlengkapan Ruangan
          </h3>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="input-label" style={{ marginBottom: '0.25rem', display: 'block' }}>
              Utilitas Bangunan Permanen (Non-Aset)
            </label>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.65rem' }}>
              Pilih atribut bawaan gedung yang melekat permanen (bukan barang inventaris lepas).
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {BUILDING_UTILITIES_LIST.map((item) => {
                const checked = formData.facilities.includes(item);
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
                      onChange={() => handleFacilityToggle(item)}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                    />
                    <span>{item}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="input-label">Aset Fisik Terpasang (Terintegrasi ke Master Data Aset)</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.8rem' }}>
              Pilih kategori dan aset yang ditempatkan di ruangan ini. Jumlah unit pada tabel list di bawah dapat diedit langsung.
            </p>
            <RoomAssetSelector
              allocations={formData.assetAllocations}
              onChange={(next) => setFormData({ ...formData, assetAllocations: next })}
            />
          </div>
        </Card>

        {/* Section E: Foto Ruangan */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ImageIcon size={18} style={{ color: 'var(--color-primary-light)' }} />
            Dokumentasi Foto Fisik Ruangan
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '0.85rem' }}>
            Unggah satu atau beberapa foto fisik ruangan (tampak depan, interior, panggung, proyektor, fasilitas).
          </p>

          {/* Area Unggah Berkas Foto */}
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
                  Dapat memilih beberapa foto sekaligus (JPG, PNG, WebP)
                </p>
              </div>
            </div>
          </div>

          {/* Grid Preview Foto Terunggah */}
          {formData.photos.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.6rem' }}>
                Foto Ruangan ({formData.photos.length} foto):
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {formData.photos.map((url, idx) => (
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
                value={formData.photoInput}
                onChange={(e) => setFormData({ ...formData, photoInput: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddPhoto}
              >
                Tambah URL
              </button>
            </div>
          </details>
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

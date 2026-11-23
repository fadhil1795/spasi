'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save, UploadCloud, Image as ImageIcon, Loader2, X } from 'lucide-react';

export default function EditAssetPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    categoryId: '',
    departmentId: '',
    locationId: '',
    brand: '',
    serialNumber: '',
    quantity: '1',
    availableQty: '1',
    purchaseDate: '',
    purchaseCost: '',
    salvageValue: '',
    dailyRentRate: '',
    isRentable: false,
    isLoanable: true,
    isFixedToRoom: false,
    picName: '',
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
          quantity: String(ast.quantity || 1),
          availableQty: String(ast.availableQty ?? ast.quantity ?? 1),
          purchaseDate: ast.purchaseDate ? new Date(ast.purchaseDate).toISOString().split('T')[0] : '',
          purchaseCost: ast.purchaseCost ? String(ast.purchaseCost) : '',
          salvageValue: ast.salvageValue ? String(ast.salvageValue) : '0',
          dailyRentRate: ast.dailyRentRate ? String(ast.dailyRentRate) : '',
          isRentable: Boolean(ast.isRentable),
          isLoanable: Boolean(ast.isLoanable),
          isFixedToRoom: Boolean(ast.isFixedToRoom),
          picName: ast.picName || '',
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingImages(true);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          showToast(`Berkas "${file.name}" bukan gambar valid. Lewati.`, 'warning');
          continue;
        }

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('folder', 'assets');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            uploadedUrls.push(data.url);
          }
        } else {
          const err = await res.json();
          showToast(`Gagal mengunggah ${file.name}: ${err.error || 'Terjadi kesalahan'}`, 'error');
        }
      }

      if (uploadedUrls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls],
        }));
        showToast(`Berhasil mengunggah ${uploadedUrls.length} foto aset!`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan saat mengunggah foto', 'error');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== index),
    }));
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
                Status Operasional
              </label>
              <select
                className="input-field"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="AVAILABLE">Tersedia (Ready)</option>
                <option value="INSTALLED">Tertanam di Ruang (Installed)</option>
                <option value="BORROWED">Dipinjam (Internal)</option>
                <option value="RENTED">Disewa (Eksternal)</option>
                <option value="MAINTENANCE">Maintenance / Perbaikan</option>
                <option value="DAMAGED">Rusak</option>
                <option value="INACTIVE">Non-Aktif / Disimpan</option>
                <option value="DISPOSED">Diafkirkan / Pemutihan</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Total Unit (Kuantitas) *"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  quantity: val,
                  availableQty: parseInt(prev.availableQty) > parseInt(val) ? val : prev.availableQty,
                }));
              }}
              required
            />

            <Input
              label="Stok Tersedia (Unit) *"
              type="number"
              min="0"
              max={formData.quantity}
              value={formData.availableQty}
              onChange={(e) => setFormData({ ...formData, availableQty: e.target.value })}
              required
            />
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

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
                Nama Penanggung Jawab (PIC) Aset
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Contoh: Bpk. Hendra Wijaya, S.T."
                value={formData.picName}
                onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
              />
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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

            <Input
              label="Nilai Sisa / Residu (Rp)"
              type="number"
              placeholder="0"
              value={formData.salvageValue}
              onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
            />
          </div>

          {/* Bagian Unggah Foto Aset */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)' }}>
              <ImageIcon size={16} style={{ color: 'var(--color-primary-light)' }} />
              Dokumentasi Foto Fisik Aset
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
              Unggah satu atau beberapa foto fisik aset (tampak depan, samping, label serial number, aksesoris).
            </p>

            {/* Area Unggah Berkas Foto */}
            <div
              style={{
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem 1rem',
                textAlign: 'center',
                background: 'var(--color-surface2)',
                cursor: uploadingImages ? 'not-allowed' : 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploadingImages}
                onChange={handleFileUpload}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: uploadingImages ? 'not-allowed' : 'pointer',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', pointerEvents: 'none' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(79, 70, 229, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary-light)',
                  }}
                >
                  {uploadingImages ? <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> : <UploadCloud size={22} />}
                </div>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                    {uploadingImages ? 'Sedang mengunggah foto...' : 'Klik untuk Pilih Berkas Foto atau Seret ke Sini'}
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                    Dapat memilih beberapa foto sekaligus (JPG, PNG, WebP)
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Grid Thumbnail Foto */}
            {formData.images.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
                  Foto Terunggah ({formData.images.length} foto):
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                    gap: '0.65rem',
                  }}
                >
                  {formData.images.map((img, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: idx === 0 ? '2px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                        aspectRatio: '1',
                        background: '#0f172a',
                      }}
                    >
                      <img
                        src={img}
                        alt={`Foto Aset ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      {idx === 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '4px',
                            left: '4px',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            background: 'var(--color-primary)',
                            color: '#fff',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                          }}
                        >
                          Sampul
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
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
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
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
                  Tambah URL
                </button>
              </div>
            </details>
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

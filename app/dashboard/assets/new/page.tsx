'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save, Plus, X, Package, Building2, Sparkles } from 'lucide-react';

const FASILITAS_OPTIONS = ['AC', 'Proyektor', 'Smart TV', 'Sound System', 'WiFi', 'Whiteboard', 'Podium', 'Mic Wireless', 'Laptop', 'Kamera'];

function NewAssetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Checklist aksesori
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Atribut kustom dinamis
  const [customAttributes, setCustomAttributes] = useState<Record<string, string>>({});
  const [extraAttrKey, setExtraAttrKey] = useState('');
  const [extraAttrVal, setExtraAttrVal] = useState('');

  const prefilledRoomId = searchParams.get('roomId') || '';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    departmentId: '',
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
      const [resC, resL, resD] = await Promise.all([
        fetch('/api/public/categories'),
        fetch('/api/rooms'),
        fetch('/api/departments'),
      ]);
      if (resC.ok) {
        const cats = await resC.json();
        setCategories(cats);
        if (cats.length > 0) setFormData((prev) => ({ ...prev, categoryId: cats[0].id }));
      }
      if (resL.ok) setLocations(await resL.json());
      if (resD.ok) {
        const depts = await resD.json();
        if (Array.isArray(depts)) setDepartments(depts);
      }
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
          customAttributes,
          locationId: formData.locationId || null,
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
              <label style={labelStyle}>Fakultas / Unit Pemilik Aset</label>
              <select
                className="input-field"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              >
                <option value="">-- Milik Kampus Umum / Pusat --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

            <div>
              <label style={labelStyle}>Status Aset Awal</label>
              <select
                className="input-field"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="AVAILABLE">Tersedia (AVAILABLE)</option>
                <option value="MAINTENANCE">Dalam Perawatan (MAINTENANCE)</option>
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

        {/* Seksi B: Atribut Khusus Kategori (FR-01) */}
        {(() => {
          const selectedCat = categories.find((c) => c.id === formData.categoryId);
          const catName = (selectedCat?.name || '').toLowerCase();
          const isVehicle = catName.includes('kendaraan') || catName.includes('mobil') || catName.includes('motor');
          const isLabOrTech = catName.includes('lab') || catName.includes('elektronik') || catName.includes('alat');

          return (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>
                <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
                B. Atribut Spesifik Kategori ({selectedCat?.name || 'Aset'})
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '-0.75rem' }}>
                Field adaptif sesuai jenis kategori aset yang dipilih (FR-01: Atribut Dinamis).
              </p>

              {isVehicle && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <Input
                    label="Nomor Plat Polisi *"
                    placeholder="Contoh: B 1234 ABC"
                    value={customAttributes.licensePlate || ''}
                    onChange={(e) => setCustomAttributes({ ...customAttributes, licensePlate: e.target.value })}
                  />
                  <Input
                    label="Warna Kendaraan"
                    placeholder="Hitam Metalik / Putih"
                    value={customAttributes.color || ''}
                    onChange={(e) => setCustomAttributes({ ...customAttributes, color: e.target.value })}
                  />
                  <Input
                    label="Kapasitas Mesin (CC)"
                    placeholder="1500 cc / 2000 cc"
                    value={customAttributes.engineCapacity || ''}
                    onChange={(e) => setCustomAttributes({ ...customAttributes, engineCapacity: e.target.value })}
                  />
                  <div>
                    <label style={labelStyle}>Bahan Bakar</label>
                    <select
                      className="input-field"
                      value={customAttributes.fuelType || 'BENSIN'}
                      onChange={(e) => setCustomAttributes({ ...customAttributes, fuelType: e.target.value })}
                    >
                      <option value="BENSIN">Bensin / Pertalite / Pertamax</option>
                      <option value="SOLAR">Solar / Diesel</option>
                      <option value="LISTRIK">Kendaraan Listrik (EV)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Transmisi</label>
                    <select
                      className="input-field"
                      value={customAttributes.transmission || 'MANUAL'}
                      onChange={(e) => setCustomAttributes({ ...customAttributes, transmission: e.target.value })}
                    >
                      <option value="MANUAL">Manual</option>
                      <option value="MATIC">Otomatis / Matic</option>
                    </select>
                  </div>
                  <Input
                    label="Odometer (KM Saat Ini)"
                    type="number"
                    placeholder="12500"
                    value={customAttributes.odometer || ''}
                    onChange={(e) => setCustomAttributes({ ...customAttributes, odometer: e.target.value })}
                  />
                </div>
              )}

              {isLabOrTech && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <Input
                    label="Konsumsi Daya Listrik"
                    placeholder="Contoh: 350 Watt / 220V"
                    value={customAttributes.wattage || ''}
                    onChange={(e) => setCustomAttributes({ ...customAttributes, wattage: e.target.value })}
                  />
                  <Input
                    label="Rentang Presisi / Akurasi"
                    placeholder="Contoh: ±0.01 mm / 0.1 mg"
                    value={customAttributes.precision || ''}
                    onChange={(e) => setCustomAttributes({ ...customAttributes, precision: e.target.value })}
                  />
                  <Input
                    label="Tgl Kalibrasi Terakhir"
                    type="date"
                    value={customAttributes.lastCalibrationDate || ''}
                    onChange={(e) => setCustomAttributes({ ...customAttributes, lastCalibrationDate: e.target.value })}
                  />
                </div>
              )}

              {/* Atribut Kustom Tambahan (Key-Value) */}
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--color-border)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Parameter Tambahan Mandiri (Key-Value)
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Nama Parameter (mis. Resolusi / Port Output)"
                    value={extraAttrKey}
                    onChange={(e) => setExtraAttrKey(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Nilai (mis. 4K 60fps / HDMI, Type-C)"
                    value={extraAttrVal}
                    onChange={(e) => setExtraAttrVal(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (!extraAttrKey.trim()) return;
                      setCustomAttributes({ ...customAttributes, [extraAttrKey.trim()]: extraAttrVal.trim() });
                      setExtraAttrKey('');
                      setExtraAttrVal('');
                    }}
                  >
                    <Plus size={16} /> Tambah
                  </Button>
                </div>

                {Object.keys(customAttributes).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {Object.entries(customAttributes).map(([k, v]) => (
                      <span
                        key={k}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'var(--color-surface2)',
                          border: '1px solid var(--color-border)',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                        }}
                      >
                        <strong>{k}:</strong> {v}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...customAttributes };
                            delete updated[k];
                            setCustomAttributes(updated);
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-danger)' }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Seksi C: Checklist Aksesori */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <Package size={18} style={{ color: 'var(--color-accent)' }} />
            C. Checklist Kelengkapan Aksesori
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

        {/* Seksi D: Penempatan Aset */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <Building2 size={18} style={{ color: 'var(--color-warning)' }} />
            D. Penempatan Aset & Lokasi Fisik
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '1rem', border: `2px solid ${!formData.isFixedToRoom ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: !formData.isFixedToRoom ? 'rgba(var(--color-primary-rgb, 99,102,241),0.05)' : 'transparent', transition: 'all 0.2s' }}>
              <input
                type="radio"
                name="assetType"
                checked={!formData.isFixedToRoom}
                onChange={() => setFormData({ ...formData, isFixedToRoom: false })}
                style={{ marginTop: '2px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>📦 Aset Bergerak (Mobile Asset)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Dapat dipindahkan, dipinjam mandiri, atau dibawa antar ruangan/lapangan.</div>
                {!formData.isFixedToRoom && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={labelStyle}>Ruang Penyimpanan / Gudang Fisik (Opsional)</label>
                    <select
                      className="input-field"
                      value={formData.locationId}
                      onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    >
                      <option value="">-- Pilih Pos / Gudang Penyimpanan --</option>
                      {locations.map((l: any) => (
                        <option key={l.id} value={l.id}>
                          {l.name || l.building} {l.code ? `(${l.code})` : ''} - {l.building}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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

        {/* Seksi E: Opsi Sewa & Pinjam */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>E. Opsi Peminjaman & Penyewaan</div>

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

        {/* Seksi F: Foto */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>F. Foto Aset (Opsional)</div>
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

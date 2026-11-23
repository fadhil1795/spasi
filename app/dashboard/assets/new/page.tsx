'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save, Plus, X, Package, Building2, Sparkles, UploadCloud, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';

const FASILITAS_OPTIONS = ['AC', 'Proyektor', 'Smart TV', 'Sound System', 'WiFi', 'Whiteboard', 'Podium', 'Mic Wireless', 'Laptop', 'Kamera'];

function NewAssetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Klasifikasi Bertingkat: Induk & Subkategori
  const [selectedParentCatId, setSelectedParentCatId] = useState('');
  const [selectedSubCatId, setSelectedSubCatId] = useState('');

  // Standarisasi Penamaan & Model
  const [model, setModel] = useState('');
  const [specVariant, setSpecVariant] = useState('');
  const [autoNaming, setAutoNaming] = useState(true);
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [customBrandInput, setCustomBrandInput] = useState('');

  // Checklist aksesori
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Atribut kustom dinamis
  const [customAttributes, setCustomAttributes] = useState<Record<string, string>>({});
  const [extraAttrKey, setExtraAttrKey] = useState('');
  const [extraAttrVal, setExtraAttrVal] = useState('');

  const prefilledRoomId = searchParams.get('roomId') || '';
  const prefilledBrand = searchParams.get('brand') || '';
  const prefilledCat = searchParams.get('cat') || '';
  const prefilledSubcat = searchParams.get('subcat') || '';

  // Modal Pendaftaran Merek Baru
  const [newBrandModalOpen, setNewBrandModalOpen] = useState(false);
  const [newBrandForm, setNewBrandForm] = useState({
    name: '',
    categoryCode: '',
    subCategoryCode: '',
    description: '',
  });
  const [savingBrand, setSavingBrand] = useState(false);

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
    picName: '',
    status: 'AVAILABLE',
    condition: 'Baik',
    images: [] as string[],
    imageUrl: '',
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchBrandsForCategories = async (catCode?: string, subCode?: string) => {
    try {
      let url = '/api/brands';
      const p = new URLSearchParams();
      if (catCode) p.set('categoryCode', catCode);
      if (subCode) p.set('subCategoryCode', subCode);
      if (p.toString()) url += `?${p.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const bData = await res.json();
        if (Array.isArray(bData.brands)) {
          setBrands(bData.brands);
          if (bData.brands.length > 0) {
            setFormData((prev) => {
              if (prefilledBrand && bData.brands.includes(prefilledBrand)) {
                return { ...prev, brand: prefilledBrand };
              }
              if (!prev.brand || !bData.brands.includes(prev.brand)) {
                return { ...prev, brand: bData.brands[0] };
              }
              return prev;
            });
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openNewBrandModal = () => {
    const parent = categories.find((c: any) => c.id === selectedParentCatId);
    const sub = categories.find((c: any) => c.id === selectedSubCatId);
    setNewBrandForm({
      name: '',
      categoryCode: parent ? parent.code : 'ELK',
      subCategoryCode: sub ? sub.code : '',
      description: '',
    });
    setNewBrandModalOpen(true);
  };

  const handleSaveNewBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandForm.name.trim()) {
      showToast('Nama merek wajib diisi', 'error');
      return;
    }
    try {
      setSavingBrand(true);
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBrandForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mendaftarkan merek');
      }

      showToast(`Merek "${newBrandForm.name}" berhasil didaftarkan!`, 'success');
      const bName = newBrandForm.name.trim();
      setBrands((prev) => (prev.includes(bName) ? prev : [bName, ...prev]));
      setFormData((prev) => ({ ...prev, brand: bName }));
      setIsCustomBrand(false);
      setNewBrandModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan merek', 'error');
    } finally {
      setSavingBrand(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [resC, resL, resD, resB] = await Promise.all([
        fetch('/api/public/categories'),
        fetch('/api/rooms'),
        fetch('/api/departments'),
        fetch('/api/brands'),
      ]);
      if (resC.ok) {
        const cats = await resC.json();
        setCategories(cats);
        // Cari parent categories
        const parents = cats.filter((c: any) => !c.parentId);
        if (parents.length > 0) {
          const targetParent = prefilledCat
            ? parents.find((p: any) => p.code?.toUpperCase() === prefilledCat.toUpperCase() || p.id === prefilledCat) || parents[0]
            : parents[0];

          setSelectedParentCatId(targetParent.id);
          const subCats = cats.filter((c: any) => c.parentId === targetParent.id);

          const targetSub = prefilledSubcat && subCats.length > 0
            ? subCats.find((s: any) => s.code?.toUpperCase() === prefilledSubcat.toUpperCase() || s.id === prefilledSubcat) || subCats[0]
            : subCats.length > 0 ? subCats[0] : null;

          if (targetSub) {
            setSelectedSubCatId(targetSub.id);
            setFormData((prev) => ({ ...prev, categoryId: targetSub.id }));
            fetchBrandsForCategories(targetParent.code, targetSub.code);
          } else {
            setSelectedSubCatId('');
            setFormData((prev) => ({ ...prev, categoryId: targetParent.id }));
            fetchBrandsForCategories(targetParent.code);
          }
        }
      }
      if (resL.ok) setLocations(await resL.json());
      if (resD.ok) {
        const depts = await resD.json();
        if (Array.isArray(depts)) setDepartments(depts);
      }
      if (resB.ok) {
        const bData = await resB.json();
        if (Array.isArray(bData.brands)) {
          setBrands(bData.brands);
          if (bData.brands.length > 0) {
            setFormData((prev) => ({
              ...prev,
              brand: prefilledBrand && bData.brands.includes(prefilledBrand) ? prefilledBrand : bData.brands[0],
            }));
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Efek Standarisasi Nama Otomatis: [Merek] + [Model/Tipe] + [Spesifikasi/Varian]
  useEffect(() => {
    if (autoNaming) {
      const activeBrand = isCustomBrand ? customBrandInput : formData.brand;
      const parts = [activeBrand, model, specVariant]
        .map((s) => (s || '').trim())
        .filter(Boolean);
      const generatedName = parts.join(' ');
      if (generatedName) {
        setFormData((prev) => ({ ...prev, name: generatedName }));
      }
    }
  }, [formData.brand, customBrandInput, isCustomBrand, model, specVariant, autoNaming]);

  const handleParentCategoryChange = (parentId: string) => {
    setSelectedParentCatId(parentId);
    const parentCat = categories.find((c: any) => c.id === parentId);
    const subCats = categories.filter((c: any) => c.parentId === parentId);
    if (subCats.length > 0) {
      setSelectedSubCatId(subCats[0].id);
      setFormData((prev) => ({ ...prev, categoryId: subCats[0].id }));
      fetchBrandsForCategories(parentCat?.code, subCats[0].code);
    } else {
      setSelectedSubCatId('');
      setFormData((prev) => ({ ...prev, categoryId: parentId }));
      fetchBrandsForCategories(parentCat?.code);
    }
  };

  const handleSubCategoryChange = (subId: string) => {
    setSelectedSubCatId(subId);
    setFormData((prev) => ({ ...prev, categoryId: subId || selectedParentCatId }));
    const parentCat = categories.find((c: any) => c.id === selectedParentCatId);
    const subCat = categories.find((c: any) => c.id === subId);
    fetchBrandsForCategories(parentCat?.code, subCat?.code);
  };

  const [uploadingImages, setUploadingImages] = useState(false);

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

    const resolvedBrand = (isCustomBrand ? customBrandInput : formData.brand).trim();

    try {
      setLoading(true);
      const imagesArray = formData.images.filter((url) => url.trim() !== '');
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          brand: resolvedBrand || null,
          images: imagesArray,
          checklistItems,
          customAttributes: {
            ...customAttributes,
            model: model.trim() || undefined,
            specVariant: specVariant.trim() || undefined,
          },
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
        {/* Seksi A: Informasi Dasar & Master Terstandarisasi */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <Package size={18} style={{ color: 'var(--color-primary)' }} />
            A. Informasi Dasar & Identitas Katalog
          </div>

          {/* Baris 1: Kategori Induk, Subkategori Spesifik & Departemen Pemilik */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Kategori Induk */}
            <div>
              <label style={labelStyle}>Kategori Utama (Induk) *</label>
              <select
                className="input-field"
                value={selectedParentCatId}
                onChange={(e) => handleParentCategoryChange(e.target.value)}
                required
              >
                {categories.filter((c: any) => !c.parentId).map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code || 'AST'}] {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subkategori Spesifik */}
            <div>
              <label style={labelStyle}>
                Subkategori Spesifik {categories.some((c: any) => c.parentId === selectedParentCatId) && '*'}
              </label>
              {(() => {
                const subCats = categories.filter((c: any) => c.parentId === selectedParentCatId);
                if (subCats.length === 0) {
                  return (
                    <div style={{ padding: '0.65rem 0.9rem', fontSize: '0.85rem', color: 'var(--color-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)' }}>
                      Tanpa Subkategori
                    </div>
                  );
                }
                return (
                  <select
                    className="input-field"
                    value={selectedSubCatId}
                    onChange={(e) => handleSubCategoryChange(e.target.value)}
                    required
                  >
                    {subCats.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        [{sc.code}] {sc.name}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>

            {/* Unit / Fakultas Pemilik */}
            <div>
              <label style={labelStyle}>Fakultas / Unit Pemilik Aset</label>
              <select
                className="input-field"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              >
                <option value="">[PUSAT] Milik Kampus Umum / Yayasan</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.code?.replace(/^DEPT-/, '') || d.code}] {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Penanggung Jawab (PIC) Aset */}
            <div>
              <label style={labelStyle}>Nama Penanggung Jawab (PIC) Aset</label>
              <input
                type="text"
                className="input-field"
                placeholder="Contoh: Bpk. Hendra Wijaya, S.T. (Opsional)"
                value={formData.picName}
                onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
              />
            </div>
          </div>

          {/* Live Tag Aset Preview */}
          {(() => {
            const activeCat = categories.find((c) => c.id === formData.categoryId);
            const parentCat = categories.find((c) => c.id === selectedParentCatId);
            const selectedDept = departments.find((d) => d.id === formData.departmentId);

            // Gunakan kode subkategori jika ada, atau fallback ke kode kategori induk
            const catCode = (activeCat?.code || parentCat?.code || 'AST').toUpperCase();
            const deptCode = (selectedDept?.code?.replace(/^DEPT-/, '') || 'SARPRAS').toUpperCase();
            const currentYear = new Date().getFullYear();
            const tagPreview = `${deptCode}-${catCode}-${currentYear}-XXXX`;

            return (
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.06)',
                  border: '1px dashed rgba(59, 130, 246, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                  color: 'var(--color-primary-light)',
                  marginTop: '-0.25rem',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  🏷️ Format Tag Aset Standar Otomatis:
                </span>
                <code
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    background: 'var(--color-surface)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                  }}
                >
                  {tagPreview}
                </code>
              </div>
            );
          })()}

          {/* Baris 2: Merek / Brand, Model / Tipe, dan Spesifikasi Singkat */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '0.25rem' }}>
            {/* Merek / Brand */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Merek / Brand *</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={openNewBrandModal}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary-light)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                    title="Daftarkan merek baru lengkap dengan kategori & subkategori"
                  >
                    + Merek Baru (Kategori & Sub)
                  </button>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomBrand(!isCustomBrand);
                      if (!isCustomBrand) {
                        setCustomBrandInput('');
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-muted)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isCustomBrand ? 'Pilih Dropdown' : 'Ketik Cepat'}
                  </button>
                </div>
              </div>

              {isCustomBrand ? (
                <Input
                  placeholder="Ketik merek (mis. Chitose / Apple)"
                  value={customBrandInput}
                  onChange={(e) => setCustomBrandInput(e.target.value)}
                  required
                />
              ) : (
                <select
                  className="input-field"
                  value={formData.brand}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_MODAL__') {
                      openNewBrandModal();
                    } else if (e.target.value === '__CUSTOM__') {
                      setIsCustomBrand(true);
                      setCustomBrandInput('');
                    } else {
                      setFormData({ ...formData, brand: e.target.value });
                    }
                  }}
                  required
                >
                  <option value="">-- Pilih Merek Terdaftar --</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value="__ADD_MODAL__">✨ + Daftarkan Merek Baru (Kategori & Sub)...</option>
                  <option value="__CUSTOM__">✏️ + Ketik Merek Bebas...</option>
                </select>
              )}
            </div>

            {/* Model / Tipe Pabrikan */}
            <div>
              <Input
                label="Model / Tipe Pabrikan *"
                placeholder="mis. EB-X51 / ThinkPad E14 / HAA"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            </div>

            {/* Varian / Spesifikasi Kunci */}
            <div>
              <Input
                label="Varian / Spesifikasi Kunci"
                placeholder="mis. 3800 Lumens / Core i5 16GB"
                value={specVariant}
                onChange={(e) => setSpecVariant(e.target.value)}
              />
            </div>
          </div>

          {/* Baris 3: Nama Aset Standar (Auto-Generated) */}
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface2)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label style={{ ...labelStyle, marginBottom: 0, fontWeight: 700, color: 'var(--color-text)' }}>
                Nama Aset Resmi di Katalog *
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--color-muted)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoNaming}
                  onChange={(e) => setAutoNaming(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>⚡ Standarisasi Otomatis (Merek + Model + Spesifikasi)</span>
              </label>
            </div>

            <Input
              placeholder="Nama lengkap aset otomatis dibuat..."
              value={formData.name}
              onChange={(e) => {
                setAutoNaming(false);
                setFormData({ ...formData, name: e.target.value });
              }}
              required
            />

            {autoNaming && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={13} style={{ color: 'var(--color-primary-light)' }} />
                <span>Nama akan diperbarui otomatis saat Merek, Model, atau Spesifikasi di atas diubah.</span>
              </div>
            )}
          </div>

          {/* Baris 4: Kondisi, Status, Jumlah Stok, Nomor Seri */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <Input
              label="Jumlah Unit / Stok *"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />

            <Input
              label="Nomor Seri / SN Fisik"
              placeholder="SN-12345XYZ (opsional)"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            />

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

        {/* Seksi F: Foto Aset */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <ImageIcon size={18} style={{ color: 'var(--color-primary)' }} />
            F. Dokumentasi Foto Fisik Aset
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
            Unggah satu atau beberapa foto fisik aset (tampak depan, samping, stiker nomor seri pabrik, aksesoris pendukung).
          </p>

          {/* Area Unggah Berkas Foto (Bisa Banyak Foto Sekaligus) */}
          <div
            style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem 1rem',
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', pointerEvents: 'none' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(79, 70, 229, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary-light)',
                }}
              >
                {uploadingImages ? <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> : <UploadCloud size={24} />}
              </div>
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                  {uploadingImages ? 'Sedang mengunggah foto...' : 'Klik untuk Pilih Berkas Foto atau Seret ke Sini'}
                </span>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                  Dapat memilih beberapa foto sekaligus (JPG, PNG, WebP hingga 10MB/foto)
                </p>
              </div>
            </div>
          </div>

          {/* Preview Grid Thumbnail Foto */}
          {formData.images.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.6rem' }}>
                Foto Terunggah ({formData.images.length} foto):
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '0.75rem',
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
                      onClick={() => handleRemoveImage(idx)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '24px',
                        height: '24px',
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
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opsi Tambahan Input URL Manual */}
          <details style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
              Atau masukkan tautan URL gambar eksternal...
            </summary>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                className="input-field"
                style={{ flex: 1, fontSize: '0.8rem', height: '36px' }}
                placeholder="https://images.unsplash.com/..."
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddImage}
              >
                Tambah URL
              </button>
            </div>
          </details>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <Link href="/dashboard/assets" className="btn btn-secondary">Batal</Link>
          <Button type="submit" variant="primary" isLoading={loading}>
            <Save size={18} /> Simpan Aset Baru
          </Button>
        </div>
      </form>

      {/* Modal Pendaftaran Merek Baru dengan Kategori & Subkategori */}
      <Modal
        isOpen={newBrandModalOpen}
        onClose={() => setNewBrandModalOpen(false)}
        title="Daftarkan Merek (Brand) Baru"
      >
        <form onSubmit={handleSaveNewBrand} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
              Nama Merek / Brand <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              required
              className="input-field"
              placeholder="Contoh: MikroTik, Hikvision, Dell, Chitose..."
              value={newBrandForm.name}
              onChange={(e) => setNewBrandForm({ ...newBrandForm, name: e.target.value })}
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
              Gunakan penulisan baku (misal: "MikroTik", "Asus", "Chitose").
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
              1. Kategori Utama <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <select
              value={newBrandForm.categoryCode}
              onChange={(e) => {
                const catCode = e.target.value;
                const parentCat = categories.find((c: any) => c.code === catCode || c.id === catCode);
                const subCats = parentCat ? categories.filter((c: any) => c.parentId === parentCat.id) : [];
                setNewBrandForm({
                  ...newBrandForm,
                  categoryCode: catCode,
                  subCategoryCode: subCats.length > 0 ? subCats[0].code : '',
                });
              }}
              className="input-field"
            >
              {categories
                .filter((c: any) => !c.parentId)
                .map((cat: any) => (
                  <option key={cat.id} value={cat.code || cat.id}>
                    [{cat.code}] {cat.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
              2. Subkategori Terkait
            </label>
            {(() => {
              const parentCat = categories.find(
                (c: any) => (c.code === newBrandForm.categoryCode || c.id === newBrandForm.categoryCode) && !c.parentId
              );
              const subCats = parentCat ? categories.filter((c: any) => c.parentId === parentCat.id) : [];

              return subCats.length > 0 ? (
                <select
                  value={newBrandForm.subCategoryCode}
                  onChange={(e) => setNewBrandForm({ ...newBrandForm, subCategoryCode: e.target.value })}
                  className="input-field"
                >
                  <option value="">-- (Semua Subkategori / Umum) --</option>
                  {subCats.map((sub: any) => (
                    <option key={sub.id} value={sub.code || sub.id}>
                      [{sub.code}] {sub.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)', fontSize: '0.78rem', color: 'var(--color-muted)', background: 'var(--color-surface2)' }}>
                  Kategori ini belum memiliki subkategori khusus. Merek akan terhubung secara umum ke kategori ini.
                </div>
              );
            })()}
            <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
              Merek akan otomatis tersedia dan diprioritaskan saat staf memilih subkategori ini.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
              Keterangan / Deskripsi (Opsional)
            </label>
            <input
              className="input-field"
              placeholder="Contoh: Perangkat switch, router & Wi-Fi outdoor"
              value={newBrandForm.description}
              onChange={(e) => setNewBrandForm({ ...newBrandForm, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setNewBrandModalOpen(false)}
              disabled={savingBrand}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={savingBrand}>
              {savingBrand ? 'Menyimpan...' : 'Simpan & Terapkan'}
            </Button>
          </div>
        </form>
      </Modal>
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

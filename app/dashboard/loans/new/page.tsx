'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useCart } from '@/components/public/CartContext';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  Box,
  FileText,
  Send,
  ShoppingBag,
  AlertCircle,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  UploadCloud,
} from 'lucide-react';

interface SelectedLoanItem {
  assetId: string;
  quantity: number;
  asset: any;
}

function SinglePageLoanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAssetId = searchParams.get('assetId') || '';
  const { showToast } = useToast();
  const { cartItems } = useCart();

  const [submitting, setSubmitting] = useState(false);

  // Policy & Quota state
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [maxQuota, setMaxQuota] = useState(3);

  // Section 1: Jadwal
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Section 2: Pemilih Aset Multi-Item
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [pickerAssetId, setPickerAssetId] = useState('');
  const [pickerQty, setPickerQty] = useState(1);
  const [selectedItems, setSelectedItems] = useState<SelectedLoanItem[]>([]);

  // Section 3: Keperluan & Dokumen
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [activityType, setActivityType] = useState('PERSONAL');
  const [identityDocUrl, setIdentityDocUrl] = useState('');
  const [permitDocUrl, setPermitDocUrl] = useState('');
  const [uploadingIdentity, setUploadingIdentity] = useState(false);
  const [uploadingPermit, setUploadingPermit] = useState(false);

  // Section 4: Persetujuan
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Validasi real-time jadwal
  const scheduleError = useMemo(() => {
    if (!startDate || !endDate) return 'Tanggal mulai dan selesai wajib diisi.';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (start < todayStart) return 'Tanggal mulai peminjaman tidak boleh di masa lalu.';
    if (end < start) return 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.';
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 3) return 'Durasi peminjaman internal maksimal adalah 3 hari.';
    if (start.getDay() === 0 || start.getDay() === 6 || end.getDay() === 0 || end.getDay() === 6) {
      return 'Peminjaman tidak dapat dimulai atau berakhir pada hari Sabtu/Minggu (akhir pekan).';
    }
    return null;
  }, [startDate, endDate]);

  useEffect(() => {
    const getNextWeekday = (d: Date) => {
      const copy = new Date(d);
      while (copy.getDay() === 0 || copy.getDay() === 6) {
        copy.setDate(copy.getDate() + 1);
      }
      return copy;
    };

    const defaultStart = getNextWeekday(new Date());
    const defaultEnd = getNextWeekday(new Date(defaultStart.getTime() + 86400000));
    setStartDate(defaultStart.toISOString().split('T')[0]);
    setEndDate(defaultEnd.toISOString().split('T')[0]);

    checkUserQuota();
    fetch('/api/public/categories')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setCategoriesList(d))
      .catch(() => {});

    if (initialAssetId) {
      fetchSingleAsset(initialAssetId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAssetId]);

  useEffect(() => {
    if (startDate && endDate && !scheduleError) {
      fetchAvailableAssets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, scheduleError]);

  const checkUserQuota = async () => {
    try {
      setQuotaLoading(true);
      const res = await fetch('/api/policies/quota?checkActive=true');
      if (res.ok) {
        const data = await res.json();
        setActiveCount(data.activeCount);
        setMaxQuota(data.maxQuota);
        if (data.status === 'EXCEEDED') {
          setQuotaExceeded(true);
        }
      }
    } catch (e) {
      console.error('Error checking quota:', e);
    } finally {
      setQuotaLoading(false);
    }
  };

  const fetchSingleAsset = async (assetId: string) => {
    try {
      const res = await fetch(`/api/public/assets/${assetId}`);
      if (res.ok) {
        const ast = await res.json();
        setSelectedItems((prev) => {
          if (prev.some((i) => i.assetId === ast.id)) return prev;
          return [...prev, { assetId: ast.id, quantity: 1, asset: ast }];
        });
        showToast(`Aset "${ast.name}" otomatis dimasukkan ke daftar pinjam!`, 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAvailableAssets = async () => {
    if (!startDate || !endDate) return;
    try {
      setLoadingAssets(true);
      const res = await fetch(
        `/api/public/assets?isLoanable=true&status=AVAILABLE&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );
      if (res.ok) {
        const list = await res.json();
        setAvailableAssets(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAssets(false);
    }
  };

  const filteredSelectableAssets = useMemo(() => {
    const addedIds = new Set(selectedItems.map((i) => i.assetId));
    const q = assetSearchQuery.trim().toLowerCase();

    return availableAssets.filter((ast) => {
      if (addedIds.has(ast.id)) return false;
      if (categoryFilter !== 'ALL') {
        const matchCat =
          ast.categoryId === categoryFilter ||
          ast.category?.parentId === categoryFilter ||
          ast.category?.parent?.id === categoryFilter;
        if (!matchCat) return false;
      }
      if (q) {
        const mName = (ast.name || '').toLowerCase().includes(q);
        const mCode = (ast.code || '').toLowerCase().includes(q);
        const mBrand = (ast.brand || '').toLowerCase().includes(q);
        if (!mName && !mCode && !mBrand) return false;
      }
      return true;
    });
  }, [availableAssets, selectedItems, categoryFilter, assetSearchQuery]);

  const activePickerAsset = useMemo(
    () => filteredSelectableAssets.find((a) => a.id === pickerAssetId) || null,
    [filteredSelectableAssets, pickerAssetId]
  );

  const pickerMaxQty = activePickerAsset
    ? (activePickerAsset.remainingQty ?? activePickerAsset.availableQty ?? activePickerAsset.quantity ?? 1)
    : 1;

  const handleAddItem = () => {
    if (!activePickerAsset) {
      showToast('Pilih aset terlebih dahulu', 'warning');
      return;
    }
    const finalQty = Math.min(pickerMaxQty, Math.max(1, pickerQty || 1));
    setSelectedItems((prev) => [
      ...prev,
      { assetId: activePickerAsset.id, quantity: finalQty, asset: activePickerAsset },
    ]);
    setPickerAssetId('');
    setPickerQty(1);
  };

  const handleUpdateItemQty = (assetId: string, newQty: number, maxQty: number) => {
    const safeQty = Math.min(maxQty, Math.max(1, newQty || 1));
    setSelectedItems((prev) =>
      prev.map((it) => (it.assetId === assetId ? { ...it, quantity: safeQty } : it))
    );
  };

  const handleRemoveItem = (assetId: string) => {
    setSelectedItems((prev) => prev.filter((it) => it.assetId !== assetId));
  };

  const selectFromCartItem = (cartItem: any) => {
    if (cartItem.bookingDate) {
      setStartDate(cartItem.bookingDate);
      setEndDate(cartItem.bookingDate);
    }
    const match = availableAssets.find(
      (a: any) => a.id === cartItem.roomId || a.name.toLowerCase().includes(cartItem.roomName.toLowerCase())
    );
    const targetAsset = match || {
      id: cartItem.roomId,
      name: cartItem.roomName,
      code: cartItem.roomCode || 'CART-ITEM',
      location: { building: cartItem.building },
      status: 'AVAILABLE',
      quantity: 1,
    };

    if (selectedItems.some((i) => i.assetId === targetAsset.id)) {
      showToast(`"${targetAsset.name}" sudah ada di daftar pinjam.`, 'info');
      return;
    }

    setSelectedItems((prev) => [...prev, { assetId: targetAsset.id, quantity: 1, asset: targetAsset }]);
    showToast(`Aset "${targetAsset.name}" ditambahkan ke daftar pinjam!`, 'success');
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'identity' | 'permit') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (type === 'identity') setUploadingIdentity(true);
      else setUploadingPermit(true);

      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'loans');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) throw new Error('Gagal mengunggah berkas');
      const data = await res.json();

      if (type === 'identity') {
        setIdentityDocUrl(data.url);
        showToast('Identitas (KTP/KTM) berhasil diunggah!', 'success');
      } else {
        setPermitDocUrl(data.url);
        showToast('Surat Kegiatan berhasil diunggah!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan unggah berkas', 'error');
    } finally {
      if (type === 'identity') setUploadingIdentity(false);
      else setUploadingPermit(false);
    }
  };

  const handleSubmitLoan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quotaExceeded) {
      showToast('Kuota peminjaman aktif Anda sudah penuh.', 'error');
      return;
    }
    if (scheduleError) {
      showToast(scheduleError, 'error');
      return;
    }
    if (selectedItems.length === 0) {
      showToast('Pilih dan tambahkan minimal 1 aset ke dalam daftar pinjam.', 'error');
      return;
    }
    if (!purpose.trim()) {
      showToast('Tujuan keperluan peminjaman wajib diisi.', 'error');
      return;
    }
    if (!identityDocUrl) {
      showToast('Harap unggah KTP / KTM sebagai dokumen identitas pendukung.', 'error');
      return;
    }
    if (!permitDocUrl) {
      showToast('Harap unggah Surat Kegiatan resmi.', 'error');
      return;
    }
    if (!agreedToTerms) {
      showToast('Anda harus menyetujui pernyataan kesanggupan elektronik sebelum mengirim.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const consentTextContent =
        'Dengan mengajukan peminjaman ini, saya menyatakan bertanggung jawab penuh atas keutuhan dan keselamatan inventaris yang dipinjam. Saya setuju untuk mengembalikannya tepat waktu sesuai jadwal dan bersedia menerima sanksi/denda ganti rugi apabila terjadi kerusakan atau kehilangan sesuai kebijakan institusi.';

      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems.map((it) => ({
            assetId: it.assetId,
            quantity: it.quantity,
          })),
          startDate,
          endDate,
          purpose: purpose.trim(),
          notes: notes.trim() || null,
          permitPdfUrl: JSON.stringify([identityDocUrl, permitDocUrl]),
          activityType,
          consentText: consentTextContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const totalCreated = data.count || 1;
        showToast(
          totalCreated > 1
            ? `Berhasil mengajukan ${totalCreated} peminjaman aset! Menunggu persetujuan Level 1.`
            : 'Pengajuan peminjaman berhasil dikirim! Menunggu persetujuan Level 1.',
          'success'
        );
        router.push(`/dashboard/loans/${data.id}`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal mengajukan peminjaman', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalUnitRequested = selectedItems.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div>
        <Link
          href="/dashboard/loans"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.88rem',
            color: 'var(--color-muted)',
            fontWeight: 600,
            marginBottom: '0.75rem',
          }}
        >
          <ArrowLeft size={16} /> Kembali ke Daftar Peminjaman
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Pengajuan Peminjaman Aset Internal</h1>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
              Isi jadwal, pilih satu atau beberapa aset yang dibutuhkan, dan unggah dokumen pendukung dalam satu halaman.
            </p>
          </div>
          <div
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 'var(--radius-pill)',
              background: quotaExceeded ? 'rgba(239, 68, 68, 0.14)' : 'var(--color-surface2)',
              border: `1px solid ${quotaExceeded ? 'rgba(239, 68, 68, 0.4)' : 'var(--color-border)'}`,
              fontSize: '0.82rem',
              fontWeight: 700,
              color: quotaExceeded ? 'var(--color-danger)' : 'var(--color-text)',
            }}
          >
            Kuota Aktif: {activeCount} / {maxQuota}
          </div>
        </div>
      </div>

      {/* Quota Exceeded Alert */}
      {quotaExceeded && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '1.15rem 1.25rem',
            display: 'flex',
            gap: '0.85rem',
            alignItems: 'center',
            color: 'var(--color-danger)',
          }}
        >
          <AlertCircle size={22} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Kuota Peminjaman Aktif Anda Penuh</div>
            <div style={{ fontSize: '0.84rem', marginTop: '0.2rem' }}>
              Anda saat ini memiliki <strong>{activeCount}</strong> dari maksimal <strong>{maxQuota}</strong> peminjaman aktif. Selesaikan atau kembalikan pinjaman aktif terlebih dahulu.
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitLoan} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* BAGIAN 1: JADWAL PEMINJAMAN */}
        <Card style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={19} style={{ color: 'var(--color-primary-light)' }} />
            1. Tentukan Jadwal Peminjaman
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '0.85rem' }}>
            <Input
              label="Tanggal Mulai Pinjam *"
              type="date"
              value={startDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setStartDate(e.target.value)}
              required
              style={{ marginBottom: 0 }}
            />
            <Input
              label="Tanggal Selesai Pinjam *"
              type="date"
              value={endDate}
              min={startDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => setEndDate(e.target.value)}
              required
              style={{ marginBottom: 0 }}
            />
          </div>

          {scheduleError ? (
            <div
              style={{
                padding: '0.7rem 0.95rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#ef4444',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={15} /> {scheduleError}
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
              &bull; Durasi peminjaman maksimal <strong>3 hari</strong> &bull; Berlaku pada hari kerja (<strong>Senin &ndash; Jumat</strong>).
            </div>
          )}
        </Card>

        {/* BAGIAN 2: PILIH & TAMBAH ASET (MULTI-ITEM) */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Box size={19} style={{ color: 'var(--color-primary-light)' }} />
              2. Pilih Aset yang Dipinjam (Bisa Lebih dari 1 Barang)
            </h2>
            {selectedItems.length > 0 && (
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                {selectedItems.length} Jenis Barang ({totalUnitRequested} Unit)
              </span>
            )}
          </div>

          {/* Quick Import from Cart */}
          {cartItems.length > 0 && (
            <div style={{ background: 'rgba(79, 70, 229, 0.08)', border: '1px solid var(--color-primary)', padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary-light)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShoppingBag size={15} /> Dari Keranjang Pemesanan Anda ({cartItems.length} Item):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {cartItems.map((ci) => (
                  <button
                    key={ci.id}
                    type="button"
                    onClick={() => selectFromCartItem(ci)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem' }}
                  >
                    <Plus size={13} /> {ci.roomName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Panel Pemilih Aset */}
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface2)',
              border: '1px solid var(--color-border)',
              marginBottom: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
                  Filter Kategori Aset
                </label>
                <select
                  className="input-field"
                  style={{ height: '38px', fontSize: '0.84rem' }}
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPickerAssetId('');
                  }}
                >
                  <option value="ALL">-- Semua Kategori --</option>
                  {categoriesList
                    .filter((c) => !c.parentId)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
                  Cari Nama / Kode / Merek
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                  <input
                    className="input-field"
                    style={{ paddingLeft: '2.1rem', height: '38px', fontSize: '0.84rem' }}
                    placeholder="Ketik kata kunci..."
                    value={assetSearchQuery}
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                  />
                  {assetSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAssetSearchQuery('')}
                      style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: '240px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
                  Pilih Aset Tersedia ({filteredSelectableAssets.length})
                </label>
                <select
                  className="input-field"
                  style={{ height: '40px', fontSize: '0.85rem' }}
                  disabled={loadingAssets || Boolean(scheduleError)}
                  value={pickerAssetId}
                  onChange={(e) => {
                    setPickerAssetId(e.target.value);
                    setPickerQty(1);
                  }}
                >
                  <option value="">
                    {loadingAssets
                      ? 'Mengecek ketersediaan stok...'
                      : scheduleError
                      ? 'Perbaiki jadwal di atas terlebih dahulu...'
                      : '-- Pilih Aset untuk Ditambahkan --'}
                  </option>
                  {filteredSelectableAssets.map((ast) => {
                    const remain = ast.remainingQty ?? ast.availableQty ?? ast.quantity ?? 1;
                    return (
                      <option key={ast.id} value={ast.id}>
                        [{ast.code}] {ast.name} — Tersedia: {remain}/{ast.quantity || 1} Unit
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ width: '100px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
                  Jumlah Unit
                </label>
                <input
                  type="number"
                  className="input-field"
                  style={{ height: '40px', textAlign: 'center', fontWeight: 700 }}
                  min={1}
                  max={pickerMaxQty}
                  disabled={!activePickerAsset}
                  value={pickerQty}
                  onChange={(e) => setPickerQty(Math.min(pickerMaxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>

              <Button
                type="button"
                variant="primary"
                disabled={!activePickerAsset}
                onClick={handleAddItem}
                style={{ height: '40px', padding: '0 1.15rem' }}
              >
                <Plus size={16} /> Tambah ke Daftar
              </Button>
            </div>
          </div>

          {/* Tabel Daftar Aset yang Akan Dipinjam */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                    <th style={{ padding: '0.7rem 0.85rem', width: '44px', textAlign: 'center' }}>No</th>
                    <th style={{ padding: '0.7rem 0.85rem' }}>Kode &amp; Nama Aset</th>
                    <th style={{ padding: '0.7rem 0.85rem' }}>Lokasi</th>
                    <th style={{ padding: '0.7rem 0.85rem', width: '140px', textAlign: 'center' }}>Jumlah Pinjam</th>
                    <th style={{ padding: '0.7rem 0.85rem', width: '64px', textAlign: 'center' }}>Hapus</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.length > 0 ? (
                    selectedItems.map((it, idx) => {
                      const ast = it.asset;
                      const maxItemQty = ast.remainingQty ?? ast.availableQty ?? ast.quantity ?? 1;
                      return (
                        <tr key={it.assetId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: 'var(--color-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '0.75rem 0.85rem' }}>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                              {ast.code}
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{ast.name}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-muted)' }}>
                              {ast.category?.name || '-'} &bull; Tersedia: {maxItemQty} unit
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                            {ast.location?.building ? `${ast.location.building}${ast.location.room ? ` (${ast.location.room})` : ''}` : 'Gudang Sarpras'}
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center' }}>
                            {maxItemQty > 1 ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                <input
                                  type="number"
                                  min={1}
                                  max={maxItemQty}
                                  value={it.quantity}
                                  onChange={(e) => handleUpdateItemQty(it.assetId, parseInt(e.target.value) || 1, maxItemQty)}
                                  style={{
                                    width: '62px',
                                    height: '30px',
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    background: 'var(--color-surface2)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '4px',
                                    color: 'var(--color-text)',
                                  }}
                                />
                                <span style={{ fontSize: '0.76rem', color: 'var(--color-muted)' }}>Unit</span>
                              </div>
                            ) : (
                              <span style={{ fontWeight: 700 }}>1 Unit</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.assetId)}
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--color-danger)', padding: '0.3rem' }}
                              title="Hapus dari daftar pinjam"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                        Belum ada aset dalam daftar pinjam. Pilih aset pada panel di atas lalu klik <strong>+ Tambah ke Daftar</strong>.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* BAGIAN 3: KEPERLUAN & DOKUMEN PENDUKUNG */}
        <Card style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={19} style={{ color: 'var(--color-primary-light)' }} />
            3. Tujuan Keperluan &amp; Berkas Persyaratan
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
              Tujuan / Alasan Peminjaman *
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Contoh: Untuk kegiatan seminar nasional BEM di Aula Gedung Kuliah Bersama..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
                Kategori Prioritas Kegiatan *
              </label>
              <select
                className="input-field"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
              >
                <option value="AKADEMIK">Kegiatan Akademik / Kuliah / Lab (Prioritas Utama)</option>
                <option value="KEMAHASISWAAN">Kegiatan Organisasi Mahasiswa (UKM/BEM)</option>
                <option value="PERSONAL">Kebutuhan Umum / Lainnya</option>
              </select>
            </div>
            <Input
              label="Catatan Tambahan (Opsional)"
              placeholder="Catatan khusus pengambilan/pengiriman..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>

          {/* Upload Dokumen 1x untuk seluruh item */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)', background: 'var(--color-surface2)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UploadCloud size={15} style={{ color: 'var(--color-primary-light)' }} />
                Identitas Diri (KTP / KTM) *
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.65rem' }}>
                Format JPG, PNG, atau PDF (Maks 5MB).
              </p>
              <input
                type="file"
                accept="image/*,.pdf"
                disabled={uploadingIdentity}
                onChange={(e) => handleUploadFile(e, 'identity')}
                style={{ fontSize: '0.8rem', width: '100%' }}
              />
              {uploadingIdentity && <div style={{ fontSize: '0.76rem', color: 'var(--color-primary-light)', marginTop: '0.35rem' }}>Mengunggah...</div>}
              {identityDocUrl && (
                <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 size={14} /> KTP/KTM Terunggah
                </div>
              )}
            </div>

            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)', background: 'var(--color-surface2)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UploadCloud size={15} style={{ color: 'var(--color-primary-light)' }} />
                Surat Kegiatan / Izin Resmi *
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.65rem' }}>
                Surat tugas/izin bertanda tangan pimpinan/unit (PDF/Gambar).
              </p>
              <input
                type="file"
                accept=".pdf,image/*"
                disabled={uploadingPermit}
                onChange={(e) => handleUploadFile(e, 'permit')}
                style={{ fontSize: '0.8rem', width: '100%' }}
              />
              {uploadingPermit && <div style={{ fontSize: '0.76rem', color: 'var(--color-primary-light)', marginTop: '0.35rem' }}>Mengunggah...</div>}
              {permitDocUrl && (
                <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 size={14} /> Surat Kegiatan Terunggah
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* BAGIAN 4: RINGKASAN & KIRIM PENGAJUAN */}
        <Card style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
            4. Konfirmasi &amp; Kirim Pengajuan
          </h2>

          <div
            style={{
              padding: '0.9rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface2)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.5rem',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--color-muted)' }}>Jadwal Pinjam:</span>{' '}
              <strong>{startDate ? formatDate(startDate) : '-'} s.d. {endDate ? formatDate(endDate) : '-'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-muted)' }}>Total Barang:</span>{' '}
              <strong>{selectedItems.length} Jenis ({totalUnitRequested} Unit)</strong>
            </div>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '1rem',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              marginBottom: '1.25rem',
            }}
          >
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              style={{ marginTop: '0.2rem', width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '0.84rem', lineHeight: 1.5, color: 'var(--color-text)' }}>
              <strong>Pernyataan Kesanggupan Elektronik:</strong> Saya menyatakan bertanggung jawab penuh atas keutuhan dan keselamatan seluruh inventaris yang dipinjam. Saya setuju untuk mengembalikannya tepat waktu sesuai jadwal dan bersedia menerima sanksi/denda ganti rugi apabila terjadi kerusakan atau kehilangan sesuai kebijakan institusi.
            </div>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Link href="/dashboard/loans" className="btn btn-secondary">
              Batal
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={submitting}
              disabled={quotaExceeded || Boolean(scheduleError) || selectedItems.length === 0 || !agreedToTerms}
            >
              <Send size={16} /> Kirim Pengajuan Peminjaman ({selectedItems.length} Aset)
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default function NewLoanPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Memuat form pengajuan peminjaman...</div>}>
      <SinglePageLoanForm />
    </Suspense>
  );
}

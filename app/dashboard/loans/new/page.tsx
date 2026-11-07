'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useCart } from '@/components/public/CartContext';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Calendar, CheckCircle2, Box, FileText, Send, ShoppingBag, Sparkles, AlertCircle } from 'lucide-react';

function LoanWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAssetId = searchParams.get('assetId') || '';
  const { showToast } = useToast();
  const { cartItems } = useCart();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  // Policy & Legality state
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [maxQuota, setMaxQuota] = useState(3);
  const [activityType, setActivityType] = useState('PERSONAL');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  // Dokumen Pendukung Wajib
  const [identityDocUrl, setIdentityDocUrl] = useState('');
  const [permitDocUrl, setPermitDocUrl] = useState('');
  const [uploadingIdentity, setUploadingIdentity] = useState(false);
  const [uploadingPermit, setUploadingPermit] = useState(false);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'identity' | 'permit') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (type === 'identity') setUploadingIdentity(true);
      else setUploadingPermit(true);

      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) throw new Error('Gagal mengunggah file');
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

  useEffect(() => {
    // Set default dates: today to tomorrow
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(tomorrow);

    checkUserQuota();

    if (initialAssetId) {
      fetchSingleAsset(initialAssetId);
    }
  }, [initialAssetId]);

  const fetchSingleAsset = async (assetId: string) => {
    try {
      const res = await fetch(`/api/public/assets/${assetId}`);
      if (res.ok) {
        const ast = await res.json();
        setSelectedAsset(ast);
        showToast(`Aset "${ast.name}" telah otomatis dipilih dari Katalog!`, 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectFromCartItem = (cartItem: any) => {
    if (cartItem.bookingDate) {
      setStartDate(cartItem.bookingDate);
      setEndDate(cartItem.bookingDate);
    }
    // Find asset matching room / asset name
    const match = availableAssets.find((a: any) => a.id === cartItem.roomId || a.name.toLowerCase().includes(cartItem.roomName.toLowerCase()));
    if (match) {
      setSelectedAsset(match);
      showToast(`Aset "${match.name}" dipilih dari keranjang!`, 'success');
    } else {
      setSelectedAsset({
        id: cartItem.roomId,
        name: cartItem.roomName,
        code: cartItem.roomCode || 'CART-ITEM',
        location: { building: cartItem.building },
        status: 'AVAILABLE'
      });
      showToast(`Aset "${cartItem.roomName}" dipilih dari keranjang!`, 'success');
    }
  };

  const fetchAvailableAssets = async () => {
    if (!startDate || !endDate) return;
    try {
      setLoadingAssets(true);
      const res = await fetch(`/api/public/assets?status=AVAILABLE&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
      if (res.ok) {
        const list = await res.json();
        setAvailableAssets(list);
        if (initialAssetId && !selectedAsset) {
          const preSelect = list.find((a: any) => a.id === initialAssetId);
          if (preSelect) setSelectedAsset(preSelect);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!startDate || !endDate) {
        showToast('Tanggal mulai dan selesai wajib diisi', 'error');
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        showToast('Tanggal selesai tidak boleh sebelum tanggal mulai', 'error');
        return;
      }
      fetchAvailableAssets();
      // If asset is already pre-selected from Catalog, jump directly to Step 3 (Keperluan)
      if (selectedAsset) {
        setStep(3);
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      if (!selectedAsset) {
        showToast('Pilih salah satu aset yang akan dipinjam', 'error');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!purpose.trim()) {
        showToast('Tujuan keperluan peminjaman wajib diisi', 'error');
        return;
      }
      if (!identityDocUrl) {
        showToast('Harap unggah KTP / KTM sebagai dokumen identitas pendukung', 'error');
        return;
      }
      if (!permitDocUrl) {
        showToast('Harap unggah Surat Kegiatan resmi yang telah ditandatangani Rektor/Dekan', 'error');
        return;
      }
      setStep(4);
    }
  };

  const handleSubmitLoan = async () => {
    if (!agreedToTerms) {
      showToast('Anda harus menyetujui syarat & ketentuan peminjaman elektronik sebelum melanjutkan', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const consentTextContent = "Dengan mengajukan peminjaman ini, saya menyatakan bertanggung jawab penuh atas keutuhan dan keselamatan inventaris yang dipinjam. Saya setuju untuk mengembalikannya tepat waktu sesuai jadwal dan bersedia menerima sanksi/denda ganti rugi apabila terjadi kerusakan atau kehilangan sesuai kebijakan institusi.";
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          startDate,
          endDate,
          purpose,
          notes,
          permitPdfUrl: JSON.stringify([identityDocUrl, permitDocUrl]),
          activityType,
          consentText: consentTextContent
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('Pengajuan peminjaman berhasil dikirim! Menunggu approval Level 1.', 'success');
        router.push(`/dashboard/loans/${data.id}`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal membuat pengajuan', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link
        href="/dashboard/loans"
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
        <ArrowLeft size={16} /> Kembali ke Daftar Peminjaman
      </Link>

      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>Wizard Pengajuan Peminjaman</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Lengkapi 4 langkah sederhana untuk mengajukan peminjaman sarana &amp; aset internal.
      </p>

      {/* Banner Warning Kuota Penuh */}
      {quotaExceeded && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
        }}>
          <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ef4444', marginBottom: '0.2rem' }}>Kuota Peminjaman Aktif Penuh</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Anda memiliki **{activeCount}** booking/peminjaman yang sedang aktif. Batas maksimal peran Anda adalah **{maxQuota}** booking aktif. Silakan selesaikan pengembalian inventaris atau tunggu booking aktif Anda selesai sebelum mengajukan kembali.
            </p>
          </div>
        </div>
      )}

      {/* Step Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', position: 'relative' }}>
        {[
          { num: 1, label: 'Jadwal' },
          { num: 2, label: 'Pilih Aset' },
          { num: 3, label: 'Keperluan' },
          { num: 4, label: 'Review' },
        ].map((s) => {
          const isDone = step > s.num;
          const isCurrent = step === s.num;
          return (
            <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', zIndex: 2 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  background: isDone || isCurrent ? 'var(--grad-primary)' : 'var(--color-surface2)',
                  color: isDone || isCurrent ? '#FFFFFF' : 'var(--color-muted)',
                  border: isCurrent ? '2px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                  boxShadow: isCurrent ? 'var(--shadow-glow)' : 'none',
                }}
              >
                {isDone ? <CheckCircle2 size={20} /> : s.num}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--color-primary-light)' : 'var(--color-muted)' }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* STEP 1: JADWAL */}
      {step === 1 && (
        <Card className="animate-fade-in" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} style={{ color: 'var(--color-primary)' }} /> Langkah 1: Tentukan Jadwal Peminjaman
          </h2>

          {/* Banner Aset Terkunci jika Diarahkan dari Katalog */}
          {selectedAsset && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid #10b981', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ✓ Aset Dipilih dari Katalog
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary-light)', marginTop: '0.15rem' }}>
                  {selectedAsset.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                  Kode: <strong style={{ fontFamily: 'monospace' }}>{selectedAsset.code}</strong> • Kategori: {selectedAsset.category?.name || 'Aset Internal'}
                </div>
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '0.35rem 0.85rem', background: '#10b981', color: '#fff', borderRadius: '999px' }}>
                Aset Terpilih
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <Input
              label="Tanggal Mulai Pinjam *"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="Tanggal Selesai Pinjam *"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={handleNextStep} disabled={quotaExceeded || quotaLoading}>
              {selectedAsset ? 'Lanjut ke Keperluan' : 'Lanjut ke Pilih Aset'} <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: PILIH ASET */}
      {step === 2 && (
        <Card className="animate-fade-in" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Box size={20} style={{ color: 'var(--color-primary)' }} /> Langkah 2: Pilih Aset yang Tersedia
          </h2>

          {/* Quick Import from Cart */}
          {cartItems.length > 0 && (
            <div style={{ background: 'var(--color-primary-light, rgba(37,99,235,0.08))', border: '1px solid var(--color-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShoppingBag size={16} /> Aset dari Keranjang Pemesanan Anda ({cartItems.length} Item)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {cartItems.map((ci) => {
                  const isCartSelected = selectedAsset?.name === ci.roomName || selectedAsset?.id === ci.roomId;
                  return (
                    <div
                      key={ci.id}
                      onClick={() => selectFromCartItem(ci)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        background: isCartSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: isCartSelected ? '#FFFFFF' : 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{ci.roomName}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                          {ci.building} • Jadwal: {ci.bookingDate} ({ci.startTime} - {ci.endTime})
                        </div>
                      </div>
                      <span style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: isCartSelected ? 'rgba(255,255,255,0.2)' : 'var(--color-surface2)', fontWeight: 600 }}>
                        {isCartSelected ? '✓ Terpilih' : 'Pilih dari Keranjang'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loadingAssets ? (
            <p>Mengecek ketersediaan aset...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
              {availableAssets.map((ast) => {
                const isSelected = selectedAsset?.id === ast.id;
                return (
                  <div
                    key={ast.id}
                    onClick={() => setSelectedAsset(ast)}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(79, 70, 229, 0.12)' : 'var(--color-surface2)',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-primary-light)', fontWeight: 700 }}>
                        {ast.code}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{ast.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                        {ast.category?.name} • Lokasi: {ast.location?.building || '-'}
                      </div>
                    </div>
                    <Badge status={ast.status} />
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="secondary" onClick={() => setStep(1)}>
              ← Kembali
            </Button>
            <Button variant="primary" onClick={handleNextStep}>
              Lanjut ke Keperluan <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: KEPERLUAN */}
      {step === 3 && (
        <Card className="animate-fade-in" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} style={{ color: 'var(--color-primary)' }} /> Langkah 3: Isikan Tujuan Keperluan
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
              Tujuan / Alasan Peminjaman *
            </label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Contoh: Untuk keperluan rapat koordinasi dinas bersama perwakilan unit wilayah..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <Input
              label="Catatan Tambahan (Opsional)"
              placeholder="Catatan pengiriman/spesifikasi khusus..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
                Kategori Prioritas Kegiatan *
              </label>
              <select
                className="input-field"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="PERSONAL">Personal / Mandiri / Mahasiswa</option>
                <option value="ORGANIZATION">Organisasi Kampus / UKM / Ormawa</option>
                <option value="INSTITUTION">Resmi Institusi / Kegiatan Fakultas / Dinas</option>
              </select>
            </div>
          </div>

          {/* Double File Uploader Pendukung */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Uploader 1: KTP / KTM */}
            <div style={{
              background: 'var(--color-surface2)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: `1px ${identityDocUrl ? 'solid var(--color-success)' : 'dashed var(--color-border)'}`,
            }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.82rem', fontWeight: 700 }}>
                Unggah KTP / KTM Pemohon *
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="input-field"
                style={{ width: '100%' }}
                onChange={(e) => handleUploadFile(e, 'identity')}
              />
              {uploadingIdentity && <div style={{ fontSize: '0.73rem', color: 'var(--color-primary)', marginTop: '0.3rem' }}>Sedang mengunggah...</div>}
              {identityDocUrl && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  ✓ Berhasil diunggah! (<a href={identityDocUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Lihat File</a>)
                </div>
              )}
            </div>

            {/* Uploader 2: Surat Kegiatan */}
            <div style={{
              background: 'var(--color-surface2)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: `1px ${permitDocUrl ? 'solid var(--color-success)' : 'dashed var(--color-border)'}`,
            }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.82rem', fontWeight: 700 }}>
                Surat Kegiatan (Tanda Tangan Dekan/Rektor) *
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="input-field"
                style={{ width: '100%' }}
                onChange={(e) => handleUploadFile(e, 'permit')}
              />
              {uploadingPermit && <div style={{ fontSize: '0.73rem', color: 'var(--color-primary)', marginTop: '0.3rem' }}>Sedang mengunggah...</div>}
              {permitDocUrl && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  ✓ Berhasil diunggah! (<a href={permitDocUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Lihat File</a>)
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="secondary" onClick={() => setStep(2)}>
              ← Kembali
            </Button>
            <Button variant="primary" onClick={handleNextStep}>
              Lanjut ke Ringkasan <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: REVIEW & SUBMIT */}
      {step === 4 && (
        <Card className="animate-fade-in" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>
            Langkah 4: Konfirmasi & Kirim Pengajuan
          </h2>

          <div
            style={{
              background: 'var(--color-surface2)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              fontSize: '0.9rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Aset Dipilih</span>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary-light)' }}>
                {selectedAsset?.name} ({selectedAsset?.code})
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Tanggal Pinjam</span>
                <span style={{ fontWeight: 600 }}>{formatDate(startDate)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Tanggal Kembali</span>
                <span style={{ fontWeight: 600 }}>{formatDate(endDate)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Tujuan Keperluan</span>
                <span style={{ fontWeight: 600 }}>{purpose}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Prioritas Kegiatan</span>
                <span style={{ fontWeight: 700, color: activityType === 'INSTITUTION' ? 'var(--color-danger)' : activityType === 'ORGANIZATION' ? 'var(--color-warning)' : 'var(--color-text)' }}>
                  {activityType === 'INSTITUTION' ? '🔴 Resmi Institusi / Dinas' : activityType === 'ORGANIZATION' ? '🟡 Organisasi / UKM' : '⚪ Personal'}
                </span>
              </div>
            </div>
          </div>

          {/* T&C Scrollable Box */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
              Syarat &amp; Ketentuan Peminjaman Elektronik
            </label>
            <div style={{
              background: 'var(--color-surface2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              fontSize: '0.78rem',
              color: 'var(--color-muted)',
              maxHeight: '100px',
              overflowY: 'auto',
              lineHeight: 1.5,
              marginBottom: '0.75rem'
            }}>
              Dengan mengajukan peminjaman ini, saya menyatakan bertanggung jawab penuh atas keutuhan dan keselamatan inventaris yang dipinjam. Saya setuju untuk mengembalikannya tepat waktu sesuai jadwal dan bersedia menerima sanksi/denda ganti rugi apabila terjadi kerusakan atau kehilangan sesuai kebijakan institusi.
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Saya menyetujui syarat &amp; ketentuan elektronik peminjaman di atas.
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="secondary" onClick={() => setStep(3)}>
              ← Kembali
            </Button>
            <Button variant="primary" isLoading={submitting} onClick={handleSubmitLoan} disabled={!agreedToTerms}>
              <Send size={18} /> Kirim Pengajuan Sekarang
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function NewLoanWizardPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem' }}>Memuat form wizard...</p>}>
      <LoanWizardContent />
    </Suspense>
  );
}

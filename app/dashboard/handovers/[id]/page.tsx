'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Camera, Upload, Save,
  FileText, User, Box, ShieldCheck, Clock, RefreshCw, AlertOctagon, HelpCircle
} from 'lucide-react';

interface ComponentState {
  name: string;
  condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'HILANG';
  isMissing: boolean;
  isDamaged: boolean;
  notes: string;
}

export default function HandoverPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { showToast } = useToast();

  const id = params?.id as string; // loanId or bookingId
  const typeParam = searchParams.get('type') || 'CHECK_IN'; // CHECK_IN (Ambil) atau CHECK_OUT (Kembali)
  const isCheckOut = typeParam === 'CHECK_OUT';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [isLoan, setIsLoan] = useState(true);

  // Components Checklist State
  const [components, setComponents] = useState<ComponentState[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [inspectorName, setInspectorName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Comparison State (for CHECK_OUT, we load initial CHECK_IN handover log)
  const [initialHandover, setInitialHandover] = useState<any>(null);

  const fetchTransactionData = useCallback(async () => {
    try {
      setLoading(true);

      // Try Loan first
      let res = await fetch(`/api/loans/${id}`);
      let isLoanTrans = true;

      if (!res.ok) {
        // Fallback to room booking
        res = await fetch(`/api/room-bookings/${id}`);
        isLoanTrans = false;
      }

      if (res.ok) {
        const json = await res.json();
        setIsLoan(isLoanTrans);

        // Normalize object (loans API returns { loan: {...} }, bookings return directly)
        const txObj = isLoanTrans ? (json.loan || json) : json;
        setTransaction(txObj);

        // Fetch existing handover logs for comparison/editing
        const handoverRes = await fetch(`/api/handovers?${isLoanTrans ? 'loanId' : 'bookingId'}=${id}`);
        if (handoverRes.ok) {
          const handoverData = await handoverRes.json();
          const initialLog = handoverData.find((h: any) => h.type === 'CHECK_IN');
          setInitialHandover(initialLog);

          const currentLog = handoverData.find((h: any) => h.type === typeParam);
          if (currentLog) {
            setComponents(JSON.parse(currentLog.components || '[]'));
            setPhotoUrls(JSON.parse(currentLog.photoUrls || '[]'));
            setInspectorName(currentLog.inspectorName || '');
          } else {
            initializeDefaultComponents(txObj, isLoanTrans, initialLog);
          }
        } else {
          initializeDefaultComponents(txObj, isLoanTrans, null);
        }
      } else {
        showToast('Gagal memuat detail transaksi', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Koneksi bermasalah', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, typeParam, showToast]);

  const initializeDefaultComponents = (txObj: any, isLoanTrans: boolean, initialLog: any) => {
    // If CHECK_OUT and we have initial CHECK_IN log, copy the component structure
    if (isCheckOut && initialLog) {
      const initialComps = JSON.parse(initialLog.components || '[]');
      setComponents(initialComps.map((c: any) => ({
        name: c.name,
        condition: 'BAIK',
        isMissing: false,
        isDamaged: false,
        notes: '',
      })));
      return;
    }

    // Default assets checklist per components
    let assetChecklist: string[] = [];
    if (isLoanTrans && txObj.asset?.checklistItems) {
      try {
        assetChecklist = JSON.parse(txObj.asset.checklistItems);
      } catch {
        assetChecklist = [];
      }
    }

    // Fallback standard components
    if (assetChecklist.length === 0) {
      assetChecklist = ['Kondisi Fisik / Body Utama', 'Baterai & Daya Nyala', 'Kabel Charger / Adapter', 'Tas & Aksesori'];
    }

    setComponents(assetChecklist.map((name: string) => ({
      name,
      condition: 'BAIK',
      isMissing: false,
      isDamaged: false,
      notes: '',
    })));
  };

  useEffect(() => {
    fetchTransactionData();
  }, [fetchTransactionData]);

  const handleComponentChange = (idx: number, field: keyof ComponentState, value: any) => {
    setComponents(prev => prev.map((c, i) => {
      if (i === idx) {
        const next = { ...c, [field]: value };
        // Sync isMissing / isDamaged based on condition
        if (field === 'condition') {
          next.isMissing = value === 'HILANG';
          next.isDamaged = ['RUSAK_RINGAN', 'RUSAK_BERAT'].includes(value);
        }
        return next;
      }
      return c;
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const json = await res.json();
        setPhotoUrls(prev => [...prev, json.url]);
        showToast('Foto dokumentasi berhasil diunggah', 'success');
      } else {
        showToast('Gagal mengunggah foto', 'error');
      }
    } catch {
      showToast('Koneksi gagal saat unggah foto', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (urlToRemove: string) => {
    setPhotoUrls(prev => prev.filter(url => url !== urlToRemove));
  };

  const handleSave = async (submitStatus: 'DRAFT' | 'SUBMITTED') => {
    if (!inspectorName.trim()) {
      showToast('Nama petugas pemeriksa wajib diisi', 'error');
      return;
    }

    // Validate notes for problematic components
    for (const c of components) {
      if (c.condition !== 'BAIK') {
        if (!c.notes.trim()) {
          showToast(`Harap isi catatan detail kerusakan/kehilangan untuk komponen "${c.name}"`, 'error');
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        loanId: isLoan ? id : undefined,
        bookingId: !isLoan ? id : undefined,
        type: typeParam,
        inspectorName,
        status: submitStatus,
        components: JSON.stringify(components),
        photoUrls: JSON.stringify(photoUrls),
      };

      const res = await fetch('/api/handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(
          submitStatus === 'SUBMITTED' 
            ? 'Proses serah terima berhasil difinalisasi & disimpan!' 
            : 'Draft serah terima berhasil disimpan!',
          'success'
        );
        router.push(isLoan ? '/dashboard/loans' : '/dashboard/room-bookings');
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan serah terima', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '950px', margin: '0 auto' }}>
        <Skeleton style={{ height: '40px', width: '250px' }} />
        <Skeleton style={{ height: '220px' }} />
        <Skeleton style={{ height: '350px' }} />
      </div>
    );
  }

  // Get initial comparison components
  const initialComponents = initialHandover ? JSON.parse(initialHandover.components || '[]') : [];
  const initialPhotos = initialHandover ? JSON.parse(initialHandover.photoUrls || '[]') : [];

  const ticketNumber = isLoan ? transaction?.ticketNumber : transaction?.bookingNumber;
  const assetLabel = isLoan ? transaction?.asset?.name : transaction?.location?.name;
  const borrowerName = isLoan ? transaction?.user?.name : transaction?.renter?.name;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Back Button */}
      <div>
        <Link
          href={isLoan ? '/dashboard/loans' : '/dashboard/room-bookings'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-muted)', fontSize: '0.88rem', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Kembali ke Transaksi
        </Link>
      </div>

      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            Checklist Serah Terima Komponen {isCheckOut ? 'Pengembalian 📦' : 'Pengambilan 🚚'}
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            SOP Verifikasi fisik detail per komponen aset sebelum diserahkan/kembalikan untuk akurasi klaim.
          </p>
        </div>
        <span style={{
          padding: '0.4rem 1rem', borderRadius: '999px', fontWeight: 800, fontSize: '0.8rem',
          background: isCheckOut ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
          color: isCheckOut ? '#f59e0b' : '#10b981', border: `1px solid ${isCheckOut ? '#f59e0b' : '#10b981'}`
        }}>
          {isCheckOut ? 'PENGEMBALIAN (CHECK_OUT)' : 'PENGAMBILAN (CHECK_IN)'}
        </span>
      </div>

      {/* Info Card */}
      <Card style={{ padding: '1.5rem', background: 'var(--color-surface2)' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
          Detail Transaksi Aset
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div>
            <div style={{ color: 'var(--color-muted)' }}>Nomor Tiket</div>
            <strong style={{ fontSize: '0.95rem' }}>#{ticketNumber}</strong>
          </div>
          <div>
            <div style={{ color: 'var(--color-muted)' }}>Aset / Item</div>
            <strong>{assetLabel}</strong>
          </div>
          <div>
            <div style={{ color: 'var(--color-muted)' }}>Peminjam / Penyewa</div>
            <strong>{borrowerName}</strong>
          </div>
          <div>
            <div style={{ color: 'var(--color-muted)' }}>Tanggal Transaksi</div>
            <strong>{formatDate(isLoan ? transaction?.startDate : transaction?.startTime)}</strong>
          </div>
        </div>
      </Card>

      {/* Checklist Components */}
      <Card style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          📋 Checklist Fisik Komponen Aset
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {components.map((comp, idx) => {
            const isIssue = comp.condition !== 'BAIK';
            // Find initial comparison component
            const initialComp = initialComponents.find((c: any) => c.name === comp.name);

            return (
              <div
                key={idx}
                style={{
                  padding: '1.25rem', borderRadius: 'var(--radius-md)',
                  border: isIssue ? '1.5px solid var(--color-danger)' : '1px solid var(--color-border)',
                  background: isIssue ? 'rgba(239,68,68,0.02)' : 'var(--color-surface2)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Title component & selector */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>
                      {idx + 1}. {comp.name}
                    </strong>
                    
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {[
                        { val: 'BAIK', label: '✓ BAIK', color: '#10b981' },
                        { val: 'RUSAK_RINGAN', label: '⚠️ RUSAK RINGAN', color: '#f59e0b' },
                        { val: 'RUSAK_BERAT', label: '⚡ RUSAK BERAT', color: '#f97316' },
                        { val: 'HILANG', label: '🛑 HILANG', color: '#ef4444' },
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => handleComponentChange(idx, 'condition', opt.val)}
                          style={{
                            padding: '0.35rem 0.65rem', border: 'none', borderRadius: '4px',
                            fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                            background: comp.condition === opt.val ? opt.color : 'rgba(0,0,0,0.05)',
                            color: comp.condition === opt.val ? '#fff' : 'var(--color-muted)',
                            transition: 'all 0.2s',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SOP Checklist Pembanding Side-by-Side */}
                  {isCheckOut && initialHandover && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.02)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-primary)' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600 }}>Kondisi Awal (CHECK-IN) 📥</div>
                        <div style={{ fontSize: '0.82rem', marginTop: '0.15rem' }}>
                          Status: <strong style={{ color: '#10b981' }}>{initialComp?.condition || 'BAIK'}</strong>
                        </div>
                        {initialComp?.notes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                            Catatan: {initialComp.notes}
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600 }}>Kondisi Sekarang (CHECK-OUT) 📤</div>
                        <div style={{ fontSize: '0.82rem', marginTop: '0.15rem' }}>
                          Status: <strong style={{ color: isIssue ? '#ef4444' : '#10b981' }}>{comp.condition}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes input */}
                  {isIssue && (
                    <div style={{ animation: 'fadeIn 0.2s ease' }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--color-danger)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                        Detail Kerusakan / Kehilangan Komponen *
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Jelaskan komponen mana yang bermasalah, patah, hilang, dll..."
                        value={comp.notes}
                        onChange={(e) => handleComponentChange(idx, 'notes', e.target.value)}
                        style={{ fontSize: '0.82rem', width: '100%' }}
                      />
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Side-by-side Photo comparison block */}
      <Card style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          📸 Foto Bukti &amp; Perbandingan Fisik
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: isCheckOut && initialHandover ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
          
          {/* Left panel: Initial Photos (only checkout) */}
          {isCheckOut && initialHandover && (
            <div style={{ padding: '1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={16} /> Foto Kondisi Awal Serah Terima (CHECK_IN)
              </div>
              
              {initialPhotos.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>
                  Tidak ada foto dokumentasi awal.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {initialPhotos.map((url: string, pIdx: number) => (
                    <a href={url} target="_blank" rel="noopener noreferrer" key={pIdx}>
                      <img
                        src={url} alt="Awal"
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                        title="Klik untuk memperbesar"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Right panel: Current Photos */}
          <div style={{ padding: '1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Camera size={16} /> Foto Kondisi Sekarang ({typeParam})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="file"
                  accept="image/*"
                  id="handover-photo-file"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => document.getElementById('handover-photo-file')?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.8rem' }}
                >
                  <Upload size={14} /> {uploading ? 'Mengunggah...' : 'Unggah Foto Baru'}
                </Button>
              </div>

              {photoUrls.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {photoUrls.map((url, pIdx) => (
                    <div key={pIdx} style={{ position: 'relative' }}>
                      <img
                        src={url} alt="Sekarang"
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(url)}
                        style={{
                          position: 'absolute', top: '-5px', right: '-5px',
                          background: 'var(--color-danger)', color: '#fff', border: 'none',
                          borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </Card>

      {/* Save panel */}
      <Card style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="input-label">Nama Petugas Pemeriksa *</label>
            <input
              type="text"
              className="input-field"
              placeholder="Masukkan nama lengkap petugas..."
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              style={{ maxWidth: '400px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <Button
              variant="secondary"
              onClick={() => handleSave('DRAFT')}
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Save size={16} /> Simpan Draft
            </Button>
            <Button
              onClick={() => handleSave('SUBMITTED')}
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <CheckCircle2 size={16} /> Selesaikan Serah Terima
            </Button>
          </div>
        </div>
      </Card>

    </div>
  );
}

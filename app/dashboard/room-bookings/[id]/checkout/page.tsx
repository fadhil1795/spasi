'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeft, LogOut, ClipboardCheck, AlertTriangle, Camera, Upload, ShieldCheck, CheckCircle2
} from 'lucide-react';

type Condition = 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'HILANG' | 'TIDAK_DIPERIKSA';

interface CheckoutRow {
  assetId: string;
  assetName: string;
  assetCode: string;
  checkinCondition: string;
  newCondition: Condition;
  conditionNotes: string;
  isMissing: boolean;
  isDamaged: boolean;
  claimAmount: number;
  isFixedToRoom: boolean;
  photoUrls: string[];
}

export default function CheckOutPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { showToast } = useToast();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CheckoutRow[]>([]);
  const [inspectorName, setInspectorName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/room-bookings/${id}`);
        if (!res.ok) { showToast('Booking tidak ditemukan', 'error'); return; }
        const data = await res.json();
        setBooking(data);

        // Build checkout rows from check-in inspection data
        const checkinInspections: Record<string, any> = {};
        (data.inspections || []).filter((insp: any) => insp.type === 'CHECK_IN').forEach((insp: any) => {
          checkinInspections[insp.assetId] = insp;
        });

        const roomAssets: CheckoutRow[] = (data.location?.assets || []).map((a: any) => {
          const prev = checkinInspections[a.id];
          return {
            assetId: a.id,
            assetName: a.name,
            assetCode: a.code,
            checkinCondition: prev?.conditionBefore || 'Baik',
            newCondition: 'BAIK',
            conditionNotes: '',
            isMissing: false,
            isDamaged: false,
            claimAmount: 0,
            isFixedToRoom: true,
            photoUrls: [],
          };
        });

        const addonAssets: CheckoutRow[] = (data.addonAssets || []).map((addon: any) => {
          const assetId = addon.asset?.id || addon.assetId;
          const prev = checkinInspections[assetId];
          return {
            assetId,
            assetName: addon.asset?.name || addon.assetName || '-',
            assetCode: addon.asset?.code || '',
            checkinCondition: prev?.conditionBefore || 'Baik',
            newCondition: 'BAIK',
            conditionNotes: '',
            isMissing: false,
            isDamaged: false,
            claimAmount: 0,
            isFixedToRoom: false,
            photoUrls: [],
          };
        });

        setRows([...roomAssets, ...addonAssets]);
      } catch (e) {
        console.error(e);
        showToast('Gagal memuat data booking', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRow = (idx: number, field: keyof CheckoutRow, value: any) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handlePhotoUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingIdx(idx);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const json = await res.json();
        setRows((prev) =>
          prev.map((r, i) => (i === idx ? { ...r, photoUrls: [...r.photoUrls, json.url] } : r))
        );
        showToast('Foto bukti berhasil diunggah', 'success');
      } else {
        showToast('Gagal mengunggah foto', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan unggah foto', 'error');
    } finally {
      setUploadingIdx(null);
    }
  };

  // Live settlement
  const totalClaim = rows.reduce((acc, r) => acc + (r.isDamaged || r.isMissing ? Number(r.claimAmount) : 0), 0);
  const deposit = booking?.depositAmount ?? 0;
  const refundAmount = Math.max(0, deposit - totalClaim);
  const chargeAmount = Math.max(0, totalClaim - deposit);
  const hasIssue = rows.some((r) => r.isMissing || r.isDamaged || r.newCondition !== 'BAIK');

  const handleSubmit = async () => {
    if (!inspectorName.trim()) {
      showToast('Nama petugas pemeriksa wajib diisi', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`/api/room-bookings/${id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspectedBy: inspectorName,
          notes: notes || undefined,
          inspectionItems: rows.map((r) => ({
            assetId: r.assetId,
            assetName: r.assetName || r.assetCode || '',
            conditionAfter: r.newCondition,
            isMissing: r.isMissing,
            isDamaged: r.isDamaged,
            claimAmount: r.isDamaged || r.isMissing ? r.claimAmount : 0,
            notes: r.conditionNotes || null,
            photoUrls: r.photoUrls,
          })),
        }),
      });

      if (res.ok) {
        showToast('Check-out & Inspeksi berhasil diselesaikan!', 'success');
        router.push('/dashboard/room-bookings');
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal melakukan check-out', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fixedRows = rows.filter((r) => r.isFixedToRoom);
  const addonRows = rows.filter((r) => !r.isFixedToRoom);
  const globalIndex = (isFixed: boolean, localIdx: number) =>
    isFixed ? localIdx : fixedRows.length + localIdx;

  if (loading) {
    return (
      <div style={{ maxWidth: '950px', margin: '0 auto' }}>
        <Skeleton height="40px" style={{ marginBottom: '1rem' }} />
        <Skeleton height="120px" style={{ marginBottom: '1rem' }} />
        <Skeleton height="320px" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ maxWidth: '950px', margin: '0 auto', textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
        Booking tidak ditemukan.
        <br />
        <Link href="/dashboard/room-bookings" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
          ← Kembali
        </Link>
      </div>
    );
  }

  const ChecklistSection = ({
    title,
    sectionRows,
    isFixed,
  }: {
    title: string;
    sectionRows: CheckoutRow[];
    isFixed: boolean;
  }) => {
    if (sectionRows.length === 0) return null;
    return (
      <Card style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardCheck size={20} style={{ color: 'var(--color-primary)' }} />
          {title}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sectionRows.map((row, localIdx) => {
            const idx = globalIndex(isFixed, localIdx);
            const isProblematic = row.newCondition !== 'BAIK' && row.newCondition !== 'TIDAK_DIPERIKSA';

            return (
              <div
                key={row.assetId}
                style={{
                  padding: '1.1rem',
                  borderRadius: 'var(--radius-md)',
                  border: isProblematic ? '1.5px solid var(--color-danger)' : '1px solid var(--color-border)',
                  background: isProblematic ? 'rgba(239,68,68,0.03)' : 'var(--color-surface2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{row.assetName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Kode: {row.assetCode} | Kondisi Masuk: <strong style={{ color: 'var(--color-success)' }}>{row.checkinCondition}</strong></div>
                  </div>

                  {/* Buttons Radio Options */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {[
                      { val: 'BAIK', label: '✓ BAIK', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                      { val: 'RUSAK_RINGAN', label: '⚠️ RUSAK RINGAN', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
                      { val: 'RUSAK_BERAT', label: '⚡ RUSAK BERAT', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
                      { val: 'HILANG', label: '❌ HILANG', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
                    ].map((opt) => {
                      const selected = row.newCondition === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            updateRow(idx, 'newCondition', opt.val as Condition);
                            if (opt.val === 'RUSAK_RINGAN' || opt.val === 'RUSAK_BERAT') {
                              updateRow(idx, 'isDamaged', true);
                              updateRow(idx, 'isMissing', false);
                            } else if (opt.val === 'HILANG') {
                              updateRow(idx, 'isMissing', true);
                              updateRow(idx, 'isDamaged', false);
                            } else {
                              updateRow(idx, 'isDamaged', false);
                              updateRow(idx, 'isMissing', false);
                              updateRow(idx, 'claimAmount', 0);
                            }
                          }}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            border: selected ? `2px solid ${opt.color}` : '1px solid var(--color-border)',
                            background: selected ? opt.bg : 'var(--color-surface)',
                            color: selected ? opt.color : 'var(--color-muted)',
                            fontWeight: selected ? 800 : 500,
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-form Detail Masalah & Klaim jika ada Kerusakan / Kehilangan */}
                {isProblematic && (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--color-border)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Jelaskan detail kerusakan / penyebab..."
                      value={row.conditionNotes}
                      onChange={(e) => updateRow(idx, 'conditionNotes', e.target.value)}
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
                    />
                    <div>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="Klaim Ganti Rugi (Rp)"
                        value={row.claimAmount || ''}
                        min={0}
                        onChange={(e) => updateRow(idx, 'claimAmount', Number(e.target.value))}
                        style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.45rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px dashed var(--color-border)',
                          background: 'var(--color-surface)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--color-primary)',
                        }}
                      >
                        <Camera size={14} /> {uploadingIdx === idx ? 'Unggah...' : '+ Upload Foto'}
                        <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(idx, e)} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back */}
      <Link
        href="/dashboard/room-bookings"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-muted)', fontSize: '0.9rem', fontWeight: 600 }}
      >
        <ArrowLeft size={16} /> Kembali ke Daftar Booking
      </Link>

      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <LogOut size={26} style={{ color: 'var(--color-primary)' }} /> Inspeksi &amp; Form Check-Out Ruangan 🔍
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Verifikasi fisik kondisi inventaris &amp; alat add-on sebelum sesi diselesaikan.
        </p>
      </div>

      {/* Stepper Progress Indicator */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[
            { step: 1, title: '1. Check-In & Pemakaian', done: true },
            { step: 2, title: '2. Pengembalian Sesi', done: true },
            { step: 3, title: '3. Inspeksi Physical Checklist', done: true },
            { step: 4, title: '4. Final Settlement & Refund', done: false },
          ].map((st, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '160px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: st.done ? 'var(--color-primary)' : 'var(--color-surface2)',
                  color: st.done ? '#fff' : 'var(--color-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                }}
              >
                {st.done ? '✓' : st.step}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: st.done ? 700 : 500, color: st.done ? 'var(--color-text)' : 'var(--color-muted)' }}>
                {st.title}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Booking Summary */}
      <Card style={{ padding: '1.25rem' }}>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Ringkasan Booking</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.85rem', fontSize: '0.9rem' }}>
          <div>
            <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>No. Booking</span>
            <strong style={{ fontFamily: 'monospace', color: 'var(--color-primary-light)' }}>{booking.bookingNumber}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Ruangan</span>
            <strong>{booking.location?.name}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Penyewa</span>
            <strong>{booking.renter?.name}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Waktu Sesi</span>
            <strong>{formatDate(booking.startTime, 'dd MMM HH:mm')} – {formatDate(booking.endTime, 'HH:mm')}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Deposit Jaminan</span>
            <strong style={{ color: 'var(--color-warning)' }}>{formatCurrency(deposit)}</strong>
          </div>
        </div>
      </Card>

      {/* Inspection sections */}
      <ChecklistSection title="Checklist Inventaris Fasilitas Ruangan" sectionRows={fixedRows} isFixed={true} />
      <ChecklistSection title="Checklist Add-On Alat Tambahan" sectionRows={addonRows} isFixed={false} />

      {/* Settlement panel */}
      <Card style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {hasIssue && <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />}
          Kalkulasi Klaim &amp; Penyelesaian Deposit
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.35rem' }}>Total Deposit Jaminan</div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{formatCurrency(deposit)}</div>
          </div>
          <div style={{ background: totalClaim > 0 ? 'var(--color-danger-bg)' : 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center', border: totalClaim > 0 ? '1px solid rgba(239,68,68,0.3)' : 'none' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.35rem' }}>Total Klaim Kerusakan</div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: totalClaim > 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(totalClaim)}</div>
          </div>
          <div style={{ background: chargeAmount > 0 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center', border: chargeAmount > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.35rem' }}>
              {chargeAmount > 0 ? 'Kekurangan Bayar' : 'Refund Deposit Kembali'}
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: chargeAmount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {formatCurrency(chargeAmount > 0 ? chargeAmount : refundAmount)}
            </div>
          </div>
        </div>

        {chargeAmount > 0 && (
          <div style={{ background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', fontSize: '0.88rem', color: 'var(--color-danger)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>Total klaim melebihi deposit. Penyewa perlu membayar kekurangan sebesar <strong>{formatCurrency(chargeAmount)}</strong>.</span>
          </div>
        )}

        {/* Inspector & Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Nama Petugas Pemeriksa *"
            placeholder="Nama petugas yang melakukan check-out"
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            required
          />
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
              Catatan General Check-Out (Opsional)
            </label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="Catatan penutupan sesi, kondisi umum ruangan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/dashboard/room-bookings" className="btn btn-secondary">
          ← Batal
        </Link>
        <Button variant="primary" isLoading={submitting} onClick={handleSubmit} style={{ padding: '0.75rem 1.75rem' }}>
          <LogOut size={18} /> Konfirmasi Inspeksi &amp; Selesaikan Check-Out
        </Button>
      </div>
    </div>
  );
}

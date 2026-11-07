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
import { ArrowLeft, ClipboardCheck, LogIn } from 'lucide-react';

type Condition = 'Baik' | 'Ada Minus' | 'Rusak';

interface InspectionRow {
  assetId: string;
  assetName: string;
  assetCode: string;
  condition: Condition;
  conditionNotes: string;
  isMissing: boolean;
  isFixedToRoom: boolean;
}

export default function CheckInPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { showToast } = useToast();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InspectionRow[]>([]);
  const [inspectorName, setInspectorName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/room-bookings/${id}`);
        if (!res.ok) { showToast('Booking tidak ditemukan', 'error'); return; }
        const data = await res.json();
        setBooking(data);

        // Build inspection rows from room fixed assets + addon assets
        const roomAssets: InspectionRow[] = (data.location?.assets || []).map((a: any) => ({
          assetId: a.id,
          assetName: a.name,
          assetCode: a.code,
          condition: 'Baik' as Condition,
          conditionNotes: '',
          isMissing: false,
          isFixedToRoom: true,
        }));

        const addonAssets: InspectionRow[] = (data.addonAssets || []).map((addon: any) => ({
          assetId: addon.asset?.id || addon.assetId,
          assetName: addon.asset?.name || addon.assetName || '-',
          assetCode: addon.asset?.code || '',
          condition: 'Baik' as Condition,
          conditionNotes: '',
          isMissing: false,
          isFixedToRoom: false,
        }));

        setRows([...roomAssets, ...addonAssets]);
      } catch (e) {
        console.error(e);
        showToast('Gagal memuat data booking', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRow = (idx: number, field: keyof InspectionRow, value: any) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async () => {
    if (!inspectorName.trim()) {
      showToast('Nama petugas pemeriksa wajib diisi', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`/api/room-bookings/${id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspectedBy: inspectorName,
          inspectionItems: rows.map((r) => ({
            assetId: r.assetId,
            assetName: r.assetName || r.assetCode || '',
            conditionBefore: r.condition,
            isMissing: r.isMissing,
            notes: r.conditionNotes || null,
          })),
        }),
      });

      if (res.ok) {
        showToast('Check-in berhasil! Ruangan sekarang AKTIF.', 'success');
        router.push('/dashboard/room-bookings');
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal melakukan check-in', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const conditionStyle = (c: Condition) => {
    switch (c) {
      case 'Baik':      return { color: 'var(--color-success)' };
      case 'Ada Minus': return { color: 'var(--color-warning)' };
      case 'Rusak':     return { color: 'var(--color-danger)' };
    }
  };

  const fixedRows   = rows.filter((r) => r.isFixedToRoom);
  const addonRows   = rows.filter((r) => !r.isFixedToRoom);
  const globalIndex = (isFixed: boolean, localIdx: number) =>
    isFixed ? localIdx : fixedRows.length + localIdx;

  if (loading) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <Skeleton height="40px" style={{ marginBottom: '1rem' }} />
        <Skeleton height="120px" style={{ marginBottom: '1rem' }} />
        <Skeleton height="300px" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
        Booking tidak ditemukan.
        <br />
        <Link href="/dashboard/room-bookings" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
          ← Kembali
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back */}
      <Link
        href="/dashboard/room-bookings"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-muted)', fontSize: '0.9rem', fontWeight: 600 }}
      >
        <ArrowLeft size={16} /> Kembali ke Daftar Booking
      </Link>

      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <LogIn size={26} style={{ color: 'var(--color-primary)' }} /> Form Check-In
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Lakukan pemeriksaan kondisi inventaris ruangan sebelum penyewa masuk.
        </p>
      </div>

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
            <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Waktu</span>
            <strong>{formatDate(booking.startTime, 'dd MMM HH:mm')} – {formatDate(booking.endTime, 'HH:mm')}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Total</span>
            <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(booking.totalAmount + booking.depositAmount)}</strong>
          </div>
        </div>
      </Card>

      {/* Room Inventory Checklist */}
      <Card style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardCheck size={20} style={{ color: 'var(--color-primary)' }} />
          Checklist Inventaris Ruangan
        </h2>

        {fixedRows.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Tidak ada inventaris tetap untuk ruangan ini.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 100px', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>Aset</span><span>Kondisi</span><span>Catatan</span><span>Hilang?</span>
            </div>
            {fixedRows.map((row, localIdx) => {
              const idx = globalIndex(true, localIdx);
              return (
                <div key={row.assetId} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 100px', gap: '0.75rem', padding: '0.75rem', borderBottom: '1px solid var(--color-border)', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{row.assetName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{row.assetCode}</div>
                  </div>
                  <div>
                    <select
                      className="input-field"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', ...conditionStyle(row.condition) }}
                      value={row.condition}
                      onChange={(e) => updateRow(idx, 'condition', e.target.value as Condition)}
                    >
                      <option value="Baik">Baik</option>
                      <option value="Ada Minus">Ada Minus</option>
                      <option value="Rusak">Rusak</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      className="input-field"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      placeholder="Catatan kondisi…"
                      value={row.conditionNotes}
                      onChange={(e) => updateRow(idx, 'conditionNotes', e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <input
                      type="checkbox"
                      id={`missing-fixed-${localIdx}`}
                      checked={row.isMissing}
                      onChange={(e) => updateRow(idx, 'isMissing', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-danger)' }}
                    />
                    <label htmlFor={`missing-fixed-${localIdx}`} style={{ fontSize: '0.8rem', color: 'var(--color-danger)', cursor: 'pointer' }}>Hilang</label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add-On Checklist */}
      {addonRows.length > 0 && (
        <Card style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardCheck size={20} style={{ color: 'var(--color-primary)' }} />
            Checklist Add-On Alat
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 100px', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>Alat</span><span>Kondisi</span><span>Catatan</span><span>Hilang?</span>
            </div>
            {addonRows.map((row, localIdx) => {
              const idx = globalIndex(false, localIdx);
              return (
                <div key={row.assetId} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 100px', gap: '0.75rem', padding: '0.75rem', borderBottom: '1px solid var(--color-border)', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{row.assetName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{row.assetCode}</div>
                  </div>
                  <div>
                    <select
                      className="input-field"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', ...conditionStyle(row.condition) }}
                      value={row.condition}
                      onChange={(e) => updateRow(idx, 'condition', e.target.value as Condition)}
                    >
                      <option value="Baik">Baik</option>
                      <option value="Ada Minus">Ada Minus</option>
                      <option value="Rusak">Rusak</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      className="input-field"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      placeholder="Catatan kondisi…"
                      value={row.conditionNotes}
                      onChange={(e) => updateRow(idx, 'conditionNotes', e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <input
                      type="checkbox"
                      id={`missing-addon-${localIdx}`}
                      checked={row.isMissing}
                      onChange={(e) => updateRow(idx, 'isMissing', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-danger)' }}
                    />
                    <label htmlFor={`missing-addon-${localIdx}`} style={{ fontSize: '0.8rem', color: 'var(--color-danger)', cursor: 'pointer' }}>Hilang</label>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Inspector */}
      <Card style={{ padding: '1.5rem' }}>
        <div style={{ maxWidth: '360px' }}>
          <Input
            label="Nama Petugas Pemeriksa *"
            placeholder="Nama petugas yang melakukan check-in"
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            required
          />
        </div>
      </Card>

      {/* Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/dashboard/room-bookings" className="btn btn-secondary">
          ← Batal
        </Link>
        <Button variant="primary" isLoading={submitting} onClick={handleSubmit}>
          <LogIn size={18} /> Konfirmasi Check-In &amp; Aktifkan Sesi
        </Button>
      </div>
    </div>
  );
}

'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Upload,
  Box,
  User,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

type ConditionVal = 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'HILANG';

interface BatchItemForm {
  loanId: string;
  ticketNumber: string;
  assetName: string;
  assetCode: string;
  quantity: number;
  status: string;
  selected: boolean;
  condition: ConditionVal;
  notes: string;
}

function BatchHandoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { showToast } = useToast();

  const idsParam = searchParams.get('ids') || '';
  const typeParam = (searchParams.get('type') === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN') as
    | 'CHECK_IN'
    | 'CHECK_OUT';
  const isCheckOut = typeParam === 'CHECK_OUT';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [items, setItems] = useState<BatchItemForm[]>([]);
  const [inspectorName, setInspectorName] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    if (session?.user?.name && !inspectorName) {
      setInspectorName(session.user.name);
    }
  }, [session?.user?.name, inspectorName]);

  const fetchBatch = useCallback(async () => {
    if (!idsParam) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/loans/group?ids=${encodeURIComponent(idsParam)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Gagal memuat data serah terima paket', 'error');
        return;
      }
      const data = await res.json();
      setGroupInfo(data);

      const eligibleLoans = (data.loans || []).filter((l: any) =>
        isCheckOut ? ['ACTIVE', 'RETURN_REQUESTED'].includes(l.status) : l.status === 'APPROVED'
      );

      setItems(
        eligibleLoans.map((l: any) => ({
          loanId: l.id,
          ticketNumber: l.ticketNumber,
          assetName: l.asset?.name || 'Aset',
          assetCode: l.asset?.code || '-',
          quantity: l.quantity || 1,
          status: l.status,
          selected: true,
          condition: 'BAIK',
          notes: '',
        }))
      );
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setLoading(false);
    }
  }, [idsParam, isCheckOut, showToast]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'handovers');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengunggah foto');
      setPhotoUrls((prev) => [...prev, data.url]);
      showToast('Foto bukti serah terima berhasil diunggah!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengunggah foto', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSetAllGood = () => {
    setItems((prev) => prev.map((it) => ({ ...it, condition: 'BAIK', notes: '' })));
  };

  const selectedItems = items.filter((it) => it.selected);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectorName.trim()) {
      showToast('Nama petugas pemeriksa wajib diisi.', 'error');
      return;
    }
    if (selectedItems.length === 0) {
      showToast('Pilih minimal 1 aset untuk diproses.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        type: typeParam,
        inspectorName: inspectorName.trim(),
        items: selectedItems.map((it) => ({
          loanId: it.loanId,
          photoUrls,
          components: [
            {
              name: `${it.assetName} (${it.quantity} unit)`,
              condition: it.condition,
              isMissing: it.condition === 'HILANG',
              isDamaged: it.condition === 'RUSAK_RINGAN' || it.condition === 'RUSAK_BERAT',
              notes: it.notes.trim(),
            },
          ],
        })),
      };

      const res = await fetch('/api/handovers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal menyimpan serah terima massal', 'error');
        return;
      }

      showToast(
        isCheckOut
          ? `Serah terima pengembalian ${data.count} aset berhasil diselesaikan!`
          : `Serah terima pengambilan ${data.count} aset berhasil diselesaikan!`,
        'success'
      );
      router.push('/dashboard/loans');
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '1rem' }}>
        <Skeleton height="260px" />
      </div>
    );
  }

  const primary = groupInfo?.primary;

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Link
        href="/dashboard/loans"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--color-muted)',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={16} /> Kembali ke Kelola Peminjaman
      </Link>

      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
          {isCheckOut ? 'Serah Terima Kembali Paket (Batch Check-Out)' : 'Serah Terima Ambil Paket (Batch Check-In)'}
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          {isCheckOut
            ? 'Periksa kondisi seluruh aset yang dikembalikan dalam 1 formulir sekaligus.'
            : 'Konfirmasi kondisi awal seluruh aset yang diambil peminjam dalam 1 langkah.'}
        </p>
      </div>

      {primary && (
        <Card style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <User size={13} /> Peminjam
            </div>
            <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>{primary.user?.name || '-'}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{primary.user?.email || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={13} /> Jadwal Pinjam
            </div>
            <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>
              {formatDate(primary.startDate)} s.d. {formatDate(primary.endDate)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Box size={13} /> Paket / Kode Grup
            </div>
            <div style={{ fontWeight: 700, marginTop: '0.2rem', fontFamily: 'monospace' }}>
              #{groupInfo.groupCode || primary.ticketNumber}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{items.length} aset siap diproses</div>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-muted)' }}>
          <AlertTriangle size={34} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
          <div style={{ fontWeight: 700 }}>Tidak ada aset yang memenuhi status untuk serah terima ini.</div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <ShieldCheck size={18} color="var(--color-primary-light)" /> Daftar Pemeriksaan Aset ({selectedItems.length}/{items.length} dipilih)
              </h2>
              <Button type="button" variant="secondary" size="sm" onClick={handleSetAllGood}>
                <CheckCircle2 size={14} /> Tandai Semua Kondisi BAIK
              </Button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                    <th style={{ padding: '0.75rem', width: '40px' }}>Pilih</th>
                    <th style={{ padding: '0.75rem' }}>Tiket & Aset</th>
                    <th style={{ padding: '0.75rem', width: '90px' }}>Jumlah</th>
                    <th style={{ padding: '0.75rem', width: '170px' }}>Kondisi Fisik</th>
                    <th style={{ padding: '0.75rem' }}>Catatan Pemeriksaan</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.loanId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setItems((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, selected: checked } : p))
                            );
                          }}
                          style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700 }}>{item.assetName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                          #{item.ticketNumber} • {item.assetCode}
                        </div>
                        <div style={{ marginTop: '0.2rem' }}>
                          <Badge status={item.status} />
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>{item.quantity} unit</td>
                      <td style={{ padding: '0.75rem' }}>
                        <select
                          className="input-field"
                          value={item.condition}
                          disabled={!item.selected}
                          onChange={(e) => {
                            const val = e.target.value as ConditionVal;
                            setItems((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, condition: val } : p))
                            );
                          }}
                        >
                          <option value="BAIK">BAIK</option>
                          <option value="RUSAK_RINGAN">RUSAK RINGAN</option>
                          <option value="RUSAK_BERAT">RUSAK BERAT</option>
                          <option value="HILANG">HILANG</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Catatan kondisi / kelengkapan..."
                          value={item.notes}
                          disabled={!item.selected}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, notes: val } : p))
                            );
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label className="input-label">Nama Petugas Pemeriksa *</label>
              <input
                type="text"
                className="input-field"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="Nama petugas sarpras/admin"
                required
              />
            </div>
            <div>
              <label className="input-label">Foto Bukti Serah Terima (Opsional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Upload size={14} /> {uploading ? 'Mengunggah...' : 'Unggah Foto'}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={uploading} />
                </label>
                {photoUrls.length > 0 && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 700 }}>
                    {photoUrls.length} foto terunggah
                  </span>
                )}
              </div>
            </div>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Link href="/dashboard/loans" className="btn btn-secondary">
              Batal
            </Link>
            <Button type="submit" isLoading={submitting} disabled={selectedItems.length === 0 || submitting}>
              <CheckCircle2 size={16} />{' '}
              {isCheckOut
                ? `Konfirmasi Serah Terima Kembali (${selectedItems.length} Aset)`
                : `Konfirmasi Serah Terima Ambil (${selectedItems.length} Aset)`}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function BatchHandoverPage() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: '980px', margin: '0 auto', padding: '1rem' }}>
          <Skeleton height="260px" />
        </div>
      }
    >
      <BatchHandoverContent />
    </Suspense>
  );
}


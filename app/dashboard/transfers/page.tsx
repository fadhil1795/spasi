'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  ArrowRightLeft,
  Plus,
  Search,
  Printer,
  UserCheck,
  Check,
  X,
  ArrowRight,
  Eye,
} from 'lucide-react';

export default function AssetTransfersPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const userRole = (session?.user as any)?.role || 'STAFF';
  const canApprove = ['SUPER_ADMIN', 'ADMIN', 'APPROVER'].includes(userRole);

  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Inline Reject State (Tanpa Popup Modal)
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resT = await fetch('/api/transfers');
      if (resT.ok) setTransfers(await resT.json());
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data mutasi aset', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (t: any) => {
    try {
      setProcessingId(t.id);
      const res = await fetch(`/api/transfers/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Mutasi aset telah disetujui dan data lokasi/unit/PIC aset diperbarui!', 'success');
        fetchData();
      } else {
        showToast(data.error || 'Gagal menyetujui mutasi', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async (transferId: string) => {
    try {
      setProcessingId(transferId);
      const res = await fetch(`/api/transfers/${transferId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', rejectionNotes }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Pengajuan mutasi aset telah ditolak', 'success');
        setRejectingId(null);
        setRejectionNotes('');
        fetchData();
      } else {
        showToast(data.error || 'Gagal menolak mutasi', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const s = t.status || 'APPROVED';
      if (statusFilter !== 'ALL' && s !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = t.transferNumber?.toLowerCase().includes(q);
        const matchAsset = t.asset?.name?.toLowerCase().includes(q) || t.asset?.code?.toLowerCase().includes(q);
        const matchLoc = t.fromLocation?.toLowerCase().includes(q) || t.toLocation?.toLowerCase().includes(q);
        const matchDept = t.fromDepartment?.toLowerCase().includes(q) || t.toDepartment?.toLowerCase().includes(q);
        const matchPic = t.fromPicName?.toLowerCase().includes(q) || t.toPicName?.toLowerCase().includes(q);
        if (!matchNum && !matchAsset && !matchLoc && !matchDept && !matchPic) return false;
      }
      return true;
    });
  }, [transfers, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    const c = { ALL: transfers.length, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    transfers.forEach((t) => {
      const st = (t.status || 'APPROVED') as keyof typeof c;
      if (c[st] !== undefined) c[st]++;
    });
    return c;
  }, [transfers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ArrowRightLeft size={28} style={{ color: 'var(--color-primary)' }} />
            Mutasi &amp; Perpindahan Aset
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Kelola pemindahan aset antar-ruangan, pemindahan antar-unit/fakultas, perubahan penanggung jawab (PIC), persetujuan mutasi, dan cetak BAST Mutasi.
          </p>
        </div>

        <Link
          href="/dashboard/transfers/new"
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}
        >
          <Plus size={18} /> Ajukan Mutasi Aset Baru
        </Link>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Total Histori Mutasi</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.35rem' }}>{counts.ALL}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Seluruh perpindahan tercatat</div>
        </Card>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Menunggu Persetujuan</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.35rem', color: '#f59e0b' }}>{counts.PENDING}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Butuh verifikasi Admin / Approver</div>
        </Card>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Mutasi Disetujui</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.35rem', color: '#10b981' }}>{counts.APPROVED}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Siap cetak BAST Mutasi</div>
        </Card>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Mutasi Ditolak</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.35rem', color: '#ef4444' }}>{counts.REJECTED}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Permohonan dibatalkan</div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Cari nomor mutasi, nama/kode aset, ruangan, unit, atau PIC..."
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.4rem', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: `Semua (${counts.ALL})` },
              { id: 'PENDING', label: `Menunggu Persetujuan (${counts.PENDING})` },
              { id: 'APPROVED', label: `Disetujui (${counts.APPROVED})` },
              { id: 'REJECTED', label: `Ditolak (${counts.REJECTED})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: statusFilter === tab.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: statusFilter === tab.id ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: statusFilter === tab.id ? '#fff' : 'var(--color-text)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Transfers Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', fontWeight: 700 }}>
                <th style={{ padding: '0.85rem 1rem' }}>No. Mutasi &amp; Waktu</th>
                <th style={{ padding: '0.85rem 1rem' }}>Aset yang Dimutasi</th>
                <th style={{ padding: '0.85rem 1rem' }}>Pemindahan Antar-Ruangan</th>
                <th style={{ padding: '0.85rem 1rem' }}>Pemindahan Antar-Unit</th>
                <th style={{ padding: '0.85rem 1rem' }}>Perubahan Penanggung Jawab</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status &amp; Persetujuan</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    Memuat histori mutasi aset...
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    Belum ada data mutasi aset yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => {
                  const st = t.status || 'APPROVED';
                  const badgeCfg =
                    st === 'PENDING'
                      ? { label: 'MENUNGGU APPROVAL', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
                      : st === 'REJECTED'
                      ? { label: 'DITOLAK', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
                      : { label: 'DISETUJUI', color: '#10b981', bg: 'rgba(16,185,129,0.12)' };

                  return (
                    <React.Fragment key={t.id}>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary)' }}>
                            {t.transferNumber || `MUT-${t.id.slice(-6).toUpperCase()}`}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                            {formatDate(t.transferredAt, 'dd MMM yyyy HH:mm')}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--color-muted)' }}>
                            Oleh: <strong>{t.transferredBy}</strong>
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <Link href={`/dashboard/assets/${t.assetId}`} style={{ fontWeight: 700, color: 'var(--color-text)', textDecoration: 'none' }}>
                            {t.asset?.name || 'Aset'}
                          </Link>
                          <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                            {t.asset?.code} • {t.asset?.category?.name || '-'}
                          </div>
                          {t.reason && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                              &quot;{t.reason}&quot;
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Dari: {t.fromLocation || 'Gudang Utama'}</div>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                            <ArrowRight size={13} style={{ color: 'var(--color-primary)' }} /> {t.toLocation || 'Gudang Utama'}
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                            Dari: {t.fromDepartment || t.asset?.department?.name || 'Inventaris Pusat'}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                            <ArrowRight size={13} style={{ color: '#10b981' }} /> {t.toDepartment || t.asset?.department?.name || 'Inventaris Pusat'}
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                            PIC Lama: {t.fromPicName || '-'}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                            <UserCheck size={13} style={{ color: '#3b82f6' }} /> {t.toPicName || t.asset?.picName || '-'}
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: badgeCfg.color,
                              background: badgeCfg.bg,
                            }}
                          >
                            {badgeCfg.label}
                          </span>
                          {t.approvedBy && (
                            <div style={{ fontSize: '0.73rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                              Oleh: {t.approvedBy}
                            </div>
                          )}
                          {t.rejectionNotes && (
                            <div style={{ fontSize: '0.73rem', color: '#ef4444', marginTop: '0.15rem' }}>
                              Catatan: {t.rejectionNotes}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {st === 'PENDING' && canApprove && (
                              <>
                                <button
                                  className="btn btn-primary btn-sm"
                                  disabled={processingId === t.id}
                                  onClick={() => handleApprove(t)}
                                  style={{ background: '#10b981', borderColor: '#10b981' }}
                                >
                                  <Check size={14} /> Setujui
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  disabled={processingId === t.id}
                                  style={{ color: '#ef4444' }}
                                  onClick={() => {
                                    if (rejectingId === t.id) {
                                      setRejectingId(null);
                                    } else {
                                      setRejectingId(t.id);
                                      setRejectionNotes('');
                                    }
                                  }}
                                >
                                  <X size={14} /> Tolak
                                </button>
                              </>
                            )}
                            {st === 'APPROVED' && (
                              <Link
                                href={`/dashboard/assets/transfers/${t.id}/bast`}
                                className="btn btn-secondary btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                              >
                                <Printer size={14} /> BAST Mutasi
                              </Link>
                            )}
                            <Link
                              href={`/dashboard/assets/${t.assetId}`}
                              className="btn btn-ghost btn-sm"
                              title="Lihat Detail Aset"
                            >
                              <Eye size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Baris Inline Penolakan Tanpa Popup */}
                      {rejectingId === t.id && (
                        <tr style={{ background: 'rgba(239, 68, 68, 0.06)', borderBottom: '1px solid var(--color-border)' }}>
                          <td colSpan={7} style={{ padding: '0.85rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444' }}>
                                Alasan Penolakan Mutasi ({t.asset?.name}):
                              </span>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="Ketik alasan penolakan mutasi..."
                                value={rejectionNotes}
                                onChange={(e) => setRejectionNotes(e.target.value)}
                                style={{ flex: 1, minWidth: '240px', height: '36px', fontSize: '0.84rem' }}
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setRejectingId(null)}
                              >
                                Batal
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                isLoading={processingId === t.id}
                                onClick={() => handleConfirmReject(t.id)}
                                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                              >
                                Konfirmasi Tolak
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

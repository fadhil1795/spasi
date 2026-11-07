'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft, QrCode, Printer, RefreshCw, CheckCircle2,
  AlertTriangle, XCircle, Search, Building2, User, Clock,
  ArrowRightLeft, Check, ShieldCheck, Tag
} from 'lucide-react';

export default function StockOpnameDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MATCH' | 'WRONG_LOCATION' | 'MISSING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Reconcile Modal State
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    if (id) fetchSessionDetail();
  }, [id]);

  const fetchSessionDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/stock-opname/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSessionData(data);
      } else {
        showToast('Sesi opname tidak ditemukan', 'error');
      }
    } catch {
      showToast('Gagal memuat detail sesi opname', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteReconciliation = async () => {
    try {
      setReconciling(true);
      const res = await fetch(`/api/stock-opname/${id}/reconcile`, {
        method: 'POST',
      });

      if (res.ok) {
        const result = await res.json();
        showToast(result.message, 'success');
        setReconcileModalOpen(false);
        fetchSessionDetail();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal melakukan sinkronisasi data', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setReconciling(false);
    }
  };

  const handleToggleStatus = async (newStatus: 'COMPLETED' | 'IN_PROGRESS') => {
    try {
      const res = await fetch(`/api/stock-opname/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showToast(`Status sesi berhasil diubah menjadi ${newStatus === 'COMPLETED' ? 'Selesai' : 'Berjalan'}`, 'success');
        fetchSessionDetail();
      }
    } catch {
      showToast('Gagal memperbarui status sesi', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Skeleton height="35px" width="300px" />
        <Skeleton height="160px" borderRadius="var(--radius-lg)" />
        <Skeleton height="400px" borderRadius="var(--radius-lg)" />
      </div>
    );
  }

  if (!sessionData) {
    return (
      <Card style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '3rem auto' }}>
        <h2>Sesi Opname Tidak Ditemukan</h2>
        <Link href="/dashboard/stock-opname" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Kembali ke Daftar Opname
        </Link>
      </Card>
    );
  }

  const items = sessionData.items || [];
  const filteredItems = items.filter((item: any) => {
    const matchTab = activeTab === 'ALL' || item.scanStatus === activeTab;
    const q = searchQuery.toLowerCase();
    const matchQuery =
      !q ||
      (item.asset?.code && item.asset.code.toLowerCase().includes(q)) ||
      (item.asset?.name && item.asset.name.toLowerCase().includes(q)) ||
      (item.asset?.brand && item.asset.brand.toLowerCase().includes(q)) ||
      (item.asset?.serialNumber && item.asset.serialNumber.toLowerCase().includes(q));
    return matchTab && matchQuery;
  });

  const progressPercent = sessionData.totalExpected > 0
    ? Math.min(100, Math.round((sessionData.totalScanned / sessionData.totalExpected) * 100))
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link
            href="/dashboard/stock-opname"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '0.4rem' }}
          >
            <ArrowLeft size={16} /> Kembali ke Daftar Stock Opname
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{sessionData.title}</h1>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, background: 'var(--color-surface2)', border: '1px solid var(--color-border)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              {sessionData.sessionNumber}
            </span>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: sessionData.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: sessionData.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--color-primary)',
              }}
            >
              {sessionData.status === 'COMPLETED' ? 'Selesai' : 'Sedang Berjalan'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--color-muted)', fontSize: '0.85rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Building2 size={15} /> Ruang: <strong>{sessionData.location?.name || sessionData.location?.building} (Lt. {sessionData.location?.floor || '1'} {sessionData.location?.room || ''})</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <User size={15} /> Auditor: <strong>{sessionData.auditor?.name || 'Petugas'}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={15} /> Dimulai: <strong>{formatDate(sessionData.startDate)}</strong>
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {sessionData.status !== 'COMPLETED' && (
            <Link
              href={`/dashboard/stock-opname/${sessionData.id}/scan`}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <QrCode size={16} /> Buka Scanner Kamera HP
            </Link>
          )}

          <Link
            href={`/dashboard/stock-opname/${sessionData.id}/report`}
            target="_blank"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Printer size={16} /> Cetak Berita Acara (BA)
          </Link>

          {(sessionData.totalWrongLoc > 0 || sessionData.totalDamaged > 0) && sessionData.status !== 'COMPLETED' && (
            <Button variant="secondary" onClick={() => setReconcileModalOpen(true)}>
              <RefreshCw size={15} /> Sinkronkan ke Master Aset
            </Button>
          )}

          {sessionData.status === 'IN_PROGRESS' ? (
            <Button variant="secondary" onClick={() => handleToggleStatus('COMPLETED')}>
              <CheckCircle2 size={15} /> Selesaikan Sesi
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => handleToggleStatus('IN_PROGRESS')}>
              <RefreshCw size={15} /> Buka Kembali
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards & Progress Metric */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Progres Verifikasi
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{sessionData.totalScanned}</span>
            <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>/ {sessionData.totalExpected} Unit</span>
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--color-primary-light)' }}>{progressPercent}%</span>
          </div>
          <div style={{ height: '6px', width: '100%', background: 'var(--color-surface2)', borderRadius: '3px', overflow: 'hidden', marginTop: '0.6rem' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)', transition: 'width 0.3s ease' }} />
          </div>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Sesuai di Ruangan Ini (Match)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--color-success)' }}>
            {sessionData.totalMatch}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Aset fisik terverifikasi di tempatnya
          </div>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #eab308' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Salah Kamar / Nyasar
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: '#eab308' }}>
            {sessionData.totalWrongLoc}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Terdaftar di ruang lain tapi ada di sini
          </div>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Belum Ditemukan (Missing)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: '#ef4444' }}>
            {sessionData.totalMissing}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Tercatat di buku tetapi belum discan
          </div>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <Card style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: `Semua Item (${items.length})` },
              { id: 'MATCH', label: `✓ Cocok (${sessionData.totalMatch})` },
              { id: 'WRONG_LOCATION', label: `⚠ Salah Kamar (${sessionData.totalWrongLoc})` },
              { id: 'MISSING', label: `✕ Belum Ditemukan (${sessionData.totalMissing})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: activeTab === tab.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: activeTab === tab.id ? '#fff' : 'var(--color-text)',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Cari nama, kode aset, nomor seri..."
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.2rem', width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </Card>

      {/* Items Table */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', fontWeight: 700 }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Kode & Identitas Aset</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Lokasi Seharusnya</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Hasil Audit Fisik</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Kondisi Fisik</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Waktu Scan</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                    Tidak ada item aset yang sesuai filter ini.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item: any) => {
                  const asset = item.asset;
                  const isMatch = item.scanStatus === 'MATCH';
                  const isWrong = item.scanStatus === 'WRONG_LOCATION';
                  const isMissing = item.scanStatus === 'MISSING';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: isWrong ? 'rgba(234, 179, 8, 0.04)' : undefined,
                      }}
                    >
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                          <Link href={`/dashboard/assets/${asset?.id}`} target="_blank" style={{ color: 'inherit', textDecoration: 'none' }}>
                            {asset?.name || 'Aset'}
                          </Link>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-primary-light)' }}>
                            {asset?.code}
                          </span>
                          {asset?.brand && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                              • {asset.brand}
                            </span>
                          )}
                          {asset?.serialNumber && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                              (SN: {asset.serialNumber})
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                          {sessionData.location?.name || sessionData.location?.building}
                        </div>
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        {isMatch && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-success)', background: 'rgba(34, 197, 94, 0.12)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                            <CheckCircle2 size={13} /> Sesuai Ruangan (Match)
                          </span>
                        )}
                        {isWrong && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: '#eab308', background: 'rgba(234, 179, 8, 0.15)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                            <AlertTriangle size={13} /> Salah Kamar / Nyasar
                          </span>
                        )}
                        {isMissing && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                            <XCircle size={13} /> Belum Ditemukan
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color:
                              item.conditionAfter === 'Baik'
                                ? 'var(--color-success)'
                                : item.conditionAfter === 'Rusak Berat'
                                ? '#ef4444'
                                : '#eab308',
                          }}
                        >
                          {item.conditionAfter || asset?.condition || 'Baik'}
                        </span>
                        {item.conditionBefore && item.conditionBefore !== item.conditionAfter && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                            (Sebelumnya: {item.conditionBefore})
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                        {item.scannedAt ? formatDate(item.scannedAt) : '-'}
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                        {item.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Rekonsiliasi Hasil Opname */}
      {reconcileModalOpen && (
        <Modal
          isOpen={reconcileModalOpen}
          onClose={() => setReconcileModalOpen(false)}
          title="Sinkronisasi Data Temuan Stock Opname"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem', fontSize: '0.85rem' }}>
              <strong>Tindakan Rekonsiliasi Otomatis:</strong>
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
                <li>Aset yang ditemukan <strong>Salah Kamar ({sessionData.totalWrongLoc} unit)</strong> akan dipindahkan lokasinya secara resmi ke ruangan ini ({sessionData.location?.name}) dan dicatat ke riwayat mutasi.</li>
                <li>Perubahan kondisi fisik (Baik $\rightarrow$ Rusak) akan disinkronkan ke kartu aset master.</li>
                <li>Sesi opname ini akan otomatis ditandai sebagai <strong>Selesai (Completed)</strong>.</li>
              </ul>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              Apakah Anda yakin ingin menerapkan hasil audit fisik ini ke dalam database master inventaris?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setReconcileModalOpen(false)} disabled={reconciling}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleExecuteReconciliation} loading={reconciling}>
                <Check size={16} /> Ya, Sinkronkan Sekarang
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
